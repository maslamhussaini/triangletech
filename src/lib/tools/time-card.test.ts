import { describe, expect, it } from "vitest";
import {
  buildSampleCsv,
  buildTimesheetCsv,
  calculateTimesheet,
  decimalHours,
  decimalHoursToMinutes,
  directHoursToMinutes,
  escapeCsvCell,
  formatDuration,
  parseCsvText,
  parseDateCell,
  parseImportedRows,
  parsePaidHoursCell,
  guessColumnMapping,
  validateSavedTimesheet,
  type SessionInput,
} from "./time-card";
import { parseLocalizedNumber } from "../i18n/locales";
import { buildTimesheetReport } from "./timesheet-report";

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

describe("break allocation across a workweek boundary", () => {
  it("warns when an overnight break crosses a workweek boundary", () => {
    // Week starts Monday 2026-10-26; Sunday 2026-11-01 22:00 -> Monday 2026-11-02 06:00 crosses the week boundary.
    const r = calculateTimesheet({
      period: "weekly",
      weekStart: "2026-10-26",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
      hourlyRate: null,
      sessions: [{ id: "s1", date: "2026-11-01", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 60 }],
    });
    expect(r.errors).toEqual([]);
    expect(r.warnings.map(w => w.code)).toContain("break-allocation-overtime");
  });
  it("does not warn for an overnight break inside one workweek", () => {
    const r = calculateTimesheet({
      period: "weekly",
      weekStart: "2026-10-26",
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
      hourlyRate: null,
      sessions: [{ id: "s1", date: "2026-10-27", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 60 }],
    });
    expect(r.warnings.map(w => w.code)).not.toContain("break-allocation-overtime");
  });
});

describe("direct hours conversion", () => {
  it("maps whole and fractional hours to integer minutes with nearest-minute rounding", () => {
    expect(directHoursToMinutes(3)).toBe(180);
    expect(directHoursToMinutes(4)).toBe(240);
    expect(directHoursToMinutes(5)).toBe(300);
    expect(directHoursToMinutes(7.5)).toBe(450);
    expect(directHoursToMinutes(7.25)).toBe(435);
    // Decimals are fractions of an hour: 7.30 = 7.3h = 7h 18m, never 7h 30m.
    expect(directHoursToMinutes(7.3)).toBe(438);
    expect(decimalHoursToMinutes(7.3)).toBe(438);
    expect(decimalHoursToMinutes(0.01)).toBe(1);
    expect(directHoursToMinutes(24)).toBe(1440);
  });
  it("rejects negative, zero, non-finite, and over-24-hour values", () => {
    expect(directHoursToMinutes(-1)).toBeNull();
    expect(directHoursToMinutes(0)).toBeNull();
    expect(directHoursToMinutes(24.01)).toBeNull();
    expect(directHoursToMinutes(NaN)).toBeNull();
    expect(directHoursToMinutes(Infinity)).toBeNull();
  });
  it("parses localized decimals through the shared parser", () => {
    expect(parseLocalizedNumber("7,5", "de")).toBe(7.5);
    expect(decimalHoursToMinutes(parseLocalizedNumber("7,5", "de")!)).toBe(450);
    expect(parseLocalizedNumber("7.25", "en")).toBe(7.25);
    expect(decimalHoursToMinutes(parseLocalizedNumber("٧٫٥", "ar")!)).toBe(450);
  });
  it("parses paid-hours import cells (numbers, dot/comma decimals, h suffix)", () => {
    expect(parsePaidHoursCell(7.5)).toEqual({ kind: "ok", hours: 7.5, minutes: 450 });
    expect(parsePaidHoursCell("7,5")).toEqual({ kind: "ok", hours: 7.5, minutes: 450 });
    expect(parsePaidHoursCell("7.5h")).toEqual({ kind: "ok", hours: 7.5, minutes: 450 });
    expect(parsePaidHoursCell("")).toEqual({ kind: "empty" });
    expect(parsePaidHoursCell("abc")).toEqual({ kind: "malformed" });
    expect(parsePaidHoursCell("25")).toEqual({ kind: "out-of-range" });
    expect(parsePaidHoursCell("-3")).toEqual({ kind: "out-of-range" });
  });
});

function hoursSession(date: string, paidMinutes: number, extra: Partial<SessionInput> = {}): SessionInput {
  return { id: `h-${date}-${paidMinutes}`, date, mode: "hours", start: "", end: "", endsNextDay: false, breakMinutes: 0, paidMinutes, ...extra };
}

