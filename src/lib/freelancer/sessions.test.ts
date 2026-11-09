import { describe, expect, it } from "vitest";
import { groupEntriesByWeek, sessionPayCents } from "./sessions";
import { emptyStoreDocument } from "./models";
import { FreelancerStore, STORE_FILE } from "./store";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

describe("sessions: grouping by week and day", () => {
  it("groups a 45h week into 5 days, newest first, with totals and pay", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    await addEntries(store, client.id, WEEK_45H);
    const weeks = groupEntriesByWeek(store.document, client, "2026-11-02", "2026-11-06", testSettings());
    expect(weeks).toHaveLength(1);
    const week = weeks[0] as NonNullable<typeof weeks[0]>;
    expect(week.weekStart).toBe("2026-11-02");
    expect(week.weekEnd).toBe("2026-11-08");
    expect(week.totalMinutes).toBe(45 * 60);
    expect(week.regularMinutes).toBe(45 * 60);
    expect(week.overtimeMinutes).toBe(0);
    expect(week.payCents).toBe(45 * 5000); // 45h × $50
    expect(week.days.map((d) => d.date)).toEqual([
      "2026-11-06",
      "2026-11-05",
      "2026-11-04",
      "2026-11-03",
      "2026-11-02",
    ]);
    for (const day of week.days) {
      expect(day.paidMinutes).toBe(9 * 60);
      expect(day.payCents).toBe(9 * 5000); // 9h × $50
    }
  });

  it("attributes overtime chronologically: Friday carries the 5 overtime hours", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store, { overtimeEnabled: true, overtimeThresholdHours: 40, overtimeMultiplier: 1.5 });
    await addEntries(store, client.id, WEEK_45H);
    const [week] = groupEntriesByWeek(store.document, client, "2026-11-02", "2026-11-06", testSettings());
    expect(week?.totalMinutes).toBe(45 * 60);
    expect(week?.regularMinutes).toBe(40 * 60);
    expect(week?.overtimeMinutes).toBe(5 * 60);
    expect(week?.payCents).toBe(40 * 5000 + 5 * 7500); // 40h × $50 + 5h × $75
    const friday = week?.days.find((d) => d.date === "2026-11-06");
    expect(friday?.regularMinutes).toBe(4 * 60);
    expect(friday?.overtimeMinutes).toBe(5 * 60);
    expect(friday?.payCents).toBe(4 * 5000 + 5 * 7500);
    const monday = week?.days.find((d) => d.date === "2026-11-02");
    expect(monday?.overtimeMinutes).toBe(0);
    expect(monday?.payCents).toBe(9 * 5000);
  });

  it("a Sunday overnight shift is split across both adjacent weeks (minutes exact in each)", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    await addEntries(store, client.id, [
      { date: "2026-11-01", startTime: "22:00", endTime: "06:00", endsNextDay: true, breakMinutes: 0 },
    ]);
    const weeks = groupEntriesByWeek(store.document, client, "2026-10-26", "2026-11-08", testSettings());
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-11-02", "2026-10-26"]); // newest first
    const mondayWeek = weeks.find((w) => w.weekStart === "2026-11-02");
    const sundayWeek = weeks.find((w) => w.weekStart === "2026-10-26");
    expect(sundayWeek?.totalMinutes).toBe(2 * 60); // 22:00–24:00 Sunday
    expect(mondayWeek?.totalMinutes).toBe(6 * 60); // 00:00–06:00 Monday
    expect(sundayWeek?.days[0]?.date).toBe("2026-11-01");
    expect(mondayWeek?.days[0]?.date).toBe("2026-11-01"); // same entry, Monday minutes
  });

  it("direct-hours entries group under their date with the entered hours", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    await addEntries(store, client.id, [{ date: "2026-11-03", mode: "direct", directHours: 7.5 }]);
    const [week] = groupEntriesByWeek(store.document, client, "2026-11-02", "2026-11-06", testSettings());
    expect(week?.days).toHaveLength(1);
    expect(week?.days[0]?.paidMinutes).toBe(450);
    expect(week?.days[0]?.payCents).toBe(Math.round(7.5 * 5000));
  });

  it("weeks with no entries are omitted and an invalid range throws", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store);
    await addEntries(store, client.id, WEEK_45H);
    const weeks = groupEntriesByWeek(store.document, client, "2026-11-02", "2026-11-15", testSettings());
    expect(weeks).toHaveLength(1); // the 2026-11-09 week has no entries
    expect(() => groupEntriesByWeek(store.document, client, "2026-11-06", "2026-11-02", testSettings())).toThrow(/Invalid grouping range/);
    expect(() => groupEntriesByWeek(store.document, client, "2026-13-02", "2026-11-06", testSettings())).toThrow(/Invalid grouping range/);
  });

  it("an entry with no snapshot rate shows null pay, not zero", async () => {
    // A null snapshot rate cannot arise through createEntry (a client
    // always carries a numeric default), but the model allows it — the
    // UI must show "no rate set", never $0.00. Inject such a document
    // directly and group it.
    const { adapter } = await openTestStore();
    const doc = emptyStoreDocument();
    doc.clients.push({
      id: "c-norate",
      name: "No Rate Ltd",
      currency: "USD",
      defaultRateCents: 5000,
      paymentTermsDays: 14,
      archived: false,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
    doc.entries.push({
      id: "e-norate",
      clientId: "c-norate",
      date: "2026-11-02",
      startTime: "09:00",
      endTime: "17:00",
      endsNextDay: false,
      breakMinutes: 0,
      mode: "times",
      origin: "manual",
      rateCentsAtEntry: null,
      invoiceId: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
    await adapter.writeText(STORE_FILE, JSON.stringify(doc));
    const { store } = await FreelancerStore.open(adapter);
    const client = store.document.clients[0] as NonNullable<typeof store.document.clients[0]>;
    const [week] = groupEntriesByWeek(store.document, client, "2026-11-02", "2026-11-06", testSettings());
    expect(week?.totalMinutes).toBe(8 * 60);
    expect(week?.payCents).toBeNull();
    expect(week?.days[0]?.payCents).toBeNull();
  });
});

describe("sessions: per-session pay", () => {
  it("returns null without a rate and applies the multiplier only when overtime is on", () => {
    expect(sessionPayCents(60, 60, null, 1.5, true)).toBeNull();
    expect(sessionPayCents(60, 60, 5000, 1.5, false)).toBe(10000); // 1h + 1h at $50
    expect(sessionPayCents(60, 60, 5000, 1.5, true)).toBe(12500); // 1h × $50 + 1h × $75
  });
});
