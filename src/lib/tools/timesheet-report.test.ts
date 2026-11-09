import { describe, expect, it } from "vitest";
import { calculateTimesheet } from "./time-card";
import { buildTimesheetPdfSections, buildTimesheetReport } from "./timesheet-report";
import { dictionaries } from "../i18n/dictionaries";

function weekSessions(dates: string[], start = "09:00", end = "17:00", breakMinutes = 0) {
  return dates.map((date, i) => ({
    id: `s${i}`,
    date,
    start,
    end,
    endsNextDay: false,
    breakMinutes,
  }));
}

describe("timesheet report data", () => {
  it("screenshot scenario inputs are unknown; a reproducible setting gives 30h / 20 regular / 10 overtime / $315", () => {
    // Reproducible, not guessed from the screenshot: one week, 30 hours,
    // overtime threshold 20h, rate $9/h, multiplier 1.5x.
    // 20 x $9 + 10 x $9 x 1.5 = $180 + $135 = $315.
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: weekSessions(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"], "09:00", "15:00"),
      hourlyRate: 9,
      currency: "USD",
      overtimeThresholdHours: 20,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: 9 });
    expect(report.totalMinutes).toBe(1800);
    expect(report.regularMinutes).toBe(1200);
    expect(report.overtimeMinutes).toBe(600);
    expect(report.grossPayCents).toBe(31500);
    expect(report.regularPayCents).toBe(18000);
    expect(report.overtimePayCents).toBe(13500);
    expect((report.regularPayCents ?? 0) + (report.overtimePayCents ?? 0)).toBe(report.grossPayCents);
  });

  it("does not change correct behaviour to match a default 40h threshold: same 30h at 40h gives 0 overtime", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: weekSessions(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"], "09:00", "15:00"),
      hourlyRate: 9,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: 9 });
    expect(report.totalMinutes).toBe(1800);
    expect(report.regularMinutes).toBe(1800);
    expect(report.overtimeMinutes).toBe(0);
    expect(report.grossPayCents).toBe(27000);
  });

  it("sorts sessions chronologically regardless of entry order", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [
        { id: "b", date: "2026-11-04", start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 30 },
        { id: "a", date: "2026-11-02", start: "13:00", end: "17:00", endsNextDay: false, breakMinutes: 0 },
        { id: "c", date: "2026-11-02", start: "09:00", end: "12:00", endsNextDay: false, breakMinutes: 0 },
      ],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    expect(report.sessions.map(s => `${s.date} ${s.start}`)).toEqual([
      "2026-11-02 09:00",
      "2026-11-02 13:00",
      "2026-11-04 09:00",
    ]);
    expect(report.grossPayCents).toBeNull();
  });

  it("daily totals follow the engine's midnight split and biweekly weeks stay separate", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "biweekly",
      sessions: [
        { id: "n", date: "2026-11-08", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 30 },
        { id: "w2", date: "2026-11-10", start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 0 },
      ],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    // Overnight 22:00-06:00 less 30m break = 450m paid: gross
    // segments 120m + 360m, break split proportionally 7m + 23m,
    // so paid 113m on 2026-11-08 and 337m on 2026-11-09.
    const day8 = report.dailyTotals.find(d => d.date === "2026-11-08");
    const day9 = report.dailyTotals.find(d => d.date === "2026-11-09");
    expect(day8?.paidMinutes).toBe(113);
    expect(day9?.paidMinutes).toBe(337);
    expect(report.weeks).toHaveLength(2);
    expect(report.weeks[0].totalMinutes).toBe(113);
    expect(report.weeks[1].totalMinutes).toBe(337 + 480);
  });
});

