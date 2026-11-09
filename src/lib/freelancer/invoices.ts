/**
 * Freelancer Time & Invoice — invoice integrity (M1) + invoicing flow (M3).
 *
 * Rules (checklist §3, fixed):
 * - I-1 numbering: `INV-YYYYMMDD-NNN`, NNN from the persisted sequence
 *   counter inside the single store document. Exactly +1 per invoice.
 * - I-2 atomic creation: invoice + counter increment + entry markings
 *   happen in ONE store write (the caller runs `buildInvoice` inside
 *   `FreelancerStore.transact`). If the write fails, no invoice exists,
 *   the counter is unchanged, and no entry is marked.
 * - I-3 uniqueness across restarts and voids: the counter is persisted
 *   data, never in-memory only. A voided invoice keeps its number and
 *   status `void`; its number is never reused.
 * - I-4 no double-invoicing: the MODEL layer rejects any invoice
 *   containing an entry whose `invoiceId` is already set — not just the UI.
 * - I-5 historical amounts: each line snapshots `quantityHours`,
 *   `rateCents` and `amountCents` at creation; totals are stored values,
 *   never recomputed from current rates.
 *
 * Week-aware invoicing (M3 — resolves the M1 limitation): overtime is
 * computed on the client's FULL week, not just the invoiced subset.
 * `computeInvoiceLines` runs the pay engine over the whole document
 * (every entry of the client in the covered weeks, including entries
 * already invoiced on earlier invoices) and then builds lines ONLY from
 * the selected entries' attributed minutes. Attribution stays
 * chronological regular-first (see rates.ts), so invoicing Mon–Thu
 * first and Friday later gives Friday 4h regular + 5h overtime against
 * a 40h threshold — exactly as if the whole week had been invoiced at
 * once — and invoicing in either order gives the same per-session
 * split. The total across all invoices for a week therefore always
 * equals the single-invoice total for that week.
 *
 * Line building: for each week covered by the entries, the week's
 * regular/overtime minutes (engine figures, per client) are attributed
 * to sessions chronologically — first `regularMinutes` of paid minutes
 * are regular, the rest overtime (see rates.ts) — then grouped by
 * (week, rate, source) into lines. Line amounts are rounded per line
 * from attributed minutes; the invoice total is the SUM OF ITS LINES
 * (stored), so a line-level rounding can differ from the engine's
 * week-level pay figure by at most a cent per line. That is the
 * documented trade-off: invoice totals are snapshotted line sums, and
 * the timesheet report's gross pay remains the engine's figure.
 *
 * Overdue is DERIVED, never stored (M3): stored statuses are only
 * `draft | sent | paid | void`. `displayInvoiceStatus` returns
 * "overdue" when the stored status is `sent` (or the legacy stored
 * "overdue") and today is past `dueDate`. No transition ever writes
 * "overdue", and a draft that passes its due date still displays as
 * `draft` — it was never sent, so it cannot be overdue.
 *
 * Status transitions (M3, enforced in the store): `draft → sent →
 * paid`, and `void` from `draft` or `sent` only. A paid invoice cannot
 * be voided (its money is recorded as received); void keeps the number
 * and the invoice stays visible with status `void`.
 *
 * Parties (M3): the bill-to block snapshots the client record and the
 * seller block snapshots the company branding/settings at creation.
 * Both are editable per invoice WITHOUT mutating the stored client
 * record — the edits live on that invoice only.
 */
import { addDays, formatMoney, isValidDateString } from "@/lib/tools/time-card";
import { calculateClientPay } from "./rates";
import {
  newId,
  nowIso,
  type Client,
  type Invoice,
  type InvoiceLine,
  type InvoiceParty,
  type InvoiceStatus,
  type StoreDocument,
} from "./models";
import type { AppSettings } from "./settings";

export type CreateInvoiceInput = {
  clientId: string;
  /** Entry ids to invoice. All must belong to the client and be uninvoiced. */
  entryIds: string[];
  /** Issue date YYYY-MM-DD. Defaults to today (UTC date). */
  issueDate?: string;
  /** Tax percent (e.g. 10 = 10%). Defaults to 0. */
  taxPercent?: number;
  /** Explicit due date YYYY-MM-DD. Beats `paymentTermsDays` when both are given. */
  dueDate?: string;
  /** Net terms in days for this invoice. Beats the client's terms when given. */
  paymentTermsDays?: number;
  /** Bill-to block for this invoice only. Defaults to the client record. */
  billTo?: InvoiceParty;
  /** Seller block for this invoice only. Defaults to the company name in settings. */
  seller?: InvoiceParty;
  notes?: string;
};

