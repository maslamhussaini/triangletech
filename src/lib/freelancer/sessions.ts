/**
 * Freelancer Time & Invoice — session grouping for the time-card UI (M2).
 *
 * Groups a client's entries by day and by Monday-start week, with daily
 * totals and pay. All minute splits and pay come from the M1 aggregation
 * (`calculateClientWeek` in rates.ts, which runs the lifted engine per
 * client per week) — nothing here reimplements calculation:
 * - paid/regular/overtime minutes per day come from the engine's
 *   chronological regular-first attribution on each week;
 * - pay per day uses the same per-session formula as rates.ts's
 *   mixed-rate path (round per session, at most a cent of rounding per
 *   session versus a single week-level rounding), so a day's pay is
 *   exact for that day's sessions;
 * - week pay is the week aggregation itself (single-rate weeks use the
 *   engine's `payCents` directly), so the week total shown in the UI
 *   is exactly `calculateClientWeek(...).payCents`.
 * A consequence to be aware of: the sum of the displayed day pays can
 * differ from the displayed week pay by at most a cent per session in
 * a mixed-rate week. That is the documented rates.ts behaviour, not a
 * second implementation.
 *
 * Overnight spill: an entry starting Sunday can spill paid minutes
 * into Monday. The engine attributes those minutes to the week they
 * fall in, but the entry itself is listed under its START date (its
 * `date` field) — the day group shows the entry where the user entered
 * it, with the paid minutes the engine attributed to that entry in
 * that week. Consequence: a shift spanning the Sunday/Monday boundary
 * is listed in BOTH adjacent weeks (Sunday minutes in the first, Monday
 * minutes in the second), so every week's day totals always sum exactly
 * to that week's totals. A week with no entries at all is omitted.
 */
import { addDays, formatDuration, formatMoney, isValidDateString } from "@/lib/tools/time-card";
import { calculateClientWeek, effectiveOvertime, mondayOf, type ClientWeekPay } from "./rates";
import type { Client, StoreDocument, TimeEntry } from "./models";
import type { AppSettings } from "./settings";

export type GroupedEntry = {
  entry: TimeEntry;
  /** Engine-attributed paid minutes for this entry in this week. */
  paidMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Per-session pay (same formula as rates.ts mixed-rate path); null when no rate. */
  payCents: number | null;
};

export type DayGroup = {
  date: string; // YYYY-MM-DD (entry start date)
  entries: GroupedEntry[];
  paidMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Per-session sum (see header); null when no session has a rate. */
  payCents: number | null;
};

export type WeekGroup = {
  weekStart: string; // Monday YYYY-MM-DD
  weekEnd: string; // Sunday YYYY-MM-DD
  days: DayGroup[]; // newest day first
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Exactly calculateClientWeek(...).payCents for this week. */
  payCents: number | null;
  warnings: ClientWeekPay["warnings"];
};

/** Pay for one attributed session (same formula as rates.ts mixed-rate path). */
export function sessionPayCents(
  regularMinutes: number,
  overtimeMinutes: number,
  rateCents: number | null,
  overtimeMultiplier: number,
  overtimeEnabled: boolean
): number | null {
  if (rateCents === null) return null;
  const mult = overtimeEnabled ? overtimeMultiplier : 1;
  return Math.round((regularMinutes * rateCents + overtimeMinutes * rateCents * mult) / 60);
}

/**
 * Group one client's entries by week (newest week first), each week by
 * day (newest day first). `fromDate`/`toDate` bound the weeks shown;
 * both must be valid dates with fromDate <= toDate.
 */
export function groupEntriesByWeek(
  doc: StoreDocument,
  client: Client,
  fromDate: string,
  toDate: string,
  settings: AppSettings
): WeekGroup[] {
  if (!isValidDateString(fromDate) || !isValidDateString(toDate) || fromDate > toDate) {
    throw new Error(`Invalid grouping range: ${fromDate} to ${toDate}`);
  }
  const weeks: WeekGroup[] = [];
  let cursor = mondayOf(fromDate);
  const lastMonday = mondayOf(toDate);
  while (cursor <= lastMonday) {
    const week = calculateClientWeek(doc, client, cursor, settings);
    if (week.totalMinutes > 0 || week.sessions.length > 0) {
      weeks.push(buildWeekGroup(doc, client, week, settings));
    }
    cursor = addDays(cursor, 7);
  }
  return weeks.reverse();
}

function buildWeekGroup(
  doc: StoreDocument,
  client: Client,
  week: ClientWeekPay,
  settings: AppSettings
): WeekGroup {
  const overtime = effectiveOvertime(client, settings);
  const byDate = new Map<string, DayGroup>();
  for (const attributed of week.sessions) {
    const entry = doc.entries.find((e) => e.id === attributed.entryId);
    if (!entry) continue;
    let day = byDate.get(entry.date);
    if (!day) {
      day = { date: entry.date, entries: [], paidMinutes: 0, regularMinutes: 0, overtimeMinutes: 0, payCents: null };
      byDate.set(entry.date, day);
    }
    const sessionPay = sessionPayCents(
      attributed.regularMinutes,
      attributed.overtimeMinutes,
      attributed.rateCents,
      overtime.overtimeMultiplier,
      overtime.overtimeEnabled
    );
    day.entries.push({
      entry,
      paidMinutes: attributed.paidMinutes,
      regularMinutes: attributed.regularMinutes,
      overtimeMinutes: attributed.overtimeMinutes,
      payCents: sessionPay,
    });
    day.paidMinutes += attributed.paidMinutes;
    day.regularMinutes += attributed.regularMinutes;
    day.overtimeMinutes += attributed.overtimeMinutes;
    if (sessionPay !== null) day.payCents = (day.payCents ?? 0) + sessionPay;
  }
  const days = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((day) => ({
      ...day,
      entries: [...day.entries].sort((a, b) => (a.entry.startTime || "").localeCompare(b.entry.startTime || "")),
    }));
  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    days,
    totalMinutes: week.totalMinutes,
    regularMinutes: week.regularMinutes,
    overtimeMinutes: week.overtimeMinutes,
    payCents: week.payCents,
    warnings: week.warnings,
  };
}

/** "Mon 2 Nov" style label for a YYYY-MM-DD date (English, M2 scope). */
export function shortDayLabel(date: string): string {
  const dt = new Date(`${date}T00:00:00Z`);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getUTCMonth()];
  return `${weekday} ${dt.getUTCDate()} ${month}`;
}

export function formatDayTotal(day: DayGroup, currency: string): string {
  const pay = day.payCents === null ? "no rate set" : formatMoney(day.payCents, currency);
  const ot = day.overtimeMinutes > 0 ? ` (${formatDuration(day.overtimeMinutes)} overtime)` : "";
  return `${formatDuration(day.paidMinutes)} · ${pay}${ot}`;
}
