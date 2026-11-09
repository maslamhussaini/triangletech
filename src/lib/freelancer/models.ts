/**
 * Freelancer Time & Invoice — entity model (M1).
 *
 * Pure types + validation + schema migration. No UI, no storage, no
 * network here. The store document is the single versioned JSON
 * document described in M1_ACCEPTANCE_CHECKLIST.md §1 D-1 (records +
 * invoice sequence counter only — app settings live in Capacitor
 * Preferences, see settings.ts; the ownership table is documented in
 * store.ts).
 *
 * Schema versions:
 * - v1 (pre-release draft shape, never shipped): the invoice sequence
 *   counter lived inside a `settings` object in the document and
 *   invoices carried no `currency` snapshot.
 * - v2 (M1): the counter is a top-level `invoiceSequence` object
 *   and every invoice snapshots its `currency`. The v1→v2 migration is
 *   explicit and one-way; app settings are NOT carried over (they live
 *   in Preferences now — a migrated install starts from the documented
 *   defaults, recorded in the migration report).
 * - v3 (current, M2): adds `runningTimer` (the persisted stopwatch
 *   state, null when no timer is running). The v2→v3 migration is
 *   purely additive — every v2 document gains `runningTimer: null`
 *   and nothing else changes.
 * - M3 adds OPTIONAL invoice fields only (`billTo`, `seller`,
 *   `paymentTermsDays` snapshots) — no schema bump, no migration: a
 *   v3 document without them is still valid, and the UI falls back to
 *   the client record / settings when they are absent. Stored invoice
 *   status is `draft | sent | paid | void` only (M3): "overdue" is a
 *   DERIVED display status (stored `sent` + today past `dueDate`),
 *   never written — see invoices.ts `displayInvoiceStatus`. A stored
 *   "overdue" value is tolerated on load as a legacy value (no code
 *   path has ever written one) and displays as overdue.
 * - v4 (current, M4): adds `proEntitlement` (last-known Pro
 *   entitlement, null when Free — see entitlements.ts for why it
 *   lives in the document, not Preferences) and `rewardGrants`
 *   (`{ month, count }`: rewarded-ad extra invoices earned in that
 *   calendar month). The v3→v4 migration is purely additive.
 * - A document with a future/unknown version is REFUSED, never silently
 *   rewritten (checklist D-4 / P-4).
 */
import { isValidDateString } from "@/lib/tools/time-card";
import { validateRunningTimer, type RunningTimer } from "./timer";
import { validateProEntitlement, type ProEntitlement } from "./entitlements";

export const CURRENT_SCHEMA_VERSION = 4;

