import type { Alavancas } from "./plano";

/** Alavancas que a pessoa mexeu no painel, para o PDF usar os mesmos números (só nesta sessão). */
let atual: Alavancas | null = null;
export const planoSessao = {
  get: () => atual,
  set: (a: Alavancas | null) => { atual = a; },
};
