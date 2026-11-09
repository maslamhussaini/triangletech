/**
 * Airbnb Booking Profit Calculator — pure financial logic.
 *
 * Calculates the CONTRIBUTION from one individual guest booking: what the
 * booking brings in, minus the costs that exist because this booking exists
 * (platform and management fees, cleaning, supplies, other per-booking
 * costs). Contribution is deliberately NOT called profit: fixed property
 * costs (mortgage or rent, property tax, insurance, baseline utilities),
 * debt service and income taxes are all excluded, and the UI says so.
 *
 * Fee base — labelled everywhere this module is used:
 * platform and management fees are percentages of GROSS BOOKING REVENUE
 * (accommodation revenue + guest cleaning fee + additional booking charges).
 * That is the convention this calculator is specified to use. Real platform
 * fee structures vary by listing, market and host settings (split guest/host
 * fees vs host-only fees, and what the fee is charged on), so no percentage
 * here is presented as an official Airbnb rate — users enter the percentages
 * from their own payout summary.
 *
 * Pass-through taxes (occupancy / lodging taxes collected from the guest
 * for a tax authority) are excluded from revenue entirely: they are not the
 * host's money. Users are told not to enter them as additional charges.
 *
 * Validation follows the same rule as the rental calculator: out-of-range
 * input is reported in `validationErrors` computed on the raw values, and
 * the figures are calculated at the nearest valid limit — never silently.
 */

export interface BookingInputs {
  nightlyRate: number;
  nightsBooked: number;
  /** Cleaning fee charged to the guest for this booking (income). */
  guestCleaningFee: number;
  /** Other guest charges for this booking, excluding pass-through taxes. */
  additionalCharges: number;
  platformFeePercent: number;
  managementFeePercent: number;
  /** What cleaning this booking actually cost the host (expense). */
  cleaningExpense: number;
  suppliesExpense: number;
  otherCosts: number;
}

/**
 * The worked example used across the page and the tests:
 * $150/night × 3 nights, $75 guest cleaning fee, 3% platform fee,
 * 20% management fee, $60 actual cleaning, $15 supplies.
 * Gross $525 → platform $15.75, management $105 → contribution $329.25.
 */
export const DEFAULT_BOOKING_INPUTS: BookingInputs = {
  nightlyRate: 150,
  nightsBooked: 3,
  guestCleaningFee: 75,
  additionalCharges: 0,
  platformFeePercent: 3,
  managementFeePercent: 20,
  cleaningExpense: 60,
  suppliesExpense: 15,
  otherCosts: 0,
};

export const BOOKING_DEFAULTS_NOTE =
  "The starting figures are a worked example ($150 a night for 3 nights), not rates for any real listing. Replace every figure with the ones from your own booking and payout summary.";

// ---------------------------------------------------------------------------
// Validation (on the raw, as-entered values)
// ---------------------------------------------------------------------------

export interface BookingFieldError {
  field: keyof BookingInputs;
  message: string;
}

const FIELD_LABELS: Record<keyof BookingInputs, string> = {
  nightlyRate: "Nightly rate",
  nightsBooked: "Nights booked",
  guestCleaningFee: "Guest cleaning fee",
  additionalCharges: "Additional booking charges",
  platformFeePercent: "Platform fee",
  managementFeePercent: "Management fee",
  cleaningExpense: "Actual cleaning expense",
  suppliesExpense: "Supplies expense",
  otherCosts: "Other booking-specific costs",
};

const MONEY_FIELDS: (keyof BookingInputs)[] = [
  "nightlyRate",
  "guestCleaningFee",
  "additionalCharges",
  "cleaningExpense",
  "suppliesExpense",
  "otherCosts",
];

const PERCENT_FIELDS: (keyof BookingInputs)[] = ["platformFeePercent", "managementFeePercent"];

