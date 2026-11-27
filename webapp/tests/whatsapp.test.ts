import { describe, expect, it } from "vitest";
import { WHATSAPP_VINGA, linkWhatsappVinga, mensagemParaVinga } from "../shared/whatsapp";

describe("WhatsApp do Vinga", () => {
  it("monta a mensagem com o ramo e a cidade", () => {
    expect(mensagemParaVinga("Lanchonete", "Maceió")).toBe("Oi! Quero receber meu plano de negócio do Vinga (lanchonete em Maceió).");
    expect(mensagemParaVinga("", "")).toBe("Oi! Quero receber meu plano de negócio do Vinga.");
  });
  it("gera link wa.me com o número só em dígitos e a mensagem codificada", () => {
    const link = linkWhatsappVinga("Lanchonete", "Maceió");
    expect(link.startsWith(`https://wa.me/${WHATSAPP_VINGA}?text=`)).toBe(true);
    expect(WHATSAPP_VINGA).toMatch(/^55\d{10,11}$/);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(mensagemParaVinga("Lanchonete", "Maceió"));
  });
});
