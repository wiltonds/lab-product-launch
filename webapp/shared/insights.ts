/**
 * Contrato entre o app e a API dos modelos de dados (motor em Python/FastAPI, a construir).
 *
 * O app nunca inventa números de mercado: enquanto EXPO_PUBLIC_INSIGHTS_API_URL não estiver
 * configurada, ou a API não responder, cada bloco aparece como "em breve".
 *
 * Endpoint esperado:
 *   GET {EXPO_PUBLIC_INSIGHTS_API_URL}/v1/insights?municipio=<código IBGE>&atividade=<id>
 *   → MunicipalInsights (JSON abaixo)
 */

export type Confidence = "OBSERVADO" | "ESTIMADO";

export type InsightSignal = {
  id: "concorrencia" | "espaco" | "sobrevivencia" | "demanda" | string;
  title: string;            // ex.: "Concorrência"
  verdict: "favoravel" | "atencao" | "risco" | "neutro";
  headline: string;         // ex.: "1 barbearia para cada 2.100 moradores"
  detail?: string;          // explicação curta em linguagem simples
  comparison?: string;      // ex.: "Média de Alagoas: 1 para cada 1.600"
  confidence: Confidence;
  source: string;           // ex.: "Receita Federal — CNPJ, out/2026"
  sampleSize?: number;      // n de empresas usadas; < 30 exige aviso
};

export type MunicipalInsights = {
  municipalityCode: string;
  activityId: string;
  modelVersion: string;
  generatedAt: string;
  signals: InsightSignal[];
  /** Partes do Índice Vinga que vêm dos dados públicos (0–100; null = sem dados suficientes). */
  marketScore?: { market: number | null; survival: number | null };
  limitations: string[];
};

export type InsightsState =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; data: MunicipalInsights; savedAt?: string };

/** Os três blocos que o painel reserva para os dados do município. */
export const PLANNED_SIGNALS: { id: string; title: string; question: string; icon: "storefront-outline" | "analytics-outline" | "pulse-outline" | "people-outline" }[] = [
  { id: "concorrencia", title: "Concorrência", question: "Quantos negócios parecidos já existem por morador?", icon: "storefront-outline" },
  { id: "espaco", title: "Espaço no mercado", question: "Quantos negócios uma cidade como a sua costuma ter?", icon: "analytics-outline" },
  { id: "sobrevivencia", title: "Sobrevivência", question: "Quantos negócios desse tipo seguem abertos depois de 2 anos?", icon: "pulse-outline" },
  { id: "demanda", title: "Movimento do setor", question: "Mais negócios desse tipo estão abrindo ou fechando?", icon: "people-outline" },
];

export const SMALL_SAMPLE_THRESHOLD = 30;

/** Endereço público da API em produção. EXPO_PUBLIC_INSIGHTS_API_URL substitui (ex.: localhost no desenvolvimento). */
export const DEFAULT_INSIGHTS_API_URL = "https://lab-dados-api.onrender.com";

export function insightsApiUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_INSIGHTS_API_URL || DEFAULT_INSIGHTS_API_URL;
  return url && url.trim() ? url.trim().replace(/\/$/, "") : null;
}

const cacheKey = (m: string, a: string) => `vinga:insights:${m}:${a}`;

async function storage() {
  try { return (await import("@react-native-async-storage/async-storage")).default; } catch { return null; }
}

/** Guarda a última resposta boa de cada cidade + atividade: se a API cair, o app mostra a última análise com a data. */
async function lerCache(m: string, a: string): Promise<InsightsState | null> {
  try {
    const s = await storage();
    const raw = s ? await s.getItem(cacheKey(m, a)) : null;
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw) as { savedAt: string; data: MunicipalInsights };
    return { status: "ready", data, savedAt };
  } catch { return null; }
}

async function salvarCache(m: string, a: string, data: MunicipalInsights) {
  try { const s = await storage(); await s?.setItem(cacheKey(m, a), JSON.stringify({ savedAt: new Date().toISOString(), data })); } catch { /* sem cache, segue */ }
}

export async function fetchMunicipalInsights(municipalityCode: string, activityId: string, signal?: AbortSignal): Promise<InsightsState> {
  const base = insightsApiUrl();
  if (!base) return { status: "unavailable", reason: "Os modelos de dados do município ainda não estão conectados." };
  if (!municipalityCode || !activityId) return { status: "unavailable", reason: "Escolha o negócio e a cidade para ver os dados." };
  try {
    const res = await fetch(`${base}/v1/insights?municipio=${encodeURIComponent(municipalityCode)}&atividade=${encodeURIComponent(activityId)}`, { signal });
    if (res.status === 404) return { status: "unavailable", reason: "Não há dados validados para essa combinação ainda." };
    if (!res.ok) return (await lerCache(municipalityCode, activityId)) ?? { status: "unavailable", reason: "Os dados estão sendo atualizados. Tente de novo em alguns minutos." };
    const data = (await res.json()) as MunicipalInsights;
    if (!Array.isArray(data.signals)) return { status: "unavailable", reason: "Resposta da API fora do formato esperado." };
    void salvarCache(municipalityCode, activityId, data);
    return { status: "ready", data };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { status: "loading" };
    return (await lerCache(municipalityCode, activityId)) ?? { status: "unavailable", reason: "Não foi possível consultar os dados agora." };
  }
}
