import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Conta de usuário via Supabase Auth (código de 6 dígitos por e-mail).
 * A URL e a chave "anon" do projeto são públicas por natureza (o acesso é controlado por RLS),
 * então podem ficar no código. Configure em EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
 * ou preencha as constantes abaixo depois de criar o projeto.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export const supabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function supabase(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export type Perfil = {
  nome: string;
  whatsapp: string;
  municipio: string;
  municipio_codigo: string;
  motivacao: string;
  fase: string;
  experiencia: string;
  aceita_marketing: boolean;
};

/** Pede o código. shouldCreateUser=true cria a conta no primeiro acesso. */
export async function sendCode(email: string, criarConta: boolean): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Cadastro ainda não configurado.";
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: criarConta } });
  if (!error) return null;
  if (/signups not allowed|user not found/i.test(error.message)) return "Não achamos conta com esse e-mail. Crie sua conta primeiro.";
  if (/rate|too many|security purposes/i.test(error.message)) return "Muitas tentativas. Espere 1 minuto e peça outro código.";
  return "Não conseguimos enviar o código agora. Tente de novo em instantes.";
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Cadastro ainda não configurado.";
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (!error) return null;
  if (/expired/i.test(error.message)) return "O código expirou. Peça um novo.";
  return "Código incorreto. Confira o e-mail e tente de novo.";
}

/** Grava o perfil na tabela `perfis` (uma linha por usuário; RLS garante que cada um só vê o seu). */
export async function savePerfil(perfil: Perfil): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Cadastro ainda não configurado.";
  const { data } = await sb.auth.getUser();
  if (!data.user) return "Sessão expirada. Entre de novo.";
  const { error } = await sb.from("perfis").upsert({ id: data.user.id, email: data.user.email, ...perfil, atualizado_em: new Date().toISOString() });
  return error ? "Conta criada, mas não conseguimos salvar seus dados. Tente de novo." : null;
}

export async function currentEmail(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}
