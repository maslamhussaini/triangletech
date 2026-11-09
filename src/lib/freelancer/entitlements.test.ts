/**
 * Freelancer Time & Invoice — entitlement + cap unit tests (M4).
 *
 * Covers the pure rules in entitlements.ts: the Pro state machine
 * (incl. cancelled-but-paid-up and grace) and the Free-cap decisions
 * (invoice month counting incl. voided invoices, client counting
 * incl. archived clients, template cap).
 */
import { describe, expect, it } from "vitest";
import {
  assertClientCap,
  assertInvoiceCap,
  assertTemplateCap,
  clientCapStatus,
  countInvoicesCreatedInMonth,
  FreeCapError,
  freeInvoiceAllowanceForMonth,
  invoiceCapStatus,
  isFreeCapError,
  isProActive,
  monthKeyOfDate,
  templateCapStatus,
  type ProEntitlement,
} from "./entitlements";
import { emptyStoreDocument, type StoreDocument } from "./models";

const NOW = new Date("2026-11-07T12:00:00.000Z");

function entitlement(overrides: Partial<ProEntitlement> = {}): ProEntitlement {
  return { productId: "freelancer_pro_monthly", platform: "play", state: "active", ...overrides };
}

function docWithInvoices(issueDates: string[], pro: ProEntitlement | null = null): StoreDocument {
  const doc = emptyStoreDocument();
  doc.proEntitlement = pro;
  doc.invoices = issueDates.map((issueDate, i) => ({
    id: `inv-${i}`,
    number: `INV-${issueDate.replaceAll("-", "")}-00${i + 1}`,
    clientId: "client-1",
    issueDate,
    dueDate: issueDate,
    status: "draft",
    currency: "USD",
    taxPercent: 0,
    subtotalCents: 1000,
    taxCents: 0,
    totalCents: 1000,
    lines: [],
    createdAt: "2026-11-07T00:00:00.000Z",
    updatedAt: "2026-11-07T00:00:00.000Z",
  }));
  return doc;
}

describe("isProActive", () => {
  it("null and none are not Pro", () => {
    expect(isProActive(null, NOW)).toBe(false);
    expect(isProActive(entitlement({ state: "none" }), NOW)).toBe(false);
  });

  it("active and grace are Pro", () => {
    expect(isProActive(entitlement({ state: "active" }), NOW)).toBe(true);
    expect(isProActive(entitlement({ state: "grace" }), NOW)).toBe(true);
  });

  it("cancelled stays Pro until the paid period ends, then stops", () => {
    expect(isProActive(entitlement({ state: "cancelled", expiry: "2026-12-07T00:00:00.000Z" }), NOW)).toBe(true);
    expect(isProActive(entitlement({ state: "cancelled", expiry: "2026-11-01T00:00:00.000Z" }), NOW)).toBe(false);
    expect(isProActive(entitlement({ state: "cancelled" }), NOW)).toBe(true); // cancelled lifetime: no expiry
  });

  it("expired and refunded are not Pro", () => {
    expect(isProActive(entitlement({ state: "expired", expiry: "2026-11-01T00:00:00.000Z" }), NOW)).toBe(false);
    expect(isProActive(entitlement({ state: "refunded" }), NOW)).toBe(false);
  });
});

