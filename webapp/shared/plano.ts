/**
 * Motor do plano de negócio: cruza a ideia da pessoa (respostas do diagnóstico) com os dados da cidade
 * (insights da API) e o molde do ramo, e devolve um plano no padrão do Sebrae:
 * resumo, mercado, marketing (canvas), operacional, financeiro de 12 meses, cenários, SWOT, riscos e 90 dias.
 *
 * Tudo aqui é cálculo puro (sem tela), para o painel, o PDF e os testes usarem o mesmo número.
 */
import type { AppData } from "./finance";
import type { MunicipalInsights } from "./insights";
import { moldeDe, type Molde } from "./moldes";

/** O que a pessoa pode mexer no painel. */
export type Alavancas = {
  preco: number;
  vendasDia: number;
  diasMes: number;
  custoVariavel: number; // % do preço
  fixos: number;         // R$/mês sem aluguel e sem retirada
  aluguel: number;       // R$/mês (0 = em casa)
  retirada: number;      // salário da pessoa (R$/mês)
  investimento: number;  // para abrir (R$)
};

export type Mes = { mes: number; vendas: number; custoVariavel: number; fixos: number; sobra: number; retirada: number; resultado: number; caixa: number };
export type Cenario = { id: "pessimista" | "provavel" | "otimista"; nome: string; vendasMes: number; resultadoMes: number };
export type Item = { texto: string; fonte?: string };

export type Plano = {
  negocio: string;
  cidade: string;
  uf: string;
  bairro: string;
  emCasa: boolean;
  molde: Molde | null;
  alavancas: Alavancas;
  resumo: {
    paraComecar: number;             // investimento + capital de giro de 3 meses
    capitalGiro: number;
    vendasDiaParaRetirada: number;   // ponto de equilíbrio com a retirada
    vendasDiaSemRetirada: number;    // só para pagar o negócio
    sobraMes3: number;               // antes da retirada
    fecha: boolean;
    folga: number;                   // vendas/dia acima do necessário (negativo = falta)
    sobraDoDinheiro: number;         // investable - paraComecar
    mesesDeCasa: number | null;      // quanto a reserva sustenta a casa depois de começar
    retornoEmMeses: number | null;   // meses para o resultado (depois da retirada) pagar o investimento
  };
  meses: Mes[];
  cenarios: Cenario[];
  mercado: { sinais: { titulo: string; manchete: string; detalhe?: string; comparacao?: string; tom: string; fonte: string }[]; menosDisputadas: string[]; limitacoes: string[] } | null;
  swot: { forcas: Item[]; fraquezas: Item[]; oportunidades: Item[]; ameacas: Item[] };
  riscos: Item[];
  planoB: Item[];
  passos: string[];
  canvas: { bloco: string; texto: string }[];
};

const CENARIOS = [
  { id: "pessimista" as const, nome: "Se vender menos", demanda: 0.7, preco: 0.9 },
  { id: "provavel" as const, nome: "Mais provável", demanda: 1, preco: 1 },
  { id: "otimista" as const, nome: "Se vender mais", demanda: 1.3, preco: 1.1 },
];

/** Números de partida: o molde do ramo, ajustado às respostas (em casa ou ponto, preço e movimento que a pessoa disse). */
export function alavancasIniciais(data: AppData): Alavancas {
  const m = moldeDe(activityIdOf(data));
  const f = data.finance;
  const emCasa = f.rent === 0 && (m?.podeEmCasa ?? true);
  const respondeu = f.averageTicket !== 45 || f.customersPerDay !== 12; // 45/12 são os padrões antigos, iguais para todo ramo
  return {
    preco: respondeu || !m ? f.averageTicket : m.ticket,
    vendasDia: respondeu || !m ? f.customersPerDay : m.vendasDia,
    diasMes: m?.diasMes ?? f.operatingDays,
    custoVariavel: m?.custoVariavel ?? f.variableCostPercent,
    fixos: m ? (emCasa ? m.fixos.casa : m.fixos.ponto) : f.energy + f.water + f.internet,
    aluguel: emCasa ? 0 : f.rent,
    retirada: f.ownerPay,
    investimento: m ? (emCasa ? m.investimento.casa : m.investimento.ponto) : f.initialInvestment,
  };
}

