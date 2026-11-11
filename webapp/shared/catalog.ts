export type ActivityIcon = "fast-food-outline" | "restaurant-outline" | "nutrition-outline" | "cut-outline" | "sparkles-outline" | "color-palette-outline" | "construct-outline" | "car-sport-outline" | "ellipsis-horizontal";

export const BUSINESS_CATEGORIES = [
  { id: "alimentacao", label: "Alimentação", activities: [
    { id: "lanchonete", label: "Lanchonete", icon: "fast-food-outline" },
    { id: "restaurante", label: "Restaurante pequeno", icon: "restaurant-outline" },
    { id: "marmitaria", label: "Marmitaria", icon: "nutrition-outline" },
  ] },
  { id: "beleza", label: "Beleza", activities: [
    { id: "barbearia", label: "Barbearia", icon: "cut-outline" },
    { id: "salao", label: "Salão de beleza", icon: "sparkles-outline" },
    { id: "estetica", label: "Manicure e estética", icon: "color-palette-outline" },
  ] },
  { id: "automotivo", label: "Automotivo", activities: [
    { id: "oficina", label: "Oficina mecânica", icon: "construct-outline" },
    { id: "servicos-auto", label: "Lava-jato e serviços", icon: "car-sport-outline" },
  ] },
] as const satisfies readonly { id: string; label: string; activities: readonly { id: string; label: string; icon: ActivityIcon }[] }[];

export function findActivity(label: string) {
  for (const c of BUSINESS_CATEGORIES) for (const a of c.activities) if (a.label === label) return { ...a, category: c.id };
  return null;
}

export function activityIcon(label: string): string {
  return findActivity(label)?.icon ?? "storefront-outline";
}

export const POPULAR_MUNICIPALITIES = ["Maceió", "Arapiraca", "Rio Largo", "Palmeira dos Índios", "Penedo", "União dos Palmares"];

export const ALAGOAS_SOURCE = {
  label: "IBGE — Códigos dos Municípios",
  url: "https://www.ibge.gov.br/explica/codigos-dos-municipios.php",
  retrievedAt: "2026-11-11",
  count: 102,
} as const;