describe("hours-only entries in the engine", () => {
  it("accepts 3, 4, and 5 hours without start/end times", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [hoursSession("2026-11-02", 180), hoursSession("2026-11-03", 240), hoursSession("2026-11-04", 300)],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(720);
    expect(r.days.find(d => d.date === "2026-11-02")!.paidMinutes).toBe(180);
  });
  it("counts direct hours exactly, with no break deduction and no midnight split", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [hoursSession("2026-11-02", 450, { breakMinutes: 30 })],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(450);
    expect(r.sessions[0].segments).toHaveLength(1);
    expect(r.sessions[0].segments[0]).toEqual({ date: "2026-11-02", grossMinutes: 450, breakMinutes: 0, paidMinutes: 450, inPeriod: true });
  });
  it("mixes modes across days and feeds the same overtime engine", () => {
    const r = calculateTimesheet({
      ...base,
      hourlyRate: 20,
      sessions: [
        hoursSession("2026-11-02", 450),
        session({ date: "2026-11-03", start: "09:00", end: "17:30", breakMinutes: 30 }),
      ],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(930);
    expect(r.days.find(d => d.date === "2026-11-02")!.paidMinutes).toBe(450);
    expect(r.days.find(d => d.date === "2026-11-03")!.paidMinutes).toBe(480);
  });
  it("applies weekly overtime to hours-only weeks", () => {
    const days = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
    const r = calculateTimesheet({ ...base, hourlyRate: 20, sessions: days.map(d => hoursSession(d, 480)) });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(48 * 60);
    expect(r.regularMinutes).toBe(40 * 60);
    expect(r.overtimeMinutes).toBe(8 * 60);
    expect(r.payCents).toBe(104000);
  });
  it("keeps biweekly overtime independent per week for hours-only entries", () => {
    const week1 = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"].map(d => hoursSession(d, 540));
    week1.push(hoursSession("2026-11-06", 540));
    const week2 = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"].map(d => hoursSession(d, 420));
    const r = calculateTimesheet({ ...base, period: "biweekly", sessions: [...week1, ...week2] });
    expect(r.errors).toEqual([]);
    expect(r.weeks[0].overtimeMinutes).toBe(5 * 60);
    expect(r.weeks[1].overtimeMinutes).toBe(0);
    expect(r.overtimeMinutes).toBe(5 * 60);
  });
  it("excludes hours-only entries on a mixed-mode day instead of double-counting", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [
        session({ date: "2026-11-02", start: "09:00", end: "17:00", breakMinutes: 0 }),
        hoursSession("2026-11-02", 480),
      ],
    });
    expect(r.errors.map(e => e.code)).toContain("mixed-mode-day");
    expect(r.totalMinutes).toBe(480);
  });
  it("excludes hours-only entries when an overnight segment lands on the same day", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [
        session({ date: "2026-11-02", start: "22:00", end: "06:00", endsNextDay: true, breakMinutes: 0 }),
        hoursSession("2026-11-03", 480),
      ],
    });
    expect(r.errors.map(e => e.code)).toContain("mixed-mode-day");
    expect(r.totalMinutes).toBe(480);
  });
  it("rejects a day whose hours-only entries total more than 24 hours", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [hoursSession("2026-11-02", 900), hoursSession("2026-11-02", 600)],
    });
    expect(r.errors.map(e => e.code)).toContain("day-over-24h");
    expect(r.totalMinutes).toBe(900);
  });
  it("rejects invalid hours values with distinct codes", () => {
    const over = calculateTimesheet({ ...base, sessions: [hoursSession("2026-11-02", 1500)] });
    expect(over.errors.map(e => e.code)).toContain("hours-over-24h");
    const neg = calculateTimesheet({ ...base, sessions: [hoursSession("2026-11-02", -60)] });
    expect(neg.errors.map(e => e.code)).toContain("hours-non-positive");
    const zero = calculateTimesheet({ ...base, sessions: [hoursSession("2026-11-02", 0)] });
    expect(zero.errors.map(e => e.code)).toContain("hours-non-positive");
    const nan = calculateTimesheet({ ...base, sessions: [hoursSession("2026-11-02", NaN)] });
    expect(nan.errors.map(e => e.code)).toContain("hours-malformed");
    const missing = calculateTimesheet({ ...base, sessions: [{ id: "h-x", date: "2026-11-02", mode: "hours", start: "", end: "", endsNextDay: false, breakMinutes: 0 }] });
    expect(missing.errors.map(e => e.code)).toContain("hours-incomplete");
  });
  it("excludes out-of-period hours-only entries and explains them", () => {
    const r = calculateTimesheet({ ...base, sessions: [hoursSession("2026-11-09", 480)] });
    expect(r.errors).toEqual([]);
    expect(r.outOfPeriodPaidMinutes).toBe(480);
    expect(r.totalMinutes).toBe(0);
  });
});

