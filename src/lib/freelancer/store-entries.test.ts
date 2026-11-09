import { describe, expect, it } from "vitest";
import { FreelancerStore, STORE_FILE, createMemoryFileAdapter } from "./store";
import { startTimer, pauseTimer, timerToSession, elapsedMinutes } from "./timer";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

describe("store: updateEntry / deleteEntry (M2)", () => {
  it("edits times and break, keeping the original rate snapshot", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const [entry] = await addEntries(store, client.id, WEEK_45H.slice(0, 1));
    expect(entry?.rateCentsAtEntry).toBe(5000);
    await store.updateClient(client.id, { defaultRateCents: 9000 });
    const updated = await store.updateEntry(entry?.id as string, { endTime: "19:30", breakMinutes: 60 }, testSettings());
    expect(updated.endTime).toBe("19:30");
    expect(updated.breakMinutes).toBe(60);
    expect(updated.rateCentsAtEntry).toBe(5000); // R-2: rate changes never rewrite recorded sessions
  });

  it("re-resolves the rate when the session moves to a different client", async () => {
    const { store } = await openTestStore();
    const a = await makeClient(store, { name: "A", defaultRateCents: 5000 });
    const b = await makeClient(store, { name: "B", defaultRateCents: 8000 });
    const [entry] = await addEntries(store, a.id, WEEK_45H.slice(0, 1));
    const updated = await store.updateEntry(entry?.id as string, { clientId: b.id }, testSettings());
    expect(updated.clientId).toBe(b.id);
    expect(updated.rateCentsAtEntry).toBe(8000);
  });

  it("re-resolves the rate when the session moves to a project with an override", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const project = await store.createProject({ clientId: client.id, name: "Rush job", rateOverrideCents: 12000, archived: false });
    const [entry] = await addEntries(store, client.id, WEEK_45H.slice(0, 1));
    const updated = await store.updateEntry(entry?.id as string, { projectId: project.id }, testSettings());
    expect(updated.rateCentsAtEntry).toBe(12000);
  });

  it("rejects an edit that would make the session invalid (no silent fix)", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const [entry] = await addEntries(store, client.id, WEEK_45H.slice(0, 1));
    await expect(store.updateEntry(entry?.id as string, { date: "2026-13-02" }, testSettings())).rejects.toThrow(/Invalid entry/);
    // The stored entry is untouched.
    expect(store.getEntry(entry?.id as string)?.date).toBe("2026-11-02");
  });

  it("rejects edits and deletes of invoiced sessions", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const [entry] = await addEntries(store, client.id, WEEK_45H.slice(0, 1));
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: [entry?.id as string], issueDate: "2026-11-02" },
      testSettings()
    );
    expect(store.getEntry(entry?.id as string)?.invoiceId).toBe(invoice.id);
    await expect(store.updateEntry(entry?.id as string, { breakMinutes: 0 }, testSettings())).rejects.toThrow(/already on invoice/);
    await expect(store.deleteEntry(entry?.id as string)).rejects.toThrow(/already on invoice/);
    expect(store.getEntry(entry?.id as string)).toBeDefined();
  });

  it("deletes an uninvoiced session", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const [entry] = await addEntries(store, client.id, WEEK_45H.slice(0, 1));
    await store.deleteEntry(entry?.id as string);
    expect(store.getEntry(entry?.id as string)).toBeUndefined();
    expect(store.document.entries).toHaveLength(0);
  });

  it("throws for unknown entry ids", async () => {
    const { store } = await openTestStore();
    await expect(store.updateEntry("missing", { breakMinutes: 0 }, testSettings())).rejects.toThrow(/does not exist/);
    await expect(store.deleteEntry("missing")).rejects.toThrow(/does not exist/);
  });
});

