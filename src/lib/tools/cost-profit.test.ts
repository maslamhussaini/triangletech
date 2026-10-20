import { describe, expect, it } from "vitest";

// Imported through the "@" alias on purpose: this suite also proves the
// Vitest alias configuration resolves "@/..." exactly like tsconfig paths.
import {
  calculate,
  calculatePrice,
  calculateProfit,
  type PriceModeInputs,
  type ProfitModeInputs,
} from "@/lib/tools/cost-profit";

const profitInputs: ProfitModeInputs = {
  mode: "profit",
  sellingPrice: 200,
  productCost: 80,
  freight: 10,
  duty: 0,
  packaging: 10,
  marketplaceFee: 20,
  paymentFee: 5,
  advertising: 5,
  affiliateCommission: 0,
  otherExpense: 0,
  currency: "USD",
};

const priceInputs: PriceModeInputs = {
  mode: "price",
  productCost: 40,
  freight: 5,
  duty: 3,
  packaging: 2,
  marketplaceFee: 10,
  paymentFee: 3,
  advertising: 8,
  affiliateCommission: 5,
  otherExpense: 2,
  desiredNetMargin: 22,
  currency: "USD",
};

describe("calculateProfit", () => {
  it("computes landed cost, profits and totals for valid inputs", () => {
    // By hand: landed = 80+10+0+10 = 100; gross = 200-100 = 100;
    // expenses = 20+5+5+0+0 = 30; net = 100-30 = 70; total = 100+30 = 130.
    const result = calculateProfit(profitInputs);
    expect(result.mode).toBe("profit");
    expect(result.landedCost).toBe(100);
    expect(result.grossProfit).toBe(100);
    expect(result.sellingExpenses).toBe(30);
    expect(result.netProfit).toBe(70);
    expect(result.totalCostAndExpenses).toBe(130);
  });

  it("computes percentage arithmetic exactly", () => {
    // Gross margin = 100/200 = 50%; net margin = 70/200 = 35%;
    // ROI = 70/100 (of landed cost) = 70%.
    const result = calculateProfit(profitInputs);
    expect(result.grossMargin).toBe(50);
    expect(result.netMargin).toBe(35);
    expect(result.roi).toBe(70);
  });

  it("protects against division by zero when price and costs are zero", () => {
    const zero: ProfitModeInputs = {
      ...profitInputs,
      sellingPrice: 0,
      productCost: 0,
      freight: 0,
      packaging: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      advertising: 0,
    };
    const result = calculateProfit(zero);
    expect(result.grossMargin).toBe(0);
    expect(result.netMargin).toBe(0);
    expect(result.roi).toBe(0);
    for (const value of Object.values(result)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("handles the zero-cost boundary without NaN or Infinity", () => {
    // Selling at 50 with no costs at all: profit is 50 at a 100% margin;
    // ROI has a zero denominator (landed cost 0) and is reported as 0.
    const result = calculateProfit({
      ...profitInputs,
      sellingPrice: 50,
      productCost: 0,
      freight: 0,
      packaging: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      advertising: 0,
    });
    expect(result.grossProfit).toBe(50);
    expect(result.grossMargin).toBe(100);
    expect(result.netProfit).toBe(50);
    expect(result.roi).toBe(0);
  });
});

describe("calculatePrice", () => {
  it("derives the required selling price for a target net margin", () => {
    // By hand: landed = 40+5+3+2 = 50; expenses = 10+3+8+5+2 = 28;
    // total cost = 78; price = 78 / (1 - 0.22) = 100; net profit = 22;
    // gross profit = 100 - 50 = 50; ROI = 22/50 = 44%.
    const result = calculatePrice(priceInputs);
    expect(result.mode).toBe("price");
    expect(result.totalCost).toBe(78);
    expect(result.requiredSellingPrice).toBe(100);
    expect(result.expectedNetProfit).toBe(22);
    expect(result.expectedGrossProfit).toBe(50);
    expect(result.expectedROI).toBe(44);
    expect(result.validationError).toBeUndefined();
  });

  it("rejects a desired margin of exactly 100%", () => {
    const result = calculatePrice({ ...priceInputs, desiredNetMargin: 100 });
    expect(result.validationError).toBe(
      "Desired margin must be less than 100%. No finite selling price can satisfy 100% margin with positive costs.",
    );
    expect(result.requiredSellingPrice).toBe(0);
  });

  it("rejects a desired margin above 100%", () => {
    const result = calculatePrice({ ...priceInputs, desiredNetMargin: 150 });
    expect(result.validationError).toBe(
      "Desired margin must be less than 100%. No finite selling price can satisfy 100% margin with positive costs.",
    );
    expect(result.requiredSellingPrice).toBe(0);
  });

  it("rejects a negative desired margin", () => {
    const result = calculatePrice({ ...priceInputs, desiredNetMargin: -5 });
    expect(result.validationError).toBe("Desired margin cannot be negative.");
    expect(result.requiredSellingPrice).toBe(0);
  });
});

describe("calculate dispatcher and determinism", () => {
  it("routes profit and price modes to the matching calculation", () => {
    expect(calculate(profitInputs)).toEqual(calculateProfit(profitInputs));
    expect(calculate(priceInputs)).toEqual(calculatePrice(priceInputs));
  });

  it("produces identical output for identical inputs", () => {
    const first = calculate(profitInputs);
    const second = calculate({ ...profitInputs });
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
