/**
 * Cidades do Brasil (IBGE), dentro do próprio app: a escolha de cidade funciona
 * mesmo com a API fora do ar. A lista vem de data/publicado/municipios.parquet
 * (atualizada a cada edição dos dados) e está ordenada da maior para a menor cidade.
 */
import data from "./data/municipios-br.json";

export type City = { code: string; name: string; uf: string; population: number };
export type State = { uf: string; name: string };

export const STATES: State[] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
].map(([uf, name]) => ({ uf, name }));

export const stateName = (uf: string) => STATES.find((s) => s.uf === uf)?.name ?? uf;

/** DDD do WhatsApp → UF (para sugerir o estado). */
const DDD: Record<string, string> = {};
([
  ["SP", "11 12 13 14 15 16 17 18 19"], ["RJ", "21 22 24"], ["ES", "27 28"], ["MG", "31 32 33 34 35 37 38"],
  ["PR", "41 42 43 44 45 46"], ["SC", "47 48 49"], ["RS", "51 53 54 55"], ["DF", "61"], ["GO", "62 64"], ["TO", "63"],
  ["MT", "65 66"], ["MS", "67"], ["AC", "68"], ["RO", "69"], ["BA", "71 73 74 75 77"], ["SE", "79"], ["PE", "81 87"],
  ["AL", "82"], ["PB", "83"], ["RN", "84"], ["CE", "85 88"], ["PI", "86 89"], ["PA", "91 93 94"], ["AM", "92 97"],
  ["RR", "95"], ["AP", "96"], ["MA", "98 99"],
] as const).forEach(([uf, ddds]) => ddds.split(" ").forEach((d) => { DDD[d] = uf; }));
export function ufFromWhatsapp(digits: string): string | undefined {
  const d = digits.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length >= 2 ? DDD[d.slice(0, 2)] : undefined;
}

export const ALL_CITIES: City[] = (data.municipios as [string, string, string, number][]).map(([code, name, uf, population]) => ({ code, name, uf, population }));
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const KEYS = ALL_CITIES.map((c) => norm(c.name));

/** Começa-com primeiro, depois contém; dentro de cada grupo, a UF preferida e as maiores cidades primeiro. */
export function searchCities(query: string, opts: { uf?: string; preferUf?: string; limit?: number } = {}): City[] {
  const q = norm(query);
  const limit = opts.limit ?? 8;
  const pool = ALL_CITIES.map((c, i) => ({ c, k: KEYS[i] })).filter(({ c }) => !opts.uf || c.uf === opts.uf);
  if (!q) return pool.slice(0, limit).map(({ c }) => c);
  const rank = (c: City) => (opts.preferUf && c.uf === opts.preferUf ? 0 : 1);
  const starts = pool.filter(({ k }) => k.startsWith(q)).map(({ c }) => c);
  const has = pool.filter(({ k }) => !k.startsWith(q) && k.includes(q)).map(({ c }) => c);
  const sort = (xs: City[]) => xs.sort((a, b) => rank(a) - rank(b) || b.population - a.population);
  return [...sort(starts), ...sort(has)].slice(0, limit);
}

export function citiesOf(uf: string): number {
  return ALL_CITIES.filter((c) => c.uf === uf).length;
}

export function findCity(code: string): City | undefined {
  return ALL_CITIES.find((c) => c.code === code);
}
