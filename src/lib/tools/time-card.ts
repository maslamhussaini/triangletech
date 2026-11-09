/**
 * Work Hours & Time Card Calculator — pure calculation module.
 *
 * No UI, no exports, no storage here. Every duration is computed in integer
 * minutes; decimal hours and money are derived only for display.
 *
 * DOCUMENTED RULES (shown in the UI, not hidden):
 * - An end time that is not after its start time is an ERROR, not an
 *   overnight shift. The user must check "Ends next day" explicitly.
 * - Overnight minutes are split at midnight, so each date (and each
 *   workweek) only counts the minutes that actually fall on that date.
 * - Unpaid break minutes for an overnight session are allocated across its
 *   midnight segments in proportion to each segment's length (integer
 *   minutes, remainder carried to the earliest segments). The allocation is
 *   reported per segment in the result, so it is an explicit rule, not a
 *   silent guess about where the break was taken. ASSUMPTION LIMIT: when
 *   that split crosses a workweek boundary, it can change weekly overtime;
 *   the engine therefore emits a "break-allocation-overtime" warning and
 *   the UI shows it above the results. An exact result in that case
 *   requires splitting the shift at midnight into two sessions with each
 *   part's actual break minutes — there is no per-segment break input,
 *   so the split session is the explicit-allocation mechanism.
 * - Weekly overtime is evaluated separately for each workweek. A biweekly
 *   period never uses a single 80-hour threshold.
 * - Money: rate is converted to whole cents, then
 *   payCents = round((regularMinutes * rateCents
 *     + overtimeMinutes * rateCents * multiplier) / 60)
 *   (half-up for positive amounts via Math.round). Pay is always labelled
 *   "estimated gross pay": no tax, payroll, or labor-law claim is made.
 * - No rounding of punches: exact minutes are used, no 15-minute rounding.
 * - Invalid rows are reported, never silently clamped or dropped.
 */

export type PeriodKind = "weekly" | "biweekly";
export type DateFormat = "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";

/** Entry mode for one session row. "times" is the original start/end
 *  mode; "hours" is a direct paid-hours entry. Absent means "times"
 *  (older saved timesheets predate the field). */
export type EntryMode = "times" | "hours";

export type SessionInput = {
  id: string;
  date: string; // YYYY-MM-DD, the day the shift starts (hours mode: the day the hours count toward)
  start: string; // HH:MM or 12-hour text, e.g. "9:00 AM" ("" when mode is "hours")
  end: string; // "" when mode is "hours"
  endsNextDay: boolean; // false when mode is "hours": no overnight split is invented
  breakMinutes: number; // 0 when mode is "hours": hours are already net of unpaid breaks
  /** Entry mode. Absent means "times" (older saved timesheets). */
  mode?: EntryMode;
  /** Direct paid hours, as integer minutes. Only meaningful when mode is "hours". */
  paidMinutes?: number;
  employee?: string;
  project?: string;
};

/**
 * Convert direct decimal hours to integer minutes with an explicit
 * nearest-minute rule (half-up via Math.round). Returns null for
 * negative, non-finite, zero, or over-24-hour values. Decimals are
 * fractions of an hour: 7.30 means 7.3 hours = 7h 18m, never 7h 30m.
 */
/** Decimal hours -> integer minutes with the nearest-minute rule.
 * No range check here: NaN and out-of-range values pass through so
 * the caller's validation can report the exact problem. */
export function decimalHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function directHoursToMinutes(hours: number): number | null {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return null;
  return decimalHoursToMinutes(hours);
}

export type TimesheetError = { sessionId?: string; row?: number; message: string; code?: string };
export type TimesheetWarning = { sessionId?: string; row?: number; message: string; code?: string };

export type SegmentAllocation = {
  date: string;
  grossMinutes: number;
  breakMinutes: number;
  paidMinutes: number;
  inPeriod: boolean;
};

export type SessionResult = {
  session: SessionInput;
  grossMinutes: number;
  paidMinutes: number;
  segments: SegmentAllocation[];
};

export type DayResult = {
  date: string;
  paidMinutes: number;
  sessionCount: number;
};

export type WeekResult = {
  index: number; // 0-based within the period
  startDate: string;
  endDate: string;
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  payCents: number | null;
};

export type TimesheetInput = {
  weekStart: string; // YYYY-MM-DD, first day of the first workweek
  period: PeriodKind;
  sessions: SessionInput[];
  hourlyRate?: number | null;
  currency?: string;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
};

export type TimesheetResult = {
  periodStart: string;
  periodEnd: string; // inclusive
  days: DayResult[];
  weeks: WeekResult[];
  sessions: SessionResult[];
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  payCents: number | null;
  errors: TimesheetError[];
  warnings: TimesheetWarning[];
  outOfPeriodPaidMinutes: number;
  outOfPeriodDetails: string[];
  /** Structured form of outOfPeriodDetails, for translated rendering (dates/minutes, no English sentence). */
  outOfPeriodSegments: { paidMinutes: number; sessionDate: string; segmentDate: string }[];
};