export function gerarPlano(data: AppData, insights: MunicipalInsights | null, alav?: Alavancas): Plano {
  const m = moldeDe(activityIdOf(data));
  const a = alav ?? alavancasIniciais(data);
  const margem = a.preco * (1 - a.custoVariavel / 100);
  const custoNegocio = a.fixos + a.aluguel;
  const cheio = a.preco * a.vendasDia * a.diasMes;
  const rampa = m?.rampa ?? [0.4, 0.7, 1];

  const capitalGiro = 3 * custoNegocio;
  const paraComecar = a.investimento + capitalGiro;
  const vendasDiaSemRetirada = margem > 0 && a.diasMes > 0 ? custoNegocio / margem / a.diasMes : Infinity;
  const vendasDiaParaRetirada = margem > 0 && a.diasMes > 0 ? (custoNegocio + a.retirada) / margem / a.diasMes : Infinity;

  // 12 meses: começo devagar, caixa partindo do que sobra depois de abrir
  const meses: Mes[] = [];
  let caixa = data.profile.investable - a.investimento;
  for (let i = 1; i <= 12; i++) {
    const frac = i <= 3 ? rampa[i - 1] : 1;
    const vendas = cheio * frac;
    const cv = vendas * a.custoVariavel / 100;
    const sobra = vendas - cv - custoNegocio;
    const resultado = sobra - a.retirada;
    caixa += resultado;
    meses.push({ mes: i, vendas, custoVariavel: cv, fixos: custoNegocio, sobra, retirada: a.retirada, resultado, caixa });
  }

  let acumulado = 0;
  let retornoEmMeses: number | null = null;
  for (let i = 1; i <= 36; i++) {
    const frac = i <= 3 ? rampa[i - 1] : 1;
    acumulado += cheio * frac * (1 - a.custoVariavel / 100) - custoNegocio - a.retirada;
    if (acumulado >= a.investimento) { retornoEmMeses = i; break; }
  }

  const sobraDoDinheiro = data.profile.investable - paraComecar;
  const guardado = Math.max(0, sobraDoDinheiro) + Math.max(0, data.profile.reserve);
  const mesesDeCasa = data.profile.personalMonthly > 0 ? guardado / data.profile.personalMonthly : null;

  const cenarios: Cenario[] = CENARIOS.map((c) => {
    const vendasMes = a.preco * c.preco * a.vendasDia * c.demanda * a.diasMes;
    return { id: c.id, nome: c.nome, vendasMes, resultadoMes: vendasMes * (1 - a.custoVariavel / 100) - custoNegocio - a.retirada };
  });

  const fecha = vendasDiaParaRetirada <= a.vendasDia;
  const folga = a.vendasDia - vendasDiaParaRetirada;
  const resumo = { paraComecar, capitalGiro, vendasDiaParaRetirada, vendasDiaSemRetirada, sobraMes3: meses[2].sobra, fecha, folga, sobraDoDinheiro, mesesDeCasa, retornoEmMeses };

  const mercado = insights ? {
    sinais: insights.signals.map((s) => ({ titulo: s.title, manchete: s.headline, detalhe: s.detail, comparacao: s.comparison, tom: s.verdict, fonte: s.source })),
    menosDisputadas: (insights.opportunities?.cities ?? []).slice(0, 3).map((c) => c.name),
    limitacoes: insights.limitations,
  } : null;

  const swot = montarSwot(data, insights, a, resumo, m);
  const { riscos, planoB } = montarRiscos(data, insights, a, resumo, m);

  const canvas = m ? [
    { bloco: "Clientes", texto: m.canvas.clientes },
    { bloco: "Proposta de valor", texto: m.canvas.proposta },
    { bloco: "Canais", texto: m.canvas.canais },
    { bloco: "Relacionamento", texto: m.canvas.relacionamento },
    { bloco: "Receita", texto: `${brl(a.preco)} por ${m.unidade}` },
    { bloco: "Recursos", texto: m.canvas.recursos },
    { bloco: "Atividades", texto: m.canvas.atividades },
    { bloco: "Parcerias", texto: m.canvas.parcerias },
    { bloco: "Custos", texto: `${a.custoVariavel}% em cada venda; ${brl(custoNegocio)} fixos por mês` },
  ] : [];

  return {
    negocio: data.idea.activity || "Seu negócio",
    cidade: data.idea.municipality, uf: data.idea.municipalityUf ?? "", bairro: data.idea.neighborhood ?? "",
    emCasa: a.aluguel === 0, molde: m, alavancas: a, resumo, meses, cenarios, mercado, swot, riscos, planoB,
    passos: m?.passos ?? [], canvas,
  };
}