/** `INV-YYYYMMDD-NNN` (NNN zero-padded to 3, grows past 999 naturally). */
export function formatInvoiceNumber(prefix: string, issueDate: string, sequence: number): string {
  return `${prefix}-${issueDate.replaceAll("-", "")}-${String(sequence).padStart(3, "0")}`;
}

/** Due date = issue date + the client's payment terms (default 14 days). */
export function invoiceDueDate(issueDate: string, paymentTermsDays: number): string {
  return addDays(issueDate, paymentTermsDays);
}

/**
 * Resolve the due date for an invoice: an explicit due date wins, else
 * the per-invoice terms override wins, else the client's terms.
 * Returns the due date plus the terms that produced it (the terms are
 * snapshotted on the invoice; an explicit due date snapshots null terms
 * only when neither override nor client terms applied — in practice the
 * client's terms are always the fallback, so the snapshot is the terms
 * actually used unless the date was typed directly).
 */
export function resolveInvoiceDueDate(args: {
  issueDate: string;
  client: Client;
  settings: AppSettings;
  dueDate?: string;
  paymentTermsDays?: number;
}): { dueDate: string; paymentTermsDays: number } {
  if (args.dueDate !== undefined) {
    if (!isValidDateString(args.dueDate)) throw new Error(`Cannot create invoice: dueDate ${args.dueDate} is not a YYYY-MM-DD date`);
    return { dueDate: args.dueDate, paymentTermsDays: args.paymentTermsDays ?? args.client.paymentTermsDays ?? args.settings.defaultPaymentTermsDays };
  }
  const terms = args.paymentTermsDays ?? args.client.paymentTermsDays ?? args.settings.defaultPaymentTermsDays;
  return { dueDate: invoiceDueDate(args.issueDate, terms), paymentTermsDays: terms };
}

function roundCents(minutes: number, rateCents: number, multiplier = 1): number {
  return Math.round((minutes * rateCents * multiplier) / 60);
}

/** Resolve the bill-to / seller snapshots for an invoice (pure). */
export function resolveInvoiceParties(args: {
  client: Client;
  settings: AppSettings;
  billTo?: InvoiceParty;
  seller?: InvoiceParty;
}): { billTo: InvoiceParty; seller: InvoiceParty | undefined } {
  const billTo: InvoiceParty = args.billTo ?? {
    name: args.client.name,
    ...(args.client.email ? { email: args.client.email } : {}),
    ...(args.client.address ? { address: args.client.address } : {}),
  };
  if (!billTo.name.trim()) throw new Error("Cannot create invoice: the bill-to name must not be empty");
  const sellerName = args.seller?.name ?? args.settings.companyName;
  const seller: InvoiceParty | undefined =
    args.seller ?? (sellerName.trim() ? { name: sellerName.trim() } : undefined);
  if (seller !== undefined && !seller.name.trim()) throw new Error("Cannot create invoice: the seller name must not be empty");
  return { billTo, seller };
}

/**
 * Compute the invoice lines for a set of entries WITHOUT mutating
 * anything (M3 preview path). Week-aware: the pay engine runs over the
 * client's FULL weeks in the document, and only the selected entries'
 * attributed minutes become lines. Entries with no rate configured
 * contribute hours but no billable line (same as M1).
 */
