import { describe, expect, it } from "vitest";
import { createMemoryFileAdapter, FreelancerStore } from "./store";
import { formatInvoiceNumber } from "./invoices";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

describe("invoices: numbering (I-1)", () => {
  it("formats INV-YYYYMMDD-NNN with a zero-padded sequence", () => {
    expect(formatInvoiceNumber("INV", "2026-11-07", 1)).toBe("INV-20261107-001");
    expect(formatInvoiceNumber("INV", "2026-11-07", 42)).toBe("INV-20261107-042");
    expect(formatInvoiceNumber("INV", "2026-11-07", 1234)).toBe("INV-20261107-1234");
  });

  it("due date is the issue date plus the client's payment terms", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { paymentTermsDays: 14 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect(invoice.number).toBe("INV-20261102-001");
    expect(invoice.dueDate).toBe("2026-11-16");
    expect(invoice.status).toBe("draft");
    expect(invoice.currency).toBe("USD");
  });
});

describe("invoices: sequence across restarts + voids (I-C1, I-C2)", () => {
  it("numbers strictly increase across restarts with no reuse", async () => {
    const adapter = createMemoryFileAdapter();
    const { store } = await FreelancerStore.open(adapter);
    const settings = testSettings();
    const client = await makeClient(store);
    const first = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const inv1 = await store.createInvoice({ clientId: client.id, entryIds: first.map((e) => e.id), issueDate: "2026-11-02" }, settings);
    expect(inv1.number).toBe("INV-20261102-001");

    const { store: relaunched } = await FreelancerStore.open(adapter);
    const second = await addEntries(relaunched, client.id, WEEK_45H.slice(1, 2), settings);
    const inv2 = await relaunched.createInvoice({ clientId: client.id, entryIds: second.map((e) => e.id), issueDate: "2026-11-03" }, settings);
    expect(inv2.number).toBe("INV-20261103-002");
    expect(relaunched.document.invoiceSequence.nextNumber).toBe(3);
  });

  it("a voided number is never reissued and the voided invoice stays retrievable", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const first = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const inv1 = await store.createInvoice({ clientId: client.id, entryIds: first.map((e) => e.id), issueDate: "2026-11-02" }, settings);
    const voided = await store.voidInvoice(inv1.id);
    expect(voided.status).toBe("void");
    expect(voided.number).toBe("INV-20261102-001");
    const second = await addEntries(store, client.id, WEEK_45H.slice(1, 2), settings);
    const inv2 = await store.createInvoice({ clientId: client.id, entryIds: second.map((e) => e.id), issueDate: "2026-11-03" }, settings);
    expect(inv2.number).toBe("INV-20261103-002");
    expect(store.document.invoices.find((i) => i.id === inv1.id)?.status).toBe("void");
  });
});

describe("invoices: double-invoicing rejection (I-C3)", () => {
  it("a direct model call invoicing an already-invoiced entry is rejected; nothing is created", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 2), settings);
    const inv1 = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    await expect(
      store.createInvoice({ clientId: client.id, entryIds: [entries[0]?.id as string], issueDate: "2026-11-03" }, settings)
    ).rejects.toThrow(/already invoiced/);
    expect(store.document.invoices).toHaveLength(1);
    expect(store.document.invoiceSequence.nextNumber).toBe(2);
    expect(store.getEntry(entries[0]?.id as string)?.invoiceId).toBe(inv1.id);
  });
});

describe("invoices: historical amounts (I-C4)", () => {
  it("changing the client rate after invoicing leaves every line and total byte-identical", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { defaultRateCents: 5000 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 },
      settings
    );
    // 9h × $50 = $450.00 subtotal, 10% tax = $45.00, total $495.00.
    expect(invoice.subtotalCents).toBe(45000);
    expect(invoice.taxCents).toBe(4500);
    expect(invoice.totalCents).toBe(49500);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]?.amountCents).toBe(45000);
    const snapshot = JSON.stringify(invoice);

    await store.updateClient(client.id, { defaultRateCents: 9000 });
    const reloaded = store.document.invoices.find((i) => i.id === invoice.id);
    expect(JSON.stringify(reloaded)).toBe(snapshot);
  });

  it("overtime lines snapshot the multiplied rate and amount", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, {
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect(invoice.subtotalCents).toBe(237500); // 40×$50 + 5×$50×1.5
    expect(invoice.lines).toHaveLength(2);
    const regular = invoice.lines.find((l) => l.source === "regular");
    const overtime = invoice.lines.find((l) => l.source === "overtime");
    expect(regular?.quantityHours).toBe(40);
    expect(regular?.amountCents).toBe(200000);
    expect(overtime?.quantityHours).toBe(5);
    expect(overtime?.rateCents).toBe(7500); // $50 × 1.5
    expect(overtime?.amountCents).toBe(37500);
    expect(invoice.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(invoice.subtotalCents);
  });
});

describe("invoices: failed creation is all-or-nothing (I-C5)", () => {
  it("a store write failure during invoice creation leaves no invoice, an unchanged counter, unmarked entries", async () => {
    const { store, adapter } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    adapter.faults.failWrite = true; // every write now fails
    await expect(
      store.createInvoice({ clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" }, settings)
    ).rejects.toThrow(/injected fault/);
    expect(store.document.invoices).toHaveLength(0);
    expect(store.document.invoiceSequence.nextNumber).toBe(1);
    expect(store.getEntry(entries[0]?.id as string)?.invoiceId).toBeNull();
  });
});
