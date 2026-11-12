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
  return /^\d{6}$/.test(onlyDigits(raw)) ? null : "O código tem 6 números.";
}
