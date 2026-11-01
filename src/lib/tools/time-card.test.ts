import { describe, expect, it } from "vitest";
import {
  buildTimesheetCsv,
  calculateTimesheet,
  decimalHours,
  escapeCsvCell,
  formatDuration,
  parseCsvText,
  parseDateCell,
  parseImportedRows,
  guessColumnMapping,
  type SessionInput,
} from "./time-card";

function session(partial: Partial<SessionInput> & { date: string }): SessionInput {
  return { id: `s-${partial.date}-${partial.start ?? "x"}`, start: "09:00", end: "17:30", endsNextDay: false, breakMinutes: 30, ...partial };
}

const base = { weekStart: "2026-11-02", period: "weekly" as const, overtimeThresholdHours: 40, overtimeMultiplier: 1.5 };

describe("hand-checkable cases", () => {
  it("A: 09:00-17:30 with 30m break = 8h", () => {
    const r = calculateTimesheet({ ...base, sessions: [session({ date: "2026-11-02" })] });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(480);
    expect(formatDuration(480)).toBe("8h");
    expect(decimalHours(480)).toBe(8);
  });
  it("B: 22:00-06:00 next day with 30m break = 7h 30m, split across dates", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [session({ date: "2026-11-02", start: "22:00", end: "06:00", endsNextDay: true })],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(450);
    const day2 = r.days.find(d => d.date === "2026-11-02");
    const day3 = r.days.find(d => d.date === "2026-11-03");
    expect(day2!.paidMinutes + day3!.paidMinutes).toBe(450);
    // Break is allocated proportionally: 120 gross on day 2, 360 on day 3 of 480 gross.
    expect(r.sessions[0].segments.find(s => s.date === "2026-11-02")!.breakMinutes).toBe(7);
    expect(r.sessions[0].segments.find(s => s.date === "2026-11-03")!.breakMinutes).toBe(23);
  });
  it("C: 46h at $20, 40h threshold, 1.5x = 40 regular + 6 overtime = $980", () => {
    const sessions = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map(d =>
      session({ date: d, start: "08:00", end: "17:00", breakMinutes: 0 })
    );
    sessions.push(session({ date: "2026-11-07", start: "08:00", end: "09:00", breakMinutes: 0 }));
    const r = calculateTimesheet({ ...base, sessions, hourlyRate: 20, currency: "USD" });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(46 * 60);
    expect(r.regularMinutes).toBe(40 * 60);
    expect(r.overtimeMinutes).toBe(6 * 60);
    expect(r.payCents).toBe(98000);
  });
  it("D: biweekly week1 46h + week2 30h = 6 overtime hours, not an 80h test", () => {
    const week1 = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map(d =>
      session({ date: d, start: "08:00", end: "17:00", breakMinutes: 0 })
    );
    week1.push(session({ date: "2026-11-07", start: "08:00", end: "09:00", breakMinutes: 0 }));
    const week2 = ["2026-11-09", "2026-11-10", "2026-11-11"].map(d =>
      session({ date: d, start: "08:00", end: "18:00", breakMinutes: 0 })
    );
    const r = calculateTimesheet({ ...base, period: "biweekly", sessions: [...week1, ...week2], hourlyRate: 20 });
    expect(r.errors).toEqual([]);
    expect(r.weeks[0].overtimeMinutes).toBe(6 * 60);
    expect(r.weeks[1].overtimeMinutes).toBe(0);
    expect(r.overtimeMinutes).toBe(6 * 60);
    expect(r.totalMinutes).toBe(76 * 60);
  });
});