function montarSwot(data: AppData, insights: MunicipalInsights | null, a: Alavancas, r: Plano["resumo"], m: Molde | null): Plano["swot"] {
  const forcas: Item[] = [], fraquezas: Item[] = [], oportunidades: Item[] = [], ameacas: Item[] = [];
  const exp = data.profile.experience;
  if (/2 anos/.test(exp)) forcas.push({ texto: "Experiência de mais de 2 anos no ramo" });
  else if (/pouco/.test(exp)) forcas.push({ texto: "Já tem alguma experiência no ramo" });
  else if (exp) fraquezas.push({ texto: "Nunca trabalhou no ramo: aprenda antes de investir alto" });
  if (a.aluguel === 0) forcas.push({ texto: "Começa em casa: custo fixo baixo e risco menor" });
  if (r.fecha && r.folga >= 1) forcas.push({ texto: `Folga de ${num1(r.folga)} ${m?.unidadePlural ?? "vendas"} por dia acima do necessário` });
  if (!r.fecha) fraquezas.push({ texto: `Precisa de ${num1(r.vendasDiaParaRetirada)} ${m?.unidadePlural ?? "vendas"} por dia e espera ${num1(a.vendasDia)}` });
  if (data.profile.reserve <= 0) fraquezas.push({ texto: "Sem reserva para as contas da casa" });
  if (r.sobraDoDinheiro < 0) fraquezas.push({ texto: `Faltam ${brl(-r.sobraDoDinheiro)} para abrir e aguentar 3 meses` });
  for (const s of insights?.signals ?? []) {
    const it = { texto: `${s.title}: ${s.headline}`, fonte: s.source };
    if (s.verdict === "favoravel") oportunidades.push(it);
    else if (s.verdict === "risco" || s.verdict === "atencao") ameacas.push(it);
  }
  const cid = insights?.opportunities?.cities ?? [];
  if (cid.length) oportunidades.push({ texto: `Cidades próximas menos disputadas: ${cid.slice(0, 3).map((c) => c.name).join(", ")}`, fonte: "Receita Federal (CNPJ) e IBGE" });
  return { forcas, fraquezas, oportunidades, ameacas };
}

function montarRiscos(data: AppData, insights: MunicipalInsights | null, a: Alavancas, r: Plano["resumo"], m: Molde | null): { riscos: Item[]; planoB: Item[] } {
  const riscos: Item[] = [], planoB: Item[] = [];
  const un = m?.unidadePlural ?? "vendas";
  if (!r.fecha) riscos.push({ texto: `O movimento que você espera não paga a sua retirada (${num1(a.vendasDia)} de ${num1(r.vendasDiaParaRetirada)} ${un}/dia).` });
  if (r.sobraDoDinheiro < 0) riscos.push({ texto: `O dinheiro não cobre abrir e aguentar 3 meses: faltam ${brl(-r.sobraDoDinheiro)}.` });
  if (r.mesesDeCasa !== null && r.mesesDeCasa < 3) riscos.push({ texto: "A reserva sustenta a casa por menos de 3 meses: negócio novo demora a pagar o dono." });
  const conc = insights?.signals.find((s) => s.id === "concorrencia");
  if (conc && conc.verdict !== "favoravel") riscos.push({ texto: `Concorrência: ${conc.headline}.`, fonte: conc.source });
  const sob = insights?.signals.find((s) => s.id === "sobrevivencia");
  if (sob && sob.verdict === "risco") riscos.push({ texto: `Sobrevivência baixa no ramo: ${sob.headline}.`, fonte: sob.source });
  const meta = Math.max(1, Math.round(a.vendasDia * 0.5));
  planoB.push({ texto: `Teste de 2 semanas: se vier menos de ${meta} ${un} por dia, mude uma coisa só (preço, público ou bairro) e teste de novo.` });
  if (insights?.opportunities?.cities?.length) planoB.push({ texto: `Se o seu bairro estiver saturado, atenda onde há menos concorrência: ${insights.opportunities.cities.slice(0, 2).map((c) => c.name).join(" ou ")}.` });
  if (a.aluguel > 0 && m?.podeEmCasa) planoB.push({ texto: "Comece em casa ou a domicílio e só alugue o ponto quando a agenda lotar." });
  return { riscos, planoB };
}

export function activityIdOf(data: AppData): string | undefined {
  const label = data.idea.activity;
  const map: Record<string, string> = { "Lanchonete": "lanchonete", "Restaurante pequeno": "restaurante", "Marmitaria": "marmitaria", "Barbearia": "barbearia", "Salão de beleza": "salao", "Manicure e estética": "estetica", "Oficina mecânica": "oficina", "Lava-jato e serviços": "servicos-auto" };
  return map[label];
}

export function brl(n: number): string {
  const v = Math.round(Math.abs(n)).toLocaleString("pt-BR");
  return (n < 0 ? "−R$ " : "R$ ") + v;
}

export function num1(n: number): string {
  if (!isFinite(n)) return "—";
  return (Math.ceil(n * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
