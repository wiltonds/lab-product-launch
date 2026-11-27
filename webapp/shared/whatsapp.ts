/** Número do WhatsApp do Vinga (com 55 e DDD). Troque em EXPO_PUBLIC_WHATSAPP_VINGA quando tiver o número próprio. */
export const WHATSAPP_VINGA = (process.env.EXPO_PUBLIC_WHATSAPP_VINGA || "5527997923848").replace(/\D/g, "");

/** Mensagem que a pessoa manda ao Vinga, já com o ramo e a cidade. */
export function mensagemParaVinga(atividade: string, cidade: string): string {
  const negocio = [atividade ? atividade.toLowerCase() : "", cidade ? `em ${cidade}` : ""].filter(Boolean).join(" ");
  return `Oi! Quero receber meu plano de negócio do Vinga${negocio ? ` (${negocio})` : ""}.`;
}

/** Link wa.me que abre a conversa com o Vinga com a mensagem pronta. */
export function linkWhatsappVinga(atividade: string, cidade: string): string {
  return `https://wa.me/${WHATSAPP_VINGA}?text=${encodeURIComponent(mensagemParaVinga(atividade, cidade))}`;
}
