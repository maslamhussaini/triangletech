import { describe, expect, it } from "vitest";
import {
  parseDirectHours,
  parseMultiplier,
  parseNonNegativeInt,
  parseRateDollars,
  parseThresholdHours,
  validateClientForm,
  validateSessionForm,
} from "./forms";

describe("forms: rate parsing (visible errors, never silent clamping)", () => {
  it("parses dollars and cents to whole cents", () => {
    expect(parseRateDollars("50")).toEqual({ ok: true, cents: 5000 });
    expect(parseRateDollars("50.25")).toEqual({ ok: true, cents: 5025 });
    expect(parseRateDollars("12.5")).toEqual({ ok: true, cents: 1250 });
  });

  it("rejects three-decimal rates instead of rounding them", () => {
    const r = parseRateDollars("12.345");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("12.345");
  });

  it("rejects negative rates, text, and empty input with a visible error", () => {
    expect(parseRateDollars("-5").ok).toBe(false);
    expect(parseRateDollars("fifty").ok).toBe(false);
    expect(parseRateDollars("").ok).toBe(false);
    expect(parseRateDollars("50,00").ok).toBe(false);
  });
});

describe("forms: integer and hours parsing", () => {
  it("parses break minutes as whole numbers only", () => {
    expect(parseNonNegativeInt("30", "Break")).toEqual({ ok: true, value: 30 });
    expect(parseNonNegativeInt("0", "Break")).toEqual({ ok: true, value: 0 });
    expect(parseNonNegativeInt("30.5", "Break").ok).toBe(false);
    expect(parseNonNegativeInt("-5", "Break").ok).toBe(false);
    expect(parseNonNegativeInt("", "Break").ok).toBe(false);
  });

  it("parses direct hours as decimal fractions of an hour", () => {
    expect(parseDirectHours("7.5")).toEqual({ ok: true, hours: 7.5 });
    expect(parseDirectHours("0").ok).toBe(false);
    expect(parseDirectHours("25").ok).toBe(false);
    expect(parseDirectHours("7,5").ok).toBe(false);
  });

  it("parses overtime multiplier and threshold within their ranges", () => {
    expect(parseMultiplier("1.5")).toEqual({ ok: true, value: 1.5 });
    expect(parseMultiplier("0.5").ok).toBe(false);
    expect(parseMultiplier("6").ok).toBe(false);
    expect(parseThresholdHours("40")).toEqual({ ok: true, value: 40 });
    expect(parseThresholdHours("0").ok).toBe(false);
    expect(parseThresholdHours("169").ok).toBe(false);
  });
});

describe("forms: session validation", () => {
  const base = {
    clientId: "c-1",
    date: "2026-11-02",
    mode: "times" as const,
    startTime: "09:00",
    endTime: "17:30",
    endsNextDay: false,
    breakMinutes: 30,
  };

  it("accepts a valid times-mode session", () => {
    expect(validateSessionForm(base)).toEqual([]);
  });

  it("accepts an overnight shift only with ends-next-day", () => {
    const overnight = { ...base, startTime: "22:00", endTime: "06:00" };
    expect(validateSessionForm(overnight)).not.toHaveLength(0);
    expect(validateSessionForm({ ...overnight, endsNextDay: true })).toEqual([]);
  });

  it("rejects a break as long as the shift instead of silently shortening it", () => {
    const errors = validateSessionForm({ ...base, startTime: "09:00", endTime: "09:30", breakMinutes: 30 });
    expect(errors.join(" ")).toContain("Break");
  });

  it("rejects an unparseable start time with the value in the message", () => {
    const errors = validateSessionForm({ ...base, startTime: "nine" });
    expect(errors.join(" ")).toContain("nine");
  });

  it("rejects a missing client and an invalid date", () => {
    expect(validateSessionForm({ ...base, clientId: "" })).not.toHaveLength(0);
    expect(validateSessionForm({ ...base, date: "2026-13-02" })).not.toHaveLength(0);
  });

  it("validates direct-hours mode", () => {
    expect(validateSessionForm({ ...base, mode: "direct", directHours: 7.5 })).toEqual([]);
    expect(validateSessionForm({ ...base, mode: "direct", directHours: 0 })).not.toHaveLength(0);
    expect(validateSessionForm({ ...base, mode: "direct", directHours: 25 })).not.toHaveLength(0);
  });
});

describe("forms: client validation", () => {
  const base = { name: "Acme", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14 };

  it("accepts a valid client", () => {
    expect(validateClientForm(base)).toEqual([]);
  });

  it("requires a name and a currency", () => {
    expect(validateClientForm({ ...base, name: "  " })).not.toHaveLength(0);
    expect(validateClientForm({ ...base, currency: "" })).not.toHaveLength(0);
  });

  it("validates overtime settings only when overtime is on", () => {
    expect(validateClientForm({ ...base, overtimeEnabled: true, overtimeThresholdHours: 40, overtimeMultiplier: 1.5 })).toEqual([]);
    expect(validateClientForm({ ...base, overtimeEnabled: true, overtimeThresholdHours: 0, overtimeMultiplier: 1.5 })).not.toHaveLength(0);
    expect(validateClientForm({ ...base, overtimeEnabled: true, overtimeThresholdHours: 40, overtimeMultiplier: 0.5 })).not.toHaveLength(0);
    // Off: absent/invalid overtime fields are not errors.
    expect(validateClientForm({ ...base, overtimeEnabled: false })).toEqual([]);
  });
});
