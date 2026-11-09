/**
 * Freelancer Time & Invoice — rate resolution + per-client pay (M1).
 *
 * Rules (checklist §2, fixed):
 * - R-1 resolution order: project rate override → client default rate →
 *   app default rate. No other order, no silent fallback to another
 *   client's rate.
 * - R-2 rate snapshot: the resolved rate is stored on the session at
 *   creation (`rateCentsAtEntry`, see store.createEntry). Later rate
 *   changes never touch recorded sessions.
 * - R-3 overtime is per-client, per workweek: group THAT client's
 *   sessions by workweek and run the lifted `calculateTimesheet` per
 *   group. Sessions from different clients NEVER pool into one threshold.
 * - R-4 overtime OFF by default. When off, the engine is fed a 168h
 *   threshold with a 1.0× multiplier: a week cannot exceed 168 hours
 *   (7 × 24), so no hour is ever classified overtime, and the multiplier
 *   is irrelevant. This keeps the engine as the single source of the
 *   regular/overtime minute split instead of a second implementation.
 * - R-6 overnight + break behaviour: the engine's midnight split and
 *   proportional break allocation apply per session before overtime
 *   grouping; `break-allocation-overtime` warnings are surfaced in the
 *   pay result, never dropped.
 * - R-7 currency: one currency per client; a session's currency is its
 *   client's currency. No FX conversion in M1.
 *
 * Per-session regular/overtime attribution (needed for invoice lines):
 * the engine reports regular/overtime minutes per WEEK, not per session.
 * Attribution is chronological: walking the week's sessions in start
 * order, the first `regularMinutes` of paid minutes are regular and the
 * rest are overtime. The split is exact in week totals (it sums to the
 * engine's figures) and the rule is explicit, not a silent guess. Pay
 * uses the engine's `payCents` directly when every session in the week
 * shares one rate; with mixed snapshot rates, pay is computed per
 * session from the attributed minutes (documented approximation of at
 * most a cent per session of rounding versus a single week-level
 * rounding).
 */
import {
  addDays,
  calculateTimesheet,
  dateOrdinal,
  directHoursToMinutes,
  isValidDateString,
  ordinalToDate,
  type SessionInput,
  type TimesheetResult,
} from "@/lib/tools/time-card";
import type { Client, StoreDocument, TimeEntry } from "./models";
import type { AppSettings } from "./settings";

export function resolveRateCents(args: {
  projectRateOverrideCents?: number;
  clientDefaultRateCents: number;
  appDefaultRateCents: number | null;
}): number | null {
  if (args.projectRateOverrideCents !== undefined) return args.projectRateOverrideCents;
  return args.clientDefaultRateCents ?? args.appDefaultRateCents;
}

/** Map a stored entry onto the engine's session input. */
export function entryToSessionInput(entry: TimeEntry): SessionInput {
  if (entry.mode === "direct") {
    return {
      id: entry.id,
      date: entry.date,
      start: "",
      end: "",
      endsNextDay: false,
      breakMinutes: 0,
      mode: "hours",
      paidMinutes: directHoursToMinutes(entry.directHours ?? 0) ?? 0,
      project: entry.projectId,
    };
  }
  return {
    id: entry.id,
    date: entry.date,
    start: entry.startTime,
    end: entry.endTime,
    endsNextDay: entry.endsNextDay,
    breakMinutes: entry.breakMinutes,
    mode: "times",
    project: entry.projectId,
  };
}

/** Monday (YYYY-MM-DD) of the week containing `date`. Workweeks are Monday-start. */
export function mondayOf(date: string): string {
  const ordinal = dateOrdinal(date);
  // dateOrdinal day 0 is a Thursday (1970-01-01); shift so Monday = 0 mod 7.
  const dayOfWeekMon0 = (((ordinal + 3) % 7) + 7) % 7; // Mon=0 … Sun=6
  return ordinalToDate(ordinal - dayOfWeekMon0);
}