/* ---------- date / time helpers ---------- */

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Days since 1970-01-01 (UTC). Only called with validated dates. */
export function dateOrdinal(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function ordinalToDate(ordinal: number): string {
  const dt = new Date(ordinal * 86400000);
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return ordinalToDate(dateOrdinal(date) + days);
}

/** Accepts "09:00", "9:00", "9:00 AM", "9am", "21:30". Returns minutes since midnight, or null. */
export function parseTimeToMinutes(value: string): number | null {
  const raw = value.trim().toLowerCase().replace(/\s+/g, " ");
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?$/) ?? raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3] as string | undefined;
  if (minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "p" && hour !== 12) hour += 12;
    if (meridiem === "a" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime(minutes: number, hour12: boolean): string {
  if (!hour12) return minutesToHHMM(minutes);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function decimalHours(minutes: number): number {
  return minutes / 60;
}

export function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

export function formatMoney(cents: number | null, currency = "USD"): string {
  if (cents === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

/** Excel serial date (days since 1899-12-30, with the 1900 leap-year bug baked in) -> YYYY-MM-DD. */
export function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 80000) return null;
  const whole = Math.floor(serial);
  return ordinalToDate(whole - 25569);
}

export function excelSerialToTimeMinutes(serial: number): number {
  const frac = serial - Math.floor(serial);
  return Math.round(frac * 1440) % 1440;
}

/** Parse a date cell under an explicit format. Ambiguous slash dates follow the chosen format exactly. */
export function parseDateCell(value: unknown, format: DateFormat): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const datePart = excelSerialToDate(value);
    return datePart;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && isValidDateString(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const year = Number(slash[3]);
    const month = format === "MM/DD/YYYY" ? a : format === "DD/MM/YYYY" ? b : null;
    const day = format === "MM/DD/YYYY" ? b : format === "DD/MM/YYYY" ? a : null;
    if (month === null || day === null) return null;
    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidDateString(candidate) ? candidate : null;
  }
  // A bare Excel serial in text form.
  if (/^\d{5}(\.\d+)?$/.test(raw)) return excelSerialToDate(Number(raw));
  return null;
}

/** Parse a time cell: text, or an Excel time fraction (0..1), or an Excel datetime serial. */
export function parseTimeCell(value: unknown): { minutes: number; dateFromSerial?: string } | null {
  if (typeof value === "number") {
    if (value >= 0 && value < 1) return { minutes: Math.round(value * 1440) % 1440 };
    if (value >= 1 && value < 80000) {
      return { minutes: excelSerialToTimeMinutes(value), dateFromSerial: excelSerialToDate(value) ?? undefined };
    }
    return null;
  }
  if (typeof value === "string") {
    const parsed = parseTimeToMinutes(value);
    return parsed === null ? null : { minutes: parsed };
  }
  return null;
}

function parseBreakCell(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const raw = String(value).trim().replace(/m(in)?$/i, "");
  if (!/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Parse a paid-hours cell for import. Numbers are decimal hours as-is.
 * Strings accept a single dot or comma decimal separator and an
 * optional trailing "h" (e.g. "7.5", "7,5", "7.5h"). Returns null for
 * empty cells (absent column value) and "malformed" for non-empty
 * cells that are not a number. The result is integer minutes via
 * directHoursToMinutes, so over-24 and non-positive values are
 * distinguished from malformed ones by the caller checking the
 * returned kind.
 */
export function parsePaidHoursCell(value: unknown): { kind: "empty" } | { kind: "ok"; hours: number; minutes: number } | { kind: "malformed" } | { kind: "out-of-range" } {
  if (value === "" || value === null || value === undefined) return { kind: "empty" };
  if (typeof value === "number") {
    const minutes = directHoursToMinutes(value);
    if (minutes === null) return { kind: "out-of-range" };
    return { kind: "ok", hours: value, minutes };
  }
  const raw = String(value).trim().replace(/\s*h$/i, "");
  if (!raw) return { kind: "empty" };
  // A readable but non-positive number is out of range, not malformed.
  if (/^-\d/.test(raw)) return { kind: "out-of-range" };
  // One comma as decimal separator when no dot is present ("7,5").
  const normalized = raw.includes(".") ? raw : raw.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { kind: "malformed" };
  const hours = Number(normalized);
  const minutes = directHoursToMinutes(hours);
  if (minutes === null) return { kind: "out-of-range" };
  return { kind: "ok", hours, minutes };
}

function parseNextDayCell(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const raw = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "overnight", "next day", "ends next day"].includes(raw);
}

/* ---------- core calculation ---------- */

export function calculateTimesheet(input: TimesheetInput): TimesheetResult {
  const errors: TimesheetError[] = [];
  const warnings: TimesheetWarning[] = [];
  const periodDays = input.period === "biweekly" ? 14 : 7;
  const thresholdMinutes = Math.round(input.overtimeThresholdHours * 60);

  if (!isValidDateString(input.weekStart)) {
    errors.push({ code: "invalid-week-start", message: "Week-start date is invalid. Pick a valid calendar date." });
  }
  if (!(input.overtimeThresholdHours > 0) || input.overtimeThresholdHours > 168 || !Number.isFinite(input.overtimeThresholdHours)) {
    errors.push({ code: "invalid-threshold", message: "Weekly overtime threshold must be more than 0 and no more than 168 hours." });
  }
  if (!(input.overtimeMultiplier >= 1) || input.overtimeMultiplier > 5 || !Number.isFinite(input.overtimeMultiplier)) {
    errors.push({ code: "invalid-multiplier", message: "Overtime multiplier must be at least 1 and no more than 5." });
  }
  if (input.hourlyRate !== null && input.hourlyRate !== undefined && (!Number.isFinite(input.hourlyRate) || input.hourlyRate < 0)) {
    errors.push({ code: "negative-rate", message: "Hourly rate cannot be negative." });
  }
  const settingsValid = errors.length === 0;
  const periodStart = isValidDateString(input.weekStart) ? input.weekStart : "1970-01-01";
  const periodStartOrdinal = dateOrdinal(periodStart);
  const periodEnd = addDays(periodStart, periodDays - 1);
  const periodEndOrdinal = periodStartOrdinal + periodDays - 1;

  type Expanded = { session: SessionInput; startAbs: number; endAbs: number; gross: number };
  const expanded: Expanded[] = [];
  /** Hours-mode rows validated so far, in input order (processed after times rows). */
  const hoursCandidates: { session: SessionInput; paid: number }[] = [];

  for (const session of input.sessions) {
    if (session.mode === "hours") {
      // Direct paid-hours entry: no start/end times, no overnight
      // split, no break deduction (hours are already net). Only the
      // value itself is validated here; day-level guards (mixed mode,
      // daily 24-hour cap) run after times rows are expanded.
      if (!isValidDateString(session.date)) {
        errors.push({ sessionId: session.id, code: "invalid-date", message: `Session on "${session.date}" has an invalid date.` });
        continue;
      }
      const paid = session.paidMinutes;
      if (paid === undefined) {
        errors.push({ sessionId: session.id, code: "hours-incomplete", message: `Hours-only entry on ${session.date} has no hours value. Enter the paid hours worked.` });
        continue;
      }
      if (!Number.isFinite(paid) || !Number.isInteger(paid)) {
        errors.push({ sessionId: session.id, code: "hours-malformed", message: `Hours-only entry on ${session.date} could not be read as a whole number of minutes.` });
        continue;
      }
      if (paid <= 0) {
        errors.push({ sessionId: session.id, code: "hours-non-positive", message: `Hours-only entry on ${session.date} must be more than 0 hours.` });
        continue;
      }
      if (paid > 1440) {
        errors.push({ sessionId: session.id, code: "hours-over-24h", message: `Hours-only entry on ${session.date} exceeds 24 hours in a day.` });
        continue;
      }
      hoursCandidates.push({ session, paid });
      continue;
    }
    if (!isValidDateString(session.date)) {
      errors.push({ sessionId: session.id, code: "invalid-date", message: `Session on "${session.date}" has an invalid date.` });
      continue;
    }
    const startMin = parseTimeToMinutes(session.start);
    const endMin = parseTimeToMinutes(session.end);
    if (startMin === null || endMin === null) {
      errors.push({ sessionId: session.id, code: "incomplete-session", message: `Session on ${session.date} is incomplete: enter both a start time and an end time.` });
      continue;
    }
    const startAbs = dateOrdinal(session.date) * 1440 + startMin;
    let endAbs: number;
    if (session.endsNextDay) {
      endAbs = (dateOrdinal(session.date) + 1) * 1440 + endMin;
    } else {
      endAbs = dateOrdinal(session.date) * 1440 + endMin;
      if (endAbs <= startAbs) {
        errors.push({
          sessionId: session.id,
          code: "ends-before-start",
          message: `Session on ${session.date} (${session.start}–${session.end}) ends before it starts. Check "Ends next day" if this shift runs overnight; it is not assumed.`,
        });
        continue;
      }
    }
    const gross = endAbs - startAbs;
    if (gross <= 0) {
      errors.push({ sessionId: session.id, code: "no-duration", message: `Session on ${session.date} has no duration.` });
      continue;
    }
    if (!Number.isFinite(session.breakMinutes) || session.breakMinutes < 0) {
      errors.push({ sessionId: session.id, code: "negative-break", message: `Session on ${session.date} has a negative unpaid break.` });
      continue;
    }
    if (session.breakMinutes >= gross) {
      errors.push({
        sessionId: session.id,
        code: "break-too-long",
        message: `Session on ${session.date} has an unpaid break (${session.breakMinutes} minutes) that is not shorter than the shift itself (${gross} minutes). Reduce the break or fix the times.`,
      });
      continue;
    }
    expanded.push({ session, startAbs, endAbs, gross });
  }

  // Overlap detection on the absolute timeline (catches overnight collisions with the next day).
  const sorted = [...expanded].sort((a, b) => a.startAbs - b.startAbs);
  const overlappedIds = new Set<string>();
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startAbs < sorted[i - 1].endAbs) {
      errors.push({
        sessionId: sorted[i].session.id,
        code: "overlap",
        message: `Session on ${sorted[i].session.date} (${sorted[i].session.start}–${sorted[i].session.end}) overlaps another session. Overlapping sessions are not counted.`,
      });
      overlappedIds.add(sorted[i].session.id);
    }
  }

  const dayTotals = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  const sessionResults: SessionResult[] = [];
  let outOfPeriodPaidMinutes = 0;
  const outOfPeriodDetails: string[] = [];
  const outOfPeriodSegments: { paidMinutes: number; sessionDate: string; segmentDate: string }[] = [];

  for (const item of expanded) {
    if (overlappedIds.has(item.session.id)) continue;
    // Split at midnight boundaries.
    const rawSegments: { date: string; gross: number }[] = [];
    let cursor = item.startAbs;
    while (cursor < item.endAbs) {
      const dayOrdinal = Math.floor(cursor / 1440);
      const dayEnd = (dayOrdinal + 1) * 1440;
      const segEnd = Math.min(dayEnd, item.endAbs);
      rawSegments.push({ date: ordinalToDate(dayOrdinal), gross: segEnd - cursor });
      cursor = segEnd;
    }
    // Proportional break allocation (integer minutes, remainder to earliest segments).
    const segments: SegmentAllocation[] = [];
    let allocatedSoFar = 0;
    rawSegments.forEach((seg, idx) => {
      const cumGross = rawSegments.slice(0, idx + 1).reduce((s, r) => s + r.gross, 0);
      const target = Math.floor((item.session.breakMinutes * cumGross) / item.gross);
      const segBreak = target - allocatedSoFar;
      allocatedSoFar = target;
      const paid = seg.gross - segBreak;
      const ordinal = dateOrdinal(seg.date);
      const inPeriod = ordinal >= periodStartOrdinal && ordinal <= periodEndOrdinal;
      segments.push({ date: seg.date, grossMinutes: seg.gross, breakMinutes: segBreak, paidMinutes: paid, inPeriod });
      if (!inPeriod) {
        outOfPeriodPaidMinutes += paid;
        outOfPeriodSegments.push({ paidMinutes: paid, sessionDate: item.session.date, segmentDate: seg.date });
        outOfPeriodDetails.push(
          `${formatDuration(paid)} of the ${item.session.date} shift falls on ${seg.date}, outside the ${input.period} period starting ${periodStart}, and is excluded from the totals.`
        );
      } else {
        dayTotals.set(seg.date, (dayTotals.get(seg.date) ?? 0) + paid);
        dayCounts.set(seg.date, (dayCounts.get(seg.date) ?? 0) + 1);
      }
    });
    // Fix any rounding residue on the last segment (floor method already sums exactly, but guard anyway).
    const allocatedTotal = segments.reduce((s, r) => s + r.breakMinutes, 0);
    if (allocatedTotal !== item.session.breakMinutes && segments.length > 0) {
      const diff = item.session.breakMinutes - allocatedTotal;
      const last = segments[segments.length - 1];
      last.breakMinutes += diff;
      last.paidMinutes -= diff;
    }
    sessionResults.push({ session: item.session, grossMinutes: item.gross, paidMinutes: item.gross - item.session.breakMinutes, segments });
    // Explicit-allocation requirement: when an overnight session's break
    // allocation crosses a workweek boundary, the assumed proportional
    // split can change weekly overtime, so the result must not be
    // presented as exact. Warn visibly; the exact route is to split the
    // shift at midnight into two sessions with each part's real break.
    if (item.session.breakMinutes > 0 && segments.length > 1) {
      const weekIndexes = new Set(segments.map(seg => Math.floor((dateOrdinal(seg.date) - periodStartOrdinal) / 7)));
      if (weekIndexes.size > 1) {
        warnings.push({
          sessionId: item.session.id,
          code: "break-allocation-overtime",
          message: `Overnight break allocation is assumed, not exact: the ${item.session.breakMinutes}m unpaid break on the ${item.session.date} shift crosses a workweek boundary and was split across midnight in proportion to each day's length. That split can change weekly overtime. For an exact result, split the shift at midnight into two sessions and enter each part's actual break minutes.`,
        });
      }
    }
  }

  // Hours-only entries, after times rows: one segment on the entry
  // date, never split at midnight, never break-deducted. Day-level
  // guards: a date must not mix entry modes, and hours-only entries
  // on one date must not total more than 24 hours. Guarded rows are
  // excluded and reported, never silently merged or double-counted.
  const timesDates = new Set<string>();
  for (const sr of sessionResults) {
    for (const seg of sr.segments) if (seg.inPeriod) timesDates.add(seg.date);
  }
  const hoursDaySums = new Map<string, number>();
  for (const { session, paid } of hoursCandidates) {
    const ordinal = dateOrdinal(session.date);
    const inPeriod = ordinal >= periodStartOrdinal && ordinal <= periodEndOrdinal;
    if (inPeriod && timesDates.has(session.date)) {
      errors.push({
        sessionId: session.id,
        code: "mixed-mode-day",
        message: `Day ${session.date} mixes start/end sessions with hours-only entries. The hours-only entries on this day are not counted. Use one entry mode per day.`,
      });
      continue;
    }
    if (inPeriod) {
      const sum = (hoursDaySums.get(session.date) ?? 0) + paid;
      if (sum > 1440) {
        errors.push({
          sessionId: session.id,
          code: "day-over-24h",
          message: `Hours-only entries on ${session.date} add up to more than 24 hours. Reduce them so the day totals 24 hours or less.`,
        });
        continue;
      }
      hoursDaySums.set(session.date, sum);
      dayTotals.set(session.date, (dayTotals.get(session.date) ?? 0) + paid);
      dayCounts.set(session.date, (dayCounts.get(session.date) ?? 0) + 1);
    } else {
      outOfPeriodPaidMinutes += paid;
      outOfPeriodSegments.push({ paidMinutes: paid, sessionDate: session.date, segmentDate: session.date });
      outOfPeriodDetails.push(
        `${formatDuration(paid)} of hours-only time entered for ${session.date} falls outside the ${input.period} period starting ${periodStart}, and is excluded from the totals.`
      );
    }
    sessionResults.push({
      session,
      grossMinutes: paid,
      paidMinutes: paid,
      segments: [{ date: session.date, grossMinutes: paid, breakMinutes: 0, paidMinutes: paid, inPeriod }],
    });
  }

  const days: DayResult[] = [];
  for (let i = 0; i < periodDays; i++) {
    const date = addDays(periodStart, i);
    days.push({ date, paidMinutes: dayTotals.get(date) ?? 0, sessionCount: dayCounts.get(date) ?? 0 });
  }

  const rateCents = input.hourlyRate === null || input.hourlyRate === undefined ? null : Math.round(input.hourlyRate * 100);
  const weeks: WeekResult[] = [];
  let totalMinutes = 0;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let payCents: number | null = null;
  if (settingsValid) {
    for (let w = 0; w < periodDays / 7; w++) {
      const weekDays = days.slice(w * 7, w * 7 + 7);
      const weekTotal = weekDays.reduce((s, d) => s + d.paidMinutes, 0);
      const regular = Math.min(weekTotal, thresholdMinutes);
      const overtime = weekTotal - regular;
      const weekPay = rateCents === null ? null : Math.round((regular * rateCents + overtime * rateCents * input.overtimeMultiplier) / 60);
      weeks.push({
        index: w,
        startDate: weekDays[0].date,
        endDate: weekDays[weekDays.length - 1].date,
        totalMinutes: weekTotal,
        regularMinutes: regular,
        overtimeMinutes: overtime,
        payCents: weekPay,
      });
      totalMinutes += weekTotal;
      regularMinutes += regular;
      overtimeMinutes += overtime;
    }
    payCents = rateCents === null ? null : weeks.reduce((s, wk) => s + (wk.payCents ?? 0), 0);
  } else {
    for (let w = 0; w < periodDays / 7; w++) {
      const weekDays = days.slice(w * 7, w * 7 + 7);
      weeks.push({ index: w, startDate: weekDays[0].date, endDate: weekDays[weekDays.length - 1].date, totalMinutes: 0, regularMinutes: 0, overtimeMinutes: 0, payCents: null });
    }
  }

  return {
    periodStart,
    periodEnd,
    days,
    weeks,
    sessions: sessionResults,
    totalMinutes,
    regularMinutes,
    overtimeMinutes,
    payCents,
    errors,
    warnings,
    outOfPeriodPaidMinutes,
    outOfPeriodDetails,
    outOfPeriodSegments,
  };
}

