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
  formatDecimalHours,
  formatDuration,
  parseTimeToMinutes,
  type TimesheetResult,
} from "./time-card";
import type { PremiumSection, PremiumTable } from "./premium-pdf";

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

export type BreakAllocationWarning = {
  /** ISO date of the overnight shift whose break was split. */
  date: string;
  breakMinutes: number;
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
  /** True when any timed row is an overnight shift (ends next day). */
  hasOvernight: boolean;
  /**
   * Engine break-allocation warnings, resolved to the shift's date and
   * break minutes. Empty unless an overnight break split crossed a
   * workweek boundary — the only case the engine warns about.
   */
  breakAllocationWarnings: BreakAllocationWarning[];
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

  const hasOvernight = sessions.some(s => s.mode === "times" && s.endsNextDay);
  const breakAllocationWarnings: BreakAllocationWarning[] = result.warnings
    .filter(w => w.code === "break-allocation-overtime")
    .map(w => {
      const sess = result.sessions.find(s => s.session.id === w.sessionId)?.session;
      return sess ? { date: sess.date, breakMinutes: sess.breakMinutes } : null;
    })
    .filter((w): w is BreakAllocationWarning => w !== null);

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
    hasOvernight,
    breakAllocationWarnings,
  };
}

/**
 * Pure section builder for the Time Card PDF report, so the report's
 * shape is unit-testable without rendering a page. The client passes
 * its own (locale-aware) formatters and the translated-string lookup;
 * this module owns only which sections appear and which columns they
 * carry:
 *
 * - All hours-only entries: one compact Date / Paid hours table. The
 *   heading carries the "(Hours only)" qualifier, since the mode
 *   column is absent — the qualifier is what explains the missing
 *   start/end columns. No timestamps are ever invented.
 * - All timed entries: Date / Start / End / Next day / Break / Paid
 *   (the Entry mode column is uniform, so it is dropped).
 * - Mixed entries: the full 7-column table, with an explicit "—" in
 *   the start/end/next-day/break cells of hours-only rows, so a blank
 *   is never mistaken for missing data.
 * - Daily totals appear only when they add information: some date has
 *   more than one session row, or an overnight shift split its paid
 *   time across two calendar days. Otherwise the table would repeat
 *   the sessions table row for row and is omitted.
 * - The overnight-split note appears only under Daily totals when an
 *   overnight shift exists. The proportional-break warning appears as
 *   a Notes section only when the engine warned (an overnight break
 *   split crossed a workweek boundary).
 * - The pay summary keeps every line (totals, threshold, multiplier,
 *   rate, regular/overtime/gross pay, excluded out-of-period time):
 *   pagination is fixed by removing redundant tables, never by
 *   dropping required figures.
 */
export type TimesheetPdfDeps = {
  tr: (key: string, vars?: Record<string, string | number>) => string;
  fmtDate: (iso: string) => string;
  fmtClock: (hhmm: string) => string;
  fmtMoney: (cents: number) => string;
  period: "weekly" | "biweekly";
  threshold: number | string;
  multiplier: number | string;
  /** Null when no hourly rate was entered: no pay figures are shown. */
  rate: number | null;
};