export type ClientWeekPay = {
  weekStart: string; // Monday YYYY-MM-DD
  weekEnd: string; // Sunday YYYY-MM-DD
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Engine payCents when a single rate covers the week, else the per-session sum (see header). */
  payCents: number | null;
  /** Per-session attribution (chronological regular-first). */
  sessions: { entryId: string; paidMinutes: number; regularMinutes: number; overtimeMinutes: number; rateCents: number | null }[];
  warnings: TimesheetResult["warnings"];
  errors: TimesheetResult["errors"];
};

export type ClientPayResult = {
  client: Client;
  weeks: ClientWeekPay[];
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  payCents: number | null;
  warnings: TimesheetResult["warnings"];
};

/**
 * Overtime settings effective for a client: the client's own settings
 * when present on the record, else the app defaults. M1 stores overtime
 * settings per client on the client record itself (see models.ts Client —
 * the plan's §4 Client gains `overtimeEnabled`, `overtimeThresholdHours`,
 * `overtimeMultiplier`, all defaulting off / 40 / 1.5); the settings
 * object supplies the app-level defaults for new clients.
 */
export type ClientOvertime = {
  overtimeEnabled: boolean;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
};

export function effectiveOvertime(client: Partial<ClientOvertime>, settings: AppSettings): ClientOvertime {
  return {
    overtimeEnabled: client.overtimeEnabled ?? settings.overtimeEnabled,
    overtimeThresholdHours: client.overtimeThresholdHours ?? settings.overtimeThresholdHours,
    overtimeMultiplier: client.overtimeMultiplier ?? settings.overtimeMultiplier,
  };
}

/** Run the lifted engine for one client, one Monday-start week. */
export function calculateClientWeek(
  doc: StoreDocument,
  client: Client,
  weekStart: string,
  settings: AppSettings
): ClientWeekPay {
  /** Run the lifted engine for one client, one Monday-start week.
   *  Entries starting the day BEFORE the week are included: an overnight
   *  shift starting Sunday spills paid minutes into Monday, and the
   *  engine only counts in-period segments — so each segment is counted
   *  in exactly one week's call, never twice, never dropped. */
  const overtime = effectiveOvertime(client, settings);
  const weekEnd = addDays(weekStart, 6);
  const entries = doc.entries
    .filter((e) => e.clientId === client.id && e.date >= addDays(weekStart, -1) && e.date <= weekEnd)
    .sort((a, b) => (a.date === b.date ? (a.startTime || "").localeCompare(b.startTime || "") : a.date < b.date ? -1 : 1));
  const sessions = entries.map(entryToSessionInput);
  const result = calculateTimesheet({
    weekStart,
    period: "weekly",
    sessions,
    hourlyRate: null, // minutes split is rate-independent; pay is computed below
    currency: client.currency,
    overtimeThresholdHours: overtime.overtimeEnabled ? overtime.overtimeThresholdHours : 168,
    overtimeMultiplier: overtime.overtimeEnabled ? overtime.overtimeMultiplier : 1,
  });
  // Chronological regular-first attribution (see header).
  const paidBySession = new Map(result.sessions.map((s) => [s.session.id, s.paidMinutes]));
  let regularRemaining = result.regularMinutes;
  const attributed = entries.map((entry) => {
    const paid = paidBySession.get(entry.id) ?? 0;
    const regular = Math.min(paid, regularRemaining);
    regularRemaining -= regular;
    return {
      entryId: entry.id,
      paidMinutes: paid,
      regularMinutes: regular,
      overtimeMinutes: paid - regular,
      rateCents: entry.rateCentsAtEntry,
    };
  });
  const singleRate = new Set(attributed.map((a) => a.rateCents)).size <= 1;
  let payCents: number | null;
  if (singleRate) {
    const rate = attributed[0]?.rateCents ?? null;
    payCents =
      rate === null
        ? null
        : Math.round((result.regularMinutes * rate + result.overtimeMinutes * rate * (overtime.overtimeEnabled ? overtime.overtimeMultiplier : 1)) / 60);
  } else {
    let sum = 0;
    let anyRate = false;
    for (const a of attributed) {
      if (a.rateCents === null) continue;
      anyRate = true;
      sum += Math.round((a.regularMinutes * a.rateCents + a.overtimeMinutes * a.rateCents * (overtime.overtimeEnabled ? overtime.overtimeMultiplier : 1)) / 60);
    }
    payCents = anyRate ? sum : null;
  }
  return {
    weekStart,
    weekEnd,
    totalMinutes: result.totalMinutes,
    regularMinutes: result.regularMinutes,
    overtimeMinutes: result.overtimeMinutes,
    payCents,
    sessions: attributed,
    warnings: result.warnings,
    errors: result.errors,
  };
}