describe("invoice cap", () => {
  it("allows the first 3 invoices in a month, blocks the 4th", () => {
    const doc = docWithInvoices(["2026-11-01", "2026-11-02", "2026-11-03"]);
    const status = invoiceCapStatus(doc, "2026-11-04", NOW);
    expect(status).toEqual({ allowed: false, used: 3, limit: 3, month: "2026-11" });
    expect(() => assertInvoiceCap(doc, "2026-11-04", NOW)).toThrow(FreeCapError);
  });

  it("a voided invoice still counts toward the month it was created in", () => {
    const doc = docWithInvoices(["2026-11-01", "2026-11-02", "2026-11-03"]);
    doc.invoices[0]!.status = "void";
    expect(countInvoicesCreatedInMonth(doc, "2026-11")).toBe(3);
    expect(invoiceCapStatus(doc, "2026-11-04", NOW).allowed).toBe(false);
  });

  it("a new calendar month resets the count (month comes from the issue date)", () => {
    const doc = docWithInvoices(["2026-11-01", "2026-11-02", "2026-11-03"]);
    const status = invoiceCapStatus(doc, "2026-12-01", NOW);
    expect(status).toEqual({ allowed: true, used: 0, limit: 3, month: "2026-12" });
  });

  it("the count resets across the year boundary (December invoices do not count in January)", () => {
    const doc = docWithInvoices(["2026-12-28", "2026-12-29", "2026-12-30"]);
    const status = invoiceCapStatus(doc, "2027-01-02", NOW);
    expect(status).toEqual({ allowed: true, used: 0, limit: 3, month: "2027-01" });
  });

  it("a rewarded-ad grant raises the month's allowance by one", () => {
    const doc = docWithInvoices(["2026-11-01", "2026-11-02", "2026-11-03"]);
    doc.rewardGrants = { month: "2026-11", count: 1 };
    expect(freeInvoiceAllowanceForMonth(doc, "2026-11")).toBe(4);
    expect(invoiceCapStatus(doc, "2026-11-04", NOW).allowed).toBe(true);
    // A grant earned in another month does not apply here.
    expect(freeInvoiceAllowanceForMonth(doc, "2026-12")).toBe(3);
  });

  it("Pro removes the invoice cap", () => {
    const doc = docWithInvoices(["2026-11-01", "2026-11-02", "2026-11-03"], entitlement());
    expect(invoiceCapStatus(doc, "2026-11-04", NOW).allowed).toBe(true);
    expect(() => assertInvoiceCap(doc, "2026-11-04", NOW)).not.toThrow();
  });

  it("monthKeyOfDate takes YYYY-MM from the issue date", () => {
    expect(monthKeyOfDate("2026-11-30")).toBe("2026-11");
  });

  it("FreeCapError carries the cap, limit, used count and month", () => {
    const err = new FreeCapError("invoices", 3, 3, "2026-11");
    expect(err.cap).toBe("invoices");
    expect(err.limit).toBe(3);
    expect(err.used).toBe(3);
    expect(err.month).toBe("2026-11");
    expect(isFreeCapError(err)).toBe(true);
    expect(isFreeCapError(new Error("other"))).toBe(false);
  });
});

describe("client cap", () => {
  it("allows the first 3 clients, blocks the 4th", () => {
    const doc = emptyStoreDocument();
    doc.clients = [
      { id: "c1", name: "A", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: false, createdAt: "", updatedAt: "" },
      { id: "c2", name: "B", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: false, createdAt: "", updatedAt: "" },
      { id: "c3", name: "C", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: false, createdAt: "", updatedAt: "" },
    ];
    expect(clientCapStatus(doc, NOW)).toEqual({ allowed: false, used: 3, limit: 3 });
    expect(() => assertClientCap(doc, NOW)).toThrow(FreeCapError);
  });

  it("archived clients still count — archiving does not free a slot", () => {
    const doc = emptyStoreDocument();
    doc.clients = [
      { id: "c1", name: "A", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: true, createdAt: "", updatedAt: "" },
      { id: "c2", name: "B", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: true, createdAt: "", updatedAt: "" },
      { id: "c3", name: "C", currency: "USD", defaultRateCents: 5000, paymentTermsDays: 14, archived: false, createdAt: "", updatedAt: "" },
    ];
    expect(clientCapStatus(doc, NOW).allowed).toBe(false);
  });

  it("Pro removes the client cap", () => {
    const doc = emptyStoreDocument();
    doc.proEntitlement = entitlement();
    doc.clients = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      name: `Client ${i}`,
      currency: "USD",
      defaultRateCents: 5000,
      paymentTermsDays: 14,
      archived: false,
      createdAt: "",
      updatedAt: "",
    }));
    expect(clientCapStatus(doc, NOW).allowed).toBe(true);
    expect(() => assertClientCap(doc, NOW)).not.toThrow();
  });
});

describe("template cap", () => {
  it("the single built-in template fits the Free cap; a second template does not", () => {
    expect(templateCapStatus(1, null, NOW)).toEqual({ allowed: false, used: 1, limit: 1 });
    expect(() => assertTemplateCap(1, null, NOW)).toThrow(FreeCapError);
    expect(templateCapStatus(0, null, NOW).allowed).toBe(true);
  });

  it("Pro removes the template cap", () => {
    expect(templateCapStatus(3, entitlement(), NOW).allowed).toBe(true);
  });
});