describe("store: running timer survives a store reload (M2)", () => {
  it("a running timer is still running after reopening the store from the same files", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const client = await makeClient(store);
    const timer = startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") });
    await store.setRunningTimer(timer);
    // Simulate an app kill: reopen from the same adapter (same files).
    const { store: relaunched } = await FreelancerStore.open(adapter);
    const restored = relaunched.document.runningTimer;
    expect(restored).not.toBeNull();
    expect(restored?.id).toBe(timer.id);
    expect(restored?.status).toBe("running");
    // Elapsed is re-derived from the persisted timestamp: 90 minutes later.
    expect(elapsedMinutes(restored as NonNullable<typeof restored>, new Date("2026-11-07T10:30:00.000Z"))).toBe(90);
  });

  it("a paused timer keeps its banked time across a reload", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const client = await makeClient(store);
    const timer = pauseTimer(startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") }), new Date("2026-11-07T09:45:00.000Z"));
    await store.setRunningTimer(timer);
    const { store: relaunched } = await FreelancerStore.open(adapter);
    const restored = relaunched.document.runningTimer;
    expect(restored?.status).toBe("paused");
    expect(restored?.accumulatedMs).toBe(45 * 60 * 1000);
  });

  it("clearing the timer persists the clear across a reload", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const client = await makeClient(store);
    await store.setRunningTimer(startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") }));
    await store.setRunningTimer(null);
    const { store: relaunched } = await FreelancerStore.open(adapter);
    expect(relaunched.document.runningTimer).toBeNull();
  });

  it("a v2 document on disk migrates to v4 on load with runningTimer null (M4: chain continues v3 → v4)", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    await makeClient(store);
    // Rewrite the live file as a v2 document (drop runningTimer, version 2).
    const raw = JSON.parse((await adapter.readText(STORE_FILE)) as string) as Record<string, unknown>;
    delete raw.runningTimer;
    raw.schemaVersion = 2;
    await adapter.writeText(STORE_FILE, JSON.stringify(raw));
    const { store: migrated, load } = await FreelancerStore.open(adapter);
    expect(migrated.document.schemaVersion).toBe(4);
    expect(migrated.document.runningTimer).toBeNull();
    expect(migrated.document.proEntitlement).toBeNull();
    expect(migrated.document.clients).toHaveLength(1);
    expect(load.migrationReport.join(" ")).toContain("v2 → v3");
    expect(load.migrationReport.join(" ")).toContain("v3 → v4");
  });
});

describe("store: convertTimerToSession (M2)", () => {
  it("creates a timer-origin direct session and clears the timer in one write", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const timer = startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") });
    await store.setRunningTimer(timer);
    const session = timerToSession(timer, new Date("2026-11-07T10:30:00.000Z"), 30);
    const entry = await store.convertTimerToSession(timer, { directHours: session.directHours, breakMinutes: 30 }, testSettings());
    expect(entry.origin).toBe("timer");
    expect(entry.mode).toBe("direct");
    expect(entry.directHours).toBe(1);
    expect(entry.breakMinutes).toBe(30);
    expect(entry.rateCentsAtEntry).toBe(5000);
    expect(store.document.runningTimer).toBeNull();
    expect(store.document.entries).toHaveLength(1);
  });

  it("refuses to convert when no matching timer is running", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const timer = startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") });
    await expect(store.convertTimerToSession(timer, { directHours: 1, breakMinutes: 0 }, testSettings())).rejects.toThrow(/no matching timer/);
    expect(store.document.entries).toHaveLength(0);
  });

  it("refuses a zero-hour conversion and keeps the timer running", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    const timer = startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") });
    await store.setRunningTimer(timer);
    await expect(store.convertTimerToSession(timer, { directHours: 0, breakMinutes: 0 }, testSettings())).rejects.toThrow(/zero paid hours/);
    expect(store.document.runningTimer?.id).toBe(timer.id);
    expect(store.document.entries).toHaveLength(0);
  });

  it("a write fault during conversion leaves no session and the timer running", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const client = await makeClient(store);
    const timer = startTimer({ clientId: client.id, date: "2026-11-07", now: new Date("2026-11-07T09:00:00.000Z") });
    await store.setRunningTimer(timer);
    adapter.faults.failWrite = true;
    await expect(store.convertTimerToSession(timer, { directHours: 1, breakMinutes: 0 }, testSettings())).rejects.toThrow();
    adapter.faults.failWrite = undefined;
    expect(store.document.entries).toHaveLength(0);
    expect(store.document.runningTimer?.id).toBe(timer.id);
    // And the timer is still recoverable from disk.
    const { store: relaunched } = await FreelancerStore.open(adapter);
    expect(relaunched.document.runningTimer?.id).toBe(timer.id);
  });
});
