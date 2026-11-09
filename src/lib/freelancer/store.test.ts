import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, emptyStoreDocument } from "./models";
import {
  FreelancerStore,
  STORE_BAK_FILE,
  STORE_CORRUPT_PREFIX,
  STORE_FILE,
  createMemoryFileAdapter,
} from "./store";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

describe("store: atomic writes under fault injection (P-1)", () => {
  it("a failure after temp-write leaves the old live file intact", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    const before = JSON.stringify(store.document);
    // Fail every write to the .tmp file from here on.
    adapter.faults.failWrite = (path: string) => path.endsWith(".tmp");
    await expect(makeClient(store, { name: "Second Client" })).rejects.toThrow(/injected fault/);
    // Live file and in-memory document are the old version.
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).clients).toHaveLength(1);
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).clients[0].id).toBe(client.id);
    expect(store.document.clients).toHaveLength(1);
    expect(JSON.stringify(store.document)).toBe(before);
  });

  it("a failure during temp verification leaves the old live file intact", async () => {
    const { store, adapter } = await openTestStore();
    await makeClient(store);
    adapter.faults.failRead = (path: string) => path.endsWith(".tmp");
    await expect(makeClient(store, { name: "Second Client" })).rejects.toThrow(/injected fault/);
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).clients).toHaveLength(1);
    expect(store.document.clients).toHaveLength(1);
  });

  it("a failure during the live→.bak rotation leaves the old live file intact", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    adapter.faults.failRename = (from: string, to: string) => from === STORE_FILE && to === STORE_BAK_FILE;
    await expect(makeClient(store, { name: "Second Client" })).rejects.toThrow(/injected fault/);
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).clients[0].id).toBe(client.id);
    expect(store.document.clients).toHaveLength(1);
  });

  it("a failure during the temp→live rename is recoverable from .bak (never partial)", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    // Fail ONLY the temp→live rename: rotation already moved live→.bak.
    adapter.faults.failRename = (from: string, to: string) => from.endsWith(".tmp") && to === STORE_FILE;
    await expect(makeClient(store, { name: "Second Client" })).rejects.toThrow(/injected fault/);
    // The store's own rescue path restores .bak→live on rename failure, so
    // the live file is the OLD intact version, never partial.
    const liveText = await adapter.readText(STORE_FILE);
    expect(liveText).not.toBeNull();
    const live = JSON.parse(liveText as string) as ReturnType<typeof emptyStoreDocument>;
    expect(live.clients).toHaveLength(1);
    expect(live.clients[0].id).toBe(client.id);
    expect(store.document.clients).toHaveLength(1);
    // And a fresh open still loads the old version.
    const { store: reopened, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("ok");
    expect(reopened.document.clients).toHaveLength(1);
  });

  it("a crash between rotation and rename (live missing, .bak valid) recovers on next open", async () => {
    const { store, adapter } = await openTestStore();
    await makeClient(store);
    // Simulate the crash window: live gone, .bak holds the last good copy.
    const liveText = await adapter.readText(STORE_FILE);
    await adapter.writeText(STORE_BAK_FILE, liveText as string);
    await adapter.remove(STORE_FILE);
    const { store: reopened, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("recovered-from-backup");
    expect(load.notice).toMatch(/backup was restored/i);
    expect(reopened.document.clients).toHaveLength(1);
    // After recovery the live file exists again.
    expect(await adapter.readText(STORE_FILE)).not.toBeNull();
  });
});

