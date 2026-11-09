/**
 * Freelancer Time & Invoice — cap enforcement + schema v4 store tests (M4).
 *
 * Store-level proof that the Free caps are enforced inside transact()
 * (invoice/month incl. voided invoices, clients incl. archived, month
 * boundaries via a mock clock, rewarded-ad grants), that Pro removes
 * them, and that v3 documents migrate to v4.
 */
import { describe, expect, it } from "vitest";
import { FreelancerStore, createMemoryFileAdapter } from "./store";
import { emptyStoreDocument } from "./models";
import { FreeCapError, isFreeCapError } from "./entitlements";
import { addEntries, makeClient, testSettings } from "./test-helpers";
import { PRO_PRODUCT_MONTHLY } from "./products";

async function openStoreWithClock(initialNow: string) {
  let now = new Date(initialNow);
  const adapter = createMemoryFileAdapter();
  const { store } = await FreelancerStore.open(adapter, { clock: () => new Date(now) });
  return {
    store,
    adapter,
    setNow: (iso: string) => {
      now = new Date(iso);
    },
  };
}

async function invoiceFor(store: FreelancerStore, clientId: string, entryId: string, issueDate: string) {
  return store.createInvoice({ clientId, entryIds: [entryId], issueDate }, testSettings());
}

describe("invoice cap (store level)", () => {
  it("blocks the 4th invoice in a month and leaves the store untouched", async () => {
    const { store } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, [
      { date: "2026-11-02", mode: "direct", directHours: 2 },
      { date: "2026-11-03", mode: "direct", directHours: 2 },
      { date: "2026-11-04", mode: "direct", directHours: 2 },
      { date: "2026-11-05", mode: "direct", directHours: 2 },
    ]);
    for (let i = 0; i < 3; i++) {
      await invoiceFor(store, client.id, entries[i]!.id, "2026-11-0" + (i + 2));
    }
    expect(store.document.invoices).toHaveLength(3);
    expect(store.document.invoiceSequence.nextNumber).toBe(4);
    let caught: unknown;
    try {
      await invoiceFor(store, client.id, entries[3]!.id, "2026-11-06");
    } catch (err) {
      caught = err;
    }
    expect(isFreeCapError(caught)).toBe(true);
    expect((caught as FreeCapError).cap).toBe("invoices");
    expect((caught as FreeCapError).month).toBe("2026-11");
    // No invoice, no counter bump, entry still uninvoiced.
    expect(store.document.invoices).toHaveLength(3);
    expect(store.document.invoiceSequence.nextNumber).toBe(4);
    expect(store.getEntry(entries[3]!.id)?.invoiceId).toBeNull();
  });

  it("a voided invoice still counts — voiding does not free a slot", async () => {
    const { store } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, [
      { date: "2026-11-02", mode: "direct", directHours: 2 },
      { date: "2026-11-03", mode: "direct", directHours: 2 },
      { date: "2026-11-04", mode: "direct", directHours: 2 },
      { date: "2026-11-05", mode: "direct", directHours: 2 },
    ]);
    const created = [];
    for (let i = 0; i < 3; i++) created.push(await invoiceFor(store, client.id, entries[i]!.id, "2026-11-0" + (i + 2)));
    await store.voidInvoice(created[0]!.id);
    expect(store.getInvoice(created[0]!.id)?.status).toBe("void");
    await expect(invoiceFor(store, client.id, entries[3]!.id, "2026-11-06")).rejects.toThrow(FreeCapError);
  });

  it("a new calendar month (mock clock + December issue date) resets the cap", async () => {
    const { store, setNow } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, [
      { date: "2026-11-02", mode: "direct", directHours: 2 },
      { date: "2026-11-03", mode: "direct", directHours: 2 },
      { date: "2026-11-04", mode: "direct", directHours: 2 },
      { date: "2026-12-01", mode: "direct", directHours: 2 },
    ]);
    for (let i = 0; i < 3; i++) await invoiceFor(store, client.id, entries[i]!.id, "2026-11-0" + (i + 2));
    await expect(invoiceFor(store, client.id, entries[3]!.id, "2026-11-30")).rejects.toThrow(FreeCapError);
    // December is a new month: the same entry invoices fine there.
    setNow("2026-12-01T09:00:00.000Z");
    const dec = await invoiceFor(store, client.id, entries[3]!.id, "2026-12-01");
    expect(dec.number).toContain("20261201");
  });

  it("one rewarded-ad grant buys exactly one extra invoice in that month", async () => {
    const { store, setNow } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, [
      { date: "2026-11-02", mode: "direct", directHours: 2 },
      { date: "2026-11-03", mode: "direct", directHours: 2 },
      { date: "2026-11-04", mode: "direct", directHours: 2 },
      { date: "2026-11-05", mode: "direct", directHours: 2 },
      { date: "2026-11-06", mode: "direct", directHours: 2 },
      { date: "2026-12-01", mode: "direct", directHours: 2 },
      { date: "2026-12-02", mode: "direct", directHours: 2 },
      { date: "2026-12-03", mode: "direct", directHours: 2 },
      { date: "2026-12-04", mode: "direct", directHours: 2 },
    ]);
    for (let i = 0; i < 3; i++) await invoiceFor(store, client.id, entries[i]!.id, "2026-11-0" + (i + 2));
    expect(await store.grantRewardedInvoice()).toBe(1);
    await invoiceFor(store, client.id, entries[3]!.id, "2026-11-06");
    await expect(invoiceFor(store, client.id, entries[4]!.id, "2026-11-07")).rejects.toThrow(FreeCapError);
    // December: the November grant does not carry over — allowance is 3 again.
    setNow("2026-12-01T09:00:00.000Z");
    for (let i = 5; i < 8; i++) await invoiceFor(store, client.id, entries[i]!.id, "2026-12-0" + (i - 4));
    await expect(invoiceFor(store, client.id, entries[8]!.id, "2026-12-04")).rejects.toThrow(FreeCapError);
  });
});