/**
 * Per-client pay across a date range (inclusive). Each week is evaluated
 * independently — a biweekly range never uses a single 80-hour threshold.
 * Weeks with no sessions are omitted. The `fromDate`/`toDate` bounds are
 * validated; an overnight segment falling outside the range is excluded
 * by the engine and reported in its warnings, exactly as the web tool does.
 */
export function calculateClientPay(
  doc: StoreDocument,
  client: Client,
  fromDate: string,
  toDate: string,
  settings: AppSettings
): ClientPayResult {
  if (!isValidDateString(fromDate) || !isValidDateString(toDate) || fromDate > toDate) {
    throw new Error(`Invalid pay range: ${fromDate} to ${toDate}`);
  }
  const weeks: ClientWeekPay[] = [];
  let cursor = mondayOf(fromDate);
  const lastMonday = mondayOf(toDate);
  while (cursor <= lastMonday) {
    const week = calculateClientWeek(doc, client, cursor, settings);
    if (week.totalMinutes > 0) weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  const warnings = weeks.flatMap((w) => w.warnings);
  const totalMinutes = weeks.reduce((s, w) => s + w.totalMinutes, 0);
  const regularMinutes = weeks.reduce((s, w) => s + w.regularMinutes, 0);
  const overtimeMinutes = weeks.reduce((s, w) => s + w.overtimeMinutes, 0);
  const payCents =
    weeks.length === 0 ? null : weeks.every((w) => w.payCents === null) ? null : weeks.reduce((s, w) => s + (w.payCents ?? 0), 0);
  return { client, weeks, totalMinutes, regularMinutes, overtimeMinutes, payCents, warnings };
}

/**
 * Raw engine result for one client + one week, for CSV/report wiring
 * (exports.ts). `hourlyRate` is the single rate when the week shares one,
 * else null (pay omitted; minutes still exact).
 */
export function calculateClientWeekTimesheet(
  doc: StoreDocument,
  client: Client,
  weekStart: string,
  settings: AppSettings
): TimesheetResult {
  const overtime = effectiveOvertime(client, settings);
  const weekEnd = addDays(weekStart, 6);
  // Same day-before inclusion as calculateClientWeek: overnight spill
  // into this week must be counted (see above).
  const entries = doc.entries.filter(
    (e) => e.clientId === client.id && e.date >= addDays(weekStart, -1) && e.date <= weekEnd
  );
  const rates = new Set(entries.map((e) => e.rateCentsAtEntry));
  const hourlyRate = rates.size === 1 ? (entries[0]?.rateCentsAtEntry ?? null) : null;
  return calculateTimesheet({
    weekStart,
    period: "weekly",
    sessions: entries.map(entryToSessionInput),
    hourlyRate: hourlyRate === null ? null : hourlyRate / 100,
    currency: client.currency,
    overtimeThresholdHours: overtime.overtimeEnabled ? overtime.overtimeThresholdHours : 168,
    overtimeMultiplier: overtime.overtimeEnabled ? overtime.overtimeMultiplier : 1,
  });
}
