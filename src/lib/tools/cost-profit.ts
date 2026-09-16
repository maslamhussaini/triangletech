export type Currency = "USD" | "AED" | "PKR" | "GBP" | "EUR";

export type CostMode = "profit" | "price";

export interface ProfitModeInputs {
  mode: "profit";
  sellingPrice: number;
  productCost: number;
  freight: number;
  duty: number;
  packaging: number;
  marketplaceFee: number;
  paymentFee: number;
  advertising: number;
  affiliateCommission: number;
  otherExpense: number;
  currency: Currency;
}

export interface PriceModeInputs {
  mode: "price";
  productCost: number;
  freight: number;
  duty: number;
  packaging: number;
  marketplaceFee: number;
  paymentFee: number;
  advertising: number;
  affiliateCommission: number;
  otherExpense: number;
  desiredNetMargin: number;
  currency: Currency;
}

export type CalculatorInputs = ProfitModeInputs | PriceModeInputs;

export interface ProfitModeResult {
  mode: "profit";
  landedCost: number;
  grossProfit: number;
  grossMargin: number;
  sellingExpenses: number;
  netProfit: number;
  netMargin: number;
  roi: number;
  totalCostAndExpenses: number;
}

export interface PriceModeResult {
  mode: "price";
  requiredSellingPrice: number;
  totalCost: number;
  desiredNetMargin: number;
  expectedNetProfit: number;
  expectedROI: number;
  expectedGrossProfit: number;
  validationError?: string;
}

export type CalculatorResult = ProfitModeResult | PriceModeResult;

const ZERO = 0;
const POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;

function safePercent(numerator: number, denominator: number): number {
  if (denominator === ZERO) return ZERO;
  return (numerator / denominator) * 100;
}

function safeDiv(numerator: number, denominator: number): number {
  if (denominator === ZERO) return ZERO;
  return numerator / denominator;
}

function clampFinite(value: number): number {
  if (!Number.isFinite(value)) return ZERO;
  if (value > POSITIVE_INFINITY || value < NEGATIVE_INFINITY) return ZERO;
  return value;
}

export function calculateProfit(inputs: ProfitModeInputs): ProfitModeResult {
  const landedCost = clampFinite(inputs.productCost + inputs.freight + inputs.duty + inputs.packaging);
  const grossProfit = clampFinite(inputs.sellingPrice - landedCost);
  const grossMargin = clampFinite(safePercent(grossProfit, inputs.sellingPrice));
  const sellingExpenses = clampFinite(inputs.marketplaceFee + inputs.paymentFee + inputs.advertising + inputs.affiliateCommission + inputs.otherExpense);
  const netProfit = clampFinite(grossProfit - sellingExpenses);
  const netMargin = clampFinite(safePercent(netProfit, inputs.sellingPrice));
  const roi = clampFinite(safePercent(netProfit, landedCost));
  const totalCostAndExpenses = clampFinite(landedCost + sellingExpenses);

  return {
    mode: "profit",
    landedCost,
    grossProfit,
    grossMargin,
    sellingExpenses,
    netProfit,
    netMargin,
    roi,
    totalCostAndExpenses,
  };
}

export function calculatePrice(inputs: PriceModeInputs): PriceModeResult {
  if (inputs.desiredNetMargin < ZERO || inputs.desiredNetMargin >= 100) {
    return {
      mode: "price",
      requiredSellingPrice: ZERO,
      totalCost: ZERO,
      desiredNetMargin: inputs.desiredNetMargin,
      expectedNetProfit: ZERO,
      expectedROI: ZERO,
      expectedGrossProfit: ZERO,
      validationError: inputs.desiredNetMargin >= 100
        ? "Desired margin must be less than 100%. No finite selling price can satisfy 100% margin with positive costs."
        : "Desired margin cannot be negative.",
    };
  }

  const landedCost = clampFinite(inputs.productCost + inputs.freight + inputs.duty + inputs.packaging);
  const sellingExpenses = clampFinite(inputs.marketplaceFee + inputs.paymentFee + inputs.advertising + inputs.affiliateCommission + inputs.otherExpense);
  const totalCost = clampFinite(landedCost + sellingExpenses);
  const marginDecimal = safeDiv(inputs.desiredNetMargin, 100);
  const denominator = 1 - marginDecimal;

  if (denominator <= ZERO) {
    return {
      mode: "price",
      requiredSellingPrice: ZERO,
      totalCost,
      desiredNetMargin: inputs.desiredNetMargin,
      expectedNetProfit: ZERO,
      expectedROI: ZERO,
      expectedGrossProfit: ZERO,
      validationError: "Desired margin must be less than 100%.",
    };
  }

  const requiredSellingPrice = clampFinite(safeDiv(totalCost, denominator));
  const expectedNetProfit = clampFinite(requiredSellingPrice - totalCost);
  const expectedROI = clampFinite(safePercent(expectedNetProfit, landedCost));
  const expectedGrossProfit = clampFinite(requiredSellingPrice - landedCost);

  return {
    mode: "price",
    requiredSellingPrice,
    totalCost,
    desiredNetMargin: inputs.desiredNetMargin,
    expectedNetProfit,
    expectedROI,
    expectedGrossProfit,
  };
}

export function calculate(inputs: CalculatorInputs): CalculatorResult {
  if (inputs.mode === "profit") {
    return calculateProfit(inputs);
  }
  return calculatePrice(inputs);
}

export const DEFAULT_PROFIT_INPUTS: ProfitModeInputs = {
  mode: "profit",
  sellingPrice: 100,
  productCost: 40,
  freight: 5,
  duty: 3,
  packaging: 2,
  marketplaceFee: 10,
  paymentFee: 3,
  advertising: 8,
  affiliateCommission: 5,
  otherExpense: 2,
  currency: "USD",
};

export const DEFAULT_PRICE_INPUTS: PriceModeInputs = {
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