describe("client cap (store level)", () => {
  it("blocks the 4th client, even when one is archived", async () => {
    const { store } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    const c1 = await makeClient(store, { name: "A" });
    await makeClient(store, { name: "B" });
    await makeClient(store, { name: "C" });
    await store.updateClient(c1.id, { archived: true });
    let caught: unknown;
    try {
      await makeClient(store, { name: "D" });
    } catch (err) {
      caught = err;
    }
    expect(isFreeCapError(caught)).toBe(true);
    expect((caught as FreeCapError).cap).toBe("clients");
    expect(store.document.clients).toHaveLength(3);
  });
});

describe("Pro removes the caps", () => {
  it("an active entitlement allows a 4th client and a 4th invoice in the month", async () => {
    const { store } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    await store.setEntitlement({
      productId: PRO_PRODUCT_MONTHLY.id,
      platform: "play",
      state: "active",
      expiry: "2026-12-07T00:00:00.000Z",
      verifiedAt: "2026-11-07T00:00:00.000Z",
    });
    expect(store.document.proEntitlement?.state).toBe("active");
    const client = await makeClient(store);
    await makeClient(store, { name: "B" });
    await makeClient(store, { name: "C" });
    await makeClient(store, { name: "D" }); // 4th client: allowed for Pro
    const entries = await addEntries(store, client.id, [
      { date: "2026-11-02", mode: "direct", directHours: 2 },
      { date: "2026-11-03", mode: "direct", directHours: 2 },
      { date: "2026-11-04", mode: "direct", directHours: 2 },
      { date: "2026-11-05", mode: "direct", directHours: 2 },
    ]);
    for (let i = 0; i < 4; i++) await invoiceFor(store, client.id, entries[i]!.id, "2026-11-0" + (i + 2));
    expect(store.document.invoices).toHaveLength(4);
  });

  it("clearing the entitlement (store reports no purchase) restores the caps", async () => {
    const { store } = await openStoreWithClock("2026-11-07T12:00:00.000Z");
    await store.setEntitlement({ productId: PRO_PRODUCT_MONTHLY.id, platform: "play", state: "active" });
    await store.setEntitlement(null);
    expect(store.document.proEntitlement).toBeNull();
    await makeClient(store, { name: "A" });
    await makeClient(store, { name: "B" });
    await makeClient(store, { name: "C" });
    await expect(makeClient(store, { name: "D" })).rejects.toThrow(FreeCapError);
  });
});

describe("schema v3 → v4 migration", () => {
  it("opens a v3 document as v4 with a null entitlement and zero grants", async () => {
    const v3 = { ...emptyStoreDocument(), schemaVersion: 3 } as Record<string, unknown>;
    delete v3.proEntitlement;
    delete v3.rewardGrants;
    const adapter = createMemoryFileAdapter({ "freelancer-store.json": JSON.stringify(v3) });
    const { store, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("ok");
    expect(load.migrationReport.join(" ")).toMatch(/v3 → v4/);
    expect(store.document.schemaVersion).toBe(4);
    expect(store.document.proEntitlement).toBeNull();
    expect(store.document.rewardGrants).toEqual({ month: "", count: 0 });
    expect(store.document.clients).toEqual([]);
  });

  it("a v4 document with an unknown entitlement product fails validation (never silently accepted)", async () => {
    const bad = emptyStoreDocument();
    bad.proEntitlement = { productId: "not_a_product", platform: "play", state: "active" };
    const adapter = createMemoryFileAdapter({ "freelancer-store.json": JSON.stringify(bad) });
    const { load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("needs-confirmation");
  });
});
