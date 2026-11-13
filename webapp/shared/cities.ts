/** Busca de cidade em todo o Brasil pela API (GET /v1/municipios). Sem API, cai na lista local de Alagoas. */
import municipalityData from "@/shared/data/alagoas-municipios.json";
import { insightsApiUrl } from "@/shared/insights";

export type City = { code: string; name: string; uf: string };

const local = (municipalityData.municipalities as { ibgeCode: string; name: string }[]).map((c) => ({ code: c.ibgeCode, name: c.name, uf: "AL" }));
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function searchLocal(query: string, limit = 8): City[] {
  const q = norm(query);
  if (!q) return [];
  const starts = local.filter((c) => norm(c.name).startsWith(q));
  const has = local.filter((c) => !starts.includes(c) && norm(c.name).includes(q));
  return [...starts, ...has].slice(0, limit);
}

export function findLocal(name: string): City | undefined {
  return local.find((c) => c.name === name);
}

export async function searchCities(query: string, signal?: AbortSignal, limit = 8): Promise<{ cities: City[]; national: boolean }> {
  const base = insightsApiUrl();
  if (base && query.trim().length >= 2) {
    try {
      const r = await fetch(`${base}/v1/municipios?busca=${encodeURIComponent(query.trim())}&limite=${limit}`, { signal });
      if (r.ok) {
        const j = (await r.json()) as { codigo: string; nome: string; uf: string }[];
        return { cities: j.map((c) => ({ code: c.codigo, name: c.nome, uf: c.uf })), national: true };
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
    }
  }
  return { cities: searchLocal(query, limit), national: false };
}
