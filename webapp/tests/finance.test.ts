import { describe, expect, it } from "vitest";
import { calculateScenario, DEFAULT_FINANCE } from "../shared/finance";

describe("calculateScenario", () => {
  it("calculates revenue, fixed/variable costs and operating result from user assumptions", () => {
    const result = calculateScenario(DEFAULT_FINANCE, "intermediario");
    expect(result.revenue).toBe(14040);
    expect(result.fixedCosts).toBe(3870);
    expect(result.variableCosts).toBe(4212);
    expect(result.operatingResult).toBe(5958);
    expect(result.classification).toBe("CENÁRIO SIMULADO");
  });
  it("changes only the disclosed demand and ticket assumptions in each scenario", () => {
    const base = calculateScenario(DEFAULT_FINANCE, "intermediario");
    const low = calculateScenario(DEFAULT_FINANCE, "conservador");
    const high = calculateScenario(DEFAULT_FINANCE, "otimista");
    expect(low.assumptions).toMatchObject({ demandFactor: 0.7, ticketFactor: 0.9 });
    expect(high.assumptions).toMatchObject({ demandFactor: 1.3, ticketFactor: 1.1 });
    expect(low.revenue).toBeLessThan(base.revenue);
    expect(high.revenue).toBeGreaterThan(base.revenue);
  });
  it("does not return break-even counts when contribution inputs are invalid", () => {
    const result = calculateScenario({ ...DEFAULT_FINANCE, averageTicket: 0 }, "intermediario");
    expect(result.breakEvenRevenue).toBeNull();
    expect(result.breakEvenCustomersPerDay).toBeNull();
  });
});
