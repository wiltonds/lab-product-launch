import { describe, expect, it } from "vitest";
import { maskWhatsapp, suggestEmail, validateCode, validateEmail, validateName, validateWhatsapp } from "../shared/validation";

describe("WhatsApp", () => {
  it("aceita celular válido, com ou sem máscara e +55", () => {
    expect(validateWhatsapp("(82) 9 9123-4567")).toBeNull();
    expect(validateWhatsapp("82991234567")).toBeNull();
    expect(validateWhatsapp("+55 82 99123-4567")).toBeNull();
  });
  it("recusa número curto, DDD inexistente, fixo e repetido", () => {
    expect(validateWhatsapp("8299123")).toMatch(/DDD \+ 9/);
    expect(validateWhatsapp("20991234567")).toMatch(/DDD não existe/);
    expect(validateWhatsapp("82331234567")).toMatch(/começa com 9/);
    expect(validateWhatsapp("82999999999")).toMatch(/não parece real/);
  });
  it("formata enquanto digita", () => {
    expect(maskWhatsapp("82991234567")).toBe("(82) 9 9123-4567");
    expect(maskWhatsapp("829")).toBe("(82) 9");
  });
});

describe("E-mail", () => {
  it("aceita e-mail válido", () => {
    expect(validateEmail(" Maria.Silva@Gmail.com ")).toBeNull();
  });
  it("recusa formato inválido e sugere correção de domínio", () => {
    expect(validateEmail("maria@")).toMatch(/inválido/);
    expect(validateEmail("maria gmail.com")).toMatch(/inválido/);
    expect(validateEmail("maria@gmial.com")).toMatch(/gmail\.com/);
    expect(suggestEmail("maria@hotmal.com")).toBe("maria@hotmail.com");
  });
});

describe("Nome e código", () => {
  it("valida", () => {
    expect(validateName("A")).not.toBeNull();
    expect(validateName("Will 2")).toMatch(/números/);
    expect(validateName("Will")).toBeNull();
    expect(validateCode("123456")).toBeNull();
    expect(validateCode("12345")).not.toBeNull();
  });
});