export function computeInvoiceLines(
  doc: StoreDocument,
  client: Client,
  entryIds: string[],
  settings: AppSettings
): { lines: Omit<InvoiceLine, "id" | "invoiceId">[]; subtotalCents: number } {
  const entries = entryIds.map((id) => {
    const entry = doc.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Cannot create invoice: entry ${id} does not exist`);
    return entry;
  });
  for (const entry of entries) {
    if (entry.clientId !== client.id) {
      throw new Error(`Cannot create invoice: entry ${entry.id} belongs to a different client`);
    }
    if (entry.invoiceId !== null) {
      throw new Error(
        `Cannot create invoice: entry ${entry.id} is already invoiced (invoice ${entry.invoiceId}) — double-invoicing is rejected`
      );
    }
  }
  const dates = entries.map((e) => e.date).sort();
  // FULL-week pay run: `doc` is the whole document, so entries already
  // invoiced on earlier invoices still consume their chronological
  // share of the week's regular hours. Lines are built from the
  // selected entries' attributed minutes only.
  const pay = calculateClientPay(doc, client, dates[0] as string, dates.at(-1) as string, settings);
  const selectedIds = new Set(entryIds);
  const byWeekRateSource = new Map<string, { weekStart: string; rateCents: number; source: "regular" | "overtime"; minutes: number }>();
  for (const week of pay.weeks) {
    for (const s of week.sessions) {
      if (!selectedIds.has(s.entryId)) continue; // another invoice's (or uninvoiced) session: consumes regular hours, builds no line here
      const rate = s.rateCents;
      if (rate === null) continue; // no rate configured: hours tracked, no billable amount
      for (const [source, minutes] of [
        ["regular", s.regularMinutes],
        ["overtime", s.overtimeMinutes],
      ] as const) {
        if (minutes <= 0) continue;
        const key = `${week.weekStart}|${rate}|${source}`;
        const existing = byWeekRateSource.get(key);
        if (existing) existing.minutes += minutes;
        else byWeekRateSource.set(key, { weekStart: week.weekStart, rateCents: rate, source, minutes });
      }
    }
  }
  const lines: Omit<InvoiceLine, "id" | "invoiceId">[] = [...byWeekRateSource.values()]
    .sort((a, b) => (a.weekStart === b.weekStart ? a.rateCents - b.rateCents : a.weekStart < b.weekStart ? -1 : 1))
    .map((g) => {
      const multiplier = g.source === "overtime" ? (client.overtimeMultiplier ?? settings.overtimeMultiplier) : 1;
      const quantityHours = Math.round((g.minutes / 60) * 100) / 100;
      return {
        description:
          g.source === "overtime"
            ? `Week of ${g.weekStart} — Overtime hours (${formatMoney(g.rateCents, client.currency)} × ${multiplier})`
            : `Week of ${g.weekStart} — Regular hours`,
        quantityHours,
        rateCents: g.source === "overtime" ? Math.round(g.rateCents * multiplier) : g.rateCents,
        amountCents: roundCents(g.minutes, g.rateCents, multiplier),
        source: g.source,
      };
    });
  return { lines, subtotalCents: lines.reduce((s, l) => s + l.amountCents, 0) };
}

export type InvoicePreview = {
  number: string;
  issueDate: string;
  dueDate: string;
  paymentTermsDays: number;
  billTo: InvoiceParty;
  seller: InvoiceParty | undefined;
  currency: string;
  taxPercent: number;
  lines: Omit<InvoiceLine, "id" | "invoiceId">[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Preview an invoice without creating anything (M3): same lines,
 * totals, due date, parties and number that `buildInvoice` would
 * produce, with no mutation — no invoice, no counter bump, no entry
 * markings. The creation UI shows this review step before the user
 * confirms; the test suite asserts preview === created invoice.
 */
export function previewInvoice(doc: StoreDocument, input: CreateInvoiceInput, settings: AppSettings): InvoicePreview {
  const client = doc.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error(`Cannot create invoice: client ${input.clientId} does not exist`);
  if (input.entryIds.length === 0) throw new Error("Cannot create invoice: no time entries selected");
  const issueDate = input.issueDate ?? nowIso().slice(0, 10);
  const taxPercent = input.taxPercent ?? 0;
  if (taxPercent < 0 || !Number.isFinite(taxPercent)) throw new Error("Cannot create invoice: taxPercent must be a non-negative number");
  const { dueDate, paymentTermsDays } = resolveInvoiceDueDate({ issueDate, client, settings, dueDate: input.dueDate, paymentTermsDays: input.paymentTermsDays });
  const { billTo, seller } = resolveInvoiceParties({ client, settings, billTo: input.billTo, seller: input.seller });
  const { lines, subtotalCents } = computeInvoiceLines(doc, client, input.entryIds, settings);
  const taxCents = Math.round((subtotalCents * taxPercent) / 100);
  return {
    number: formatInvoiceNumber(settings.invoiceNumberPrefix, issueDate, doc.invoiceSequence.nextNumber),
    issueDate,
    dueDate,
    paymentTermsDays,
    billTo,
    seller,
    currency: client.currency,
    taxPercent,
    lines,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

/**
 * Build an invoice from a store document WITHOUT persisting it.
 * Mutates `draft` (invoice appended, entries marked, counter bumped) and
 * returns the invoice. The caller must persist `draft` atomically —
 * `FreelancerStore.createInvoice` does this via `transact`, so a failed
 * save discards every change here.
 */
export function buildInvoice(draft: StoreDocument, input: CreateInvoiceInput, settings: AppSettings): Invoice {
  const client = draft.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error(`Cannot create invoice: client ${input.clientId} does not exist`);
  if (input.entryIds.length === 0) throw new Error("Cannot create invoice: no time entries selected");
  const entries = input.entryIds.map((id) => {
    const entry = draft.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Cannot create invoice: entry ${id} does not exist`);
    return entry;
  });
  for (const entry of entries) {
    if (entry.clientId !== client.id) {
      throw new Error(`Cannot create invoice: entry ${entry.id} belongs to a different client`);
    }
    if (entry.invoiceId !== null) {
      throw new Error(
        `Cannot create invoice: entry ${entry.id} is already invoiced (invoice ${entry.invoiceId}) — double-invoicing is rejected`
      );
    }
  }

  const preview = previewInvoice(draft, input, settings);
  const invoiceId = newId();
  const lines: InvoiceLine[] = preview.lines.map((l) => ({ ...l, id: newId(), invoiceId }));
  const sequence = draft.invoiceSequence.nextNumber;
  const invoice: Invoice = {
    id: invoiceId,
    number: preview.number,
    clientId: client.id,
    issueDate: preview.issueDate,
    dueDate: preview.dueDate,
    paymentTermsDays: preview.paymentTermsDays,
    status: "draft",
    currency: client.currency,
    taxPercent: preview.taxPercent,
    billTo: preview.billTo,
    ...(preview.seller ? { seller: preview.seller } : {}),
    subtotalCents: preview.subtotalCents,
    taxCents: preview.taxCents,
    totalCents: preview.totalCents,
    lines,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  draft.invoices.push(invoice);
  for (const entry of entries) {
    entry.invoiceId = invoiceId;
    entry.updatedAt = nowIso();
  }
  draft.invoiceSequence = { nextNumber: sequence + 1, lastIssueDate: preview.issueDate };
  return invoice;
}

