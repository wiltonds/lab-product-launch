import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { workspaces } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Armazenamento indisponível." });
      const rows = await db.select({ payload: workspaces.payload, updatedAt: workspaces.updatedAt }).from(workspaces).where(eq(workspaces.openId, ctx.user.openId)).limit(1);
      if (!rows.length) return { payload: null, updatedAt: null };
      try { return { payload: JSON.parse(rows[0].payload) as Record<string, unknown>, updatedAt: rows[0].updatedAt.toISOString() }; }
      catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível ler os dados salvos." }); }
    }),
    save: protectedProcedure.input(z.object({ payload: z.record(z.string(), z.unknown()) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Armazenamento indisponível." });
      const serialized = JSON.stringify(input.payload);
      if (serialized.length > 500_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Os dados enviados excedem o limite." });
      await db.insert(workspaces).values({ openId: ctx.user.openId, payload: serialized }).onDuplicateKeyUpdate({ set: { payload: serialized, updatedAt: new Date() } });
      return { saved: true, updatedAt: new Date().toISOString() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