export function validateBookingInputs(raw: BookingInputs): BookingFieldError[] {
  const errors: BookingFieldError[] = [];
  const push = (field: keyof BookingInputs, message: string) => errors.push({ field, message });

  for (const field of MONEY_FIELDS) {
    const value = raw[field];
    if (!Number.isFinite(value) || value < 0) {
      push(field, `${FIELD_LABELS[field]} must not be negative. You entered ${String(value)} — results treat it as $0 until this is fixed.`);
    }
  }
  for (const field of PERCENT_FIELDS) {
    const value = raw[field];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      push(field, `${FIELD_LABELS[field]} must be between 0% and 100%. You entered ${String(value)} — results use the nearest limit until this is fixed.`);
    }
  }
  if (!Number.isFinite(raw.nightsBooked) || raw.nightsBooked < 1) {
    push("nightsBooked", `Nights booked must be at least 1 for a booking. You entered ${String(raw.nightsBooked)}.`);
  } else if (!Number.isInteger(raw.nightsBooked)) {
    push("nightsBooked", `Nights booked must be a whole number. You entered ${String(raw.nightsBooked)} — results round it until this is fixed.`);
  }
  const combinedFees =
    (Number.isFinite(raw.platformFeePercent) ? raw.platformFeePercent : 0) +
    (Number.isFinite(raw.managementFeePercent) ? raw.managementFeePercent : 0);
  if (combinedFees > 100) {
    push(
      "managementFeePercent",
      `Platform and management fees together are ${combinedFees}% of gross booking revenue — more than the booking brings in. Reduce one of them.`,
    );
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Sanitisation — defense in depth so results are always finite.
// ---------------------------------------------------------------------------

function finiteOrZero(value: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function sanitizeBookingInputs(raw: BookingInputs): BookingInputs {
  const percent = (value: number) => Math.min(100, Math.max(0, finiteOrZero(value)));
  const money = (value: number) => Math.max(0, finiteOrZero(value));
  return {
    nightlyRate: money(raw.nightlyRate),
    nightsBooked: Math.max(0, Math.round(finiteOrZero(raw.nightsBooked))),
    guestCleaningFee: money(raw.guestCleaningFee),
    additionalCharges: money(raw.additionalCharges),
    platformFeePercent: percent(raw.platformFeePercent),
    managementFeePercent: percent(raw.managementFeePercent),
    cleaningExpense: money(raw.cleaningExpense),
    suppliesExpense: money(raw.suppliesExpense),
    otherCosts: money(raw.otherCosts),
  };
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export interface BookingCostLine {
  label: string;
  amount: number;
}

export interface BookingResult {
  accommodationRevenue: number;
  grossBookingRevenue: number;
  platformFeeAmount: number;
  managementFeeAmount: number;
  totalVariableCosts: number;
  netContribution: number;
  /** Net contribution ÷ gross booking revenue. Null when gross is $0. */
  contributionMarginPercent: number | null;
  /** Net contribution ÷ nights booked. Null when nights are 0. */
  contributionPerNight: number | null;
  costBreakdown: BookingCostLine[];
  validationErrors: BookingFieldError[];
}

export function calculateBooking(rawInputs: BookingInputs): BookingResult {
  const validationErrors = validateBookingInputs(rawInputs);
  const inputs = sanitizeBookingInputs(rawInputs);

  const accommodationRevenue = inputs.nightlyRate * inputs.nightsBooked;
  const grossBookingRevenue =
    accommodationRevenue + inputs.guestCleaningFee + inputs.additionalCharges;

  // Fee base: GROSS booking revenue (see header). Labelled in the UI.
  const platformFeeAmount = (grossBookingRevenue * inputs.platformFeePercent) / 100;
  const managementFeeAmount = (grossBookingRevenue * inputs.managementFeePercent) / 100;

  const costBreakdown: BookingCostLine[] = [
    { label: "Platform fee", amount: platformFeeAmount },
    { label: "Management fee", amount: managementFeeAmount },
    { label: "Cleaning expense", amount: inputs.cleaningExpense },
    { label: "Supplies", amount: inputs.suppliesExpense },
    { label: "Other booking costs", amount: inputs.otherCosts },
  ];
  const totalVariableCosts = costBreakdown.reduce((sum, line) => sum + line.amount, 0);
  const netContribution = grossBookingRevenue - totalVariableCosts;

  return {
    accommodationRevenue,
    grossBookingRevenue,
    platformFeeAmount,
    managementFeeAmount,
    totalVariableCosts,
    netContribution,
    contributionMarginPercent:
      grossBookingRevenue > 0 ? (netContribution / grossBookingRevenue) * 100 : null,
    contributionPerNight: inputs.nightsBooked > 0 ? netContribution / inputs.nightsBooked : null,
    costBreakdown,
    validationErrors,
  };
}
