/**
 * Rental Property Investment Calculator — "Should I Buy This Rental Property?"
 *
 * Pure, environment-independent financial logic for a short-term rental (STR)
 * purchase analysis. No DOM, no network, no storage: every figure is derived
 * only from the values the user types in, so the module is fully unit-testable
 * in Node and the page can honestly state that inputs never leave the browser.
 *
 * Financial conventions (kept deliberately explicit — this is where quick
 * calculators most often mislead):
 *
 * - NOI (net operating income) = gross operating income − operating expenses.
 *   Operating expenses EXCLUDE debt service, income tax, depreciation and
 *   capital expenditure. The mortgage is a financing cost, never an operating
 *   expense, so changing the loan never changes NOI.
 * - Cash flow = NOI − debt service (principal + interest). This is
 *   before-tax cash flow; the tool does not model income tax.
 * - Total cash invested = down payment + closing costs + furnishing costs.
 *   The loan principal is not "invested cash" — only money the buyer actually
 *   puts in counts. Cash-on-cash return = annual cash flow ÷ cash invested.
 * - Platform and management fees are percentages of gross *rental* revenue
 *   (nightly rate × occupied nights), not of cleaning-fee income.
 * - Cleaning economics are per stay: stays = occupied nights ÷ average stay
 *   length. Cleaning fees charged to guests are income; cleaning costs paid
 *   per turnover are an operating expense. They are never netted silently.
 * - Break-even occupancy solves contribution per occupied night against all
 *   fixed annual costs (fixed operating expenses, plus debt service for the
 *   cash-flow break-even). Variable costs — platform/management percentages
 *   and per-stay cleaning — are inside the per-night contribution, so the
 *   result is exact for this model, not an approximation that ignores fees.
 */

export interface RentalInputs {
  // Purchase & financing
  purchasePrice: number;
  /** Percent of the purchase price, 0–100. */
  downPaymentPercent: number;
  /** Nominal annual mortgage interest rate, percent. */
  interestRatePercent: number;
  loanTermYears: number;
  // Revenue (short-term rental)
  nightlyRate: number;
  /** Percent of available nights booked, 0–100. */
  occupancyPercent: number;
  // Quick-mode operating estimate
  /** Catch-all monthly operating expenses the user has not itemised. */
  monthlyExpenses: number;
  platformFeePercent: number;
  managementFeePercent: number;
  // Advanced — itemised operating expenses
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  utilitiesMonthly: number;
  repairsMonthly: number;
  otherExpensesMonthly: number;
  // Advanced — one-time cash in
  closingCosts: number;
  furnishingCosts: number;
  // Advanced — cleaning economics & availability
  cleaningFeePerStay: number;
  cleaningCostPerStay: number;
  averageStayNights: number;
  availableNightsPerYear: number;
}

export const DEFAULT_RENTAL_INPUTS: RentalInputs = {
  purchasePrice: 350_000,
  downPaymentPercent: 20,
  interestRatePercent: 6.5,
  loanTermYears: 30,
  nightlyRate: 180,
  occupancyPercent: 65,
  monthlyExpenses: 400,
  platformFeePercent: 3,
  managementFeePercent: 10,
  propertyTaxAnnual: 3_500,
  insuranceAnnual: 1_800,
  hoaMonthly: 0,
  utilitiesMonthly: 200,
  repairsMonthly: 150,
  otherExpensesMonthly: 50,
  closingCosts: 7_000,
  furnishingCosts: 15_000,
  cleaningFeePerStay: 120,
  cleaningCostPerStay: 90,
  averageStayNights: 3.5,
  availableNightsPerYear: 365,
};

/** Illustrative-example label shown wherever the defaults are offered. */
export const DEFAULTS_NOTE =
  "The starting figures are an illustrative example (a $350,000 purchase at a $180 nightly rate and 65% occupancy), not market data for any property. Replace every figure with your own.";

// ---------------------------------------------------------------------------
// Sanitisation — the engine never returns NaN/Infinity, whatever it is given.
// ---------------------------------------------------------------------------

function finiteOrZero(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nonNegative(value: number): number {
  return Math.max(0, finiteOrZero(value));
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, finiteOrZero(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finiteOrZero(value)));
}

