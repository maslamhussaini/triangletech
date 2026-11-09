/**
 * Freelancer Time & Invoice — entitlements (M1 schema, M4 logic).
 *
 * M1 defined the TYPES and the Free-cap HYPOTHESIS constants only; M4
 * wires the real logic here. The Free caps below are still the research
 * HYPOTHESES (plan §9) — unvalidated, not decided limits — but they ARE
 * enforced from M4 on, by the store methods in store.ts, which call the
 * pure check functions in this file.
 *
 * ENTITLEMENT STATES (state machine):
 * - "none" — no purchase on record.
 * - "active" — a subscription in its paid period, or a lifetime purchase.
 * - "cancelled" — the user cancelled auto-renew, but the paid period has
 *   NOT ended yet: Pro stays active until `expiry` (plan §9: "Cancel
 *   anytime; Pro stays active until the paid period ends"). `isProActive`
 *   therefore treats "cancelled" as active while `expiry` is in the
 *   future, and inactive once it passes.
 * - "grace" — the store reports a billing-retry / grace period (payment
 *   failed, access retained while the store retries). Pro stays active.
 * - "expired" — the paid period ended with no renewal.
 * - "refunded" — the store revoked the purchase (refund / developer
 *   issue). Access ends immediately.
 *
 * CAP RULES (M4 decisions, tested in caps.test.ts):
 * - Invoices: 3 CREATED invoices per calendar month (by `issueDate`,
 *   YYYY-MM). A VOIDED invoice still counts toward the month it was
 *   created in — voiding must not free a slot, or the cap could be
 *   gamed by creating and voiding invoices. The month is taken from the
 *   invoice's issue date, not the wall clock, so an invoice dated in a
 *   new month is a new month's invoice even if created late.
 * - Clients: 3 clients TOTAL in the document, archived clients included
 *   — archiving must not free a slot, for the same anti-gaming reason.
 * - Templates: 1 template. The app ships exactly ONE built-in invoice
 *   template and M4 adds no template creation UI, so the cap is
 *   trivially satisfied (template count is always 1) and
 *   `checkTemplateCap` exists as the enforcement point for the
 *   template-management work of a later milestone — it is tested, but
 *   no M4 screen can hit it.
 * - Rewarded ads: one watched rewarded ad grants ONE extra invoice in
 *   the current calendar month (plan §9). Grants are counted per month
 *   and reset when the month changes.
 * - Pro removes every cap.
 *
 * WHERE PRO STATE LIVES (M4, extends the M1 ownership table in
 * store.ts): the last-known entitlement (`proEntitlement`) and the
 * month's rewarded-grant count (`rewardGrants`) live INSIDE the single
 * versioned JSON store document (schema v4), NOT in Preferences.
 * Reasons: (1) Pro status is durable user state, not a setting — a
 * settings reset must never wipe it (checklist P-6); (2) it is covered
 * by the same atomic write + `.bak` recovery as every other record, so
 * an entitlement update can never half-land; (3) the cap checks in
 * `FreelancerStore.createInvoice` / `createClient` run inside the same
 * `transact()` as the creation, so the cap decision and the creation
 * are one atomic step. The stored entitlement is a CACHE of what the
 * store last reported: on launch (and after purchase/restore) the app
 * re-verifies against the store SDK through the purchase adapter and
 * overwrites the cache — the store is the authority, the document is
 * the offline-readable copy. Server-side receipt validation is out of
 * scope for the MVP (no backend, plan §9).
 */
import type { StoreDocument } from "./models";
import { proProductById } from "./products";

export type EntitlementPlatform = "play" | "appstore";
export type EntitlementState = "none" | "active" | "expired" | "cancelled" | "grace" | "refunded";

export type ProEntitlement = {
  productId: string;
  platform: EntitlementPlatform;
  state: EntitlementState;
  /** ISO timestamp of expiry, when the store reports one. */
  expiry?: string;
  /** Last time the entitlement was verified against the store. */
  verifiedAt?: string;
};