describe("hours-only import", () => {
  it("maps a paid-hours column and imports hours-only rows", () => {
    const rows = parseCsvText("Date,Paid hours,Employee\n2026-11-02,7.5,Ana\n2026-11-03,7.25,Ana\n");
    const mapping = guessColumnMapping(rows[0]);
    expect(mapping.paidHours).toBe(1);
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping, hasHeader: true });
    expect(result.errors).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.sessions.map(s => [s.date, s.mode, s.paidMinutes])).toEqual([
      ["2026-11-02", "hours", 450],
      ["2026-11-03", "hours", 435],
    ]);
  });
  it("holds a both-sides row as a conflict and imports neither side automatically", () => {
    const rows = parseCsvText("Date,Start,End,Paid hours\n2026-11-02,09:00,17:00,7.5\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.sessions).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].timesSession!.start).toBe("09:00");
    expect(result.conflicts[0].hoursSession.paidMinutes).toBe(450);
    expect(result.rows[0].warnings).toContain("This row contains both paid hours and start/end times. Choose one interpretation; the row is never counted twice.");
  });
  it("still offers the hours choice when the times candidate itself is invalid", () => {
    const rows = parseCsvText("Date,Start,End,Paid hours\n2026-11-02,17:00,09:00,7.5\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].timesSession).toBeNull();
    expect(result.conflicts[0].timesErrors.length).toBeGreaterThan(0);
    expect(result.conflicts[0].hoursSession.paidMinutes).toBe(450);
  });
  it("errors malformed or out-of-range paid hours instead of ignoring them", () => {
    const bad = parseCsvText("Date,Start,End,Paid hours\n2026-11-02,09:00,17:00,abc\n");
    const badResult = parseImportedRows(bad, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(bad[0]), hasHeader: true });
    expect(badResult.rows[0].errorCodes).toContain("import-paid-hours-malformed");
    const over = parseCsvText("Date,Paid hours\n2026-11-02,25\n");
    const overResult = parseImportedRows(over, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(over[0]), hasHeader: true });
    expect(overResult.rows[0].errorCodes).toContain("import-paid-hours-out-of-range");
  });
  it("errors rows with neither times nor paid hours", () => {
    const rows = parseCsvText("Date,Start,End,Paid hours\n2026-11-02,,,,\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.rows[0].errorCodes).toContain("import-no-entry");
  });
  it("warns when decided rows mix modes on one date", () => {
    const rows = parseCsvText("Date,Start,End,Paid hours\n2026-11-02,09:00,17:00,\n2026-11-02,,,7.5\n");
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.rows[1].warningCodes).toContain("import-mixed-mode-day");
  });
  it("parses the shipped sample CSV, including its hours-only row", () => {
    const rows = parseCsvText(buildSampleCsv());
    const result = parseImportedRows(rows, { dateFormat: "YYYY-MM-DD", mapping: guessColumnMapping(rows[0]), hasHeader: true });
    expect(result.errors).toEqual([]);
    expect(result.conflicts).toEqual([]);
    const hoursRow = result.sessions.find(s => s.date === "2026-11-06");
    expect(hoursRow?.mode).toBe("hours");
    expect(hoursRow?.paidMinutes).toBe(450);
  });
});

describe("hours-only reports and saved data", () => {
  it("marks hours rows as Hours only with blank start/end in CSV", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [hoursSession("2026-11-02", 450), session({ date: "2026-11-03", start: "09:00", end: "17:00", breakMinutes: 0 })],
    });
    const parsed = parseCsvText(buildTimesheetCsv(r, {}));
    expect(parsed[0]).toEqual(["Date", "Entry mode", "Start", "End", "Ends next day", "Unpaid break (minutes)", "Paid hours", "Paid minutes", "Paid time", "Paid decimal hours"]);
    // CSV keeps result order (times rows first, hours rows appended);
    // the PDF report is the chronologically sorted view.
    const hoursRow = parsed.find(row => row[0] === "2026-11-02")!;
    const timesRow = parsed.find(row => row[0] === "2026-11-03")!;
    expect(hoursRow).toEqual(["2026-11-02", "Hours only", "", "", "", "", "7.50", "450", "7h 30m", "7.50"]);
    expect(timesRow[1]).toBe("Start / End");
  });
  it("marks hours rows in the PDF report with blank start/end and sorts by date", () => {
    const r = calculateTimesheet({
      ...base,
      sessions: [session({ date: "2026-11-03", start: "09:00", end: "17:00", breakMinutes: 0 }), hoursSession("2026-11-02", 450)],
    });
    const report = buildTimesheetReport(r, { hourlyRate: null });
    expect(report.sessions[0]).toMatchObject({ date: "2026-11-02", mode: "hours", start: "", end: "", paidMinutes: 450 });
    expect(report.sessions[1]).toMatchObject({ date: "2026-11-03", mode: "times", start: "09:00" });
  });
  it("keeps older saved timesheets compatible and validates new hours rows", () => {
    const old = { version: 1, weekStart: "2026-11-02", period: "weekly", sessions: [{ id: "s1", date: "2026-11-02", start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 30 }], overtimeThresholdHours: 40, overtimeMultiplier: 1.5 };
    expect(validateSavedTimesheet(old)).not.toBeNull();
    const hours = { ...old, sessions: [hoursSession("2026-11-02", 450)] };
    expect(validateSavedTimesheet(hours)).not.toBeNull();
    const bad = { ...old, sessions: [hoursSession("2026-11-02", 1500)] };
    expect(validateSavedTimesheet(bad)).toBeNull();
    const badMode = { ...old, sessions: [{ id: "s1", date: "2026-11-02", mode: "other", start: "", end: "", endsNextDay: false, breakMinutes: 0 }] };
    expect(validateSavedTimesheet(badMode)).toBeNull();
  });
});