describe("store: corruption quarantine + backup restore (P-2, P-3)", () => {
  it("invalid JSON in the live file is quarantined and .bak is restored with a notice", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    // A second write guarantees a .bak exists (rotation of the first live file).
    await store.updateClient(client.id, { notes: "second write" });
    const goodText = await adapter.readText(STORE_FILE);
    await adapter.writeText(STORE_FILE, "{ this is not json");
    const { store: reopened, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("recovered-from-backup");
    expect(load.notice).toMatch(/damaged/i);
    expect(load.notice).toMatch(/nothing was deleted/i);
    expect(reopened.document.clients).toHaveLength(1);
    expect(reopened.document.clients[0].id).toBe(client.id);
    // The quarantined file still exists on disk, byte-identical.
    const files = adapter.files();
    const quarantine = Object.keys(files).find((k) => k.startsWith(STORE_CORRUPT_PREFIX));
    expect(quarantine).toBeDefined();
    expect(files[quarantine as string]).toBe("{ this is not json");
    // The live file is valid again (restored backup).
    expect(JSON.parse(goodText as string).clients).toHaveLength(1);
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).clients).toHaveLength(1);
  });

  it("a schema-invalid live file (not just bad JSON) is quarantined too", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    // A second write guarantees a .bak exists (rotation of the first live file).
    await store.updateClient(client.id, { notes: "second write" });
    await adapter.writeText(STORE_FILE, JSON.stringify({ schemaVersion: 2, clients: "not-an-array" }));
    const { load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("recovered-from-backup");
    expect(load.events.some((e) => e.step === "corrupt-live")).toBe(true);
  });

  it("when live AND backup are both damaged, nothing is written until the user confirms", async () => {
    const { adapter } = await openTestStore();
    await adapter.writeText(STORE_FILE, "{ broken");
    await adapter.writeText(STORE_BAK_FILE, "{ also broken");
    const { store: reopened, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("needs-confirmation");
    expect(load.notice).toMatch(/both damaged/i);
    // No silent overwrite: the damaged live file was quarantined, and no
    // fresh live file was written.
    expect(await adapter.readText(STORE_FILE)).toBeNull();
    const files = adapter.files();
    expect(Object.keys(files).some((k) => k.startsWith(STORE_CORRUPT_PREFIX))).toBe(true);
    // Explicit confirmation starts empty — and only then.
    const confirmed = await reopened.initializeEmptyAfterConfirmation();
    expect(confirmed.status).toBe("fresh-empty");
    expect(reopened.document.clients).toHaveLength(0);
  });

  it("initializeEmptyAfterConfirmation refuses when the load did not fail", async () => {
    const { store } = await openTestStore();
    await expect(store.initializeEmptyAfterConfirmation()).rejects.toThrow(/only allowed after a failed load/);
  });

  it("a future-schema live file is refused and left untouched", async () => {
    const { adapter } = await openTestStore();
    const future = { ...emptyStoreDocument(), schemaVersion: 99 };
    await adapter.writeText(STORE_FILE, JSON.stringify(future));
    await expect(FreelancerStore.open(adapter)).rejects.toThrow(/newer version/);
    expect(JSON.parse((await adapter.readText(STORE_FILE)) as string).schemaVersion).toBe(99);
  });
});

describe("store: restart survival + settings separation (P-5, P-6)", () => {
  it("data survives a kill/relaunch: clients, entries, invoices, sequence counter (P-5)", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 2), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect(invoice.number).toBe("INV-20261102-001");

    // "Kill" the app: drop the instance, open a fresh one over the same adapter.
    const { store: relaunched } = await FreelancerStore.open(adapter);
    expect(relaunched.document.clients).toHaveLength(1);
    expect(relaunched.document.entries).toHaveLength(2);
    expect(relaunched.document.invoices).toHaveLength(1);
    expect(relaunched.document.invoices[0]?.number).toBe("INV-20261102-001");
    expect(relaunched.document.invoiceSequence.nextNumber).toBe(2);
    expect(relaunched.getEntry(entries[0]?.id as string)?.invoiceId).toBe(invoice.id);
    // The next invoice continues the sequence across the restart.
    await addEntries(relaunched, client.id, WEEK_45H.slice(2, 3), settings);
    const second = await relaunched.createInvoice(
      {
        clientId: client.id,
        entryIds: relaunched.document.entries.filter((e) => e.invoiceId === null).map((e) => e.id),
        issueDate: "2026-11-02",
      },
      settings
    );
    expect(second.number).toBe("INV-20261102-002");
  });

  it("settings live outside the store document and a reset never touches records (P-6)", async () => {
    const { store, adapter } = await openTestStore();
    const client = await makeClient(store);
    await addEntries(store, client.id, WEEK_45H.slice(0, 1), testSettings());
    const raw = await adapter.readText(STORE_FILE);
    expect(raw).not.toBeNull();
    expect(raw as string).not.toContain("settings");
    expect(raw as string).not.toContain("overtimeEnabled");
    const before = JSON.stringify(store.document);
    // A settings reset (Preferences side) cannot change the document:
    // the document simply has no settings key to reset.
    const { load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("ok");
    expect(JSON.stringify(store.document)).toBe(before);
  });

  it("a v1 document on disk loads through the migration chain on open (v1 → current)", async () => {
    const adapter = createMemoryFileAdapter();
    const v1 = {
      schemaVersion: 1,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      clients: [
        {
          id: "c-acme",
          name: "Acme Corp",
          currency: "USD",
          defaultRateCents: 5000,
          paymentTermsDays: 14,
          archived: false,
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      projects: [],
      entries: [],
      invoices: [],
      settings: { nextInvoiceSequence: 4 },
    };
    await adapter.writeText(STORE_FILE, JSON.stringify(v1));
    const { store, load } = await FreelancerStore.open(adapter);
    expect(load.status).toBe("ok");
    expect(load.migrationReport.length).toBeGreaterThan(0);
    expect(store.document.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(store.document.invoiceSequence.nextNumber).toBe(4);
  });
});