/** Display status for lists (M3). "overdue" is derived, never stored. */
export type DisplayInvoiceStatus = InvoiceStatus | "overdue";

/**
 * Display status of an invoice on a given day (YYYY-MM-DD, defaults to
 * today UTC). `sent` + today past `dueDate` → "overdue". A stored legacy
 * "overdue" also displays as overdue. Drafts, paid and void invoices
 * never display as overdue, however late they are.
 */
export function displayInvoiceStatus(invoice: Invoice, today: string = nowIso().slice(0, 10)): DisplayInvoiceStatus {
  const stored = invoice.status as InvoiceStatus | "overdue";
  if ((stored === "sent" || stored === "overdue") && today > invoice.dueDate) return "overdue";
  return stored === "overdue" ? "sent" : stored;
}

/** Bill-to block for display: the invoice snapshot, or the client record for pre-M3 invoices. */
export function invoiceBillTo(invoice: Invoice, client: Client): InvoiceParty {
  return (
    invoice.billTo ?? {
      name: client.name,
      ...(client.email ? { email: client.email } : {}),
      ...(client.address ? { address: client.address } : {}),
    }
  );
}

/** The only legal status moves (M3). Anything else is rejected, never silently applied. */
export function assertInvoiceTransition(from: InvoiceStatus | "overdue", to: "sent" | "paid" | "void"): void {
  const allowed: Record<string, string[]> = {
    draft: ["sent", "void"],
    sent: ["paid", "void"],
    paid: [],
    void: [],
    overdue: ["paid", "void"], // legacy stored value: same moves as sent
  };
  if (!(allowed[from] ?? []).includes(to)) {
    throw new Error(`Cannot move invoice from ${from} to ${to}`);
  }
}

/** One-line summary for lists ("INV-20261107-001 · $1,234.56 · draft"). */
export function invoiceSummary(invoice: Invoice): string {
  return `${invoice.number} · ${formatMoney(invoice.totalCents, invoice.currency)} · ${invoice.status}`;
}