/** Normalise raw inputs into the ranges the formulas are defined over. */
export function sanitizeRentalInputs(raw: RentalInputs): RentalInputs {
  return {
    purchasePrice: nonNegative(raw.purchasePrice),
    downPaymentPercent: clampPercent(raw.downPaymentPercent),
    interestRatePercent: clamp(raw.interestRatePercent, 0, 100),
    loanTermYears: clamp(raw.loanTermYears, 0, 50),
    nightlyRate: nonNegative(raw.nightlyRate),
    occupancyPercent: clampPercent(raw.occupancyPercent),
    monthlyExpenses: nonNegative(raw.monthlyExpenses),
    platformFeePercent: clampPercent(raw.platformFeePercent),
    managementFeePercent: clampPercent(raw.managementFeePercent),
    propertyTaxAnnual: nonNegative(raw.propertyTaxAnnual),
    insuranceAnnual: nonNegative(raw.insuranceAnnual),
    hoaMonthly: nonNegative(raw.hoaMonthly),
    utilitiesMonthly: nonNegative(raw.utilitiesMonthly),
    repairsMonthly: nonNegative(raw.repairsMonthly),
    otherExpensesMonthly: nonNegative(raw.otherExpensesMonthly),
    closingCosts: nonNegative(raw.closingCosts),
    furnishingCosts: nonNegative(raw.furnishingCosts),
    cleaningFeePerStay: nonNegative(raw.cleaningFeePerStay),
    cleaningCostPerStay: nonNegative(raw.cleaningCostPerStay),
    // A stay shorter than one night is not meaningful; 0 disables cleaning
    // economics entirely (handled in the calculation, warned to the user).
    averageStayNights: nonNegative(raw.averageStayNights),
    availableNightsPerYear: Math.round(clamp(raw.availableNightsPerYear, 0, 365)),
  };
}

// ---------------------------------------------------------------------------
// Validation — out-of-range input must be VISIBLE, never silently clamped.
// The engine still sanitises before calculating (so results stay finite and
// are computed at the nearest valid limit), but every value it had to pull
// back into range is reported here and the UI must display these errors next
// to the field and in a banner above the results.
// ---------------------------------------------------------------------------

export interface RentalFieldError {
  field: keyof RentalInputs;
  message: string;
}

const FIELD_LABELS: Record<keyof RentalInputs, string> = {
  purchasePrice: "Purchase price",
  downPaymentPercent: "Down payment",
  interestRatePercent: "Mortgage interest rate",
  loanTermYears: "Loan term",
  nightlyRate: "Nightly rate",
  occupancyPercent: "Occupancy rate",
  monthlyExpenses: "Monthly expenses",
  platformFeePercent: "Platform fee",
  managementFeePercent: "Management fee",
  propertyTaxAnnual: "Property tax",
  insuranceAnnual: "Insurance",
  hoaMonthly: "HOA dues",
  utilitiesMonthly: "Utilities",
  repairsMonthly: "Repairs & maintenance",
  otherExpensesMonthly: "Other expenses",
  closingCosts: "Closing costs",
  furnishingCosts: "Furnishing & setup",
  cleaningFeePerStay: "Cleaning fee charged",
  cleaningCostPerStay: "Cleaning cost",
  averageStayNights: "Average stay length",
  availableNightsPerYear: "Available rental nights",
};

const PERCENT_FIELDS: (keyof RentalInputs)[] = [
  "downPaymentPercent",
  "interestRatePercent",
  "occupancyPercent",
  "platformFeePercent",
  "managementFeePercent",
];

const NON_NEGATIVE_FIELDS: (keyof RentalInputs)[] = [
  "purchasePrice",
  "nightlyRate",
  "monthlyExpenses",
  "propertyTaxAnnual",
  "insuranceAnnual",
  "hoaMonthly",
  "utilitiesMonthly",
  "repairsMonthly",
  "otherExpensesMonthly",
  "closingCosts",
  "furnishingCosts",
  "cleaningFeePerStay",
  "cleaningCostPerStay",
  "averageStayNights",
];