/* ---------- CSV parsing / export ---------- */

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n") {
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ""));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type ImportField = "date" | "start" | "end" | "break" | "nextDay" | "employee" | "project" | "paidHours";
export type ColumnMapping = Partial<Record<ImportField, number>>;

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  date: ["date", "day", "work date", "shift date"],
  start: ["start", "start time", "clock in", "in", "from"],
  end: ["end", "end time", "clock out", "out", "to"],
  break: ["break", "unpaid break", "break minutes", "unpaid break minutes", "break min"],
  nextDay: ["next day", "ends next day", "overnight", "nextday", "ends nextday"],
  employee: ["employee", "name", "employee name", "worker", "staff"],
  project: ["project", "job", "client", "task"],
  paidHours: ["paid hours", "paid hours worked", "hours worked", "worked hours", "hours", "paid time", "decimal hours"],
};

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  (Object.keys(HEADER_SYNONYMS) as ImportField[]).forEach(field => {
    const idx = normalized.findIndex(h => HEADER_SYNONYMS[field].includes(h));
    if (idx >= 0) mapping[field] = idx;
  });
  return mapping;
}

export type ImportedRow = {
  rowNumber: number;
  session: SessionInput | null;
  errors: string[];
  warnings: string[];
  /** Parallel to errors/warnings: translation codes (tc.err.* / tc.warn.*), "" when none. */
  errorCodes: string[];
  warningCodes: string[];
  errorDetails: string[];
  /** Set when the row contains both usable times and usable paid hours: the user must choose. */
  conflict?: ImportConflict;
};