/**
 * Derived: is Pro active for this entitlement, at `now`?
 * - "active" and "grace" are always active.
 * - "cancelled" is active only while the paid period has not ended
 *   (`expiry` in the future, or no expiry recorded — a cancelled
 *   lifetime purchase stays active).
 * - "none", "expired", "refunded", and a null entitlement are inactive.
 */
export function isProActive(entitlement: ProEntitlement | null, now: Date = new Date()): boolean {
  if (!entitlement) return false;
  if (entitlement.state === "active" || entitlement.state === "grace") return true;
  if (entitlement.state === "cancelled") {
    if (!entitlement.expiry) return true;
    return new Date(entitlement.expiry).getTime() > now.getTime();
  }
  return false;
}

/**
 * Free-tier caps (HYPOTHESIS from the research — enforced from M4,
 * NOT decided prices/limits).
 */
export const FREE_LIMITS_HYPOTHESIS = {
  maxInvoicesPerMonth: 3,
  maxClients: 3,
  maxTemplates: 1,
} as const;

/** Validate a stored entitlement value (used by the v4 document validator). */
export function validateProEntitlement(v: unknown, where = "proEntitlement"): string[] {
  const errors: string[] = [];
  if (v === null) return errors;
  if (typeof v !== "object" || Array.isArray(v)) return [`${where} must be null or an object`];
  const e = v as Record<string, unknown>;
  if (typeof e.productId !== "string" || !e.productId.trim()) errors.push(`${where}.productId must be a non-empty string`);
  else if (!proProductById(e.productId)) errors.push(`${where}.productId ${e.productId} is not a known Pro product`);
  if (e.platform !== "play" && e.platform !== "appstore") errors.push(`${where}.platform must be "play" or "appstore"`);
  if (!["none", "active", "expired", "cancelled", "grace", "refunded"].includes(e.state as string)) {
    errors.push(`${where}.state must be none, active, expired, cancelled, grace or refunded`);
  }
  if (e.expiry !== undefined && (typeof e.expiry !== "string" || Number.isNaN(Date.parse(e.expiry)))) {
    errors.push(`${where}.expiry must be an ISO date string`);
  }
  if (e.verifiedAt !== undefined && (typeof e.verifiedAt !== "string" || Number.isNaN(Date.parse(e.verifiedAt)))) {
    errors.push(`${where}.verifiedAt must be an ISO date string`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Free caps (pure — the store calls these inside transact())
// ---------------------------------------------------------------------------

export type CapKind = "invoices" | "clients" | "templates";

/** A cap refusal: the store throws this; the UI shows the upsell prompt. */
export class FreeCapError extends Error {
  readonly cap: CapKind;
  readonly limit: number;
  readonly used: number;
  /** Calendar month (YYYY-MM) the invoice cap applies to, when relevant. */
  readonly month?: string;

  constructor(cap: CapKind, limit: number, used: number, month?: string) {
    const what =
      cap === "invoices"
        ? `Free plan allows ${limit} invoices per month${month ? ` (${month})` : ""} — ${used} already created`
        : cap === "clients"
          ? `Free plan allows ${limit} clients — ${used} already added`
          : `Free plan allows ${limit} template — ${used} already in use`;
    super(`${what}. Upgrade to Pro for unlimited invoices, clients and templates.`);
    this.name = "FreeCapError";
    this.cap = cap;
    this.limit = limit;
    this.used = used;
    if (month) this.month = month;
  }
}

export function isFreeCapError(err: unknown): err is FreeCapError {
  return err instanceof FreeCapError;
}

/** "YYYY-MM" calendar-month key of a YYYY-MM-DD date. */
export function monthKeyOfDate(date: string): string {
  return date.slice(0, 7);
}

/**
 * Invoices created in a calendar month, by issue date. EVERY created
 * invoice counts — draft, sent, paid AND void. A voided invoice keeps
 * its number and its slot: voiding never frees a Free invoice.
 */
export function countInvoicesCreatedInMonth(doc: StoreDocument, month: string): number {
  return doc.invoices.filter((inv) => monthKeyOfDate(inv.issueDate) === month).length;
}

/** Free invoice allowance for a month: the cap plus any rewarded-ad grants earned that month. */
export function freeInvoiceAllowanceForMonth(doc: StoreDocument, month: string): number {
  const grants = doc.rewardGrants.month === month ? doc.rewardGrants.count : 0;
  return FREE_LIMITS_HYPOTHESIS.maxInvoicesPerMonth + grants;
}

export type InvoiceCapStatus = {
  allowed: boolean;
  used: number;
  limit: number;
  month: string;
};

/** Pure invoice-cap decision for a new invoice with this issue date. */
export function invoiceCapStatus(doc: StoreDocument, issueDate: string, now: Date = new Date()): InvoiceCapStatus {
  const month = monthKeyOfDate(issueDate);
  if (isProActive(doc.proEntitlement, now)) {
    return { allowed: true, used: countInvoicesCreatedInMonth(doc, month), limit: Number.POSITIVE_INFINITY, month };
  }
  const used = countInvoicesCreatedInMonth(doc, month);
  const limit = freeInvoiceAllowanceForMonth(doc, month);
  return { allowed: used < limit, used, limit, month };
}

/** Throw FreeCapError when the invoice cap would be exceeded. */
export function assertInvoiceCap(doc: StoreDocument, issueDate: string, now: Date = new Date()): void {
  const status = invoiceCapStatus(doc, issueDate, now);
  if (!status.allowed) throw new FreeCapError("invoices", status.limit, status.used, status.month);
}

export type ClientCapStatus = { allowed: boolean; used: number; limit: number };

/**
 * Pure client-cap decision. Counts ALL clients in the document,
 * archived included — archiving must not free a Free client slot.
 */
export function clientCapStatus(doc: StoreDocument, now: Date = new Date()): ClientCapStatus {
  if (isProActive(doc.proEntitlement, now)) {
    return { allowed: true, used: doc.clients.length, limit: Number.POSITIVE_INFINITY };
  }
  return {
    allowed: doc.clients.length < FREE_LIMITS_HYPOTHESIS.maxClients,
    used: doc.clients.length,
    limit: FREE_LIMITS_HYPOTHESIS.maxClients,
  };
}

/** Throw FreeCapError when the client cap would be exceeded. */
export function assertClientCap(doc: StoreDocument, now: Date = new Date()): void {
  const status = clientCapStatus(doc, now);
  if (!status.allowed) throw new FreeCapError("clients", status.limit, status.used);
}

export type TemplateCapStatus = { allowed: boolean; used: number; limit: number };

/**
 * Pure template-cap decision. `templateCount` is the number of invoice
 * templates in use (the app ships exactly 1 built-in template; custom
 * templates do not exist in M4, so callers pass 1). Pro removes the cap.
 */
export function templateCapStatus(templateCount: number, entitlement: ProEntitlement | null, now: Date = new Date()): TemplateCapStatus {
  if (isProActive(entitlement, now)) {
    return { allowed: true, used: templateCount, limit: Number.POSITIVE_INFINITY };
  }
  return {
    allowed: templateCount < FREE_LIMITS_HYPOTHESIS.maxTemplates,
    used: templateCount,
    limit: FREE_LIMITS_HYPOTHESIS.maxTemplates,
  };
}

/** Throw FreeCapError when another template would exceed the cap. */
export function assertTemplateCap(templateCount: number, entitlement: ProEntitlement | null, now: Date = new Date()): void {
  const status = templateCapStatus(templateCount, entitlement, now);
  if (!status.allowed) throw new FreeCapError("templates", status.limit, status.used);
}
