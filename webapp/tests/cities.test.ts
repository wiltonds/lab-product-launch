import { describe, expect, it } from "vitest";
import { ALL_CITIES, citiesOf, searchCities, STATES, ufFromWhatsapp } from "../shared/cities";

describe("cidades do Brasil", () => {
  it("tem todas as cidades e os 27 estados", () => {
    expect(ALL_CITIES.length).toBeGreaterThan(5500);
    expect(STATES).toHaveLength(27);
    expect(citiesOf("AL")).toBe(102);
    expect(citiesOf("MG")).toBe(853);
  });
  it("busca sem acento, começa-com primeiro", () => {
    const r = searchCities("maceio");
    expect(r[0].name).toBe("Maceió");
    expect(searchCities("caru")[0].uf).toBe("PE");
  });
  it("filtra pelo estado", () => {
    const r = searchCities("santa luzia", { uf: "BA" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.uf === "BA")).toBe(true);
  });
  it("sem busca mostra as maiores do estado", () => {
    expect(searchCities("", { uf: "SP", limit: 1 })[0].name).toBe("São Paulo");
  });
  it("DDD sugere o estado", () => {
    expect(ufFromWhatsapp("(82) 9 9999-9999")).toBe("AL");
    expect(ufFromWhatsapp("5511999999999")).toBe("SP");
  });
});
