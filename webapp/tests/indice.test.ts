import { describe, expect, it } from "vitest";
import { DEFAULT_APP_DATA, mergeAppData } from "../shared/finance";
import { computeIndice, label, RECOMECO } from "../shared/indice";

const base = mergeAppData(DEFAULT_APP_DATA, { profile: { ...DEFAULT_APP_DATA.profile, experience: "Sim, um pouco", stage: "Estou pesquisando e fazendo contas" } });

describe("Índice Vinga", () => {
  it("fica entre 0 e 100 e traz motivo e ação", () => {
    const i = computeIndice(base, { market: 60, survival: 70 });
    expect(i.score).toBeGreaterThanOrEqual(0);
    expect(i.score).toBeLessThanOrEqual(100);
    expect(i.reason.length).toBeGreaterThan(10);
    expect(i.action.length).toBeGreaterThan(10);
    expect(i.partial).toBe(false);
  });

  it("sem dados da cidade vira nota parcial", () => {
    const i = computeIndice(base, null);
    expect(i.partial).toBe(true);
    expect(i.parts.find((p) => p.id === "mercado")?.score).toBeNull();
  });

  it("aponta o mercado quando ele é o ponto fraco", () => {
    const i = computeIndice(base, { market: 5, survival: 90 });
    expect(i.reason).toContain("disputado");
  });

  it("aponta as contas quando não fecham", () => {
    const apertado = mergeAppData(base, { finance: { ...base.finance, customersPerDay: 3 } });
    const i = computeIndice(apertado, { market: 90, survival: 90 });
    expect(i.reason).toContain("clientes por dia");
  });

  it("recomeço dá mais peso ao bolso", () => {
    const fraco = mergeAppData(base, { profile: { ...base.profile, reserve: 0 }, finance: { ...base.finance, customersPerDay: 5 } });
    const normal = computeIndice(fraco, { market: 90, survival: 90 }).score;
    const recomeco = computeIndice(mergeAppData(fraco, { profile: { ...fraco.profile, motivation: RECOMECO } }), { market: 90, survival: 90 }).score;
    expect(recomeco).toBeLessThan(normal);
  });

  it("rótulos", () => {
    expect(label(80)).toContain("boas chances");
    expect(label(20)).toContain("Ainda não");
  });
});
