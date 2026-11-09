import { describe, expect, it } from "vitest";
import { displayInvoiceStatus, invoiceBillTo, previewInvoice } from "./invoices";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";
import type { Invoice } from "./models";

function otClientSettings() {
  return testSettings();
}

describe("invoices M3: week-aware partial invoicing", () => {
  it("invoicing Mon-Thu first leaves Friday with 4h regular + 5h overtime (40h threshold)", async () => {
    const { store } = await openTestStore();
    const settings = otClientSettings();
    const client = await makeClient(store, {
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const first = await store.createInvoice(
      { clientId: client.id, entryIds: entries.slice(0, 4).map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect(first.lines).toHaveLength(1);
    expect(first.lines[0]?.source).toBe("regular");
    expect(first.lines[0]?.quantityHours).toBe(36);
    expect(first.subtotalCents).toBe(180000); // 36h × $50

    const second = await store.createInvoice(
      { clientId: client.id, entryIds: [entries[4]?.id as string], issueDate: "2026-11-09" },
      settings
    );
    expect(second.lines).toHaveLength(2);
    const regular = second.lines.find((l) => l.source === "regular");
    const overtime = second.lines.find((l) => l.source === "overtime");
    expect(regular?.quantityHours).toBe(4);
    expect(regular?.amountCents).toBe(20000);
    expect(overtime?.quantityHours).toBe(5);
    expect(overtime?.rateCents).toBe(7500);
    expect(overtime?.amountCents).toBe(37500);
    expect(second.subtotalCents).toBe(57500);
    // Split invoices sum to the single-invoice week total (237500).
    expect(first.subtotalCents + second.subtotalCents).toBe(237500);
  });

  it("invoicing Friday FIRST still attributes it 4h regular + 5h overtime (order-independent)", async () => {
    const { store } = await openTestStore();
    const settings = otClientSettings();
    const client = await makeClient(store, {
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const fridayFirst = await store.createInvoice(
      { clientId: client.id, entryIds: [entries[4]?.id as string], issueDate: "2026-11-02" },
      settings
    );
    expect(fridayFirst.lines).toHaveLength(2);
    expect(fridayFirst.lines.find((l) => l.source === "regular")?.quantityHours).toBe(4);
    expect(fridayFirst.lines.find((l) => l.source === "overtime")?.quantityHours).toBe(5);
    expect(fridayFirst.subtotalCents).toBe(57500);

    const rest = await store.createInvoice(
      { clientId: client.id, entryIds: entries.slice(0, 4).map((e) => e.id), issueDate: "2026-11-03" },
      settings
    );
    expect(rest.lines).toHaveLength(1);
    expect(rest.lines[0]?.source).toBe("regular");
    expect(rest.lines[0]?.quantityHours).toBe(36);
    expect(rest.subtotalCents).toBe(180000);
    expect(fridayFirst.subtotalCents + rest.subtotalCents).toBe(237500);
  });

  it("a mid-week split attributes overtime only to the later invoice", async () => {
    const { store } = await openTestStore();
    const settings = otClientSettings();
    const client = await makeClient(store, {
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const first = await store.createInvoice(
      { clientId: client.id, entryIds: entries.slice(0, 3).map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect(first.subtotalCents).toBe(135000); // 27h regular × $50
    const second = await store.createInvoice(
      { clientId: client.id, entryIds: entries.slice(3).map((e) => e.id), issueDate: "2026-11-09" },
      settings
    );
    expect(second.lines.find((l) => l.source === "regular")?.quantityHours).toBe(13);
    expect(second.lines.find((l) => l.source === "overtime")?.quantityHours).toBe(5);
    expect(second.subtotalCents).toBe(102500); // 13×$50 + 5×$75
    expect(first.subtotalCents + second.subtotalCents).toBe(237500);
  });
});

describe("invoices M3: preview matches creation without mutating", () => {
  it("previewInvoice returns the exact lines/totals/number creation will produce, with no side effects", async () => {
    const { store } = await openTestStore();
    const settings = testSettings({ companyName: "Solo Studio" });
    const client = await makeClient(store, {
      name: "Acme Corp",
      email: "billing@acme.test",
      address: "1 Main St, Raleigh, NC",
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const input = { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 };
    const preview = previewInvoice(store.document, input, settings);
    expect(preview.number).toBe("INV-20261102-001");
    expect(preview.dueDate).toBe("2026-11-16");
    expect(preview.billTo).toEqual({ name: "Acme Corp", email: "billing@acme.test", address: "1 Main St, Raleigh, NC" });
    expect(preview.seller).toEqual({ name: "Solo Studio" });
    expect(preview.subtotalCents).toBe(237500);
    expect(preview.taxCents).toBe(23750);
    expect(preview.totalCents).toBe(261250);
    // No mutation: no invoice, counter unchanged, entries unmarked.
    expect(store.document.invoices).toHaveLength(0);
    expect(store.document.invoiceSequence.nextNumber).toBe(1);
    expect(store.document.entries.every((e) => e.invoiceId === null)).toBe(true);

    const created = await store.createInvoice(input, settings);
    expect(created.number).toBe(preview.number);
    expect(created.dueDate).toBe(preview.dueDate);
    expect(created.lines.map((l) => ({ description: l.description, quantityHours: l.quantityHours, rateCents: l.rateCents, amountCents: l.amountCents, source: l.source }))).toEqual(
      preview.lines.map((l) => ({ ...l }))
    );
    expect(created.subtotalCents).toBe(preview.subtotalCents);
    expect(created.totalCents).toBe(preview.totalCents);
    expect(created.billTo).toEqual(preview.billTo);
  });
});

describe("invoices M3: due dates + terms", () => {
  it("a per-invoice terms override recomputes the due date and is snapshotted", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { paymentTermsDays: 14 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", paymentTermsDays: 30 },
      settings
    );
    expect(invoice.dueDate).toBe("2026-12-02");
    expect(invoice.paymentTermsDays).toBe(30);
  });

  it("an explicit due date wins over terms", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { paymentTermsDays: 14 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", dueDate: "2026-11-20" },
      settings
    );
    expect(invoice.dueDate).toBe("2026-11-20");
  });

  it("an invalid explicit due date is rejected with nothing created", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    await expect(
      store.createInvoice(
        { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", dueDate: "20-11-2026" },
        settings
      )
    ).rejects.toThrow(/dueDate/);
    expect(store.document.invoices).toHaveLength(0);
    expect(store.document.invoiceSequence.nextNumber).toBe(1);
  });
});

describe("invoices M3: bill-to / seller snapshots", () => {
  it("per-invoice party edits are snapshotted without mutating the stored client record", async () => {
    const { store } = await openTestStore();
    const settings = testSettings({ companyName: "Solo Studio" });
    const client = await makeClient(store, {
      name: "Acme Corp",
      email: "billing@acme.test",
      address: "1 Main St, Raleigh, NC",
    });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      {
        clientId: client.id,
        entryIds: entries.map((e) => e.id),
        issueDate: "2026-11-02",
        billTo: { name: "Acme Billing Dept", email: "ap@acme.test" },
        seller: { name: "My Studio LLC", email: "me@studio.test", address: "9 Oak Ave" },
      },
      settings
    );
    expect(invoice.billTo).toEqual({ name: "Acme Billing Dept", email: "ap@acme.test" });
    expect(invoice.seller).toEqual({ name: "My Studio LLC", email: "me@studio.test", address: "9 Oak Ave" });
    const storedClient = store.getClient(client.id);
    expect(storedClient?.name).toBe("Acme Corp");
    expect(storedClient?.email).toBe("billing@acme.test");
    expect(storedClient?.address).toBe("1 Main St, Raleigh, NC");
  });

  it("invoiceBillTo falls back to the client record for pre-M3 invoices without a snapshot", async () => {
    const { store } = await openTestStore();
    const client = await makeClient(store, { name: "Acme Corp", email: "billing@acme.test", address: "1 Main St" });
    const legacy: Invoice = {
      id: "legacy-1",
      number: "INV-20261102-001",
      clientId: client.id,
      issueDate: "2026-11-02",
      dueDate: "2026-11-16",
      status: "draft",
      currency: "USD",
      taxPercent: 0,
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
      lines: [],
      createdAt: "2026-11-02T00:00:00.000Z",
      updatedAt: "2026-11-02T00:00:00.000Z",
    };
    expect(invoiceBillTo(legacy, client)).toEqual({ name: "Acme Corp", email: "billing@acme.test", address: "1 Main St" });
  });
});

describe("invoices M3: status transitions + void preservation", () => {
  it("draft -> sent -> paid is the only forward chain; void works from draft or sent", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 2), settings);
    const inv = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    expect((await store.markInvoiceSent(inv.id)).status).toBe("sent");
    expect((await store.markInvoicePaid(inv.id)).status).toBe("paid");
    expect(store.getInvoice(inv.id)?.status).toBe("paid");
  });

  it("illegal transitions are rejected and leave the status untouched", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 3), settings);
    const inv = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    // draft -> paid is not a legal move.
    await expect(store.markInvoicePaid(inv.id)).rejects.toThrow(/Cannot move invoice from draft to paid/);
    expect(store.getInvoice(inv.id)?.status).toBe("draft");
    // void from draft is legal; a second void is not.
    expect((await store.voidInvoice(inv.id)).status).toBe("void");
    await expect(store.voidInvoice(inv.id)).rejects.toThrow(/Cannot move invoice from void to void/);
    await expect(store.markInvoiceSent(inv.id)).rejects.toThrow(/Cannot move invoice from void to sent/);
    expect(store.getInvoice(inv.id)?.status).toBe("void");
  });

  it("a paid invoice cannot be voided; a voided invoice keeps its number and stays listed", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const first = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const inv1 = await store.createInvoice(
      { clientId: client.id, entryIds: first.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    await store.markInvoiceSent(inv1.id);
    await store.markInvoicePaid(inv1.id);
    await expect(store.voidInvoice(inv1.id)).rejects.toThrow(/Cannot move invoice from paid to void/);
    expect(store.getInvoice(inv1.id)?.status).toBe("paid");

    const second = await addEntries(store, client.id, WEEK_45H.slice(1, 2), settings);
    const inv2 = await store.createInvoice(
      { clientId: client.id, entryIds: second.map((e) => e.id), issueDate: "2026-11-03" },
      settings
    );
    await store.markInvoiceSent(inv2.id);
    const voided = await store.voidInvoice(inv2.id);
    expect(voided.status).toBe("void");
    expect(voided.number).toBe("INV-20261103-002");
    // Voided invoice remains visible in the list with status void.
    expect(store.document.invoices).toHaveLength(2);
    expect(store.document.invoices.find((i) => i.id === inv2.id)?.status).toBe("void");
    // Its number is never reissued.
    const third = await addEntries(store, client.id, WEEK_45H.slice(2, 3), settings);
    const inv3 = await store.createInvoice(
      { clientId: client.id, entryIds: third.map((e) => e.id), issueDate: "2026-11-04" },
      settings
    );
    expect(inv3.number).toBe("INV-20261104-003");
  });
});

describe("invoices M3: overdue is derived, never stored", () => {
  it("sent + past due displays overdue; draft/paid/void past due never do", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { paymentTermsDays: 14 });
    // This test is about display status, not caps: it needs four
    // invoices in one month, so it runs as Pro (M4 Free cap is 3/month).
    await store.setEntitlement({ productId: "freelancer_pro_monthly", platform: "play", state: "active" });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 4), settings);
    const mk = (ids: string[]) =>
      store.createInvoice({ clientId: client.id, entryIds: ids, issueDate: "2026-11-02" }, settings);
    const draft = await mk([entries[0]?.id as string]);
    const sentCreated = await mk([entries[1]?.id as string]);
    const paidCreated = await mk([entries[2]?.id as string]);
    const voidedCreated = await mk([entries[3]?.id as string]);
    await store.markInvoiceSent(sentCreated.id);
    await store.markInvoiceSent(paidCreated.id);
    await store.markInvoicePaid(paidCreated.id);
    await store.voidInvoice(voidedCreated.id);
    const sent = store.getInvoice(sentCreated.id) as NonNullable<ReturnType<typeof store.getInvoice>>;
    const paid = store.getInvoice(paidCreated.id) as NonNullable<ReturnType<typeof store.getInvoice>>;
    const voided = store.getInvoice(voidedCreated.id) as NonNullable<ReturnType<typeof store.getInvoice>>;

    // Due date is 2026-11-16 for all four.
    expect(displayInvoiceStatus(sent, "2026-11-16")).toBe("sent"); // due today is not overdue
    expect(displayInvoiceStatus(sent, "2026-11-17")).toBe("overdue");
    expect(displayInvoiceStatus(draft, "2026-11-17")).toBe("draft");
    expect(displayInvoiceStatus(paid, "2026-11-17")).toBe("paid");
    expect(displayInvoiceStatus(voided, "2026-11-17")).toBe("void");
    // And the stored status never became "overdue".
    expect(store.getInvoice(sent.id)?.status).toBe("sent");
    expect(store.document.invoices.every((i) => (i.status as string) !== "overdue")).toBe(true);
  });
});

describe("invoices M3: double-invoicing through the creation flow", () => {
  it("a partially overlapping second creation is rejected; nothing is created or marked", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store);
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 3), settings);
    const first = await store.createInvoice(
      { clientId: client.id, entryIds: entries.slice(0, 2).map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    await expect(
      store.createInvoice(
        { clientId: client.id, entryIds: entries.slice(1).map((e) => e.id), issueDate: "2026-11-03" },
        settings
      )
    ).rejects.toThrow(/already invoiced/);
    expect(store.document.invoices).toHaveLength(1);
    expect(store.document.invoiceSequence.nextNumber).toBe(2);
    expect(store.getEntry(entries[2]?.id as string)?.invoiceId).toBeNull();
    expect(store.getEntry(entries[1]?.id as string)?.invoiceId).toBe(first.id);
  });
});
