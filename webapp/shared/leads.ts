/**
 * Leads e funil do MVP.
 * - Lead: a pessoa troca nome + WhatsApp pelo plano de negócio em PDF (sem código por e-mail).
 * - Origem: de onde a pessoa veio (?origem=grupo-jacintinho ou utm_source), guardada na primeira visita.
 * - Eventos: abriu → começou → resultado → pediu PDF → lead, para ver onde as pessoas desistem.
 * Tudo vai para o Supabase (supabase/leads.sql). Falha de rede nunca trava a pessoa.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { onlyDigits } from "./validation";

const CHAVE_ORIGEM = "vinga:origem";
const CHAVE_SESSAO = "vinga:sessao";

export type Evento = "abriu" | "comecou" | "resultado" | "abriu_plano" | "pediu_pdf" | "lead" | "teste_clientes";

/** Limpa a origem vinda da URL: só letras, números e hífen, até 60 caracteres. */
export function limparOrigem(bruta: string | null | undefined): string | null {
  if (!bruta) return null;
  const s = bruta.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || null;
}

/** Lê ?origem= (ou utm_source=) da URL atual. Só na web. */
export function origemDaUrl(search: string): string | null {
  const p = new URLSearchParams(search);
  return limparOrigem(p.get("origem") ?? p.get("utm_source"));
}

let origemCache: string | null | undefined;
let sessaoCache: string | undefined;

/** Primeira origem vista neste aparelho (first touch). */
export async function origem(): Promise<string | null> {
  if (origemCache !== undefined) return origemCache;
  try {
    const salva = await AsyncStorage.getItem(CHAVE_ORIGEM);
    if (salva) return (origemCache = salva);
    const daUrl = Platform.OS === "web" && typeof window !== "undefined" ? origemDaUrl(window.location.search) : null;
    if (daUrl) await AsyncStorage.setItem(CHAVE_ORIGEM, daUrl);
    return (origemCache = daUrl);
  } catch {
    return (origemCache = null);
  }
}

async function sessao(): Promise<string> {
  if (sessaoCache) return sessaoCache;
  try {
    const salva = await AsyncStorage.getItem(CHAVE_SESSAO);
    if (salva) return (sessaoCache = salva);
  } catch { /* segue com uma nova */ }
  const nova = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try { await AsyncStorage.setItem(CHAVE_SESSAO, nova); } catch { /* sem armazenamento: vale só nesta visita */ }
  return (sessaoCache = nova);
}

const enviados = new Set<string>();

/** Registra um passo do funil, uma vez por visita. Nunca lança erro. */
export async function registrarEvento(evento: Evento, extra?: { atividade?: string; municipioCodigo?: string }): Promise<void> {
  if (enviados.has(evento)) return;
  enviados.add(evento);
  const sb = supabase();
  if (!sb) return;
  try {
    await sb.from("eventos").insert({ sessao: await sessao(), evento, origem: await origem(), atividade: extra?.atividade || null, municipio_codigo: extra?.municipioCodigo || null });
  } catch { /* o funil é secundário: a pessoa segue normalmente */ }
}

export type Lead = {
  nome: string; whatsapp: string; municipio: string; municipioCodigo: string; uf: string; bairro: string;
  atividade: string; motivacao: string; fase: string; capital: number; indice: number | null;
  aceitaContato: boolean; aceitaMarketing: boolean;
};

/** Grava o lead. Devolve a mensagem de erro, ou null quando deu certo. */
export async function salvarLead(l: Lead): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Não conseguimos enviar agora. Tente de novo em instantes.";
  const whatsapp = onlyDigits(l.whatsapp).replace(/^55(?=\d{11})/, "");
  const { error } = await sb.from("leads").insert({
    nome: l.nome.trim().slice(0, 80), whatsapp,
    municipio: l.municipio || null, municipio_codigo: /^\d{7}$/.test(l.municipioCodigo) ? l.municipioCodigo : null,
    uf: l.uf || null, bairro: l.bairro || null, atividade: l.atividade || null,
    motivacao: l.motivacao || null, fase: l.fase || null, capital: Number.isFinite(l.capital) ? l.capital : null,
    indice: l.indice, origem: await origem(), aceita_contato: l.aceitaContato, aceita_marketing: l.aceitaMarketing,
    sessao: await sessao(),
  });
  if (error) return "Não conseguimos enviar agora. Confira sua internet e tente de novo.";
  void registrarEvento("lead", { atividade: l.atividade, municipioCodigo: l.municipioCodigo });
  return null;
}