describe("timesheet PDF sections (adaptive layout)", () => {
  const tr = (key: string, vars?: Record<string, string | number>) => {
    let s = (dictionaries.en as Record<string, string>)[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const deps = {
    tr,
    fmtDate: (d: string) => d,
    fmtClock: (hhmm: string) => hhmm,
    fmtMoney: (cents: number) => `$${(cents / 100).toFixed(2)}`,
    period: "weekly" as const,
    threshold: 14,
    multiplier: 1,
    rate: 9 as number | null,
  };
  const hoursRow = (id: string, date: string, hours: number) => ({
    id, date, mode: "hours" as const, start: "", end: "", endsNextDay: false, breakMinutes: 0, paidMinutes: Math.round(hours * 60),
  });
  const timedRow = (id: string, date: string, start: string, end: string, endsNextDay = false, breakMinutes = 0) => ({
    id, date, start, end, endsNextDay, breakMinutes,
  });

  it("reference case: all hours-only, one entry per date -> compact 2-column table, no daily table, no overnight note", () => {
    const result = calculateTimesheet({
      weekStart: "2026-10-26",
      period: "weekly",
      sessions: [
        hoursRow("a", "2026-10-26", 4),
        hoursRow("b", "2026-10-28", 3),
        hoursRow("c", "2026-10-30", 3),
        hoursRow("d", "2026-10-31", 3),
        hoursRow("e", "2026-11-01", 1),
      ],
      hourlyRate: 9,
      currency: "USD",
      overtimeThresholdHours: 14,
      overtimeMultiplier: 1,
    });
    expect(result.errors).toEqual([]);
    const report = buildTimesheetReport(result, { hourlyRate: 9 });
    expect(report.totalMinutes).toBe(840);
    expect(report.regularMinutes).toBe(840);
    expect(report.overtimeMinutes).toBe(0);
    expect(report.grossPayCents).toBe(12600);
    expect(report.hasOvernight).toBe(false);
    expect(report.breakAllocationWarnings).toEqual([]);
    const sections = buildTimesheetPdfSections(report, deps);
    expect(sections.map(s => s.heading)).toEqual(["Sessions (Hours only)", "Pay summary"]);
    const table = sections[0].table!;
    expect(table.headers).toEqual(["Date", "Paid duration"]);
    expect(table.rows).toEqual([
      ["2026-10-26", "4h"],
      ["2026-10-28", "3h"],
      ["2026-10-30", "3h"],
      ["2026-10-31", "3h"],
      ["2026-11-01", "1h"],
    ]);
    // No invented timestamps anywhere in the sessions table.
    expect(table.rows.flat().join(" ")).not.toMatch(/\d{1,2}:\d{2}/);
    const pay = sections[1];
    expect(pay.lines).toContain("Total hours: 14h (14.00)");
    expect(pay.lines).toContain("Regular hours: 14h (14.00)");
    expect(pay.lines).toContain("Overtime hours: 0m (0.00)");
    expect(pay.lines).toContain("Estimated gross pay: $126.00");
  });

  it("all timed entries drop the uniform Entry mode column", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [
        timedRow("a", "2026-11-02", "09:00", "17:00", false, 30),
        timedRow("b", "2026-11-03", "09:00", "17:00"),
      ],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    const sections = buildTimesheetPdfSections(report, { ...deps, rate: null });
    expect(sections[0].heading).toBe("Sessions");
    expect(sections[0].table!.headers).toEqual(["Date", "Start", "End", "Next day", "Unpaid break (min)", "Paid duration"]);
    expect(sections[0].table!.rows[0]).toEqual(["2026-11-02", "09:00", "17:00", "No", "30", "7h 30m"]);
    // One row per date and no overnight: the daily table adds nothing.
    expect(sections.map(s => s.heading)).not.toContain("Daily totals");
  });

  it("mixed entries keep the mode column and mark hours-only cells with an explicit dash", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [
        hoursRow("a", "2026-11-02", 7.5),
        timedRow("b", "2026-11-03", "09:00", "17:00", false, 0),
      ],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    const sections = buildTimesheetPdfSections(report, { ...deps, rate: null });
    expect(sections[0].table!.headers).toEqual(["Date", "Entry mode", "Start", "End", "Next day", "Unpaid break (min)", "Paid duration"]);
    expect(sections[0].table!.rows[0]).toEqual(["2026-11-02", "Hours only", "—", "—", "—", "—", "7h 30m"]);
    expect(sections[0].table!.rows[1]).toEqual(["2026-11-03", "Start / End times", "09:00", "17:00", "No", "0", "8h"]);
  });

  it("daily totals appear when a date has several entries, and keep the split note only for overnight shifts", () => {
    const multi = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [
        timedRow("a", "2026-11-02", "09:00", "12:00"),
        timedRow("b", "2026-11-02", "13:00", "17:00"),
      ],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const multiReport = buildTimesheetReport(multi, { hourlyRate: null });
    const multiSections = buildTimesheetPdfSections(multiReport, { ...deps, rate: null });
    const daily = multiSections.find(s => s.heading === "Daily totals");
    expect(daily).toBeDefined();
    expect(daily!.table!.rows).toEqual([["2026-11-02", "7h (7.00)"]]);
    // No overnight shift: no overnight explanation anywhere.
    expect(multiSections.flatMap(s => s.lines ?? []).join(" ")).not.toContain("midnight");

    const night = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [timedRow("n", "2026-11-04", "22:00", "06:00", true, 0)],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const nightReport = buildTimesheetReport(night, { hourlyRate: null });
    expect(nightReport.hasOvernight).toBe(true);
    expect(nightReport.breakAllocationWarnings).toEqual([]);
    const nightSections = buildTimesheetPdfSections(nightReport, { ...deps, rate: null });
    const nightDaily = nightSections.find(s => s.heading === "Daily totals");
    expect(nightDaily).toBeDefined();
    expect(nightDaily!.lines).toEqual([tr("tc.reportDailyNote")]);
    // Mid-week overnight, no week-boundary crossing: no break warning.
    expect(nightSections.map(s => s.heading)).not.toContain("Notes");
  });

  it("break-allocation warning appears only when an overnight break split crosses a workweek boundary", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "biweekly",
      sessions: [timedRow("n", "2026-11-08", "22:00", "06:00", true, 30)],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    expect(report.breakAllocationWarnings).toEqual([{ date: "2026-11-08", breakMinutes: 30 }]);
    const sections = buildTimesheetPdfSections(report, { ...deps, period: "biweekly" as const, rate: null });
    const notes = sections.find(s => s.heading === "Notes");
    expect(notes).toBeDefined();
    expect(notes!.lines!.join(" ")).toContain("2026-11-08");
    expect(notes!.lines!.join(" ")).toContain("30");
  });

  it("several hours-only entries on one date keep the daily table (aggregation adds information)", () => {
    const result = calculateTimesheet({
      weekStart: "2026-11-02",
      period: "weekly",
      sessions: [hoursRow("a", "2026-11-02", 3), hoursRow("b", "2026-11-02", 4)],
      hourlyRate: null,
      currency: "USD",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const report = buildTimesheetReport(result, { hourlyRate: null });
    const sections = buildTimesheetPdfSections(report, { ...deps, rate: null });
    expect(sections[0].table!.rows).toHaveLength(2);
    const daily = sections.find(s => s.heading === "Daily totals");
    expect(daily!.table!.rows).toEqual([["2026-11-02", "7h (7.00)"]]);
  });
});
