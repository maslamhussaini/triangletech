import { describe, expect, it } from "vitest";

import {
  assessRental,
  buildScenarios,
  calculateRental,
  formatPercent,
  formatUSD,
  monthlyMortgagePayment,
  sanitizeRentalInputs,
  validateRentalInputs,
  DEFAULT_RENTAL_INPUTS,
  type RentalInputs,
} from "@/lib/tools/rental-property";

/**
 * Canonical case, worked by hand:
 * - Price $200,000, 25% down → down payment $50,000, loan $150,000.
 * - 0% interest over 10 years → $1,250/mo, $15,000/yr debt service.
 * - 200 available nights × 50% occupancy = 100 occupied nights × $100 = $10,000.
 * - Average stay 4 nights → 25 stays; cleaning fee $100 → $2,500 in,
 *   cleaning cost $80 → $2,000 out.
 * - Platform fee 10% of rental revenue = $1,000; management 0%.
 * - Fixed operating: tax $1,200 + insurance $600 + HOA $50×12 + utilities
 *   $100×12 + quick monthly $100×12 = $4,800.
 * - Total operating expenses = 1,000 + 0 + 2,000 + 4,800 = $7,800.
 * - NOI = $12,500 − $7,800 = $4,700. Cash flow = 4,700 − 15,000 = −$10,300.
 * - Cash invested = 50,000 + 4,000 closing + 6,000 furnishing = $60,000.
 */
const canonical: RentalInputs = {
  purchasePrice: 200_000,
  downPaymentPercent: 25,
  interestRatePercent: 0,
  loanTermYears: 10,
  nightlyRate: 100,
  occupancyPercent: 50,
  monthlyExpenses: 100,
  platformFeePercent: 10,
  managementFeePercent: 0,
  propertyTaxAnnual: 1_200,
  insuranceAnnual: 600,
  hoaMonthly: 50,
  utilitiesMonthly: 100,
  repairsMonthly: 0,
  otherExpensesMonthly: 0,
  closingCosts: 4_000,
  furnishingCosts: 6_000,
  cleaningFeePerStay: 100,
  cleaningCostPerStay: 80,
  averageStayNights: 4,
  availableNightsPerYear: 200,
};

describe("monthlyMortgagePayment", () => {
  it("matches the standard amortisation figure for $300,000 at 6% over 30 years", () => {
    // Reference value for this loan is $1,798.65/mo.
    expect(monthlyMortgagePayment(300_000, 6, 30)).toBeCloseTo(1798.65, 2);
  });

  it("divides principal evenly at 0% interest", () => {
    expect(monthlyMortgagePayment(120_000, 0, 10)).toBe(1000);
  });

  it("is zero with no loan or no term", () => {
    expect(monthlyMortgagePayment(0, 6.5, 30)).toBe(0);
    expect(monthlyMortgagePayment(200_000, 6.5, 0)).toBe(0);
  });

  it("rises with the interest rate for the same loan", () => {
    expect(monthlyMortgagePayment(200_000, 8, 30)).toBeGreaterThan(
      monthlyMortgagePayment(200_000, 4, 30),
    );
  });
});

describe("calculateRental — canonical case", () => {
  const result = calculateRental(canonical);

  it("computes financing from price and down payment", () => {
    expect(result.downPaymentAmount).toBe(50_000);
    expect(result.loanAmount).toBe(150_000);
    expect(result.monthlyMortgagePayment).toBe(1250);
    expect(result.annualDebtService).toBe(15_000);
  });

  it("computes revenue including per-stay cleaning fees", () => {
    expect(result.occupiedNightsPerYear).toBe(100);
    expect(result.staysPerYear).toBe(25);
    expect(result.grossRentalRevenueAnnual).toBe(10_000);
    expect(result.cleaningFeeRevenueAnnual).toBe(2_500);
    expect(result.grossIncomeAnnual).toBe(12_500);
  });

  it("computes operating expenses with fees on rental revenue only", () => {
    expect(result.platformFeesAnnual).toBe(1000);
    expect(result.managementFeesAnnual).toBe(0);
    expect(result.cleaningCostsAnnual).toBe(2000);
    expect(result.fixedOperatingExpensesAnnual).toBe(4800);
    expect(result.totalOperatingExpensesAnnual).toBe(7800);
    const breakdownTotal = result.operatingExpenseBreakdown.reduce((sum, line) => sum + line.annual, 0);
    expect(breakdownTotal).toBeCloseTo(result.totalOperatingExpensesAnnual, 6);
  });

  it("separates NOI from financing and derives cash flow", () => {
    expect(result.noiAnnual).toBe(4700);
    expect(result.noiMonthly).toBeCloseTo(4700 / 12, 6);
    expect(result.cashFlowAnnual).toBe(-10_300);
    expect(result.cashFlowMonthly).toBeCloseTo(-10_300 / 12, 6);
  });

  it("counts only real cash in — down payment, closing and furnishing", () => {
    expect(result.totalCashInvested).toBe(60_000);
    expect(result.cashOnCashPercent).toBeCloseTo((-10_300 / 60_000) * 100, 4);
    expect(result.capRatePercent).toBeCloseTo(2.35, 6);
  });

  it("computes break-even occupancy exactly, including fees and cleaning", () => {
    // Contribution per night = 100 × (1 − 0.10) + (100 − 80) / 4 = 95.
    // Cash-flow fixed = 4,800 + 15,000 = 19,800 → 208.42 nights → 104.21%.
    expect(result.breakEvenOccupancyPercent).toBeCloseTo(104.21, 2);
    // NOI fixed = 4,800 → 50.53 nights → 25.26%.
    expect(result.breakEvenOccupancyNoiPercent).toBeCloseTo(25.26, 2);
    // Above 100% must be called out, not hidden.
    expect(result.warnings.some((w) => w.includes("above 100%"))).toBe(true);
  });
});

