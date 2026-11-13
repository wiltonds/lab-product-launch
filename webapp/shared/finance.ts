export type FinanceInputs = {
  initialInvestment: number;
  rent: number;
  energy: number;
  water: number;
  internet: number;
  employees: number;
  ownerPay: number;
  variableCostPercent: number;
  averageTicket: number;
  customersPerDay: number;
  operatingDays: number;
};

export type ScenarioName = "conservador" | "intermediario" | "otimista";

export const DEFAULT_FINANCE: FinanceInputs = {
  initialInvestment: 30000,
  rent: 1800,
  energy: 350,
  water: 120,
  internet: 100,
  employees: 0,
  ownerPay: 1500,
  variableCostPercent: 30,
  averageTicket: 45,
  customersPerDay: 12,
  operatingDays: 26,
};

export function calculateScenario(input: FinanceInputs, scenario: ScenarioName) {
  const factors = {
    conservador: { demand: 0.7, ticket: 0.9 },
    intermediario: { demand: 1, ticket: 1 },
    otimista: { demand: 1.3, ticket: 1.1 },
  }[scenario];

  const ticket = Math.max(0, input.averageTicket * factors.ticket);
  const customersPerDay = Math.max(0, input.customersPerDay * factors.demand);
  const revenue = ticket * customersPerDay * Math.max(0, input.operatingDays);
  const fixedCosts = Math.max(0, input.rent) + Math.max(0, input.energy) + Math.max(0, input.water) + Math.max(0, input.internet) + Math.max(0, input.employees) + Math.max(0, input.ownerPay);
  const variableRate = Math.min(95, Math.max(0, input.variableCostPercent)) / 100;
  const variableCosts = revenue * variableRate;
  const operatingResult = revenue - variableCosts - fixedCosts;
  const contributionPerCustomer = ticket * (1 - variableRate);
  const breakEvenRevenue = contributionPerCustomer > 0 ? fixedCosts / (1 - variableRate) : null;
  const breakEvenCustomersPerDay = contributionPerCustomer > 0 && input.operatingDays > 0
    ? fixedCosts / (contributionPerCustomer * input.operatingDays)
    : null;
  const workingCapital = fixedCosts * 3;

  return {
    scenario,
    assumptions: { demandFactor: factors.demand, ticketFactor: factors.ticket, variableRate },
    revenue,
    fixedCosts,
    variableCosts,
    operatingResult,
    breakEvenRevenue,
    breakEvenCustomersPerDay,
    workingCapital,
    classification: "CENÁRIO SIMULADO" as const,
  };
}

export type Mission = { id: string; title: string; detail: string };
export const MISSIONS: Mission[] = [
  { id: "investment", title: "Definir o investimento inicial", detail: "Liste os gastos necessários antes de abrir." },
  { id: "competitors", title: "Pesquisar três concorrentes", detail: "Observe oferta, preço e atendimento; não conte apenas cadastros." },
  { id: "fixed-costs", title: "Estimar custos fixos", detail: "Inclua aluguel, contas, equipe e retirada." },
  { id: "price", title: "Testar o preço", detail: "Converse com potenciais clientes antes de assumir a demanda." },
  { id: "reserve", title: "Avaliar sua reserva financeira", detail: "Separe segurança pessoal do dinheiro do negócio." },
  { id: "customers", title: "Conversar com potenciais clientes", detail: "Registre respostas e limite da amostra." },
];

export type AppData = {
  profile: { name: string; whatsapp: string; email: string; motivation: string; stage: string; experience: string; verified: boolean; status: string; ageRange: string; homeCity: string; investable: number; reserve: number; personalMonthly: number; openingWhen: string; marketingConsent: boolean; termsAccepted: boolean };
  idea: { category: string; activity: string; municipality: string; municipalityCode: string; municipalityUf?: string; propertyFound: string; equipment: string; team: string; keepJob: string; outsideState: string };
  finance: FinanceInputs;
  completedMissions: string[];
  salesTests: { days: number; approached: number; interested: number; intendToBuy: number; bought: number; price: number; createdAt: string }[];
  mentorshipRequests: { date: string; time: string; status: "pendente"; createdAt: string }[];
  privacyRequests: { type: "export" | "deletion"; createdAt: string; status: "solicitada" }[];
};

export const DEFAULT_APP_DATA: AppData = {
  profile: { name: "", whatsapp: "", email: "", motivation: "", stage: "", experience: "", verified: false, status: "", ageRange: "", homeCity: "", investable: 30000, reserve: 12000, personalMonthly: 2500, openingWhen: "Em até 6 meses", marketingConsent: false, termsAccepted: false },
  idea: { category: "", activity: "", municipality: "Maceió", municipalityCode: "2704302", municipalityUf: "AL", propertyFound: "Ainda não", equipment: "Ainda não", team: "Vou trabalhar sozinho", keepJob: "Quero manter meu emprego", outsideState: "" },
  finance: DEFAULT_FINANCE,
  completedMissions: [],
  salesTests: [],
  mentorshipRequests: [],
  privacyRequests: [],
};

export function mergeAppData(base: AppData, partial: Partial<AppData>): AppData {
  return {
    ...base,
    ...partial,
    profile: { ...base.profile, ...partial.profile },
    idea: { ...base.idea, ...partial.idea },
    finance: { ...base.finance, ...partial.finance },
    completedMissions: partial.completedMissions ?? base.completedMissions,
    salesTests: partial.salesTests ?? base.salesTests,
    mentorshipRequests: partial.mentorshipRequests ?? base.mentorshipRequests,
    privacyRequests: partial.privacyRequests ?? base.privacyRequests,
  };
}
