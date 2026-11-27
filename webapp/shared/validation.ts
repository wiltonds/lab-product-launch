/** Validações do cadastro. Retornam a mensagem de erro em português, ou null quando o valor é válido. */

// DDDs em uso no Brasil (Anatel).
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

/** Formata enquanto a pessoa digita: (82) 9 9999-9999 */
export function maskWhatsapp(raw: string): string {
  const d = onlyDigits(raw).replace(/^55(?=\d{11})/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

export function validateWhatsapp(raw: string): string | null {
  const d = onlyDigits(raw).replace(/^55(?=\d{11})/, "");
  if (!d) return "Informe seu WhatsApp.";
  if (d.length !== 11) return "O número precisa ter DDD + 9 dígitos. Ex.: (82) 9 9999-9999.";
  if (!DDDS.has(Number(d.slice(0, 2)))) return "Esse DDD não existe. Confira os dois primeiros números.";
  if (d[2] !== "9") return "Celular começa com 9 depois do DDD.";
  if (/^(\d)\1+$/.test(d.slice(3))) return "Esse número não parece real. Confira os dígitos.";
  return null;
}

/** Erros comuns de digitação em domínios populares. */
const TYPOS: Record<string, string> = {
  "gmal.com": "gmail.com", "gmial.com": "gmail.com", "gmail.con": "gmail.com", "gmail.com.br": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com",
  "hotmial.com": "hotmail.com", "outlok.com": "outlook.com", "outlook.con": "outlook.com", "yahoo.con": "yahoo.com",
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): string | null {
  const e = normalizeEmail(raw);
  if (!e) return "Informe seu e-mail.";
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e)) return "E-mail inválido. Ex.: maria@gmail.com";
  const dominio = e.split("@")[1];
  if (TYPOS[dominio]) return `Você quis dizer @${TYPOS[dominio]}?`;
  return null;
}

export function suggestEmail(raw: string): string | null {
  const e = normalizeEmail(raw);
  const [u, d] = e.split("@");
  return d && TYPOS[d] ? `${u}@${TYPOS[d]}` : null;
}

export function validateName(raw: string): string | null {
  const n = raw.trim();
  if (n.length < 2) return "Como podemos te chamar?";
  if (/\d/.test(n)) return "O nome não pode ter números.";
  return null;
}

export function validateCode(raw: string): string | null {
  return /^\d{6,8}$/.test(onlyDigits(raw)) ? null : "Digite o código completo que chegou no e-mail.";
}

/** Teste com clientes: os campos como a pessoa digitou. */
export type TesteVendasForm = { days: string; approached: string; interested: string; intent: string; bought: string; price: string };
export type TesteVendas = { days: number; approached: number; interested: number; intendToBuy: number; bought: number; price: number };

const inteiro = (s: string): number | null => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const dinheiro = (s: string): number | null => {
  const limpo = s.trim().replace(/^R\$\s*/i, "");
  // "1.250,50" e "18,5" (jeito brasileiro) ou "18.5" (teclado numérico com ponto).
  const t = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : /^\d+\.\d{1,2}$/.test(limpo) ? limpo : limpo.replace(/\./g, "");
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};

/**
 * Valida o teste com clientes. Cada etapa do funil não pode passar da anterior
 * (abordadas ≥ interessadas ≥ disseram que comprariam; compraram ≤ abordadas).
 */
export function validarTesteVendas(f: TesteVendasForm): { erros: Partial<Record<keyof TesteVendasForm, string>>; valores: TesteVendas | null } {
  const erros: Partial<Record<keyof TesteVendasForm, string>> = {};
  const days = inteiro(f.days), approached = inteiro(f.approached), interested = inteiro(f.interested);
  const intent = inteiro(f.intent), bought = inteiro(f.bought), price = dinheiro(f.price);
  if (days === null || days < 1 || days > 365) erros.days = "Informe quantos dias, de 1 a 365.";
  if (approached === null || approached < 1) erros.approached = "Informe quantas pessoas você abordou (pelo menos 1).";
  if (interested === null) erros.interested = "Informe um número (pode ser 0).";
  else if (approached !== null && interested > approached) erros.interested = "Não pode ser maior que as pessoas abordadas.";
  if (intent === null) erros.intent = "Informe um número (pode ser 0).";
  else if (interested !== null && intent > interested) erros.intent = "Não pode ser maior que as interessadas.";
  if (bought === null) erros.bought = "Informe um número (pode ser 0).";
  else if (approached !== null && bought > approached) erros.bought = "Não pode ser maior que as pessoas abordadas.";
  if (price === null || price <= 0) erros.price = "Informe o preço em reais. Ex.: 18 ou 18,50.";
  else if (price > 100000) erros.price = "Esse preço parece alto demais. Confira o valor.";
  const ok = Object.keys(erros).length === 0;
  return { erros, valores: ok ? { days: days!, approached: approached!, interested: interested!, intendToBuy: intent!, bought: bought!, price: price! } : null };
}
