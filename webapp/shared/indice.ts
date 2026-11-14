/**
 * Índice Vinga (0 a 100): 1 número, 1 motivo, 1 ação.
 *
 * Quatro partes, cada uma de 0 a 100 (maior = mais a favor):
 *   mercado e sobrevivência  → vêm da API (dados públicos da cidade e do ramo)
 *   bolso                    → folga nas contas, reserva da família e dinheiro para abrir
 *   preparo                  → experiência no ramo e em que fase o plano está
 * Pesos iniciais publicados na metodologia; serão calibrados com dados reais.
 * Quem escolheu "Perdi o emprego" (recomeço) tem mais peso no bolso: errar custa mais caro.
 */
import { calculateScenario, type AppData } from "./finance";

export type PartId = "mercado" | "sobrevivencia" | "bolso" | "preparo";
export type Indice = {
  score: number;
  label: string;
  partial: boolean;           // true quando faltam os dados da cidade
  parts: { id: PartId; title: string; score: number | null }[];
  reason: string;             // o que mais puxa a nota para baixo
  action: string;             // o que fazer esta semana
};

const clip = (x: number) => Math.round(Math.min(100, Math.max(0, x)));
export const RECOMECO = "Perdi o emprego e preciso de renda";
const PESOS = { mercado: 0.3, sobrevivencia: 0.25, bolso: 0.3, preparo: 0.15 };
const PESOS_RECOMECO = { mercado: 0.25, sobrevivencia: 0.2, bolso: 0.4, preparo: 0.15 };
const EXPERIENCIA: Record<string, number> = { "Sim, mais de 2 anos": 90, "Sim, um pouco": 60, "Nunca trabalhei nisso": 25 };
const FASE: Record<string, number> = { "Só tenho a ideia": 30, "Estou pesquisando e fazendo contas": 60, "Já estou procurando o ponto": 80, "Já abri e quero melhorar": 90 };

export function label(score: number): string {
  if (score >= 75) return "Vinga, com boas chances";
  if (score >= 55) return "Vinga, com atenção";
  if (score >= 35) return "Dá, mas ajuste antes de investir";
  return "Ainda não: mude o plano antes";
}

export function bolso(data: AppData) {
  const f = data.finance;
  const r = calculateScenario(f, "intermediario");
  const need = r.breakEvenCustomersPerDay;
  const folga = need === null || f.customersPerDay <= 0 ? 0 : 1 - need / f.customersPerDay;   // fração de vendas que pode cair
  const meses = data.profile.personalMonthly > 0 ? data.profile.reserve / data.profile.personalMonthly : 0;
  const capital = data.profile.investable / Math.max(1, f.initialInvestment + r.workingCapital);
  const notas = { folga: clip((folga / 0.5) * 100), reserva: clip((meses / 6) * 100), capital: clip(capital * 100) };
  return { score: clip(0.5 * notas.folga + 0.3 * notas.reserva + 0.2 * notas.capital), notas, need, meses };
}

export function preparo(data: AppData): number | null {
  const e = EXPERIENCIA[data.profile.experience];
  const s = FASE[data.profile.stage];
  if (e === undefined && s === undefined) return null;
  return clip(0.6 * (e ?? 50) + 0.4 * (s ?? 50));
}

export function computeIndice(data: AppData, market?: { market: number | null; survival: number | null } | null): Indice {
  const b = bolso(data);
  const valores: Record<PartId, number | null> = {
    mercado: market?.market ?? null,
    sobrevivencia: market?.survival ?? null,
    bolso: b.score,
    preparo: preparo(data),
  };
  const pesos = data.profile.motivation === RECOMECO ? PESOS_RECOMECO : PESOS;
  let soma = 0, peso = 0;
  (Object.keys(valores) as PartId[]).forEach((k) => { const v = valores[k]; if (v !== null) { soma += v * pesos[k]; peso += pesos[k]; } });
  const score = peso > 0 ? Math.round(soma / peso) : 0;

  // O motivo é a parte que mais tira pontos da nota (peso × distância de 100).
  const pior = (Object.keys(valores) as PartId[])
    .filter((k) => valores[k] !== null)
    .sort((x, y) => pesos[y] * (100 - (valores[y] as number)) - pesos[x] * (100 - (valores[x] as number)))[0];
  const { reason, action } = explicar(pior, b, data);
  return {
    score, label: label(score), partial: valores.mercado === null || valores.sobrevivencia === null,
    parts: [
      { id: "mercado", title: "Mercado", score: valores.mercado },
      { id: "sobrevivencia", title: "Sobrevivência", score: valores.sobrevivencia },
      { id: "bolso", title: "Bolso", score: valores.bolso },
      { id: "preparo", title: "Preparo", score: valores.preparo },
    ],
    reason, action,
  };
}

function explicar(parte: PartId, b: ReturnType<typeof bolso>, data: AppData): { reason: string; action: string } {
  const ramo = data.idea.activity ? `de ${data.idea.activity.toLowerCase()}` : "desse tipo de negócio";
  if (parte === "mercado") return {
    reason: `O mercado ${ramo} em ${data.idea.municipality || "sua cidade"} está mais disputado do que o normal.`,
    action: "Visite 3 concorrentes e anote preço, fila e o que falta neles. Seu diferencial nasce daí.",
  };
  if (parte === "sobrevivencia") return {
    reason: "Nesse ramo, na sua região, muitos fecham antes de completar 2 anos.",
    action: "Converse com 2 pessoas que fecharam um negócio assim e pergunte o que deu errado.",
  };
  if (parte === "preparo") return {
    reason: "Você ainda tem pouca experiência nesse tipo de negócio.",
    action: "Trabalhe ou acompanhe uma semana num negócio do ramo antes de investir.",
  };
  const { folga, reserva } = b.notas;
  if (folga <= reserva && folga <= b.notas.capital) return {
    reason: b.need === null ? "Com esse preço, cada venda não cobre o próprio custo." : `As contas ficam apertadas: você precisa de ${Math.ceil(b.need)} clientes por dia só para empatar.`,
    action: "Teste o preço: pergunte a 10 pessoas quanto pagariam e quantas vezes por mês viriam.",
  };
  if (reserva <= b.notas.capital) return {
    reason: b.meses < 1 ? "Você ainda não tem reserva para as contas da casa." : `Sua reserva cobre só ${Math.floor(b.meses)} ${Math.floor(b.meses) === 1 ? "mês" : "meses"} das contas da casa.`,
    action: "Separe a reserva da família antes de investir. A meta é 6 meses de contas.",
  };
  return {
    reason: "O dinheiro para abrir não cobre o investimento e o capital de giro.",
    action: "Liste tudo o que precisa comprar e marque o que pode esperar ou ser usado.",
  };
}