/** Short random id. `crypto.randomUUID` where available, hex fallback. */
export function newId(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* fall through to the fallback */
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Entities (plan §4, plus `rateCentsAtEntry` per checklist R-2)
// ---------------------------------------------------------------------------

export type Client = {
  id: string;
  name: string;
  email?: string;
  address?: string;
  /** ISO 4217 code, e.g. "USD". One currency per client (checklist R-7). */
  currency: string;
  /** Default hourly rate in whole cents. */
  defaultRateCents: number;
  /** Net payment terms in days (default 14). */
  paymentTermsDays: number;
  /**
   * Per-client overtime settings (checklist §2 R-3). All optional: absent
   * means "use the app default" from settings.ts. `overtimeEnabled`
   * defaults to FALSE at the app level (R-4) — the web tool's on-default
   * must never leak in.
   */
  overtimeEnabled?: boolean;
  overtimeThresholdHours?: number;
  overtimeMultiplier?: number;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  /** Optional hourly-rate override in whole cents (beats the client default). */
  rateOverrideCents?: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntryOrigin = "manual" | "timer";
export type TimeEntryMode = "times" | "direct";

export type TimeEntry = {
  id: string;
  clientId: string;
  projectId?: string;
  /** YYYY-MM-DD, the day the shift starts (direct mode: the day the hours count toward). */
  date: string;
  /** HH:MM / 12-hour text. "" when mode is "direct". */
  startTime: string;
  /** "" when mode is "direct". */
  endTime: string;
  endsNextDay: boolean;
  breakMinutes: number;
  mode: TimeEntryMode;
  /** Direct paid hours (decimal, e.g. 7.5). Only meaningful when mode is "direct". */
  directHours?: number;
  notes?: string;
  origin: TimeEntryOrigin;
  /**
   * Effective hourly rate in whole cents, resolved at creation
   * (project override → client default → app default) and SNAPSHOTTED:
   * changing a client/project rate afterwards never changes a recorded
   * session (checklist R-2). Null when no rate was configured anywhere.
   */
  rateCentsAtEntry: number | null;
  /** Set once the entry is invoiced; null until then (checklist I-4). */
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * STORED invoice status (M3). Exactly these four are ever written.
 * "overdue" is NOT a stored status: it is derived at display time
 * (stored `sent` + today past `dueDate`) — see `displayInvoiceStatus`
 * in invoices.ts. A stored "overdue" is tolerated on load only as a
 * legacy value (no code path has ever written one).
 */
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceLineSource = "regular" | "overtime" | "manual";

/**
 * A party block snapshotted onto an invoice (M3). Bill-to defaults to
 * the client record and the seller block to the company branding /
 * settings at creation time; both are editable per invoice WITHOUT
 * mutating the stored client record — the edits live on the invoice
 * only, so the invoice stays an accurate historical record.
 */
export type InvoiceParty = {
  name: string;
  email?: string;
  address?: string;
};

export type InvoiceLine = {
  id: string;
  invoiceId: string;
  description: string;
  /** Decimal hours, e.g. 7.5. */
  quantityHours: number;
  /** Hourly rate in whole cents, snapshotted at creation. */
  rateCents: number;
  /** Line amount in whole cents, snapshotted at creation. */
  amountCents: number;
  source: InvoiceLineSource;
};

export type Invoice = {
  id: string;
  /** Sequential `INV-YYYYMMDD-NNN`, never reused, including after a void. */
  number: string;
  clientId: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  currency: string;
  taxPercent: number;
  /**
   * Net terms (days) used to compute `dueDate`, snapshotted at creation
   * (M3). Absent on pre-M3 invoices, which only stored the due date.
   */
  paymentTermsDays?: number;
  /**
   * Bill-to block snapshotted at creation (M3). Absent on pre-M3
   * invoices — the UI falls back to the client record then.
   */
  billTo?: InvoiceParty;
  /**
   * Seller block snapshotted at creation (M3). Absent on pre-M3
   * invoices — the UI falls back to the company branding / settings.
   */
  seller?: InvoiceParty;
  /** Stored totals — never recomputed from current rates (checklist I-5). */
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lines: InvoiceLine[];
  notes?: string;
  pdfGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Invoice sequence counter. Lives inside the single store document so an
 * invoice, its counter increment, and its entry markings land in ONE
 * atomic write (checklist §1 D-1 / §3 I-2). */
export type InvoiceSequence = {
  /** Next sequence number to issue (1-based). */
  nextNumber: number;
  /** Issue date (YYYY-MM-DD) of the most recently created invoice, if any. */
  lastIssueDate: string | null;
};

export type StoreDocument = {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  clients: Client[];
  projects: Project[];
  entries: TimeEntry[];
  invoices: Invoice[];
  invoiceSequence: InvoiceSequence;
  /**
   * Persisted stopwatch state (M2, schema v3). Null when no timer is
   * running. Lives in the document — not in Preferences — so a running
   * timer survives an app kill/restart exactly like any other record
   * and is covered by the same atomic write + `.bak` recovery.
   */
  runningTimer: RunningTimer | null;
  /**
   * Last-known Pro entitlement (M4, schema v4). Null when Free. This
   * is a CACHE of what the store last reported: the purchase adapter
   * re-verifies against the store SDK on launch and after
   * purchase/restore, and overwrites this value. It lives in the
   * document — not Preferences — so a settings reset can never wipe
   * Pro status and cap checks inside transact() read the same
   * document they mutate (see entitlements.ts).
   */
  proEntitlement: ProEntitlement | null;
  /**
   * Rewarded-ad extra invoices (M4, schema v4): how many extra
   * invoices beyond the Free cap were earned by watching a rewarded
   * ad in `month` (YYYY-MM). Reset when the month changes.
   */
  rewardGrants: { month: string; count: number };
};

export function emptyStoreDocument(now: string = nowIso()): StoreDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    clients: [],
    projects: [],
    entries: [],
    invoices: [],
    invoiceSequence: { nextNumber: 1, lastIssueDate: null },
    runningTimer: null,
    proEntitlement: null,
    rewardGrants: { month: "", count: 0 },
  };
}

// ---------------------------------------------------------------------------
// Validation (returns a list of problems; empty = valid)
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function checkId(errors: string[], v: unknown, where: string): void {
  if (!isNonEmptyString(v)) errors.push(`${where}.id must be a non-empty string`);
}

function checkIso(errors: string[], v: unknown, where: string): void {
  if (typeof v !== "string" || !isValidDateString(v)) errors.push(`${where} must be a YYYY-MM-DD date`);
}

export function validateClient(v: unknown, where = "client"): string[] {
  const errors: string[] = [];
  if (!isRecord(v)) return [`${where} must be an object`];
  checkId(errors, v.id, where);
  if (!isNonEmptyString(v.name)) errors.push(`${where}.name must be a non-empty string`);
  if (v.email !== undefined && typeof v.email !== "string") errors.push(`${where}.email must be a string`);
  if (v.address !== undefined && typeof v.address !== "string") errors.push(`${where}.address must be a string`);
  if (!isNonEmptyString(v.currency)) errors.push(`${where}.currency must be a non-empty string`);
  if (!isNonNegativeInt(v.defaultRateCents)) errors.push(`${where}.defaultRateCents must be a non-negative integer (cents)`);
  if (!isNonNegativeInt(v.paymentTermsDays)) errors.push(`${where}.paymentTermsDays must be a non-negative integer`);
  if (v.overtimeEnabled !== undefined && typeof v.overtimeEnabled !== "boolean") errors.push(`${where}.overtimeEnabled must be a boolean`);
  if (v.overtimeThresholdHours !== undefined && (typeof v.overtimeThresholdHours !== "number" || v.overtimeThresholdHours <= 0 || v.overtimeThresholdHours > 168)) {
    errors.push(`${where}.overtimeThresholdHours must be more than 0 and no more than 168`);
  }
  if (v.overtimeMultiplier !== undefined && (typeof v.overtimeMultiplier !== "number" || v.overtimeMultiplier < 1 || v.overtimeMultiplier > 5)) {
    errors.push(`${where}.overtimeMultiplier must be at least 1 and no more than 5`);
  }
  if (typeof v.archived !== "boolean") errors.push(`${where}.archived must be a boolean`);
  return errors;
}

export function validateProject(v: unknown, where = "project"): string[] {
  const errors: string[] = [];
  if (!isRecord(v)) return [`${where} must be an object`];
  checkId(errors, v.id, where);
  checkId(errors, v.clientId, `${where}.clientId`);
  if (!isNonEmptyString(v.name)) errors.push(`${where}.name must be a non-empty string`);
  if (v.rateOverrideCents !== undefined && !isNonNegativeInt(v.rateOverrideCents)) {
    errors.push(`${where}.rateOverrideCents must be a non-negative integer (cents)`);
  }
  if (typeof v.archived !== "boolean") errors.push(`${where}.archived must be a boolean`);
  return errors;
}

export function validateTimeEntry(v: unknown, where = "entry"): string[] {
  const errors: string[] = [];
  if (!isRecord(v)) return [`${where} must be an object`];
  checkId(errors, v.id, where);
  checkId(errors, v.clientId, `${where}.clientId`);
  if (v.projectId !== undefined && !isNonEmptyString(v.projectId)) errors.push(`${where}.projectId must be a non-empty string`);
  checkIso(errors, v.date, `${where}.date`);
  if (typeof v.startTime !== "string") errors.push(`${where}.startTime must be a string`);
  if (typeof v.endTime !== "string") errors.push(`${where}.endTime must be a string`);
  if (typeof v.endsNextDay !== "boolean") errors.push(`${where}.endsNextDay must be a boolean`);
  if (!isNonNegativeInt(v.breakMinutes)) errors.push(`${where}.breakMinutes must be a non-negative integer`);
  if (v.mode !== "times" && v.mode !== "direct") errors.push(`${where}.mode must be "times" or "direct"`);
  if (v.directHours !== undefined && (typeof v.directHours !== "number" || !Number.isFinite(v.directHours) || v.directHours <= 0)) {
    errors.push(`${where}.directHours must be a positive finite number`);
  }
  if (v.origin !== "manual" && v.origin !== "timer") errors.push(`${where}.origin must be "manual" or "timer"`);
  if (v.rateCentsAtEntry !== null && !isNonNegativeInt(v.rateCentsAtEntry)) {
    errors.push(`${where}.rateCentsAtEntry must be null or a non-negative integer (cents)`);
  }
  if (v.invoiceId !== null && !isNonEmptyString(v.invoiceId)) errors.push(`${where}.invoiceId must be null or a non-empty string`);
  return errors;
}

export function validateInvoice(v: unknown, where = "invoice"): string[] {
  const errors: string[] = [];
  if (!isRecord(v)) return [`${where} must be an object`];
  checkId(errors, v.id, where);
  if (!isNonEmptyString(v.number)) errors.push(`${where}.number must be a non-empty string`);
  checkId(errors, v.clientId, `${where}.clientId`);
  checkIso(errors, v.issueDate, `${where}.issueDate`);
  checkIso(errors, v.dueDate, `${where}.dueDate`);
  if (!["draft", "sent", "paid", "void", "overdue"].includes(v.status as string)) {
    errors.push(`${where}.status must be draft, sent, paid or void ("overdue" is tolerated on load as a legacy value only — it is never written; see displayInvoiceStatus)`);
  }
  if (!isNonEmptyString(v.currency)) errors.push(`${where}.currency must be a non-empty string`);
  if (v.paymentTermsDays !== undefined && !isNonNegativeInt(v.paymentTermsDays)) {
    errors.push(`${where}.paymentTermsDays must be a non-negative integer`);
  }
  for (const partyField of ["billTo", "seller"] as const) {
    const party = v[partyField];
    if (party !== undefined) {
      if (!isRecord(party)) {
        errors.push(`${where}.${partyField} must be an object`);
      } else {
        if (!isNonEmptyString(party.name)) errors.push(`${where}.${partyField}.name must be a non-empty string`);
        if (party.email !== undefined && typeof party.email !== "string") errors.push(`${where}.${partyField}.email must be a string`);
        if (party.address !== undefined && typeof party.address !== "string") errors.push(`${where}.${partyField}.address must be a string`);
      }
    }
  }
  if (typeof v.taxPercent !== "number" || !Number.isFinite(v.taxPercent) || v.taxPercent < 0) {
    errors.push(`${where}.taxPercent must be a non-negative number`);
  }
  for (const f of ["subtotalCents", "taxCents", "totalCents"] as const) {
    if (!isNonNegativeInt(v[f])) errors.push(`${where}.${f} must be a non-negative integer (cents)`);
  }
  if (!Array.isArray(v.lines)) {
    errors.push(`${where}.lines must be an array`);
  } else {
    v.lines.forEach((line, i) => {
      if (!isRecord(line)) {
        errors.push(`${where}.lines[${i}] must be an object`);
        return;
      }
      checkId(errors, line.id, `${where}.lines[${i}].id`);
      if (!isNonEmptyString(line.description)) errors.push(`${where}.lines[${i}].description must be a non-empty string`);
      if (typeof line.quantityHours !== "number" || !Number.isFinite(line.quantityHours) || line.quantityHours < 0) {
        errors.push(`${where}.lines[${i}].quantityHours must be a non-negative number`);
      }
      if (!isNonNegativeInt(line.rateCents)) errors.push(`${where}.lines[${i}].rateCents must be a non-negative integer (cents)`);
      if (!isNonNegativeInt(line.amountCents)) errors.push(`${where}.lines[${i}].amountCents must be a non-negative integer (cents)`);
      if (!["regular", "overtime", "manual"].includes(line.source as string)) {
        errors.push(`${where}.lines[${i}].source must be regular, overtime or manual`);
      }
    });
  }
  return errors;
}

/** Validate a parsed store document. Returns `{ ok, errors, version }`. */
export function validateStoreDocument(data: unknown): {
  ok: boolean;
  errors: string[];
  version: number | null;
} {
  const errors: string[] = [];
  if (!isRecord(data)) return { ok: false, errors: ["store document must be an object"], version: null };
  const version = typeof data.schemaVersion === "number" ? data.schemaVersion : null;
  if (version === null) errors.push("schemaVersion must be an integer");
  if (version !== null && version > CURRENT_SCHEMA_VERSION) {
    // Future version: a distinct, visible refusal (store.ts turns this
    // into FutureSchemaVersionError and leaves the file untouched).
    return { ok: false, errors: [`future-schema-version:${version}`], version };
  }
  if (version !== null && version < 1) errors.push("schemaVersion must be at least 1");
  for (const f of ["clients", "projects", "entries", "invoices"] as const) {
    if (!Array.isArray(data[f])) errors.push(`${f} must be an array`);
  }
  if (Array.isArray(data.clients)) data.clients.forEach((c, i) => errors.push(...validateClient(c, `clients[${i}]`)));
  if (Array.isArray(data.projects)) data.projects.forEach((p, i) => errors.push(...validateProject(p, `projects[${i}]`)));
  if (Array.isArray(data.entries)) data.entries.forEach((e, i) => errors.push(...validateTimeEntry(e, `entries[${i}]`)));
  if (Array.isArray(data.invoices)) data.invoices.forEach((inv, i) => errors.push(...validateInvoice(inv, `invoices[${i}]`)));
  if (version === CURRENT_SCHEMA_VERSION) {
    if (!isRecord(data.invoiceSequence)) {
      errors.push("invoiceSequence must be an object");
    } else {
      if (!isNonNegativeInt(data.invoiceSequence.nextNumber) || data.invoiceSequence.nextNumber < 1) {
        errors.push("invoiceSequence.nextNumber must be a positive integer");
      }
      if (data.invoiceSequence.lastIssueDate !== null && !isValidDateString(data.invoiceSequence.lastIssueDate as string)) {
        errors.push("invoiceSequence.lastIssueDate must be null or a YYYY-MM-DD date");
      }
    }
    if (!("runningTimer" in data)) {
      errors.push("runningTimer must be present (null when no timer is running)");
    } else {
      errors.push(...validateRunningTimer(data.runningTimer));
    }
    if (!("proEntitlement" in data)) {
      errors.push("proEntitlement must be present (null when Free)");
    } else {
      errors.push(...validateProEntitlement(data.proEntitlement));
    }
    if (!isRecord(data.rewardGrants)) {
      errors.push("rewardGrants must be an object");
    } else {
      if (typeof data.rewardGrants.month !== "string") errors.push("rewardGrants.month must be a string (YYYY-MM, or empty)");
      if (!isNonNegativeInt(data.rewardGrants.count)) errors.push("rewardGrants.count must be a non-negative integer");
    }
    if ("settings" in data) {
      errors.push("settings must not live in the store document (app settings live in Preferences — see settings.ts)");
    }
  }
  return { ok: errors.length === 0, errors, version };
}

// ---------------------------------------------------------------------------
// Migration v1 → v2 (explicit, one-way, fixture-tested)
// ---------------------------------------------------------------------------

/** v1 draft shape: counter inside `settings`, invoices without `currency`. */
export type V1StoreDocument = {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  clients: Client[];
  projects: Project[];
  entries: TimeEntry[];
  invoices: Omit<Invoice, "currency">[];
  settings: { nextInvoiceSequence?: number };
};

/**
 * Migrate a v1 document to v2. The counter moves to top-level
 * `invoiceSequence`; each invoice gains the `currency` snapshot from its
 * client (fallback "USD" when the client is missing — recorded in the
 * report, never guessed silently). v1 app settings are NOT carried over:
 * settings live in Preferences in v2, so a migrated install starts from
 * the documented defaults (see settings.ts).
 */
export function migrateV1ToV2(v1: V1StoreDocument): { doc: V2StoreDocument; report: string[] } {
  const report: string[] = [];
  const clientCurrency = new Map(v1.clients.map((c) => [c.id, c.currency]));
  const invoices: Invoice[] = v1.invoices.map((inv) => {
    const currency = clientCurrency.get(inv.clientId) ?? "USD";
    if (!clientCurrency.has(inv.clientId)) {
      report.push(`invoice ${inv.number}: client ${inv.clientId} missing, currency defaulted to USD`);
    }
    return { ...inv, currency };
  });
  const nextNumber =
    typeof v1.settings?.nextInvoiceSequence === "number" && v1.settings.nextInvoiceSequence >= 1
      ? Math.floor(v1.settings.nextInvoiceSequence)
      : 1;
  if (nextNumber === 1 && v1.invoices.length > 0) {
    report.push("v1 settings.nextInvoiceSequence missing; counter restarted at 1 — verify invoice numbers before issuing new ones");
  }
  report.push("v1 settings object dropped: app settings now live in Capacitor Preferences (defaults apply)");
  const lastIssueDate = v1.invoices.length
    ? v1.invoices.map((i) => i.issueDate).sort().at(-1) ?? null
    : null;
  const doc: V2StoreDocument = {
    schemaVersion: 2,
    createdAt: v1.createdAt,
    updatedAt: v1.updatedAt,
    clients: v1.clients,
    projects: v1.projects,
    entries: v1.entries,
    invoices,
    invoiceSequence: { nextNumber, lastIssueDate },
  };
  return { doc, report };
}

// ---------------------------------------------------------------------------
// Migration v2 → v3 (M2, purely additive)
// ---------------------------------------------------------------------------

/** v2 shape: identical to v3 except `runningTimer` does not exist (and, like v3, no Pro fields). */
export type V2StoreDocument = Omit<StoreDocument, "runningTimer" | "proEntitlement" | "rewardGrants" | "schemaVersion"> & { schemaVersion: 2 };

/**
 * Migrate a v2 document to v3. Only change: `runningTimer: null` (no
 * timer can have been running under v2 — the stopwatch did not exist).
 * Every record, the invoice counter, and all amounts are untouched.
 */
export function migrateV2ToV3(v2: V2StoreDocument): { doc: V3StoreDocument; report: string[] } {
  const doc: V3StoreDocument = { ...v2, schemaVersion: 3, runningTimer: null };
  return { doc, report: ["schema v2 → v3: runningTimer added (null — no timer was running)"] };
}

// ---------------------------------------------------------------------------
// Migration v3 → v4 (M4, purely additive)
// ---------------------------------------------------------------------------

/** v3 shape: identical to v4 except `proEntitlement` / `rewardGrants` do not exist. */
export type V3StoreDocument = Omit<StoreDocument, "proEntitlement" | "rewardGrants" | "schemaVersion"> & { schemaVersion: 3 };

/**
 * Migrate a v3 document to v4. Only changes: `proEntitlement: null`
 * (a v3 install never had Pro — purchases did not exist) and
 * `rewardGrants: { month: "", count: 0 }` (no grants earned).
 * Every record, the invoice counter, and all amounts are untouched.
 */
export function migrateV3ToV4(v3: V3StoreDocument): { doc: StoreDocument; report: string[] } {
  const doc: StoreDocument = {
    ...v3,
    schemaVersion: 4,
    proEntitlement: null,
    rewardGrants: { month: "", count: 0 },
  };
  return { doc, report: ["schema v3 → v4: proEntitlement added (null — no purchase existed) and rewardGrants added (0 grants)"] };
}

/**
 * Run the migration chain for a parsed document. Throws on future versions.
 * v1 documents are migrated BEFORE full validation: v1 invoices carry no
 * `currency` snapshot and the counter lives in `settings`, so the v2
 * validator would (correctly) reject them — migration is what fixes that.
 * The chain is v1 → v2 → v3 → v4; a v2 document migrates v2 → v3 → v4;
 * a v3 document migrates straight to v4.
 */
export function migrateDocument(data: unknown): { doc: StoreDocument; migratedFrom: number | null; report: string[] } {
  if (!isRecord(data)) throw new Error("Invalid store document: document must be an object");
  if (data.schemaVersion === 1) {
    const v1 = data as unknown as V1StoreDocument;
    if (!Array.isArray(v1.clients) || !Array.isArray(v1.projects) || !Array.isArray(v1.entries) || !Array.isArray(v1.invoices)) {
      throw new Error("Invalid store document: v1 document must have clients, projects, entries and invoices arrays");
    }
    const { doc: v2doc, report: v1report } = migrateV1ToV2(v1);
    const { doc: v3doc, report: v2report } = migrateV2ToV3(v2doc);
    const { doc, report: v3report } = migrateV3ToV4(v3doc);
    const recheck = validateStoreDocument(doc);
    if (!recheck.ok) throw new Error(`Migration v1→v4 produced an invalid document: ${recheck.errors.join("; ")}`);
    return { doc, migratedFrom: 1, report: [...v1report, ...v2report, ...v3report] };
  }
  if (data.schemaVersion === 2) {
    const v2 = data as unknown as V2StoreDocument;
    if (!Array.isArray(v2.clients) || !Array.isArray(v2.projects) || !Array.isArray(v2.entries) || !Array.isArray(v2.invoices)) {
      throw new Error("Invalid store document: v2 document must have clients, projects, entries and invoices arrays");
    }
    const { doc: v3doc, report: v2report } = migrateV2ToV3(v2);
    const { doc, report: v3report } = migrateV3ToV4(v3doc);
    const recheck = validateStoreDocument(doc);
    if (!recheck.ok) throw new Error(`Migration v2→v4 produced an invalid document: ${recheck.errors.join("; ")}`);
    return { doc, migratedFrom: 2, report: [...v2report, ...v3report] };
  }
  if (data.schemaVersion === 3) {
    const v3 = data as unknown as V3StoreDocument;
    if (!Array.isArray(v3.clients) || !Array.isArray(v3.projects) || !Array.isArray(v3.entries) || !Array.isArray(v3.invoices)) {
      throw new Error("Invalid store document: v3 document must have clients, projects, entries and invoices arrays");
    }
    const { doc, report } = migrateV3ToV4(v3);
    const recheck = validateStoreDocument(doc);
    if (!recheck.ok) throw new Error(`Migration v3→v4 produced an invalid document: ${recheck.errors.join("; ")}`);
    return { doc, migratedFrom: 3, report };
  }
  const check = validateStoreDocument(data);
  if (!check.ok) {
    const future = check.errors.find((e) => e.startsWith("future-schema-version:"));
    if (future) throw new FutureSchemaVersionError(Number(future.split(":")[1]));
    throw new Error(`Invalid store document: ${check.errors.join("; ")}`);
  }
  return { doc: data as StoreDocument, migratedFrom: null, report: [] };
}

export class FutureSchemaVersionError extends Error {
  readonly version: number;
  constructor(version: number) {
    super(
      `This data was created by a newer version of Freelancer Time & Invoice (schema v${version}). ` +
        `Please update the app — the file was left untouched.`
    );
    this.name = "FutureSchemaVersionError";
    this.version = version;
  }
}
