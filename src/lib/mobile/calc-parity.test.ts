import { describe, expect, it } from "vitest";
import {
  calculateTimesheet,
  decimalHours,
  decimalHoursToMinutes,
  formatDuration,
  formatMoney,
  type SessionInput,
} from "@/lib/tools/time-card";
import { calculateProfit } from "@/lib/tools/cost-profit";
import { convertAmount, formatConvertedCurrency } from "@/lib/tools/exchange-rate";

/**
 * Mobile calc-parity spot checks (Phase 5b).
 *
 * The mobile app ships the SAME engine source files as the website — the
 * export is built from this commit, not a reimplementation — so parity is
 * proved by (1) these hand-computed scenario assertions on the shared
 * engines, (2) the full suite (377+ tests), and (3) the served-export
 * check in QA_RESULTS.md that the mobile bundle loads the tool pages and
 * their JS chunks. Expected values below were computed by hand, not copied
 * from the implementation.
 */
function session(partial: Partial<SessionInput> & { date: string }): SessionInput {
  return {
    id: `s-${partial.date}-${partial.start ?? "x"}`,
    start: "09:00",
    end: "17:30",
    endsNextDay: false,
    breakMinutes: 30,
    ...partial,
  };
}

const base = {
  weekStart: "2026-11-02",
  period: "weekly" as const,
  overtimeThresholdHours: 40,
  overtimeMultiplier: 1.5,
};

describe("mobile parity: Time Card overnight / breaks / overtime", () => {
  it("overnight 22:00-06:00 with 30m break = 7h30m paid, break split 7/23 across dates", () => {
    // Gross 480m: 120m on 2026-11-02, 360m on 2026-11-03. Break 30m
    // allocated proportionally: 30*120/480 = 7.5 -> 7; 30*360/480 = 22.5 -> 23.
    const r = calculateTimesheet({
      ...base,
      sessions: [session({ date: "2026-11-02", start: "22:00", end: "06:00", endsNextDay: true })],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(450);
    expect(r.sessions[0].segments.find((s) => s.date === "2026-11-02")!.breakMinutes).toBe(7);
    expect(r.sessions[0].segments.find((s) => s.date === "2026-11-03")!.breakMinutes).toBe(23);
    expect(formatDuration(450)).toBe("7h 30m");
  });

  it("46h week at $20/hr, 40h threshold, 1.5x = 40 regular + 6 overtime = $980.00", () => {
    // 5x 9h (08:00-17:00, no break) = 45h + 1h Saturday = 46h.
    // Pay: 40*20 + 6*30 = 800 + 180 = 980 -> 98000 cents.
    const sessions = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map((d) =>
      session({ date: d, start: "08:00", end: "17:00", breakMinutes: 0 }),
    );
    sessions.push(session({ date: "2026-11-07", start: "08:00", end: "09:00", breakMinutes: 0 }));
    const r = calculateTimesheet({ ...base, sessions, hourlyRate: 20, currency: "USD" });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(46 * 60);
    expect(r.regularMinutes).toBe(40 * 60);
    expect(r.overtimeMinutes).toBe(6 * 60);
    expect(r.payCents).toBe(98000);
    expect(formatMoney(98000, "USD")).toBe("$980.00");
  });
});

describe("mobile parity: Work Hours (same time-card engine)", () => {
  it("single shift 09:00-17:00 with 60m break = 7h paid", () => {
    // Work Hours calculator calls calculateTimesheet with one session.
    const r = calculateTimesheet({
      ...base,
      sessions: [session({ date: "2026-11-02", start: "09:00", end: "17:00", breakMinutes: 60 })],
    });
    expect(r.errors).toEqual([]);
    expect(r.totalMinutes).toBe(420);
    expect(decimalHours(420)).toBe(7);
    expect(formatDecimalHoursCheck(r.totalMinutes)).toBe("7.00");
  });
});

function formatDecimalHoursCheck(minutes: number): string {
  // decimal hours rendered with 2 places, as the Work Hours UI shows them.
  return (minutes / 60).toFixed(2);
}

describe("mobile parity: currency rounding", () => {
  it("profit engine: $200 price, $100 landed, $30 expenses -> $70 net, 50% gross / 35% net margin", () => {
    const r = calculateProfit({
      mode: "profit",
      sellingPrice: 200,
      productCost: 80,
      freight: 10,
      duty: 0,
      packaging: 10,
      marketplaceFee: 20,
      paymentFee: 5,
      advertising: 5,
      affiliateCommission: 0,
      otherExpense: 0,
      currency: "USD",
    });
    expect(r.netProfit).toBe(70);
    expect(r.grossMargin).toBe(50);
    expect(r.netMargin).toBe(35);
  });

  it("exchange conversion + formatting round to cents (100 USD at 278.50 PKR = 27,850.00)", () => {
    expect(convertAmount(100, 278.5)).toBe(27850);
    expect(formatConvertedCurrency(27850, "PKR")).toContain("27,850.00");
    expect(convertAmount(10.005, 1)).toBeCloseTo(10.005, 10);
    expect(decimalHoursToMinutes(1.5)).toBe(90);
  });
});