/** Validate the RAW inputs exactly as entered, before any sanitisation. */
export function validateRentalInputs(raw: RentalInputs): RentalFieldError[] {
  const errors: RentalFieldError[] = [];
  const push = (field: keyof RentalInputs, message: string) => errors.push({ field, message });

  for (const field of PERCENT_FIELDS) {
    const value = raw[field];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      push(field, `${FIELD_LABELS[field]} must be between 0% and 100%. You entered ${String(value)} — results use the nearest limit until this is fixed.`);
    }
  }
  for (const field of NON_NEGATIVE_FIELDS) {
    const value = raw[field];
    if (!Number.isFinite(value) || value < 0) {
      push(field, `${FIELD_LABELS[field]} must not be negative. You entered ${String(value)} — results treat it as $0 until this is fixed.`);
    }
  }
  if (!Number.isFinite(raw.loanTermYears) || raw.loanTermYears < 0 || raw.loanTermYears > 50) {
    push("loanTermYears", `Loan term must be between 0 and 50 years. You entered ${String(raw.loanTermYears)}.`);
  } else if (raw.loanTermYears === 0 && raw.purchasePrice > 0 && raw.downPaymentPercent < 100) {
    push("loanTermYears", "Loan term is 0 years but there is a loan to repay. Choose a term, or set the down payment to 100% for a cash purchase.");
  }
  if (
    !Number.isFinite(raw.availableNightsPerYear) ||
    raw.availableNightsPerYear < 0 ||
    raw.availableNightsPerYear > 365
  ) {
    push("availableNightsPerYear", `Available rental nights must be between 0 and 365. You entered ${String(raw.availableNightsPerYear)} — results use the nearest limit until this is fixed.`);
  }
  const combinedFees = finiteOrZero(raw.platformFeePercent) + finiteOrZero(raw.managementFeePercent);
  if (combinedFees > 100) {
    push(
      "managementFeePercent",
      `Platform and management fees together are ${combinedFees}% of rental revenue — more than the revenue itself. Reduce one of them; every booked night loses money on fees alone until you do.`,
    );
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Mortgage
// ---------------------------------------------------------------------------

/**
 * Standard amortising monthly payment: P · r(1+r)^n / ((1+r)^n − 1),
 * where r is the monthly rate and n the number of payments.
 * A 0% loan divides principal evenly; no loan or no term means no payment.
 */
export function monthlyMortgagePayment(principal: number, annualRatePercent: number, termYears: number): number {
  const loan = nonNegative(principal);
  const years = clamp(termYears, 0, 50);
  if (loan === 0 || years === 0) return 0;
  const payments = Math.round(years * 12);
  if (payments <= 0) return 0;
  const monthlyRate = clamp(annualRatePercent, 0, 100) / 100 / 12;
  if (monthlyRate === 0) return loan / payments;
  const factor = Math.pow(1 + monthlyRate, payments);
  return (loan * monthlyRate * factor) / (factor - 1);
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export interface ExpenseLine {
  label: string;
  /** Annual amount. */
  annual: number;
}

export interface RentalResult {
  // Financing
  downPaymentAmount: number;
  loanAmount: number;
  monthlyMortgagePayment: number;
  annualDebtService: number;
  // Revenue
  occupiedNightsPerYear: number;
  staysPerYear: number;
  grossRentalRevenueAnnual: number;
  cleaningFeeRevenueAnnual: number;
  grossIncomeAnnual: number;
  // Operating expenses (financing excluded — see header)
  platformFeesAnnual: number;
  managementFeesAnnual: number;
  cleaningCostsAnnual: number;
  /** Tax, insurance, HOA, utilities, repairs, quick + other monthly items. */
  fixedOperatingExpensesAnnual: number;
  totalOperatingExpensesAnnual: number;
  operatingExpenseBreakdown: ExpenseLine[];
  // Headline outcomes
  noiAnnual: number;
  noiMonthly: number;
  cashFlowAnnual: number;
  cashFlowMonthly: number;
  totalCashInvested: number;
  /** Null when no cash is invested — a return on zero is undefined, not 0%. */
  cashOnCashPercent: number | null;
  /** NOI ÷ purchase price. Null when the price is 0. */
  capRatePercent: number | null;
  /**
   * Occupancy at which cash flow is exactly zero. Null when it cannot be
   * computed (no available nights, or each occupied night loses money before
   * fixed costs). May exceed 100 — that means break-even is unattainable.
   */
  breakEvenOccupancyPercent: number | null;
  /** Same, but covering operating expenses only (NOI = 0, before financing). */
  breakEvenOccupancyNoiPercent: number | null;
  warnings: string[];
  /**
   * Out-of-range inputs, computed on the values exactly as entered. The
   * figures above are calculated at the nearest valid limit for any field
   * listed here — the UI must show these, never clamp silently.
   */
  validationErrors: RentalFieldError[];
}

export function calculateRental(rawInputs: RentalInputs): RentalResult {
  const validationErrors = validateRentalInputs(rawInputs);
  const inputs = sanitizeRentalInputs(rawInputs);
  const warnings: string[] = [];

  // --- Financing -----------------------------------------------------------
  const downPaymentAmount = (inputs.purchasePrice * inputs.downPaymentPercent) / 100;
  const loanAmount = inputs.purchasePrice - downPaymentAmount;
  const mortgageMonthly = monthlyMortgagePayment(loanAmount, inputs.interestRatePercent, inputs.loanTermYears);
  const annualDebtService = mortgageMonthly * 12;

  // --- Revenue -------------------------------------------------------------
  const occupiedNightsPerYear = (inputs.availableNightsPerYear * inputs.occupancyPercent) / 100;
  const staysPerYear =
    inputs.averageStayNights > 0 ? occupiedNightsPerYear / inputs.averageStayNights : 0;
  const grossRentalRevenueAnnual = inputs.nightlyRate * occupiedNightsPerYear;
  const cleaningFeeRevenueAnnual = inputs.cleaningFeePerStay * staysPerYear;
  const grossIncomeAnnual = grossRentalRevenueAnnual + cleaningFeeRevenueAnnual;

  // --- Operating expenses (debt service is NOT one of these) ---------------
  const platformFeesAnnual = (grossRentalRevenueAnnual * inputs.platformFeePercent) / 100;
  const managementFeesAnnual = (grossRentalRevenueAnnual * inputs.managementFeePercent) / 100;
  const cleaningCostsAnnual = inputs.cleaningCostPerStay * staysPerYear;

  const expenseLines: { label: string; annual: number }[] = [
    { label: "Platform fees", annual: platformFeesAnnual },
    { label: "Management fees", annual: managementFeesAnnual },
    { label: "Cleaning costs", annual: cleaningCostsAnnual },
    { label: "Property tax", annual: inputs.propertyTaxAnnual },
    { label: "Insurance", annual: inputs.insuranceAnnual },
    { label: "HOA dues", annual: inputs.hoaMonthly * 12 },
    { label: "Utilities", annual: inputs.utilitiesMonthly * 12 },
    { label: "Repairs & maintenance", annual: inputs.repairsMonthly * 12 },
    { label: "Monthly expenses (quick estimate)", annual: inputs.monthlyExpenses * 12 },
    { label: "Other expenses", annual: inputs.otherExpensesMonthly * 12 },
  ];
  const fixedOperatingExpensesAnnual =
    inputs.propertyTaxAnnual +
    inputs.insuranceAnnual +
    inputs.hoaMonthly * 12 +
    inputs.utilitiesMonthly * 12 +
    inputs.repairsMonthly * 12 +
    inputs.monthlyExpenses * 12 +
    inputs.otherExpensesMonthly * 12;
  const totalOperatingExpensesAnnual =
    platformFeesAnnual + managementFeesAnnual + cleaningCostsAnnual + fixedOperatingExpensesAnnual;

  // --- Headline outcomes -----------------------------------------------------
  const noiAnnual = grossIncomeAnnual - totalOperatingExpensesAnnual;
  const cashFlowAnnual = noiAnnual - annualDebtService;
  const totalCashInvested = downPaymentAmount + inputs.closingCosts + inputs.furnishingCosts;

  const cashOnCashPercent =
    totalCashInvested > 0 ? (cashFlowAnnual / totalCashInvested) * 100 : null;
  const capRatePercent =
    inputs.purchasePrice > 0 ? (noiAnnual / inputs.purchasePrice) * 100 : null;

  // --- Break-even occupancy --------------------------------------------------
  // Contribution per occupied night: what one more booked night adds after
  // the costs that scale with bookings (fee percentages on the nightly rate,
  // cleaning in/out spread over the stay).
  const variableFeeRate = (inputs.platformFeePercent + inputs.managementFeePercent) / 100;
  const cleaningSpreadPerNight =
    inputs.averageStayNights > 0
      ? (inputs.cleaningFeePerStay - inputs.cleaningCostPerStay) / inputs.averageStayNights
      : 0;
  const contributionPerNight = inputs.nightlyRate * (1 - variableFeeRate) + cleaningSpreadPerNight;

  const breakEvenFor = (fixedAnnual: number): number | null => {
    if (inputs.availableNightsPerYear <= 0) return null;
    if (contributionPerNight <= 0) return null;
    if (fixedAnnual <= 0) return 0;
    return (fixedAnnual / contributionPerNight / inputs.availableNightsPerYear) * 100;
  };
  const breakEvenOccupancyPercent = breakEvenFor(fixedOperatingExpensesAnnual + annualDebtService);
  const breakEvenOccupancyNoiPercent = breakEvenFor(fixedOperatingExpensesAnnual);

  // --- Warnings the UI must surface rather than bury -------------------------
  if (inputs.purchasePrice <= 0) warnings.push("Enter a purchase price to get a meaningful analysis.");
  if (inputs.nightlyRate <= 0) warnings.push("Enter a nightly rate — with no rental income every outcome is negative.");
  if (inputs.availableNightsPerYear <= 0) warnings.push("Available rental nights are set to 0, so no rental income is modelled.");
  if (inputs.averageStayNights <= 0 && (inputs.cleaningFeePerStay > 0 || inputs.cleaningCostPerStay > 0)) {
    warnings.push("Average stay length is 0, so cleaning fees and costs are excluded. Set an average stay to include cleaning economics.");
  }
  if (totalCashInvested <= 0) warnings.push("Total cash invested is $0, so cash-on-cash return cannot be calculated.");
  if (breakEvenOccupancyPercent !== null && breakEvenOccupancyPercent > 100) {
    warnings.push("Break-even occupancy is above 100% — on these assumptions the property cannot cover its costs and mortgage even if every available night is booked.");
  }
  if (breakEvenOccupancyPercent === null && inputs.availableNightsPerYear > 0 && inputs.nightlyRate > 0) {
    warnings.push("Break-even occupancy cannot be calculated because each occupied night loses money after platform/management fees and cleaning costs, before fixed costs.");
  }

  return {
    downPaymentAmount,
    loanAmount,
    monthlyMortgagePayment: mortgageMonthly,
    annualDebtService,
    occupiedNightsPerYear,
    staysPerYear,
    grossRentalRevenueAnnual,
    cleaningFeeRevenueAnnual,
    grossIncomeAnnual,
    platformFeesAnnual,
    managementFeesAnnual,
    cleaningCostsAnnual,
    fixedOperatingExpensesAnnual,
    totalOperatingExpensesAnnual,
    operatingExpenseBreakdown: expenseLines,
    noiAnnual,
    noiMonthly: noiAnnual / 12,
    cashFlowAnnual,
    cashFlowMonthly: cashFlowAnnual / 12,
    totalCashInvested,
    cashOnCashPercent,
    capRatePercent,
    breakEvenOccupancyPercent,
    breakEvenOccupancyNoiPercent,
    warnings,
    validationErrors,
  };
}

// ---------------------------------------------------------------------------
// Scenarios — sensitivity, not a forecast. The three bands differ ONLY in
// nightly rate and occupancy, so a reader can see exactly what changed.
// ---------------------------------------------------------------------------

export interface RentalScenario {
  id: "conservative" | "base" | "optimistic";
  label: string;
  /** Plain-language statement of what this scenario assumes. */
  assumption: string;
  nightlyRate: number;
  occupancyPercent: number;
  result: RentalResult;
}

export const SCENARIO_RATE_DELTA = 0.1; // ±10% nightly rate
export const SCENARIO_OCCUPANCY_DELTA = 10; // ±10 percentage points

export function buildScenarios(rawInputs: RentalInputs): RentalScenario[] {
  const inputs = sanitizeRentalInputs(rawInputs);
  const make = (
    id: RentalScenario["id"],
    label: string,
    assumption: string,
    nightlyRate: number,
    occupancyPercent: number,
  ): RentalScenario => {
    const scenarioInputs: RentalInputs = {
      ...inputs,
      nightlyRate: Math.max(0, nightlyRate),
      occupancyPercent: Math.min(100, Math.max(0, occupancyPercent)),
    };
    return {
      id,
      label,
      assumption,
      nightlyRate: scenarioInputs.nightlyRate,
      occupancyPercent: scenarioInputs.occupancyPercent,
      result: calculateRental(scenarioInputs),
    };
  };

  return [
    make(
      "conservative",
      "Conservative",
      `Nightly rate 10% lower (${formatUSD(inputs.nightlyRate * (1 - SCENARIO_RATE_DELTA))}) and occupancy 10 points lower. Every expense, fee and the mortgage stay exactly as entered.`,
      inputs.nightlyRate * (1 - SCENARIO_RATE_DELTA),
      inputs.occupancyPercent - SCENARIO_OCCUPANCY_DELTA,
    ),
    make(
      "base",
      "Your assumptions",
      "Exactly the figures you entered — nothing adjusted.",
      inputs.nightlyRate,
      inputs.occupancyPercent,
    ),
    make(
      "optimistic",
      "Optimistic",
      `Nightly rate 10% higher (${formatUSD(inputs.nightlyRate * (1 + SCENARIO_RATE_DELTA))}) and occupancy 10 points higher (capped at 100%). Every expense, fee and the mortgage stay exactly as entered.`,
      inputs.nightlyRate * (1 + SCENARIO_RATE_DELTA),
      inputs.occupancyPercent + SCENARIO_OCCUPANCY_DELTA,
    ),
  ];
}

// ---------------------------------------------------------------------------
// Preliminary assessment — describes the numbers, never recommends a purchase.
// ---------------------------------------------------------------------------

export type AssessmentBand = "positive" | "neutral" | "negative" | "insufficient";

export interface RentalAssessment {
  band: AssessmentBand;
  headline: string;
  explanation: string;
}

/** Monthly cash flow within ±$50 of zero reads as break-even, not a signal. */
export const NEUTRAL_CASH_FLOW_BAND = 50;

export function assessRental(inputs: RentalInputs, result: RentalResult): RentalAssessment {
  const clean = sanitizeRentalInputs(inputs);
  if (clean.purchasePrice <= 0 || clean.nightlyRate <= 0 || clean.availableNightsPerYear <= 0) {
    return {
      band: "insufficient",
      headline: "Not enough information yet",
      explanation:
        "A purchase price, a nightly rate and at least one available rental night are needed before any preliminary assessment can be made.",
    };
  }
  if (result.cashFlowMonthly > NEUTRAL_CASH_FLOW_BAND) {
    return {
      band: "positive",
      headline: "Positive cash flow on the assumptions entered",
      explanation:
        `On your figures the property covers its operating expenses and mortgage with ${formatUSD(result.cashFlowMonthly)} per month to spare, before income tax, major repairs and any costs you have not entered. That is a preliminary reading of your assumptions — not a recommendation to buy. Small changes to occupancy or nightly rate can move this result; check the conservative scenario before relying on it.`,
    };
  }
  if (result.cashFlowMonthly < -NEUTRAL_CASH_FLOW_BAND) {
    return {
      band: "negative",
      headline: "Negative cash flow on the assumptions entered",
      explanation:
        `On your figures the property falls ${formatUSD(Math.abs(result.cashFlowMonthly))} per month short of covering its operating expenses and mortgage, before income tax and any costs you have not entered. That does not automatically rule the property out — appreciation, loan pay-down or a lower purchase price may still matter to you — but the shortfall would need funding from elsewhere. This is a preliminary reading of your assumptions, not advice to walk away.`,
    };
  }
  return {
    band: "neutral",
    headline: "Roughly break-even on the assumptions entered",
    explanation:
      "On your figures the property lands within $50 a month of covering its operating expenses and mortgage. At break-even there is no cushion: one slow month, one repair or a small rate change decides whether the year ends positive. Treat this as finely balanced rather than safe, and check the conservative scenario.",
  };
}

// ---------------------------------------------------------------------------
// Formatting (USD only — this tool is built for US investors)
// ---------------------------------------------------------------------------

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCentsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUSD(value: number, options?: { cents?: boolean }): string {
  if (!Number.isFinite(value)) return "—";
  return (options?.cents ? usdCentsFormatter : usdFormatter).format(value);
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}
