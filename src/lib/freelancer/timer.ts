/**
 * Freelancer Time & Invoice — stopwatch (M2).
 *
 * Pure timer math + state. No storage, no UI here: the running timer is
 * persisted as `runningTimer` on the store document (schema v3, see
 * models.ts), so it survives an app kill/restart and a store reload.
 *
 * Elapsed time is WALL-CLOCK derived from timestamps — no background
 * execution is needed (and none is claimed): while running,
 * `elapsed = accumulatedMs + (now - lastResumedAt)`. Pausing banks the
 * current segment into `accumulatedMs` and clears `lastResumedAt`, so a
 * restart mid-pause loses nothing and a restart mid-run loses nothing
 * either (the segment is re-derived from `lastResumedAt` on load).
 *
 * Stop converts the timer to a session through the existing session
 * creation path (store.createEntry, origin "timer", mode "direct"):
 * the stopwatch measures WORKED time with pauses excluded, so the
 * faithful session shape is direct hours, not a wall-clock start/end
 * pair (a start/end pair would silently re-include paused time).
 * `timerToSession` returns the exact direct-hours input for that call;
 * the break prompt in the UI supplies `breakMinutes`.
 * Elapsed seconds round to the NEAREST minute (the lifted engine's
 * `directHoursToMinutes` uses the same nearest-minute rule), so a stop
 * at 1h 30m 45s records 91 paid minutes before the break deduction.
 */
import { newId } from "./models";

export type TimerStatus = "running" | "paused";

/** Persisted running-timer state (one timer at a time — M2 scope). */
export type RunningTimer = {
  id: string;
  clientId: string;
  projectId?: string;
  /** YYYY-MM-DD, the day the timer counts toward (the day it started). */
  date: string;
  /** ISO timestamp of the first start (never changes across pauses). */
  startedAt: string;
  /** ISO timestamp the current running segment started; null while paused. */
  lastResumedAt: string | null;
  /** Elapsed milliseconds banked by finished running segments. */
  accumulatedMs: number;
  status: TimerStatus;
  notes?: string;
};

export function startTimer(args: {
  clientId: string;
  projectId?: string;
  date: string;
  notes?: string;
  now?: Date;
}): RunningTimer {
  const now = (args.now ?? new Date()).toISOString();
  return {
    id: newId(),
    clientId: args.clientId,
    ...(args.projectId ? { projectId: args.projectId } : {}),
    date: args.date,
    startedAt: now,
    lastResumedAt: now,
    accumulatedMs: 0,
    status: "running",
    ...(args.notes ? { notes: args.notes } : {}),
  };
}

/** Wall-clock elapsed milliseconds at `now` (pure — no clock reads). */
export function elapsedMs(timer: RunningTimer, now: Date): number {
  const banked = timer.accumulatedMs;
  if (timer.status !== "running" || timer.lastResumedAt === null) return banked;
  const segment = now.getTime() - new Date(timer.lastResumedAt).getTime();
  // A clock set backwards mid-run must never show negative elapsed.
  return banked + Math.max(0, segment);
}

/** Pause: bank the current segment, stop the wall-clock accumulation. */
export function pauseTimer(timer: RunningTimer, now: Date): RunningTimer {
  if (timer.status !== "running") return timer;
  return { ...timer, accumulatedMs: elapsedMs(timer, now), lastResumedAt: null, status: "paused" };
}

/** Resume a paused timer: open a new running segment from `now`. */
export function resumeTimer(timer: RunningTimer, now: Date): RunningTimer {
  if (timer.status !== "paused") return timer;
  return { ...timer, lastResumedAt: now.toISOString(), status: "running" };
}

/** Elapsed whole minutes (nearest minute) at `now`. */
export function elapsedMinutes(timer: RunningTimer, now: Date): number {
  return Math.round(elapsedMs(timer, now) / 60000);
}

/** "H:MM:SS" display of the wall-clock elapsed time at `now`. */
export function formatElapsed(timer: RunningTimer, now: Date): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs(timer, now) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type TimerSessionInput = {
  clientId: string;
  projectId?: string;
  date: string;
  /** Decimal direct hours (paid minutes / 60). */
  directHours: number;
  /** Paid minutes after the break deduction (integer). */
  paidMinutes: number;
  /** Gross elapsed minutes before the break deduction (integer). */
  grossMinutes: number;
  breakMinutes: number;
  notes?: string;
};

/**
 * Convert a stopped timer to the direct-hours session input for
 * `store.createEntry` (origin "timer"). The break is deducted from the
 * elapsed minutes and the result is clamped at zero — a break longer
 * than the elapsed time records a zero-minute session input, which the
 * caller must reject with a visible error (direct hours must be > 0),
 * never silently store.
 */
export function timerToSession(timer: RunningTimer, now: Date, breakMinutes: number): TimerSessionInput {
  const grossMinutes = elapsedMinutes(timer, now);
  const paidMinutes = Math.max(0, grossMinutes - Math.max(0, Math.floor(breakMinutes)));
  return {
    clientId: timer.clientId,
    ...(timer.projectId ? { projectId: timer.projectId } : {}),
    date: timer.date,
    directHours: paidMinutes / 60,
    paidMinutes,
    grossMinutes,
    breakMinutes: Math.max(0, Math.floor(breakMinutes)),
    ...(timer.notes ? { notes: timer.notes } : {}),
  };
}

/** Validate persisted timer state (used by models.validateStoreDocument for v3). */
export function validateRunningTimer(v: unknown, where = "runningTimer"): string[] {
  const errors: string[] = [];
  if (v === null) return errors;
  if (typeof v !== "object" || Array.isArray(v)) return [`${where} must be null or an object`];
  const t = v as Record<string, unknown>;
  if (typeof t.id !== "string" || !t.id) errors.push(`${where}.id must be a non-empty string`);
  if (typeof t.clientId !== "string" || !t.clientId) errors.push(`${where}.clientId must be a non-empty string`);
  if (t.projectId !== undefined && typeof t.projectId !== "string") errors.push(`${where}.projectId must be a string`);
  if (typeof t.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) errors.push(`${where}.date must be a YYYY-MM-DD date`);
  if (typeof t.startedAt !== "string" || Number.isNaN(Date.parse(t.startedAt))) errors.push(`${where}.startedAt must be an ISO timestamp`);
  if (t.lastResumedAt !== null && (typeof t.lastResumedAt !== "string" || Number.isNaN(Date.parse(t.lastResumedAt as string)))) {
    errors.push(`${where}.lastResumedAt must be null or an ISO timestamp`);
  }
  if (typeof t.accumulatedMs !== "number" || !Number.isFinite(t.accumulatedMs) || t.accumulatedMs < 0) {
    errors.push(`${where}.accumulatedMs must be a non-negative number`);
  }
  if (t.status !== "running" && t.status !== "paused") errors.push(`${where}.status must be "running" or "paused"`);
  if (t.status === "running" && t.lastResumedAt === null) errors.push(`${where}.lastResumedAt must be set while running`);
  if (t.status === "paused" && t.lastResumedAt !== null) errors.push(`${where}.lastResumedAt must be null while paused`);
  return errors;
}