export function buildTimesheetPdfSections(
  report: TimesheetReport,
  deps: TimesheetPdfDeps,
): PremiumSection[] {
  const { tr, fmtDate, fmtClock, fmtMoney, period, threshold, multiplier, rate } = deps;
  const sessions = report.sessions;
  const allHours = sessions.length > 0 && sessions.every(s => s.mode === "hours");
  const allTimes = sessions.length > 0 && sessions.every(s => s.mode === "times");
  const NA = "—";

  let sessionsHeading = tr("tc.reportSessions");
  let sessionsTable: PremiumTable;
  if (allHours) {
    sessionsHeading = `${tr("tc.reportSessions")} (${tr("tc.modeHours")})`;
    sessionsTable = {
      headers: [tr("tc.reportDate"), tr("tc.reportPaid")],
      widths: [258, 258],
      align: ["left", "right"],
      rows: sessions.map(s => [fmtDate(s.date), formatDuration(s.paidMinutes)]),
    };
  } else if (allTimes) {
    sessionsTable = {
      headers: [tr("tc.reportDate"), tr("tc.reportStart"), tr("tc.reportEnd"), tr("tc.reportNextDay"), tr("tc.reportBreakMin"), tr("tc.reportPaid")],
      widths: [132, 84, 84, 64, 72, 80],
      align: ["left", "left", "left", "left", "right", "right"],
      rows: sessions.map(s => [
        fmtDate(s.date),
        fmtClock(s.start),
        fmtClock(s.end),
        s.endsNextDay ? tr("tc.reportYes") : tr("tc.reportNo"),
        String(s.breakMinutes),
        formatDuration(s.paidMinutes),
      ]),
    };
  } else {
    sessionsTable = {
      headers: [tr("tc.reportDate"), tr("tc.entryMode"), tr("tc.reportStart"), tr("tc.reportEnd"), tr("tc.reportNextDay"), tr("tc.reportBreakMin"), tr("tc.reportPaid")],
      widths: [76, 76, 72, 72, 64, 64, 80],
      align: ["left", "left", "left", "left", "left", "right", "right"],
      rows: sessions.map(s => s.mode === "hours"
        ? [fmtDate(s.date), tr("tc.modeHours"), NA, NA, NA, NA, formatDuration(s.paidMinutes)]
        : [
            fmtDate(s.date),
            tr("tc.modeTimes"),
            fmtClock(s.start),
            fmtClock(s.end),
            s.endsNextDay ? tr("tc.reportYes") : tr("tc.reportNo"),
            String(s.breakMinutes),
            formatDuration(s.paidMinutes),
          ]),
    };
  }

  const perDate = new Map<string, number>();
  for (const s of sessions) perDate.set(s.date, (perDate.get(s.date) ?? 0) + 1);
  const maxPerDate = perDate.size === 0 ? 0 : Math.max(...perDate.values());
  const showDaily = maxPerDate >= 2 || report.hasOvernight;

  const sections: PremiumSection[] = [
    { heading: sessionsHeading, table: sessionsTable },
  ];
  if (showDaily) {
    sections.push({
      heading: tr("tc.reportDailyTotals"),
      table: {
        headers: [tr("tc.reportDate"), tr("tc.reportPaid")],
        widths: [252, 252],
        align: ["left", "right"],
        rows: report.dailyTotals.map(d => [fmtDate(d.date), `${formatDuration(d.paidMinutes)} (${formatDecimalHours(d.paidMinutes)})`]),
      },
      ...(report.hasOvernight ? { lines: [tr("tc.reportDailyNote")] } : {}),
    });
  }
  if (period === "biweekly") {
    sections.push({
      heading: tr("tc.reportWeekTotals"),
      table: {
        headers: [tr("tc.reportWeek"), tr("tc.reportTotalHours"), tr("tc.reportRegularHours"), tr("tc.reportOvertimeHours")],
        widths: [168, 112, 112, 112],
        align: ["left", "right", "right", "right"],
        rows: report.weeks.map((w, i) => [
          `${tr("tc.reportWeek")} ${i + 1} (${fmtDate(w.startDate)} – ${fmtDate(w.endDate)})`,
          formatDuration(w.totalMinutes),
          formatDuration(w.regularMinutes),
          formatDuration(w.overtimeMinutes),
        ]),
      },
    });
  }
  if (report.breakAllocationWarnings.length > 0) {
    sections.push({
      heading: tr("common.notes"),
      lines: report.breakAllocationWarnings.map(w =>
        tr("tc.warnBreakAllocationOvertime", { date: fmtDate(w.date), break: w.breakMinutes })),
    });
  }
  sections.push({
    heading: tr("tc.reportPaySummary"),
    emphasis: true,
    lines: [
      `${tr("tc.reportTotalHours")}: ${formatDuration(report.totalMinutes)} (${formatDecimalHours(report.totalMinutes)})`,
      `${tr("tc.reportRegularHours")}: ${formatDuration(report.regularMinutes)} (${formatDecimalHours(report.regularMinutes)})`,
      `${tr("tc.reportOvertimeHours")}: ${formatDuration(report.overtimeMinutes)} (${formatDecimalHours(report.overtimeMinutes)})`,
      `${tr("tc.reportThreshold")}: ${tr("tc.reportThresholdValue", { hours: threshold })}`,
      `${tr("tc.reportMultiplier")}: ${tr("tc.reportMultiplierValue", { value: multiplier })}`,
      ...(rate !== null && report.grossPayCents !== null
        ? [
            `${tr("tc.reportRate")}: ${fmtMoney(Math.round(rate * 100))}`,
            `${tr("tc.reportRegularPay")}: ${fmtMoney(report.regularPayCents ?? 0)}`,
            `${tr("tc.reportOvertimePay")}: ${fmtMoney(report.overtimePayCents ?? 0)}`,
            `${tr("tc.pay")}: ${fmtMoney(report.grossPayCents)}`,
          ]
        : []),
      ...(report.outOfPeriodPaidMinutes > 0
        ? [`${tr("tc.reportExcluded")}: ${tr("tc.reportExcludedValue", { duration: formatDuration(report.outOfPeriodPaidMinutes) })}`]
        : []),
    ],
  });
  return sections;
}

/** Display helper kept with the report so tests and UI agree. */
export function reportDuration(minutes: number): string {
  return formatDuration(minutes);
}