/**
 * One row that contains both a usable start/end pair and a usable
 * paid-hours value. Neither interpretation is applied automatically:
 * the wizard must ask the user to choose, so a row is never counted
 * twice. A candidate is null when that side itself is invalid; the
 * user can only choose a valid candidate.
 */
export type ImportConflict = {
  rowNumber: number;
  date: string;
  timesSession: SessionInput | null;
  timesErrors: string[];
  timesErrorCodes: string[];
  hoursSession: SessionInput;
};

export function parseImportedRows(
  rows: unknown[][],
  opts: { dateFormat: DateFormat; mapping: ColumnMapping; hasHeader: boolean }
): { sessions: SessionInput[]; rows: ImportedRow[]; conflicts: ImportConflict[]; employees: string[]; errors: TimesheetError[]; warnings: TimesheetWarning[] } {
  const errors: TimesheetError[] = [];
  const warnings: TimesheetWarning[] = [];
  const imported: ImportedRow[] = [];
  const conflicts: ImportConflict[] = [];
  const employeeSet = new Set<string>();
  const dataRows = opts.hasHeader ? rows.slice(1) : rows;
  if (dataRows.length > 2000) {
    errors.push({ code: "import-row-limit", message: "Import is limited to 2,000 rows. Split the file and try again." });
    return { sessions: [], rows: imported, conflicts, employees: [], errors, warnings };
  }
  const seen = new Set<string>();
  const parsedSessions: { session: SessionInput; rowNumber: number }[] = [];
  /** Decided modes per date, for mixed-mode warnings (conflict rows are undecided and skipped). */
  const decidedModes = new Map<string, Set<EntryMode>>();

  const noteMixedMode = (date: string, mode: EntryMode, rowWarnings: string[], rowWarningCodes: string[]) => {
    const modes = decidedModes.get(date) ?? new Set<EntryMode>();
    if (modes.size > 0 && !modes.has(mode)) {
      rowWarnings.push(`Date ${date} already has ${mode === "hours" ? "start/end" : "hours-only"} entries in this import. Mixed entry modes on one day are not counted together.`);
      rowWarningCodes.push("import-mixed-mode-day");
    }
    modes.add(mode);
    decidedModes.set(date, modes);
  };

  dataRows.forEach((row, idx) => {
    const rowNumber = (opts.hasHeader ? 2 : 1) + idx;
    const get = (field: ImportField): unknown => {
      const col = opts.mapping[field];
      if (col === undefined || col < 0 || col >= row.length) return "";
      return row[col] ?? "";
    };
    const isCellEmpty = (v: unknown) => v === "" || v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const rowErrorCodes: string[] = [];
    const rowWarningCodes: string[] = [];
    const rowErrorDetails: string[] = [];
    const date = parseDateCell(get("date"), opts.dateFormat);
    if (!date) { rowErrors.push(`Date "${String(get("date"))}" could not be read in ${opts.dateFormat} format.`); rowErrorCodes.push("import-date-unreadable"); rowErrorDetails.push(String(get("date"))); }
    // Times side: present when either time cell is non-empty. Absent
    // cells are fine for a pure hours-only row; a half-present side
    // is an error, never a guess.
    const startCell = get("start");
    const endCell = get("end");
    const timesPresent = !isCellEmpty(startCell) || !isCellEmpty(endCell);
    const startParsed = timesPresent ? parseTimeCell(startCell) : null;
    const endParsed = timesPresent ? parseTimeCell(endCell) : null;
    if (timesPresent && !startParsed) { rowErrors.push(`Start time "${String(startCell)}" could not be read.`); rowErrorCodes.push("import-start-unreadable"); rowErrorDetails.push(String(startCell)); }
    if (timesPresent && !endParsed) { rowErrors.push(`End time "${String(endCell)}" could not be read.`); rowErrorCodes.push("import-end-unreadable"); rowErrorDetails.push(String(endCell)); }
    const breakMinutes = parseBreakCell(get("break"));
    if (breakMinutes === null) { rowErrors.push(`Unpaid break "${String(get("break"))}" must be a whole number of minutes.`); rowErrorCodes.push("import-break-not-integer"); rowErrorDetails.push(String(get("break"))); }
    // Hours side: a malformed or out-of-range value is always an
    // error, even when a valid times side exists — silently ignoring
    // entered data would hide a file problem.
    const paidParsed = parsePaidHoursCell(get("paidHours"));
    if (paidParsed.kind === "malformed") { rowErrors.push(`Paid hours "${String(get("paidHours"))}" could not be read as a number of hours.`); rowErrorCodes.push("import-paid-hours-malformed"); rowErrorDetails.push(String(get("paidHours"))); }
    if (paidParsed.kind === "out-of-range") { rowErrors.push(`Paid hours "${String(get("paidHours"))}" must be more than 0 and no more than 24.`); rowErrorCodes.push("import-paid-hours-out-of-range"); rowErrorDetails.push(String(get("paidHours"))); }
    const hoursPresent = paidParsed.kind === "ok";
    const employee = String(get("employee")).trim();
    const project = String(get("project")).trim();
    if (employee) employeeSet.add(employee);

    let session: SessionInput | null = null;
    let conflict: ImportConflict | undefined;
    if (date && rowErrors.length === 0) {
      if (timesPresent && hoursPresent && startParsed && endParsed && breakMinutes !== null && paidParsed.kind === "ok") {
        // Both sides usable: offer the choice, apply neither yet.
        const sessionDate = startParsed.dateFromSerial ?? date;
        const timesCandidate: SessionInput = {
          id: `import-${rowNumber}`,
          date: sessionDate,
          start: minutesToHHMM(startParsed.minutes),
          end: minutesToHHMM(endParsed.minutes),
          endsNextDay: parseNextDayCell(get("nextDay")),
          breakMinutes,
          employee: employee || undefined,
          project: project || undefined,
        };
        const check = calculateTimesheet({
          weekStart: sessionDate,
          period: "weekly",
          sessions: [timesCandidate],
          overtimeThresholdHours: 40,
          overtimeMultiplier: 1.5,
        });
        const hoursCandidate: SessionInput = {
          id: `import-${rowNumber}`,
          date,
          mode: "hours",
          start: "",
          end: "",
          endsNextDay: false,
          breakMinutes: 0,
          paidMinutes: paidParsed.minutes,
          employee: employee || undefined,
          project: project || undefined,
        };
        if (check.errors.length === 0) {
          conflict = {
            rowNumber,
            date,
            timesSession: timesCandidate,
            timesErrors: [],
            timesErrorCodes: [],
            hoursSession: hoursCandidate,
          };
          rowWarnings.push("This row contains both paid hours and start/end times. Choose one interpretation; the row is never counted twice.");
          rowWarningCodes.push("import-conflict");
        } else {
          // Times side is broken: the row cannot be imported as times.
          // Hours side is usable, so still offer the choice, but only
          // the hours candidate is choosable.
          conflict = {
            rowNumber,
            date,
            timesSession: null,
            timesErrors: check.errors.map(e => e.message),
            timesErrorCodes: check.errors.map(e => e.code ?? ""),
            hoursSession: hoursCandidate,
          };
          rowWarnings.push("This row contains both paid hours and start/end times. Choose one interpretation; the row is never counted twice.");
          rowWarningCodes.push("import-conflict");
        }
        conflicts.push(conflict);
      } else if (timesPresent && startParsed && endParsed && breakMinutes !== null) {
        const startStr = minutesToHHMM(startParsed.minutes);
        const endStr = minutesToHHMM(endParsed.minutes);
        const sessionDate = startParsed.dateFromSerial ?? date;
        session = {
          id: `import-${rowNumber}`,
          date: sessionDate,
          start: startStr,
          end: endStr,
          endsNextDay: parseNextDayCell(get("nextDay")),
          breakMinutes,
          employee: employee || undefined,
          project: project || undefined,
        };
        // Validate duration / break / overnight rules with the same rules as manual entry.
        const check = calculateTimesheet({
          weekStart: sessionDate,
          period: "weekly",
          sessions: [session],
          overtimeThresholdHours: 40,
          overtimeMultiplier: 1.5,
        });
        check.errors.forEach(e => { rowErrors.push(e.message); rowErrorCodes.push(e.code ?? ""); rowErrorDetails.push(""); });
        if (rowErrors.length === 0) {
          const key = [session.date, session.start, session.end, session.breakMinutes].join("|");
          if (seen.has(key)) { rowWarnings.push("This row duplicates an earlier imported row."); rowWarningCodes.push("duplicate-row"); }
          seen.add(key);
          noteMixedMode(session.date, "times", rowWarnings, rowWarningCodes);
        }
      } else if (hoursPresent && paidParsed.kind === "ok") {
        session = {
          id: `import-${rowNumber}`,
          date,
          mode: "hours",
          start: "",
          end: "",
          endsNextDay: false,
          breakMinutes: 0,
          paidMinutes: paidParsed.minutes,
          employee: employee || undefined,
          project: project || undefined,
        };
        const key = [session.date, `hours:${paidParsed.minutes}`].join("|");
        if (seen.has(key)) { rowWarnings.push("This row duplicates an earlier imported row."); rowWarningCodes.push("duplicate-row"); }
        seen.add(key);
        noteMixedMode(session.date, "hours", rowWarnings, rowWarningCodes);
      } else if (!timesPresent && !hoursPresent) {
        rowErrors.push("Row has neither start/end times nor paid hours. Enter one entry mode per row.");
        rowErrorCodes.push("import-no-entry");
        rowErrorDetails.push("");
      }
    }
    if (session && rowErrors.length === 0) parsedSessions.push({ session, rowNumber });
    imported.push({ rowNumber, session: rowErrors.length === 0 && !conflict ? session : null, errors: rowErrors, warnings: rowWarnings, errorCodes: rowErrorCodes, warningCodes: rowWarningCodes, errorDetails: rowErrorDetails, conflict });
    rowErrors.forEach((m, i) => errors.push({ row: rowNumber, message: m, code: rowErrorCodes[i] || undefined }));
    rowWarnings.forEach((m, i) => warnings.push({ row: rowNumber, message: m, code: rowWarningCodes[i] || undefined }));
  });

  // Overlap warnings across otherwise-valid imported rows.
  const overlapCheck = calculateTimesheet({
    weekStart: parsedSessions[0]?.session.date ?? "1970-01-01",
    period: "weekly",
    sessions: parsedSessions.map(p => p.session),
    overtimeThresholdHours: 40,
    overtimeMultiplier: 1.5,
  });
  // Overlap errors from a single-week check are only advisory here because
  // imported rows may span weeks; the main calculator re-validates on confirm.
  void overlapCheck;

  return { sessions: parsedSessions.map(p => p.session), rows: imported, conflicts, employees: [...employeeSet], errors, warnings };
}

