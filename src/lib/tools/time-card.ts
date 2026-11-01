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
 *   silent guess about where the break was taken.
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

export type SessionInput = {
  id: string;
  date: string; // YYYY-MM-DD, the day the shift starts
  start: string; // HH:MM or 12-hour text, e.g. "9:00 AM"
  end: string;
  endsNextDay: boolean;
  breakMinutes: number;
  employee?: string;
  project?: string;
};

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

  for (const session of input.sessions) {
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

export type ImportField = "date" | "start" | "end" | "break" | "nextDay" | "employee" | "project";
export type ColumnMapping = Partial<Record<ImportField, number>>;

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  date: ["date", "day", "work date", "shift date"],
  start: ["start", "start time", "clock in", "in", "from"],
  end: ["end", "end time", "clock out", "out", "to"],
  break: ["break", "unpaid break", "break minutes", "unpaid break minutes", "break min"],
  nextDay: ["next day", "ends next day", "overnight", "nextday", "ends nextday"],
  employee: ["employee", "name", "employee name", "worker", "staff"],
  project: ["project", "job", "client", "task"],
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
};

export function parseImportedRows(
  rows: unknown[][],
  opts: { dateFormat: DateFormat; mapping: ColumnMapping; hasHeader: boolean }
): { sessions: SessionInput[]; rows: ImportedRow[]; employees: string[]; errors: TimesheetError[]; warnings: TimesheetWarning[] } {
  const errors: TimesheetError[] = [];
  const warnings: TimesheetWarning[] = [];
  const imported: ImportedRow[] = [];
  const employeeSet = new Set<string>();
  const dataRows = opts.hasHeader ? rows.slice(1) : rows;
  if (dataRows.length > 2000) {
    errors.push({ code: "import-row-limit", message: "Import is limited to 2,000 rows. Split the file and try again." });
    return { sessions: [], rows: imported, employees: [], errors, warnings };
  }
  const seen = new Set<string>();
  const parsedSessions: { session: SessionInput; rowNumber: number }[] = [];

  dataRows.forEach((row, idx) => {
    const rowNumber = (opts.hasHeader ? 2 : 1) + idx;
    const get = (field: ImportField): unknown => {
      const col = opts.mapping[field];
      if (col === undefined || col < 0 || col >= row.length) return "";
      return row[col] ?? "";
    };
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const rowErrorCodes: string[] = [];
    const rowWarningCodes: string[] = [];
    const rowErrorDetails: string[] = [];
    const date = parseDateCell(get("date"), opts.dateFormat);
    if (!date) { rowErrors.push(`Date "${String(get("date"))}" could not be read in ${opts.dateFormat} format.`); rowErrorCodes.push("import-date-unreadable"); rowErrorDetails.push(String(get("date"))); }
    const startParsed = parseTimeCell(get("start"));
    if (!startParsed) { rowErrors.push(`Start time "${String(get("start"))}" could not be read.`); rowErrorCodes.push("import-start-unreadable"); rowErrorDetails.push(String(get("start"))); }
    const endParsed = parseTimeCell(get("end"));
    if (!endParsed) { rowErrors.push(`End time "${String(get("end"))}" could not be read.`); rowErrorCodes.push("import-end-unreadable"); rowErrorDetails.push(String(get("end"))); }
    const breakMinutes = parseBreakCell(get("break"));
    if (breakMinutes === null) { rowErrors.push(`Unpaid break "${String(get("break"))}" must be a whole number of minutes.`); rowErrorCodes.push("import-break-not-integer"); rowErrorDetails.push(String(get("break"))); }
    const employee = String(get("employee")).trim();
    const project = String(get("project")).trim();
    if (employee) employeeSet.add(employee);
    let session: SessionInput | null = null;
    if (date && startParsed && endParsed && breakMinutes !== null) {
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
      const key = [session.date, session.start, session.end, session.breakMinutes].join("|");
      if (seen.has(key)) { rowWarnings.push("This row duplicates an earlier imported row."); rowWarningCodes.push("duplicate-row"); }
      seen.add(key);
    }
    if (session && rowErrors.length === 0) parsedSessions.push({ session, rowNumber });
    imported.push({ rowNumber, session: rowErrors.length === 0 ? session : null, errors: rowErrors, warnings: rowWarnings, errorCodes: rowErrorCodes, warningCodes: rowWarningCodes, errorDetails: rowErrorDetails });
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

  return { sessions: parsedSessions.map(p => p.session), rows: imported, employees: [...employeeSet], errors, warnings };
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
  lines.push(["Date", "Start", "End", "Ends next day", "Unpaid break (minutes)", "Paid minutes", "Paid time", "Paid decimal hours"]);
  result.sessions.forEach(s => {
    lines.push([
      s.session.date,
      s.session.start,
      s.session.end,
      s.session.endsNextDay ? "Yes" : "No",
      String(s.session.breakMinutes),
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
    "Date,Start,End,Ends next day,Unpaid break (minutes),Employee,Project",
    "2026-11-02,09:00,17:30,No,30,Alex Rivera,Website support",
    "2026-11-02,18:00,20:00,No,0,Alex Rivera,Website support",
    "2026-11-03,22:00,06:00,Yes,30,Alex Rivera,Night cover",
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
  }
  return data as SavedTimesheet;
}
