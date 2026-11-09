import { describe, expect, it } from "vitest";
import { calculateClientPay, mondayOf, resolveRateCents } from "./rates";
import { createMemoryFileAdapter, FreelancerStore } from "./store";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

describe("rates: resolution order (R-C1)", () => {
  it("project override beats client default beats app default", () => {
    expect(resolveRateCents({ projectRateOverrideCents: 7000, clientDefaultRateCents: 5000, appDefaultRateCents: 3000 })).toBe(7000);
    expect(resolveRateCents({ clientDefaultRateCents: 5000, appDefaultRateCents: 3000 })).toBe(5000);
    expect(resolveRateCents({ projectRateOverrideCents: undefined, clientDefaultRateCents: 5000, appDefaultRateCents: null })).toBe(5000);
  });

  it("a session snapshots the project override at creation", async () => {
    const { store } = await openTestStore();
    const settings = testSettings({ defaultRateCents: 3000 });
    const client = await makeClient(store, { defaultRateCents: 5000 });
    const project = await store.createProject({ clientId: client.id, name: "Site rebuild", rateOverrideCents: 7000, archived: false });
    const [entry] = await addEntries(store, client.id, [WEEK_45H[0] as (typeof WEEK_45H)[number]], settings, project.id);
    expect(entry?.rateCentsAtEntry).toBe(7000);
  });

  it("a session without a project snapshots the client default", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store, { defaultRateCents: 5000 });
    const [entry] = await addEntries(store, client.id, [WEEK_45H[0] as (typeof WEEK_45H)[number]], testSettings({ defaultRateCents: 3000 }));
    expect(entry?.rateCentsAtEntry).toBe(5000);
  });
});

describe("rates: snapshot (R-C2)", () => {
  it("changing the client rate afterwards leaves the recorded session and its pay unchanged", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const settings = testSettings();
    const client = await makeClient(store, { defaultRateCents: 5000 });
    const [entry] = await addEntries(store, client.id, [WEEK_45H[0] as (typeof WEEK_45H)[number]], settings);
    const before = calculateClientPay(store.document, client, "2026-11-02", "2026-11-02", settings);
    expect(before.payCents).toBe(45000); // 9h × $50
    await store.updateClient(client.id, { defaultRateCents: 9000 });
    // Reload from disk (fresh instance over the same adapter).
    const { store: relaunched } = await FreelancerStore.open(adapter);
    const reloaded = relaunched.getEntry(entry?.id as string);
    expect(reloaded?.rateCentsAtEntry).toBe(5000);
    const updatedClient = relaunched.getClient(client.id);
    expect(updatedClient?.defaultRateCents).toBe(9000);
    const after = calculateClientPay(relaunched.document, updatedClient!, "2026-11-02", "2026-11-02", settings);
    expect(after.payCents).toBe(45000);
  });
});

describe("rates: per-client overtime isolation (R-C3, normative R-5 example)", () => {
  it("A 45h with OT on (40h/1.5×) + B 10h with OT off: A 40 reg + 5 OT, B 10 reg, total 50 reg + 5 OT", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const clientA = await makeClient(store, {
      name: "Client A",
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const clientB = await makeClient(store, {
      name: "Client B",
      defaultRateCents: 3000,
      overtimeEnabled: false,
    });
    await addEntries(store, clientA.id, WEEK_45H, settings);
    await addEntries(store, clientB.id, [{ date: "2026-11-02", startTime: "09:00", endTime: "19:30", breakMinutes: 30 }], settings);
    const doc = store.document;
    const payA = calculateClientPay(doc, clientA, "2026-11-02", "2026-11-06", settings);
    const payB = calculateClientPay(doc, clientB, "2026-11-02", "2026-11-06", settings);
    expect(payA.totalMinutes).toBe(45 * 60);
    expect(payA.regularMinutes).toBe(40 * 60);
    expect(payA.overtimeMinutes).toBe(5 * 60);
    expect(payA.payCents).toBe(237500); // 40×$50 + 5×$50×1.5 = $2,375.00
    expect(payB.totalMinutes).toBe(10 * 60);
    expect(payB.regularMinutes).toBe(10 * 60);
    expect(payB.overtimeMinutes).toBe(0);
    expect(payB.payCents).toBe(30000); // 10×$30
    expect(payA.regularMinutes + payB.regularMinutes).toBe(50 * 60);
    expect(payA.overtimeMinutes + payB.overtimeMinutes).toBe(5 * 60);
  });

  it("overtime-off-everywhere variant: the same 45h week is 45 regular, 0 overtime", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { defaultRateCents: 5000, overtimeEnabled: false });
    await addEntries(store, client.id, WEEK_45H, settings);
    const pay = calculateClientPay(store.document, client, "2026-11-02", "2026-11-06", settings);
    expect(pay.regularMinutes).toBe(45 * 60);
    expect(pay.overtimeMinutes).toBe(0);
    expect(pay.payCents).toBe(225000); // 45 × $50
  });
});

describe("rates: overtime-off default (R-C4)", () => {
  it("fresh-install defaults have overtime off at app level", () => {
    expect(testSettings().overtimeEnabled).toBe(false);
  });

  it("a newly created client has no overtime override, so the app default (off) applies", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store, { defaultRateCents: 5000 });
    expect(client.overtimeEnabled).toBeUndefined();
    const settings = testSettings();
    await addEntries(store, client.id, WEEK_45H, settings);
    const pay = calculateClientPay(store.document, client, "2026-11-02", "2026-11-06", settings);
    expect(pay.regularMinutes).toBe(45 * 60);
    expect(pay.overtimeMinutes).toBe(0);
  });
});

describe("rates: overnight + break behaviour (R-6)", () => {
  it("an overnight shift splits at midnight and the break-allocation warning survives", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    // Sunday 2026-11-01 22:00 → Monday 02:00, 30-min break: the split
    // crosses the Monday workweek boundary, so the engine warns.
    const client = await makeClient(store, {
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    await addEntries(
      store,
      client.id,
      [{ date: "2026-11-01", startTime: "22:00", endTime: "02:00", endsNextDay: true, breakMinutes: 30 }],
      settings
    );
    const pay = calculateClientPay(store.document, client, "2026-11-01", "2026-11-02", settings);
    expect(pay.totalMinutes).toBe(210); // 4h − 30m break
    expect(pay.warnings.some((w) => w.code === "break-allocation-overtime")).toBe(true);
  });

  it("mondayOf maps any date to its Monday", () => {
    expect(mondayOf("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(mondayOf("2026-11-07")).toBe("2026-11-02"); // Saturday
    expect(mondayOf("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(mondayOf("2026-11-09")).toBe("2026-11-09"); // next Monday
  });
});
