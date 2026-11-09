import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  emptyStoreDocument,
  FutureSchemaVersionError,
  migrateDocument,
  migrateV1ToV2,
  migrateV2ToV3,
  validateClient,
  validateStoreDocument,
  type V1StoreDocument,
  type V2StoreDocument,
} from "./models";

describe("models: validation", () => {
  it("an empty v2 document validates", () => {
    expect(validateStoreDocument(emptyStoreDocument()).ok).toBe(true);
    expect(emptyStoreDocument().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("a document with a settings key is rejected (settings live in Preferences)", () => {
    const doc = { ...emptyStoreDocument(), settings: { defaultCurrency: "USD" } };
    const check = validateStoreDocument(doc);
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("Preferences");
  });

  it("a client with a negative rate is rejected", () => {
    expect(
      validateClient({ id: "c1", name: "X", currency: "USD", defaultRateCents: -1, paymentTermsDays: 14, archived: false })
    ).not.toHaveLength(0);
  });

  it("a client with an out-of-range overtime threshold is rejected", () => {
    expect(
      validateClient({
        id: "c1",
        name: "X",
        currency: "USD",
        defaultRateCents: 100,
        paymentTermsDays: 14,
        archived: false,
        overtimeThresholdHours: 200,
      })
    ).not.toHaveLength(0);
  });
});

const v1Fixture: V1StoreDocument = {
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
  entries: [
    {
      id: "e-1",
      clientId: "c-acme",
      date: "2026-11-02",
      startTime: "09:00",
      endTime: "17:00",
      endsNextDay: false,
      breakMinutes: 0,
      mode: "times",
      origin: "manual",
      rateCentsAtEntry: 5000,
      invoiceId: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: "inv-1",
      number: "INV-20261101-001",
      clientId: "c-acme",
      issueDate: "2026-11-01",
      dueDate: "2026-11-15",
      status: "paid",
      taxPercent: 0,
      subtotalCents: 40000,
      taxCents: 0,
      totalCents: 40000,
      lines: [],
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  settings: { nextInvoiceSequence: 2 },
};

describe("models: migration v1 → v2 (P-4)", () => {
  it("migrates a v1 fixture with all records preserved", () => {
    const { doc, report } = migrateV1ToV2(v1Fixture);
    expect(doc.schemaVersion).toBe(2);
    expect(doc.clients).toHaveLength(1);
    expect(doc.entries).toHaveLength(1);
    expect(doc.invoices).toHaveLength(1);
    expect(doc.invoices[0]?.currency).toBe("USD"); // filled from the client
    expect(doc.invoices[0]?.number).toBe("INV-20261101-001");
    expect(doc.invoiceSequence).toEqual({ nextNumber: 2, lastIssueDate: "2026-11-01" });
    expect(validateStoreDocument(doc).ok).toBe(true);
    expect(report.join(" ")).toContain("Preferences");
  });

  it("migrateDocument routes a v1 document through the migration (to the current version)", () => {
    const { doc, migratedFrom } = migrateDocument(v1Fixture);
    expect(migratedFrom).toBe(1);
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(doc.invoiceSequence.nextNumber).toBe(2);
  });

  it("a future schema version is refused with a visible error (P-4)", () => {
    const future = { ...emptyStoreDocument(), schemaVersion: 99 };
    expect(() => migrateDocument(future)).toThrow(FutureSchemaVersionError);
    expect(() => migrateDocument(future)).toThrow(/newer version/);
  });

  it("a document with an unknown non-integer version is refused", () => {
    const bad = { ...emptyStoreDocument(), schemaVersion: "two" };
    expect(() => migrateDocument(bad)).toThrow(/Invalid store document/);
  });
});

describe("models: migration v2 → v3 (M2, P-4)", () => {
  const v2Fixture: V2StoreDocument = {
    schemaVersion: 2,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    clients: v1Fixture.clients,
    projects: [],
    entries: v1Fixture.entries,
    invoices: [
      {
        id: "inv-1",
        number: "INV-20261101-001",
        clientId: "c-acme",
        issueDate: "2026-11-01",
        dueDate: "2026-11-15",
        status: "paid",
        currency: "USD",
        taxPercent: 0,
        subtotalCents: 40000,
        taxCents: 0,
        totalCents: 40000,
        lines: [],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    invoiceSequence: { nextNumber: 2, lastIssueDate: "2026-11-01" },
  };

  it("adds runningTimer null and leaves every record untouched", () => {
    const { doc, report } = migrateV2ToV3(v2Fixture);
    expect(doc.schemaVersion).toBe(3);
    expect(doc.runningTimer).toBeNull();
    expect(doc.clients).toEqual(v2Fixture.clients);
    expect(doc.entries).toEqual(v2Fixture.entries);
    expect(doc.invoices).toEqual(v2Fixture.invoices);
    expect(doc.invoiceSequence).toEqual(v2Fixture.invoiceSequence);
    expect(validateStoreDocument(doc).ok).toBe(true);
    expect(report.join(" ")).toContain("v2 → v3");
  });

  it("migrateDocument routes a v2 document through the migration (v2 → v3 → v4)", () => {
    const { doc, migratedFrom } = migrateDocument(v2Fixture);
    expect(migratedFrom).toBe(2);
    expect(doc.schemaVersion).toBe(4);
    expect(doc.runningTimer).toBeNull();
    expect(doc.proEntitlement).toBeNull();
    expect(doc.rewardGrants).toEqual({ month: "", count: 0 });
  });

  it("migrateDocument routes a v1 document through the full v1 → v2 → v3 → v4 chain", () => {
    const { doc, migratedFrom, report } = migrateDocument(v1Fixture);
    expect(migratedFrom).toBe(1);
    expect(doc.schemaVersion).toBe(4);
    expect(doc.runningTimer).toBeNull();
    expect(doc.proEntitlement).toBeNull();
    expect(doc.invoices[0]?.currency).toBe("USD");
    expect(doc.invoiceSequence.nextNumber).toBe(2);
    expect(validateStoreDocument(doc).ok).toBe(true);
    expect(report.join(" ")).toContain("Preferences");
    expect(report.join(" ")).toContain("v2 → v3");
    expect(report.join(" ")).toContain("v3 → v4");
  });

  it("a v3 document without runningTimer is rejected, not silently defaulted", () => {
    const doc = { ...emptyStoreDocument() } as unknown as Record<string, unknown>;
    delete doc.runningTimer;
    expect(validateStoreDocument(doc).ok).toBe(false);
  });
});