describe("validation", () => {
  it("rejects an earlier end time without ends-next-day instead of assuming overnight", () => {
    const r = calculateTimesheet({ ...base, sessions: [session({ date: "2026-11-02", start: "22:00", end: "06:00", endsNextDay: false })] });
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toMatch(/Ends next day/);
    expect(r.totalMinutes).toBe(0);
  });
  it("rejects overlapping sessions and excessive breaks", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [
        session({ date: "2026-11-02", start: "09:00", end: "12:00", breakMinutes: 0 }),
        session({ date: "2026-11-02", start: "11:00", end: "14:00", breakMinutes: 0 }),
        session({ date: "2026-11-03", start: "09:00", end: "10:00", breakMinutes: 60 }),
      ],
    });
    expect(r.errors.length).toBe(2);
  });
  it("rejects negative rates and invalid overtime settings", () => {
    const r = calculateTimesheet({ ...base, sessions: [], hourlyRate: -5, overtimeThresholdHours: 0, overtimeMultiplier: 0.5 });
    expect(r.errors.length).toBe(3);
  });
  it("excludes and explains out-of-period minutes", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [session({ date: "2026-11-08", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 0 })],
    });
    // Period is Nov 2-8; only the Nov 8 part (120m) counts, Nov 9 part (360m) is excluded.
    expect(r.outOfPeriodPaidMinutes).toBe(360);
    expect(r.outOfPeriodDetails.length).toBe(1);
    expect(r.totalMinutes).toBe(120);
  });
  it("overnight crossing a week boundary counts minutes in each week", () => {
    const r = calculateTimesheet({
      ...base,
      period: "biweekly",
      sessions: [session({ date: "2026-11-08", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 0 })],
    });
    expect(r.weeks[0].totalMinutes).toBe(120);
    expect(r.weeks[1].totalMinutes).toBe(360);
  });
});

describe("CSV and import", () => {
  it("parses quoted CSV and ambiguous dates under the chosen format", () => {
    const rows = parseCsvText('Date,Start,End\n"02/03/2026",09:00,17:00\n');
    expect(rows[1][0]).toBe("02/03/2026");
    expect(parseDateCell("02/03/2026", "MM/DD/YYYY")).toBe("2026-02-03");
    expect(parseDateCell("02/03/2026", "DD/MM/YYYY")).toBe("2026-03-02");
    expect(parseDateCell("02/03/2026", "YYYY-MM-DD")).toBeNull();
  });
  it("reports row-numbered import errors and does not silently drop them", () => {
    const rows = parseCsvText("Date,Start,End,Unpaid break (minutes)\n2026-11-02,09:00,17:00,30\nnot-a-date,09:00,17:00,30\n2026-11-03,09:00,17:00,abc\n");
    const mapping = guessColumnMapping(rows[0]);
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping, hasHeader: true });
    expect(result.sessions.length).toBe(1);
    expect(result.errors.map(e => e.row)).toEqual([3, 4]);
    expect(result.rows[1].errors.length).toBeGreaterThan(0);
  });
  it("collects multiple employees for selection", () => {
    const rows = parseCsvText("Date,Start,End,Employee\n2026-11-02,09:00,17:00,Ana\n2026-11-02,09:00,17:00,Ben\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.employees.sort()).toEqual(["Ana", "Ben"]);
  });
  it("neutralizes formula injection in exports", () => {
    expect(escapeCsvCell("=cmd|'x'")).toBe("'=cmd|'x'");
    expect(escapeCsvCell("+2+2")).toBe("'+2+2");
    expect(escapeCsvCell("@evil")).toBe("'@evil");
    expect(escapeCsvCell("plain")).toBe("plain");
    const r = calculateTimesheet({ ...base, sessions: [session({ date: "2026-11-02" })] });
    expect(buildTimesheetCsv(r, { employee: "=bad" })).toContain("'=bad");
  });
  it("sample CSV parses cleanly", () => {
    const rows = parseCsvText("Date,Start,End,Ends next day,Unpaid break (minutes),Employee,Project\n2026-11-02,09:00,17:30,No,30,Alex,Web\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.errors).toEqual([]);
    expect(result.sessions[0].breakMinutes).toBe(30);
  });
});
