import { describe, expect, it } from "vitest";
import { DEFAULT_APP_DATA, type AppData } from "../shared/finance";
import { alavancasIniciais, gerarPlano } from "../shared/plano";
import type { MunicipalInsights } from "../shared/insights";

function rita(): AppData {
  const d = structuredClone(DEFAULT_APP_DATA);
  d.profile = { ...d.profile, name: "Rita", investable: 10000, reserve: 0, personalMonthly: 1500, experience: "Sim, um pouco" };
  d.idea = { ...d.idea, activity: "Manicure e estética", municipality: "Campina Grande", municipalityCode: "2504009", municipalityUf: "PB", neighborhood: "Catole" };
  d.finance = { ...d.finance, rent: 0 };
  return d;
}

const insights: MunicipalInsights = {
  municipalityCode: "2504009", activityId: "estetica", modelVersion: "t", generatedAt: "2026-11-27",
  signals: [
    { id: "concorrencia", title: "Concorrência", verdict: "atencao", headline: "1 para cada 760 moradores", confidence: "OBSERVADO", source: "Receita Federal" },
    { id: "sobrevivencia", title: "Sobrevivência", verdict: "favoravel", headline: "76% seguem abertos após 2 anos", confidence: "ESTIMADO", source: "Receita Federal" },
  ],
  opportunities: { cities: [{ code: "1", name: "Queimadas", uf: "PB", active: 18, expected: 20 }], activities: [] },
  limitations: [],
};

describe("plano de negócio", () => {
  it("usa o molde do ramo, não os números iguais para todo negócio", () => {
    const a = alavancasIniciais(rita());
    expect(a.investimento).toBe(1500);   // manicure em casa, não R$ 30 mil
    expect(a.preco).toBe(35);
    expect(a.vendasDia).toBe(4);
    expect(a.aluguel).toBe(0);
  });

  it("fecha a conta da Rita com começo devagar", () => {
    const p = gerarPlano(rita(), insights);
    expect(p.resumo.paraComecar).toBe(1500 + 3 * 230);
    expect(Math.round(p.meses[2].sobra)).toBe(2234);   // 3.080 − 616 − 230
    expect(Math.round(p.meses[0].sobra)).toBe(756);
    expect(p.resumo.vendasDiaParaRetirada).toBeCloseTo(2.81, 2);
    expect(p.resumo.fecha).toBe(true);
    expect(p.meses).toHaveLength(12);
  });

  it("cenários em ordem e SWOT a partir dos dados", () => {
    const p = gerarPlano(rita(), insights);
    expect(p.cenarios[0].resultadoMes).toBeLessThan(p.cenarios[1].resultadoMes);
    expect(p.cenarios[1].resultadoMes).toBeLessThan(p.cenarios[2].resultadoMes);
    expect(p.swot.ameacas.some((x) => x.texto.includes("Concorrência"))).toBe(true);
    expect(p.swot.oportunidades.some((x) => x.texto.includes("Queimadas"))).toBe(true);
    expect(p.swot.fraquezas.some((x) => x.texto.includes("reserva"))).toBe(true);
  });

  it("avisa quando não fecha", () => {
    const d = rita();
    const p = gerarPlano(d, null, { ...alavancasIniciais(d), vendasDia: 1 });
    expect(p.resumo.fecha).toBe(false);
    expect(p.riscos.length).toBeGreaterThan(0);
    expect(p.resumo.retornoEmMeses).toBeNull();
  });
});
