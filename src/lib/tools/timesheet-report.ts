/**
 * Pure data builder for the Time Card PDF report.
 *
 * The PDF renderer (simple-pdf.ts) only draws what this module hands
 * it, so the report's numbers can be unit-tested without a browser:
 * chronological session order, daily totals (calendar days, with
 * overnight shifts split at midnight exactly as the engine reports
 * them), per-workweek totals, and a pay split that always adds up to
 * the engine's estimated gross total.
 *
 * Pay split rule: regular pay is rounded from regular minutes and the
 * rate; overtime pay is the gross total minus regular pay. That keeps
 * Regular + Overtime = Gross exactly, instead of two independent
 * roundings that can disagree by a cent. The gross itself is the
 * engine's figure (per-workweek rounding, see time-card.ts).
 */
import {
  formatDuration,
  parseTimeToMinutes,
  type TimesheetResult,
} from "./time-card";

export type ReportSessionRow = {
  date: string;
  /** "hours" rows show "Hours only" with blank start/end/break cells. */
  mode: "times" | "hours";
  start: string;
  end: string;
  endsNextDay: boolean;
  breakMinutes: number;
  paidMinutes: number;
};

export type ReportDayRow = { date: string; paidMinutes: number };

export type ReportWeekRow = {
  startDate: string;
  endDate: string;
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
};

export type TimesheetReport = {
  periodStart: string;
  periodEnd: string;
  sessions: ReportSessionRow[];
  dailyTotals: ReportDayRow[];
  weeks: ReportWeekRow[];
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  outOfPeriodPaidMinutes: number;
  /** Null when no hourly rate was entered: no pay figures are shown. */
  regularPayCents: number | null;
  overtimePayCents: number | null;
  grossPayCents: number | null;
};

export function buildTimesheetReport(
  result: TimesheetResult,
  opts: { hourlyRate: number | null }
): TimesheetReport {
  const sorted = [...result.sessions].sort((a, b) => {
    if (a.session.date !== b.session.date) return a.session.date < b.session.date ? -1 : 1;
    // Hours-only rows have no start time and sort after times rows on the same date.
    const aStart = a.session.mode === "hours" ? Number.POSITIVE_INFINITY : (parseTimeToMinutes(a.session.start) ?? 0);
    const bStart = b.session.mode === "hours" ? Number.POSITIVE_INFINITY : (parseTimeToMinutes(b.session.start) ?? 0);
    return aStart - bStart;
  });
  const sessions: ReportSessionRow[] = sorted.map(s => ({
    date: s.session.date,
    mode: s.session.mode === "hours" ? "hours" : "times",
    start: s.session.mode === "hours" ? "" : s.session.start,
    end: s.session.mode === "hours" ? "" : s.session.end,
    endsNextDay: s.session.mode === "hours" ? false : s.session.endsNextDay,
    breakMinutes: s.session.mode === "hours" ? 0 : s.session.breakMinutes,
    paidMinutes: s.paidMinutes,
  }));
  const dailyTotals: ReportDayRow[] = result.days
    .filter(d => d.sessionCount > 0)
    .map(d => ({ date: d.date, paidMinutes: d.paidMinutes }));
  const weeks: ReportWeekRow[] = result.weeks.map(w => ({
    startDate: w.startDate,
    endDate: w.endDate,
    totalMinutes: w.totalMinutes,
    regularMinutes: w.regularMinutes,
    overtimeMinutes: w.overtimeMinutes,
  }));

  let regularPayCents: number | null = null;
  let overtimePayCents: number | null = null;
  let grossPayCents: number | null = null;
  if (opts.hourlyRate !== null && result.payCents !== null) {
    const rateCents = Math.round(opts.hourlyRate * 100);
    regularPayCents = Math.round((result.regularMinutes * rateCents) / 60);
    grossPayCents = result.payCents;
    overtimePayCents = grossPayCents - regularPayCents;
  }

  return {
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    sessions,
    dailyTotals,
    weeks,
    totalMinutes: result.totalMinutes,
    regularMinutes: result.regularMinutes,
    overtimeMinutes: result.overtimeMinutes,
    outOfPeriodPaidMinutes: result.outOfPeriodPaidMinutes,
    regularPayCents,
    overtimePayCents,
    grossPayCents,
  };
}

/** Display helper kept with the report so tests and UI agree. */
export function reportDuration(minutes: number): string {
  return formatDuration(minutes);
}