describe("NOI is independent of financing", () => {
  it("changing rate, term or down payment moves cash flow but never NOI", () => {
    const base = calculateRental(canonical);
    const refinanced = calculateRental({
      ...canonical,
      interestRatePercent: 7.25,
      loanTermYears: 30,
      downPaymentPercent: 10,
    });
    expect(refinanced.noiAnnual).toBe(base.noiAnnual);
    expect(refinanced.capRatePercent).toBe(base.capRatePercent);
    expect(refinanced.cashFlowAnnual).not.toBeCloseTo(base.cashFlowAnnual, 0);
    // A smaller down payment means less cash in, so cash invested must fall.
    expect(refinanced.totalCashInvested).toBeLessThan(base.totalCashInvested);
  });

  it("a 100% cash purchase has no debt service, so cash flow equals NOI", () => {
    const cash = calculateRental({ ...canonical, downPaymentPercent: 100 });
    expect(cash.loanAmount).toBe(0);
    expect(cash.annualDebtService).toBe(0);
    expect(cash.cashFlowAnnual).toBe(cash.noiAnnual);
    expect(cash.totalCashInvested).toBe(200_000 + 4_000 + 6_000);
  });
});

describe("boundaries and sanitisation", () => {
  it("clamps occupancy above 100% and below 0%", () => {
    const over = calculateRental({ ...canonical, occupancyPercent: 150 });
    expect(over.occupiedNightsPerYear).toBe(200);
    const under = calculateRental({ ...canonical, occupancyPercent: -20 });
    expect(under.occupiedNightsPerYear).toBe(0);
  });

  it("at 0% occupancy there is no revenue and NOI is negative fixed costs", () => {
    const result = calculateRental({ ...canonical, occupancyPercent: 0 });
    expect(result.grossIncomeAnnual).toBe(0);
    expect(result.staysPerYear).toBe(0);
    expect(result.noiAnnual).toBe(-4800);
    expect(result.cashFlowAnnual).toBe(-4800 - 15_000);
  });

  it("with 0 available nights, income is zero and break-even is undefined", () => {
    const result = calculateRental({ ...canonical, availableNightsPerYear: 0 });
    expect(result.occupiedNightsPerYear).toBe(0);
    expect(result.breakEvenOccupancyPercent).toBeNull();
    expect(result.breakEvenOccupancyNoiPercent).toBeNull();
    expect(result.warnings.some((w) => w.includes("Available rental nights"))).toBe(true);
  });

  it("break-even is 0% when there are no fixed costs and no debt", () => {
    const result = calculateRental({
      ...canonical,
      downPaymentPercent: 100,
      monthlyExpenses: 0,
      propertyTaxAnnual: 0,
      insuranceAnnual: 0,
      hoaMonthly: 0,
      utilitiesMonthly: 0,
    });
    expect(result.breakEvenOccupancyPercent).toBe(0);
  });

  it("break-even is null when every occupied night loses money on variable costs", () => {
    const result = calculateRental({
      ...canonical,
      nightlyRate: 50,
      platformFeePercent: 60,
      managementFeePercent: 50,
      cleaningFeePerStay: 0,
      cleaningCostPerStay: 0,
    });
    expect(result.breakEvenOccupancyPercent).toBeNull();
    expect(result.warnings.some((w) => w.includes("cannot be calculated"))).toBe(true);
  });

  it("cash-on-cash is null (not 0%) when no cash is invested", () => {
    const result = calculateRental({
      ...canonical,
      downPaymentPercent: 0,
      closingCosts: 0,
      furnishingCosts: 0,
    });
    expect(result.totalCashInvested).toBe(0);
    expect(result.cashOnCashPercent).toBeNull();
    expect(result.warnings.some((w) => w.includes("cash-on-cash"))).toBe(true);
  });

  it("cap rate is null when the purchase price is zero", () => {
    const result = calculateRental({ ...canonical, purchasePrice: 0 });
    expect(result.capRatePercent).toBeNull();
  });

  it("an average stay of 0 disables cleaning economics with a warning", () => {
    const result = calculateRental({ ...canonical, averageStayNights: 0 });
    expect(result.staysPerYear).toBe(0);
    expect(result.cleaningFeeRevenueAnnual).toBe(0);
    expect(result.cleaningCostsAnnual).toBe(0);
    expect(result.warnings.some((w) => w.includes("Average stay length is 0"))).toBe(true);
  });

  it("clamps available nights to a calendar year", () => {
    expect(sanitizeRentalInputs({ ...canonical, availableNightsPerYear: 400 }).availableNightsPerYear).toBe(365);
    expect(sanitizeRentalInputs({ ...canonical, availableNightsPerYear: -5 }).availableNightsPerYear).toBe(0);
  });

  it("never returns NaN or Infinity, even for non-finite inputs", () => {
    const result = calculateRental({
      ...canonical,
      nightlyRate: Number.NaN,
      purchasePrice: Number.POSITIVE_INFINITY,
      occupancyPercent: Number.NaN,
    });
    for (const value of Object.values(result)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
    expect(result.grossRentalRevenueAnnual).toBe(0);
  });

  it("is deterministic — identical inputs give identical outputs", () => {
    const first = calculateRental(canonical);
    const second = calculateRental({ ...canonical });
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe("scenarios", () => {
  it("adjusts only nightly rate (±10%) and occupancy (±10 points)", () => {
    const [conservative, base, optimistic] = buildScenarios(canonical);
    expect(conservative.nightlyRate).toBeCloseTo(90, 6);
    expect(conservative.occupancyPercent).toBe(40);
    expect(base.nightlyRate).toBe(100);
    expect(base.occupancyPercent).toBe(50);
    expect(optimistic.nightlyRate).toBeCloseTo(110, 6);
    expect(optimistic.occupancyPercent).toBe(60);
    expect(base.result).toEqual(calculateRental(canonical));
  });

  it("orders cash flow conservative < base < optimistic", () => {
    const [conservative, base, optimistic] = buildScenarios(canonical);
    expect(conservative.result.cashFlowAnnual).toBeLessThan(base.result.cashFlowAnnual);
    expect(optimistic.result.cashFlowAnnual).toBeGreaterThan(base.result.cashFlowAnnual);
    // Expenses and financing do not move between scenarios.
    expect(conservative.result.annualDebtService).toBe(base.result.annualDebtService);
    expect(optimistic.result.fixedOperatingExpensesAnnual).toBe(base.result.fixedOperatingExpensesAnnual);
  });

  it("clamps scenario occupancy into 0–100", () => {
    const [, , optimistic] = buildScenarios({ ...canonical, occupancyPercent: 97 });
    expect(optimistic.occupancyPercent).toBe(100);
    const [conservative] = buildScenarios({ ...canonical, occupancyPercent: 5 });
    expect(conservative.occupancyPercent).toBe(0);
  });

  it("each scenario states its assumption in plain language", () => {
    for (const scenario of buildScenarios(canonical)) {
      expect(scenario.assumption.length).toBeGreaterThan(20);
    }
  });
});

describe("preliminary assessment", () => {
  it("flags the canonical (shortfall) case as negative, without recommending", () => {
    const result = calculateRental(canonical);
    const assessment = assessRental(canonical, result);
    expect(assessment.band).toBe("negative");
    expect(assessment.explanation).toContain("not advice");
  });

  it("flags a clearly covering case as positive, framed as preliminary", () => {
    const strong: RentalInputs = {
      ...canonical,
      purchasePrice: 100_000,
      downPaymentPercent: 100,
      nightlyRate: 200,
      occupancyPercent: 50,
      monthlyExpenses: 0,
      platformFeePercent: 0,
      propertyTaxAnnual: 0,
      insuranceAnnual: 0,
      hoaMonthly: 0,
      utilitiesMonthly: 0,
      cleaningFeePerStay: 0,
      cleaningCostPerStay: 0,
      closingCosts: 0,
      furnishingCosts: 0,
    };
    const assessment = assessRental(strong, calculateRental(strong));
    expect(assessment.band).toBe("positive");
    expect(assessment.explanation).toContain("not a recommendation");
  });

  it("treats exactly $50/month as neutral break-even", () => {
    // No loan, no expenses: 60 occupied nights × $10 = $600/yr = $50/mo.
    const edge: RentalInputs = {
      ...canonical,
      downPaymentPercent: 100,
      nightlyRate: 10,
      occupancyPercent: 30,
      monthlyExpenses: 0,
      platformFeePercent: 0,
      propertyTaxAnnual: 0,
      insuranceAnnual: 0,
      hoaMonthly: 0,
      utilitiesMonthly: 0,
      cleaningFeePerStay: 0,
      cleaningCostPerStay: 0,
      closingCosts: 0,
      furnishingCosts: 0,
    };
    const result = calculateRental(edge);
    expect(result.cashFlowMonthly).toBeCloseTo(50, 6);
    expect(assessRental(edge, result).band).toBe("neutral");
  });

  it("asks for more information instead of assessing empty inputs", () => {
    const empty = { ...canonical, purchasePrice: 0 };
    expect(assessRental(empty, calculateRental(empty)).band).toBe("insufficient");
  });
});

describe("visible validation — nothing is silently clamped", () => {
  it("accepts the canonical case and the defaults with no errors", () => {
    expect(validateRentalInputs(canonical)).toEqual([]);
    expect(validateRentalInputs(DEFAULT_RENTAL_INPUTS)).toEqual([]);
    expect(calculateRental(canonical).validationErrors).toEqual([]);
  });

  it("flags an occupancy above 100% on the occupancy field", () => {
    const errors = validateRentalInputs({ ...canonical, occupancyPercent: 150 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("occupancyPercent");
    expect(errors[0].message).toContain("between 0% and 100%");
    expect(errors[0].message).toContain("150");
    // The error travels with the result so the UI cannot miss it.
    expect(calculateRental({ ...canonical, occupancyPercent: 150 }).validationErrors).toEqual(errors);
  });

  it("flags each out-of-range percentage and negative amount by field", () => {
    const errors = validateRentalInputs({
      ...canonical,
      downPaymentPercent: 120,
      platformFeePercent: -3,
      nightlyRate: -100,
      availableNightsPerYear: 400,
    });
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("downPaymentPercent");
    expect(fields).toContain("platformFeePercent");
    expect(fields).toContain("nightlyRate");
    expect(fields).toContain("availableNightsPerYear");
  });

  it("flags combined platform + management fees above 100%", () => {
    const errors = validateRentalInputs({
      ...canonical,
      platformFeePercent: 60,
      managementFeePercent: 50,
    });
    expect(errors.some((e) => e.field === "managementFeePercent" && e.message.includes("110%"))).toBe(true);
  });

  it("flags a zero loan term when a loan exists, but not for a cash purchase", () => {
    const withLoan = validateRentalInputs({ ...canonical, loanTermYears: 0 });
    expect(withLoan.some((e) => e.field === "loanTermYears")).toBe(true);
    const cash = validateRentalInputs({ ...canonical, loanTermYears: 0, downPaymentPercent: 100 });
    expect(cash.some((e) => e.field === "loanTermYears")).toBe(false);
  });

  it("still calculates at the nearest limit while flagging the error", () => {
    // Occupancy 150 is calculated as 100 — but the error says so, visibly.
    const result = calculateRental({ ...canonical, occupancyPercent: 150 });
    expect(result.occupiedNightsPerYear).toBe(200);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });
});

describe("defaults and formatting", () => {
  it("the illustrative defaults produce a complete, finite analysis", () => {
    const result = calculateRental(DEFAULT_RENTAL_INPUTS);
    expect(result.loanAmount).toBe(280_000);
    // Reference payment for $280,000 at 6.5% over 30 years ≈ $1,769.81/mo.
    expect(result.monthlyMortgagePayment).toBeCloseTo(1769.81, 1);
    expect(result.totalCashInvested).toBe(70_000 + 7_000 + 15_000);
    expect(result.cashOnCashPercent).not.toBeNull();
    expect(Number.isFinite(result.cashFlowMonthly)).toBe(true);
  });

  it("formats USD and percents for US readers", () => {
    expect(formatUSD(1234.4)).toBe("$1,234");
    expect(formatUSD(-500)).toBe("-$500");
    expect(formatUSD(99.5, { cents: true })).toBe("$99.50");
    expect(formatPercent(2.35, 2)).toBe("2.35%");
    expect(formatPercent(null)).toBe("—");
  });
});
