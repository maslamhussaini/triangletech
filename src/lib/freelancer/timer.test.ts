import { describe, expect, it } from "vitest";
import {
  elapsedMinutes,
  elapsedMs,
  formatElapsed,
  pauseTimer,
  resumeTimer,
  startTimer,
  timerToSession,
  validateRunningTimer,
  type RunningTimer,
} from "./timer";

const T0 = new Date("2026-11-07T09:00:00.000Z");

function timerAtStart(): RunningTimer {
  return startTimer({ clientId: "c-1", projectId: "p-1", date: "2026-11-07", now: T0 });
}

describe("timer: elapsed math", () => {
  it("starts at zero and accumulates wall-clock time while running", () => {
    const t = timerAtStart();
    expect(elapsedMs(t, T0)).toBe(0);
    expect(elapsedMs(t, new Date("2026-11-07T09:30:00.000Z"))).toBe(30 * 60 * 1000);
    expect(elapsedMinutes(t, new Date("2026-11-07T10:30:45.000Z"))).toBe(91); // nearest minute
  });

  it("a clock set backwards mid-run never shows negative elapsed", () => {
    const t = timerAtStart();
    expect(elapsedMs(t, new Date("2026-11-07T08:00:00.000Z"))).toBe(0);
  });

  it("formats H:MM:SS", () => {
    const t = timerAtStart();
    expect(formatElapsed(t, new Date("2026-11-07T10:05:07.000Z"))).toBe("1:05:07");
    expect(formatElapsed(t, T0)).toBe("0:00:00");
  });
});

describe("timer: pause / resume", () => {
  it("pausing banks the segment; the paused interval adds nothing", () => {
    const t = timerAtStart();
    const paused = pauseTimer(t, new Date("2026-11-07T09:30:00.000Z"));
    expect(paused.status).toBe("paused");
    expect(paused.accumulatedMs).toBe(30 * 60 * 1000);
    expect(paused.lastResumedAt).toBeNull();
    // 10 minutes pass while paused: elapsed stays 30 minutes.
    expect(elapsedMs(paused, new Date("2026-11-07T09:40:00.000Z"))).toBe(30 * 60 * 1000);
  });

  it("resuming continues from the banked total, not from zero", () => {
    const t = timerAtStart();
    const paused = pauseTimer(t, new Date("2026-11-07T09:30:00.000Z"));
    const resumed = resumeTimer(paused, new Date("2026-11-07T09:40:00.000Z"));
    expect(resumed.status).toBe("running");
    expect(elapsedMs(resumed, new Date("2026-11-07T10:00:00.000Z"))).toBe(50 * 60 * 1000);
  });

  it("pause on a paused timer and resume on a running timer are no-ops", () => {
    const t = timerAtStart();
    const paused = pauseTimer(t, new Date("2026-11-07T09:10:00.000Z"));
    expect(pauseTimer(paused, new Date("2026-11-07T09:20:00.000Z"))).toEqual(paused);
    expect(resumeTimer(t, new Date("2026-11-07T09:20:00.000Z"))).toEqual(t);
  });

  it("multiple pause/resume cycles accumulate exactly", () => {
    let t = timerAtStart();
    t = pauseTimer(t, new Date("2026-11-07T09:15:00.000Z")); // 15 min
    t = resumeTimer(t, new Date("2026-11-07T09:20:00.000Z"));
    t = pauseTimer(t, new Date("2026-11-07T09:50:00.000Z")); // +30 min
    t = resumeTimer(t, new Date("2026-11-07T10:00:00.000Z"));
    expect(elapsedMinutes(t, new Date("2026-11-07T10:15:00.000Z"))).toBe(60);
  });
});

describe("timer: convert to session", () => {
  it("deducts the break and returns direct hours", () => {
    const t = timerAtStart();
    const session = timerToSession(t, new Date("2026-11-07T10:30:00.000Z"), 30);
    expect(session.grossMinutes).toBe(90);
    expect(session.paidMinutes).toBe(60);
    expect(session.directHours).toBe(1);
    expect(session.clientId).toBe("c-1");
    expect(session.projectId).toBe("p-1");
    expect(session.date).toBe("2026-11-07");
  });

  it("a break longer than the elapsed time clamps paid minutes at zero (caller must reject it)", () => {
    const t = timerAtStart();
    const session = timerToSession(t, new Date("2026-11-07T09:20:00.000Z"), 30);
    expect(session.grossMinutes).toBe(20);
    expect(session.paidMinutes).toBe(0);
    expect(session.directHours).toBe(0);
  });

  it("a paused timer converts from its banked total only", () => {
    const t = pauseTimer(timerAtStart(), new Date("2026-11-07T09:45:00.000Z"));
    const session = timerToSession(t, new Date("2026-11-07T11:00:00.000Z"), 0);
    expect(session.grossMinutes).toBe(45);
    expect(session.paidMinutes).toBe(45);
  });
});

describe("timer: persisted state validation", () => {
  it("null is valid (no timer running)", () => {
    expect(validateRunningTimer(null)).toEqual([]);
  });

  it("a running timer with a null lastResumedAt is invalid", () => {
    const t = { ...timerAtStart(), lastResumedAt: null };
    expect(validateRunningTimer(t)).not.toHaveLength(0);
  });

  it("a paused timer with a set lastResumedAt is invalid", () => {
    const t = { ...pauseTimer(timerAtStart(), new Date("2026-11-07T09:10:00.000Z")), lastResumedAt: "2026-11-07T09:10:00.000Z" };
    expect(validateRunningTimer(t)).not.toHaveLength(0);
  });

  it("a negative accumulated time is invalid", () => {
    const t = { ...timerAtStart(), accumulatedMs: -1 };
    expect(validateRunningTimer(t)).not.toHaveLength(0);
  });
});
