import { describe, expect, it } from "vitest";
import { calculateTimesheet } from "./time-card";
import { buildTimesheetReport } from "./timesheet-report";

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