/** Neutralize spreadsheet formula injection: a leading = + - @ (or tab/CR) is quoted with a leading apostrophe. */
export function escapeCsvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function buildTimesheetCsv(result: TimesheetResult, meta: { employee?: string; business?: string; project?: string; currency?: string }): string {
  const lines: string[][] = [];
  // CSV headers stay English (as before) so files stay importable
  // under the header synonyms. Hours-only rows show "Hours only"
  // with blank start/end/next-day/break cells and their decimal
  // hours in "Paid hours", so a re-import reads them back as
  // hours-only rows instead of conflicting with empty times.
  lines.push(["Date", "Entry mode", "Start", "End", "Ends next day", "Unpaid break (minutes)", "Paid hours", "Paid minutes", "Paid time", "Paid decimal hours"]);
  result.sessions.forEach(s => {
    const hoursMode = s.session.mode === "hours";
    lines.push([
      s.session.date,
      hoursMode ? "Hours only" : "Start / End",
      hoursMode ? "" : s.session.start,
      hoursMode ? "" : s.session.end,
      hoursMode ? "" : s.session.endsNextDay ? "Yes" : "No",
      hoursMode ? "" : String(s.session.breakMinutes),
      hoursMode ? formatDecimalHours(s.paidMinutes) : "",
      String(s.paidMinutes),
      formatDuration(s.paidMinutes),
      formatDecimalHours(s.paidMinutes),
    ]);
  });
  lines.push([]);
  lines.push(["Summary", "Value"]);
  lines.push(["Period start", result.periodStart]);
  lines.push(["Period end", result.periodEnd]);
  if (meta.employee) lines.push(["Employee", meta.employee]);
  if (meta.business) lines.push(["Business", meta.business]);
  if (meta.project) lines.push(["Project", meta.project]);
  lines.push(["Total hours", formatDuration(result.totalMinutes)]);
  lines.push(["Total decimal hours", formatDecimalHours(result.totalMinutes)]);
  lines.push(["Regular hours", formatDuration(result.regularMinutes)]);
  lines.push(["Overtime hours", formatDuration(result.overtimeMinutes)]);
  lines.push(["Estimated gross pay", result.payCents === null ? "" : formatMoney(result.payCents, meta.currency ?? "USD")]);
  lines.push(["Note", "Estimated gross pay only. No tax, payroll, or labor-law compliance is claimed."]);
  return lines.map(r => r.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

export function buildSampleCsv(): string {
  return [
    "Date,Start,End,Ends next day,Unpaid break (minutes),Paid hours,Employee,Project",
    "2026-11-02,09:00,17:30,No,30,,Alex Rivera,Website support",
    "2026-11-02,18:00,20:00,No,0,,Alex Rivera,Website support",
    "2026-11-03,22:00,06:00,Yes,30,,Alex Rivera,Night cover",
    "2026-11-06,,,,,7.5,Alex Rivera,Website support",
  ].join("\n") + "\n";
}

/* ---------- saved-data validation (versioned, corruption-safe) ---------- */

export type SavedTimesheet = {
  version: 1;
  weekStart: string;
  period: PeriodKind;
  sessions: SessionInput[];
  employee?: string;
  business?: string;
  project?: string;
  hourlyRate?: number | null;
  currency?: string;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
};

export function validateSavedTimesheet(data: unknown): SavedTimesheet | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return null;
  if (typeof d.weekStart !== "string" || !isValidDateString(d.weekStart)) return null;
  if (d.period !== "weekly" && d.period !== "biweekly") return null;
  if (!Array.isArray(d.sessions)) return null;
  for (const s of d.sessions as unknown[]) {
    if (typeof s !== "object" || s === null) return null;
    const sess = s as Record<string, unknown>;
    if (typeof sess.date !== "string" || !isValidDateString(sess.date)) return null;
    if (typeof sess.start !== "string" || typeof sess.end !== "string") return null;
    if (typeof sess.breakMinutes !== "number" || sess.breakMinutes < 0) return null;
    // Hours-mode fields are optional (older saves predate them and
    // default to times mode), but when present they must be valid:
    // a corrupt paid value rejects the save rather than inventing hours.
    if (sess.mode !== undefined && sess.mode !== "times" && sess.mode !== "hours") return null;
    if (sess.mode === "hours") {
      if (sess.paidMinutes !== undefined) {
        if (typeof sess.paidMinutes !== "number" || !Number.isInteger(sess.paidMinutes) || sess.paidMinutes <= 0 || sess.paidMinutes > 1440) return null;
      }
      if (sess.paidHoursText !== undefined && typeof sess.paidHoursText !== "string") return null;
    }
  }
  return data as SavedTimesheet;
}
