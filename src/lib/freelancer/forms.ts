/**
 * Freelancer Time & Invoice — form parsing + validation (M2).
 *
 * Rule (standing owner preference): invalid input produces a VISIBLE
 * validation error — never a silent clamp, silent default, or silent
 * reinterpretation of what the user typed. Every parser below returns
 * either a value or a human-readable error; the UI shows the error next
 * to the field and refuses to save. Nothing here guesses: "12.345"
 * dollars, a negative break, or an end time before the start time are
 * all errors, not rounded/floored/fixed values.
 */
import { isValidDateString, parseTimeToMinutes } from "@/lib/tools/time-card";

/** Parse a dollars-and-cents rate ("50", "50.00", "12.5") to whole cents. */
export function parseRateDollars(text: string): { ok: true; cents: number } | { ok: false; error: string } {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: "Enter an hourly rate, or leave the rate empty for no rate." };
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return { ok: false, error: `"${raw}" is not a valid rate. Use dollars and cents, e.g. 50 or 50.25.` };
  }
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isFinite(cents) || cents < 0) return { ok: false, error: "The rate must be zero or more." };
  return { ok: true, cents };
}

/** Format whole cents as dollars ("50.00") for editing. */
export function formatRateDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

/** Parse a non-negative integer field (break minutes, payment terms). */
export function parseNonNegativeInt(
  text: string,
  label: string
): { ok: true; value: number } | { ok: false; error: string } {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: `${label} is required.` };
  if (!/^\d+$/.test(raw)) return { ok: false, error: `${label} must be a whole number of ${label === "Break" ? "minutes" : "days"} — "${raw}" is not.` };
  return { ok: true, value: Number(raw) };
}

/** Parse direct hours ("7.5" = 7h 30m — decimals are fractions of an hour, never HH.MM). */
export function parseDirectHours(text: string): { ok: true; hours: number } | { ok: false; error: string } {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: "Enter the hours worked, e.g. 7.5." };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, error: `"${raw}" is not a valid number of hours. Use a decimal, e.g. 7.5 for 7 hours 30 minutes.` };
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) return { ok: false, error: "Hours must be more than 0." };
  if (hours > 24) return { ok: false, error: "Hours must be 24 or fewer for one day." };
  return { ok: true, hours };
}

/** Parse an overtime multiplier ("1.5"). Range 1–5, per the model. */
export function parseMultiplier(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: "Enter the overtime multiplier, e.g. 1.5." };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, error: `"${raw}" is not a valid multiplier.` };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 5) return { ok: false, error: "The multiplier must be between 1 and 5." };
  return { ok: true, value };
}

/** Parse an overtime threshold in hours (0 < h ≤ 168). */
export function parseThresholdHours(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const raw = text.trim();
  if (raw === "") return { ok: false, error: "Enter the overtime threshold in hours, e.g. 40." };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, error: `"${raw}" is not a valid number of hours.` };
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 168) return { ok: false, error: "The threshold must be more than 0 and no more than 168 hours." };
  return { ok: true, value };
}

export type SessionFormInput = {
  clientId: string;
  projectId?: string;
  date: string;
  mode: "times" | "direct";
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  breakMinutes: number;
  directHours?: number;
  notes?: string;
};

/**
 * Validate a session form (already-parsed field values). Returns the list
 * of problems; empty = valid. Times-mode rules mirror the engine's own
 * checks: end after start (or ends-next-day), break shorter than the
 * shift. The engine is still the authority on the final numbers — this
 * is the UI's early, field-level feedback.
 */
export function validateSessionForm(input: SessionFormInput): string[] {
  const errors: string[] = [];
  if (!input.clientId) errors.push("Choose a client for this session.");
  if (!isValidDateString(input.date)) errors.push("Choose a valid date.");
  if (input.mode === "direct") {
    if (input.directHours === undefined || !Number.isFinite(input.directHours) || input.directHours <= 0) {
      errors.push("Enter the hours worked (more than 0).");
    } else if (input.directHours > 24) {
      errors.push("Direct hours must be 24 or fewer for one day.");
    }
    return errors;
  }
  const start = parseTimeToMinutes(input.startTime);
  const end = parseTimeToMinutes(input.endTime);
  if (start === null) errors.push(`Start time "${input.startTime}" is not a valid time (e.g. 09:00).`);
  if (end === null) errors.push(`End time "${input.endTime}" is not a valid time (e.g. 17:30).`);
  if (start !== null && end !== null) {
    const gross = input.endsNextDay ? end + 1440 - start : end - start;
    if (gross <= 0) {
      errors.push(
        input.endsNextDay
          ? "End time must differ from the start time — a shift cannot be zero minutes."
          : "End time must be after the start time, or tick “Ends next day” for an overnight shift."
      );
    } else if (input.breakMinutes < 0) {
      errors.push("Break minutes cannot be negative.");
    } else if (input.breakMinutes >= gross) {
      errors.push(`Break (${input.breakMinutes} min) must be shorter than the shift (${gross} min) — otherwise no paid time remains.`);
    }
  }
  return errors;
}

export type ClientFormInput = {
  name: string;
  currency: string;
  defaultRateCents: number;
  paymentTermsDays: number;
  email?: string;
  address?: string;
  notes?: string;
  overtimeEnabled?: boolean;
  overtimeThresholdHours?: number;
  overtimeMultiplier?: number;
};

/** Validate a client form (already-parsed field values). */
export function validateClientForm(input: ClientFormInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Enter a client name.");
  if (!input.currency.trim()) errors.push("Enter a currency code, e.g. USD.");
  if (!Number.isInteger(input.defaultRateCents) || input.defaultRateCents < 0) {
    errors.push("The default hourly rate must be zero or more.");
  }
  if (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0) {
    errors.push("Payment terms must be a whole number of days, zero or more.");
  }
  if (input.overtimeEnabled) {
    if (input.overtimeThresholdHours === undefined || input.overtimeThresholdHours <= 0 || input.overtimeThresholdHours > 168) {
      errors.push("The overtime threshold must be more than 0 and no more than 168 hours.");
    }
    if (input.overtimeMultiplier === undefined || input.overtimeMultiplier < 1 || input.overtimeMultiplier > 5) {
      errors.push("The overtime multiplier must be between 1 and 5.");
    }
  }
  return errors;
}
