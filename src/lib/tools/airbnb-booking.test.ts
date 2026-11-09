import { describe, expect, it } from "vitest";

import {
  calculateBooking,
  sanitizeBookingInputs,
  validateBookingInputs,
  DEFAULT_BOOKING_INPUTS,
  type BookingInputs,
} from "@/lib/tools/airbnb-booking";

const zero: BookingInputs = {
  nightlyRate: 0,
  nightsBooked: 0,
  guestCleaningFee: 0,
  additionalCharges: 0,
  platformFeePercent: 0,
  managementFeePercent: 0,
  cleaningExpense: 0,
  suppliesExpense: 0,
  otherCosts: 0,
};

describe("mandatory accuracy fixture", () => {
  it("reproduces the specified booking exactly", () => {
    // Nightly $150 × 3 nights; cleaning fee $75; platform 3%; management 20%;
    // actual cleaning $60; supplies $15; everything else $0.
    const result = calculateBooking({
      nightlyRate: 150,
      nightsBooked: 3,
      guestCleaningFee: 75,
      additionalCharges: 0,
      platformFeePercent: 3,
      managementFeePercent: 20,
      cleaningExpense: 60,
      suppliesExpense: 15,
      otherCosts: 0,
    });
    expect(result.accommodationRevenue).toBe(450);
    expect(result.grossBookingRevenue).toBe(525);
    expect(result.platformFeeAmount).toBe(15.75);
    expect(result.managementFeeAmount).toBe(105);
    expect(result.totalVariableCosts).toBe(195.75);
    expect(result.netContribution).toBe(329.25);
    expect(result.contributionPerNight).toBe(109.75);
    expect(result.contributionMarginPercent).toBeCloseTo((329.25 / 525) * 100, 6);
    expect(result.validationErrors).toEqual([]);
  });

  it("the shipped defaults are exactly this worked example", () => {
    const result = calculateBooking(DEFAULT_BOOKING_INPUTS);
    expect(result.grossBookingRevenue).toBe(525);
    expect(result.netContribution).toBe(329.25);
  });
});

describe("formula structure", () => {
  it("gross revenue is accommodation + cleaning fee + additional charges", () => {
    const result = calculateBooking({
      ...zero,
      nightlyRate: 200,
      nightsBooked: 2,
      guestCleaningFee: 50,
      additionalCharges: 30,
    });
    expect(result.accommodationRevenue).toBe(400);
    expect(result.grossBookingRevenue).toBe(480);
  });

  it("fees are charged on GROSS revenue, including the cleaning fee", () => {
    // Accommodation $200 + cleaning fee $50 = $250 gross; 10% platform fee
    // must be $25 (on gross), not $20 (on accommodation only).
    const result = calculateBooking({
      ...zero,
      nightlyRate: 100,
      nightsBooked: 2,
      guestCleaningFee: 50,
      platformFeePercent: 10,
    });
    expect(result.platformFeeAmount).toBe(25);
    expect(result.managementFeeAmount).toBe(0);
  });

  it("contribution goes negative when per-booking costs exceed revenue", () => {
    const result = calculateBooking({
      ...zero,
      nightlyRate: 80,
      nightsBooked: 1,
      cleaningExpense: 120,
    });
    expect(result.netContribution).toBe(-40);
    expect(result.contributionPerNight).toBe(-40);
    expect(result.contributionMarginPercent).toBeCloseTo(-50, 6);
  });

  it("cost breakdown sums to total variable costs", () => {
    const result = calculateBooking(DEFAULT_BOOKING_INPUTS);
    const sum = result.costBreakdown.reduce((total, line) => total + line.amount, 0);
    expect(sum).toBeCloseTo(result.totalVariableCosts, 6);
  });
});

describe("boundaries", () => {
  it("zero gross revenue gives a null margin, not NaN or 0%", () => {
    const result = calculateBooking({ ...zero, nightsBooked: 2, cleaningExpense: 50 });
    expect(result.grossBookingRevenue).toBe(0);
    expect(result.contributionMarginPercent).toBeNull();
    expect(result.netContribution).toBe(-50);
    expect(result.contributionPerNight).toBe(-25);
  });

  it("zero nights gives a null per-night figure", () => {
    const result = calculateBooking({ ...zero, guestCleaningFee: 75 });
    expect(result.contributionPerNight).toBeNull();
  });

  it("never returns NaN or Infinity for non-finite inputs", () => {
    const result = calculateBooking({
      ...zero,
      nightlyRate: Number.NaN,
      nightsBooked: Number.POSITIVE_INFINITY,
      platformFeePercent: Number.NaN,
    });
    for (const value of Object.values(result)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
    expect(result.grossBookingRevenue).toBe(0);
  });

  it("is deterministic", () => {
    expect(calculateBooking(DEFAULT_BOOKING_INPUTS)).toEqual(calculateBooking({ ...DEFAULT_BOOKING_INPUTS }));
  });
});

describe("visible validation", () => {
  it("accepts the worked example with no errors", () => {
    expect(validateBookingInputs(DEFAULT_BOOKING_INPUTS)).toEqual([]);
  });

  it("flags negative amounts, out-of-range percents and bad nights by field", () => {
    const errors = validateBookingInputs({
      ...DEFAULT_BOOKING_INPUTS,
      nightlyRate: -10,
      platformFeePercent: 140,
      nightsBooked: 0,
    });
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("nightlyRate");
    expect(fields).toContain("platformFeePercent");
    expect(fields).toContain("nightsBooked");
    expect(calculateBooking({ ...DEFAULT_BOOKING_INPUTS, platformFeePercent: 140 }).validationErrors.length)
      .toBeGreaterThan(0);
  });

  it("flags fractional nights and combined fees above 100%", () => {
    const fractional = validateBookingInputs({ ...DEFAULT_BOOKING_INPUTS, nightsBooked: 2.5 });
    expect(fractional.some((e) => e.field === "nightsBooked" && e.message.includes("whole number"))).toBe(true);
    // Fractional nights are rounded only after being flagged.
    expect(sanitizeBookingInputs({ ...DEFAULT_BOOKING_INPUTS, nightsBooked: 2.5 }).nightsBooked).toBe(3);

    const combined = validateBookingInputs({
      ...DEFAULT_BOOKING_INPUTS,
      platformFeePercent: 60,
      managementFeePercent: 55,
    });
    expect(combined.some((e) => e.field === "managementFeePercent" && e.message.includes("115%"))).toBe(true);
  });

  it("calculates at the nearest limit while flagging the error", () => {
    const result = calculateBooking({ ...DEFAULT_BOOKING_INPUTS, platformFeePercent: 140 });
    expect(result.platformFeeAmount).toBe(525); // 100% of gross, the clamped limit
    expect(result.validationErrors.some((e) => e.field === "platformFeePercent")).toBe(true);
  });
});
