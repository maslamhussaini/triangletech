"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFreelancerData } from "../data-context";
import { addDays, dateOrdinal, formatDuration, formatMoney } from "@/lib/tools/time-card";
import {
  displayInvoiceStatus,
  invoiceBillTo,
  previewInvoice,
  type DisplayInvoiceStatus,
} from "@/lib/freelancer/invoices";
import { FREE_LIMITS_HYPOTHESIS, FreeCapError, invoiceCapStatus, isFreeCapError } from "@/lib/freelancer/entitlements";
import { downloadInvoiceCsv, downloadInvoicePdf } from "@/lib/freelancer/exports";
import { groupEntriesByWeek, shortDayLabel } from "@/lib/freelancer/sessions";
import { EMPTY_BRANDING } from "@/lib/tools/report-branding";
import type { Invoice } from "@/lib/freelancer/models";
import {
  alertBox,
  card,
  dangerButton,
  errorText,
  field,
  h1,
  h2,
  h3,
  input,
  label,
  mutedText,
  pageWrap,
  primaryButton,
  row,
  secondaryButton,
} from "../styles";

/**
 * Invoices (M3): creation from hours, list/history/statuses, detail,
 * branded PDF + per-invoice CSV via the native share sheet.
 *
 * - Creation: pick a client, pick the sessions (all uninvoiced sessions
 *   checked by default), review the preview — lines, totals, bill-to,
 *   seller, issue/due dates, tax — then create. Overtime is computed on
 *   the client's FULL week, so invoicing part of a week is always
 *   correct (see invoices.ts); the review shows exactly what creation
 *   will produce.
 * - Statuses: stored statuses are only draft/sent/paid/void. "Overdue"
 *   is DERIVED (stored `sent` + today past the due date) and is shown
 *   as a filter and a banner, never written. Transitions are
 *   draft → sent → paid; void from draft/sent only. A voided invoice
 *   keeps its number, is never reissued, and stays visible.
 * - The share sheet itself cannot be tested without a device: the PDF
 *   and CSV bytes are produced and verified in tests, and the share
 *   call is wired here through the same `shareOrDownloadBlob` path the
 *   timesheet exports use.
 */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_FILTERS: { value: "all" | DisplayInvoiceStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

export default function InvoicesClient() {
  const { store, doc, load, settings, branding, error, refresh, isPro, ads, grantRewardedInvoice } = useFreelancerData();
  const [view, setView] = useState<"list" | "detail" | "new">("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DisplayInvoiceStatus>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<"pdf" | "csv" | null>(null);
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  // M4 Free-cap upsell state: set when the store refuses a creation
  // with a FreeCapError (3 invoices/month on Free).
  const [capHit, setCapHit] = useState<FreeCapError | null>(null);
  const [rewarding, setRewarding] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  // Creation flow state.
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [issueDate, setIssueDate] = useState(todayLocal());
  const [termsDays, setTermsDays] = useState("14");
  const [dueDate, setDueDate] = useState("");
  const [dueManual, setDueManual] = useState(false);
  const [taxPercent, setTaxPercent] = useState("0");
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const today = todayLocal();
  const activeClients = useMemo(() => (doc?.clients ?? []).filter((c) => !c.archived), [doc]);
  const newClient = activeClients.find((c) => c.id === newClientId) ?? activeClients[0] ?? null;

  const invoicesWithDisplay = useMemo(() => {
    if (!doc) return [];
    return doc.invoices
      .map((invoice) => ({ invoice, display: displayInvoiceStatus(invoice, today) }))
      .sort((a, b) => (a.invoice.issueDate === b.invoice.issueDate ? (a.invoice.number < b.invoice.number ? 1 : -1) : a.invoice.issueDate < b.invoice.issueDate ? 1 : -1));
  }, [doc, today]);
  const filteredInvoices = invoicesWithDisplay.filter((i) => statusFilter === "all" || i.display === statusFilter);
  const filteredTotal = filteredInvoices.reduce((s, i) => s + i.invoice.totalCents, 0);
  const statusCounts = useMemo(() => {
    const counts = new Map<DisplayInvoiceStatus, number>();
    for (const { display } of invoicesWithDisplay) counts.set(display, (counts.get(display) ?? 0) + 1);
    return counts;
  }, [invoicesWithDisplay]);

  const selectedInvoice = selectedInvoiceId ? doc?.invoices.find((i) => i.id === selectedInvoiceId) ?? null : null;
  const selectedInvoiceClient = selectedInvoice ? doc?.clients.find((c) => c.id === selectedInvoice.clientId) ?? null : null;
  const selectedDisplay = selectedInvoice ? displayInvoiceStatus(selectedInvoice, today) : null;

  // Uninvoiced sessions for the creation flow, grouped by week/day.
  const newClientWeeks = useMemo(() => {
    if (!doc || !newClient || !settings) return [];
    const uninvoiced = doc.entries.filter((e) => e.clientId === newClient.id && e.invoiceId === null);
    if (uninvoiced.length === 0) return [];
    const dates = uninvoiced.map((e) => e.date).sort();
    try {
      return groupEntriesByWeek(doc, newClient, dates[0] as string, dates[dates.length - 1] as string, settings);
    } catch {
      return [];
    }
  }, [doc, newClient, settings]);
  const uninvoicedEntries = useMemo(
    () => newClientWeeks.flatMap((w) => w.days.flatMap((d) => d.entries)),
    [newClientWeeks]
  );
  const selectedPaidMinutes = useMemo(
    () => uninvoicedEntries.filter((e) => selectedEntryIds.includes(e.entry.id)).reduce((s, e) => s + e.paidMinutes, 0),
    [uninvoicedEntries, selectedEntryIds]
  );

  const preview = useMemo(() => {
    if (view !== "new" || !doc || !newClient || !settings || selectedEntryIds.length === 0) return null;
    const tax = Number(taxPercent);
    if (!Number.isFinite(tax) || tax < 0) return { error: "Tax must be a number of 0 or more." };
    try {
      const result = previewInvoice(
        doc,
        {
          clientId: newClient.id,
          entryIds: selectedEntryIds,
          issueDate,
          dueDate: dueDate || undefined,
          taxPercent: tax,
          billTo: billToName.trim()
            ? { name: billToName.trim(), ...(billToEmail.trim() ? { email: billToEmail.trim() } : {}), ...(billToAddress.trim() ? { address: billToAddress.trim() } : {}) }
            : { name: "" },
          seller:
            sellerName.trim() || sellerEmail.trim() || sellerAddress.trim()
              ? { name: sellerName.trim(), ...(sellerEmail.trim() ? { email: sellerEmail.trim() } : {}), ...(sellerAddress.trim() ? { address: sellerAddress.trim() } : {}) }
              : undefined,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        settings
      );
      return { preview: result };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [view, doc, newClient, settings, selectedEntryIds, issueDate, dueDate, taxPercent, billToName, billToEmail, billToAddress, sellerName, sellerEmail, sellerAddress, notes]);

  if (error) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Invoices</h1>
        <p role="alert" style={alertBox}>{error}</p>
      </main>
    );
  }
  if (!doc || !load || !settings) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Invoices</h1>
        <p>Loading your data…</p>
      </main>
    );
  }

  const clientName = (id: string) => doc.clients.find((c) => c.id === id)?.name ?? "Unknown client";

  function startNewInvoice(clientId?: string) {
    const client = activeClients.find((c) => c.id === clientId) ?? activeClients[0];
    if (!client) return;
    const uninvoiced = doc?.entries.filter((e) => e.clientId === client.id && e.invoiceId === null) ?? [];
    const issue = todayLocal();
    const terms = String(client.paymentTermsDays);
    setNewClientId(client.id);
    setSelectedEntryIds(uninvoiced.map((e) => e.id));
    setIssueDate(issue);
    setTermsDays(terms);
    setDueDate(addDays(issue, client.paymentTermsDays));
    setDueManual(false);
    setTaxPercent("0");
    setBillToName(client.name);
    setBillToEmail(client.email ?? "");
    setBillToAddress(client.address ?? "");
    setSellerName(branding?.companyName || settings?.companyName || "");
    setSellerEmail("");
    setSellerAddress("");
    setNotes("");
    setCreateError(null);
    setCapHit(null);
    setRewardMessage(null);
    setView("new");
  }

  function changeNewClient(clientId: string) {
    startNewInvoice(clientId);
  }

  function handleIssueDateChange(value: string) {
    setIssueDate(value);
    if (!dueManual) {
      const terms = Number(termsDays);
      if (Number.isFinite(terms) && terms >= 0) setDueDate(addDays(value, terms));
    }
  }

  function handleTermsChange(value: string) {
    setTermsDays(value);
    const terms = Number(value);
    if (Number.isFinite(terms) && terms >= 0 && issueDate) {
      setDueDate(addDays(issueDate, terms));
      setDueManual(false);
    }
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
    setDueManual(true);
    if (issueDate && value) {
      const diff = dateOrdinal(value) - dateOrdinal(issueDate);
      if (Number.isFinite(diff) && diff >= 0) setTermsDays(String(diff));
    }
  }

  async function handleCreate() {
    if (!store || !newClient || !settings) return;
    setCreateError(null);
    if (selectedEntryIds.length === 0) {
      setCreateError("Select at least one session to invoice.");
      return;
    }
    const tax = Number(taxPercent);
    if (!Number.isFinite(tax) || tax < 0) {
      setCreateError("Tax must be a number of 0 or more.");
      return;
    }
    if (!billToName.trim()) {
      setCreateError("The bill-to name must not be empty.");
      return;
    }
    setCreating(true);
    try {
      const invoice = await store.createInvoice(
        {
          clientId: newClient.id,
          entryIds: selectedEntryIds,
          issueDate,
          dueDate: dueDate || undefined,
          taxPercent: tax,
          billTo: {
            name: billToName.trim(),
            ...(billToEmail.trim() ? { email: billToEmail.trim() } : {}),
            ...(billToAddress.trim() ? { address: billToAddress.trim() } : {}),
          },
          seller:
            sellerName.trim() || sellerEmail.trim() || sellerAddress.trim()
              ? {
                  name: sellerName.trim(),
                  ...(sellerEmail.trim() ? { email: sellerEmail.trim() } : {}),
                  ...(sellerAddress.trim() ? { address: sellerAddress.trim() } : {}),
                }
              : undefined,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        settings
      );
      await refresh();
      setSelectedInvoiceId(invoice.id);
      setView("detail");
    } catch (err) {
      // A Free-cap refusal shows the Pro upsell (with the rewarded-ad
      // option) instead of a bare error line.
      if (isFreeCapError(err)) {
        setCapHit(err);
        setCreateError(null);
      } else {
        setCreateError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setCreating(false);
    }
  }

  /** Opt-in rewarded ad: one watched ad grants one extra invoice this month (M4, plan §9). */
  async function handleRewardedExtraInvoice() {
    if (!ads || !store) return;
    setRewarding(true);
    setRewardMessage(null);
    try {
      const earned = await ads.showRewardedForExtraInvoice();
      if (earned) {
        const count = await grantRewardedInvoice();
        await refresh();
        setCapHit(null);
        setRewardMessage(`Extra invoice unlocked for this month (grant ${count}). You can create the invoice now.`);
      } else {
        setRewardMessage("No reward was earned — the ad did not complete. You can try again, or upgrade to Pro.");
      }
    } finally {
      setRewarding(false);
    }
  }

  async function handleTransition(action: "sent" | "paid" | "void", invoice: Invoice) {
    if (!store) return;
    setActionError(null);
    try {
      if (action === "sent") await store.markInvoiceSent(invoice.id);
      if (action === "paid") await store.markInvoicePaid(invoice.id);
      if (action === "void") {
        await store.voidInvoice(invoice.id);
        setConfirmVoidId(null);
      }
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleShare(kind: "pdf" | "csv", invoice: Invoice) {
    if (!selectedInvoiceClient) return;
    setActionError(null);
    setSharing(kind);
    try {
      const display = displayInvoiceStatus(invoice, today);
      if (kind === "pdf") await downloadInvoicePdf(invoice, selectedInvoiceClient, branding ?? EMPTY_BRANDING, { displayStatus: display });
      else await downloadInvoiceCsv(invoice, selectedInvoiceClient);
      // M4: an interstitial may show after an export/share — at most 1
      // per 2 actions, never on the invoice screen itself (the ad shows
      // after the share sheet, via the ads service cadence).
      void ads?.noteExportOrShare();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSharing(null);
    }
  }

  function openDetail(invoice: Invoice) {
    setSelectedInvoiceId(invoice.id);
    setConfirmVoidId(null);
    setActionError(null);
    setView("detail");
  }

  return (
    <main style={pageWrap}>
      <h1 style={h1}>Invoices</h1>

      {view === "list" && (
        <>
          {activeClients.length === 0 ? (
            <section style={card}>
              <h2 style={h2}>No clients yet</h2>
              <p style={mutedText}>Add a client first — every invoice belongs to a client.</p>
              <Link href="/freelancer/clients" style={{ ...primaryButton, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
                Add your first client
              </Link>
            </section>
          ) : (
            <>
              <div style={{ ...row, marginBottom: 12 }}>
                <button type="button" style={primaryButton} onClick={() => startNewInvoice()}>
                  New invoice
                </button>
              </div>
              {!isPro && doc && (
                <p style={{ ...mutedText, marginTop: 0 }}>
                  Free plan: {invoiceCapStatus(doc, today).used} of {FREE_LIMITS_HYPOTHESIS.maxInvoicesPerMonth} invoices used in{" "}
                  {today.slice(0, 7)}. <Link href="/freelancer/pro">Upgrade to Pro for unlimited invoices</Link>.
                </p>
              )}
              <section style={card} aria-label="Filter invoices">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      style={statusFilter === f.value ? primaryButton : secondaryButton}
                      onClick={() => setStatusFilter(f.value)}
                    >
                      {f.label}
                      {f.value !== "all" ? ` (${statusCounts.get(f.value as DisplayInvoiceStatus) ?? 0})` : ` (${invoicesWithDisplay.length})`}
                    </button>
                  ))}
                </div>
                <p style={{ ...mutedText, marginTop: 12, marginBottom: 0 }}>
                  {filteredInvoices.length} invoice(s) · {formatMoney(filteredTotal, filteredInvoices[0]?.invoice.currency ?? "USD")} total
                  {statusFilter === "overdue" ? " — overdue means sent and past the due date." : ""}
                </p>
              </section>
              {filteredInvoices.length === 0 ? (
                <p style={mutedText}>
                  {invoicesWithDisplay.length === 0
                    ? "No invoices yet. Create one from tracked hours."
                    : "No invoices with this status."}
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {filteredInvoices.map(({ invoice, display }) => (
                    <li key={invoice.id} style={card}>
                      <button
                        type="button"
                        onClick={() => openDetail(invoice)}
                        style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", textAlign: "left" }}
                      >
                        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1B1B4B" }}>
                          {invoice.number} · {formatMoney(invoice.totalCents, invoice.currency)}
                        </p>
                        <p style={{ ...mutedText, marginBottom: 0 }}>
                          {clientName(invoice.clientId)} · issued {invoice.issueDate} · due {invoice.dueDate} · {display}
                          {display === "overdue" ? " — past due" : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {view === "detail" && selectedInvoice && selectedInvoiceClient && (
        <>
          <div style={{ ...row, marginBottom: 12 }}>
            <button type="button" style={secondaryButton} onClick={() => setView("list")}>← All invoices</button>
          </div>
          <section style={card} aria-label="Invoice detail">
            <h2 style={h2}>{selectedInvoice.number}</h2>
            <p style={mutedText}>
              {clientName(selectedInvoice.clientId)} · {selectedDisplay}
              {selectedDisplay === "overdue" ? ` — due ${selectedInvoice.dueDate} and past due. The stored status stays “sent”; overdue is shown because today is past the due date.` : ""}
              {selectedInvoice.status === "void" ? " — voided invoices keep their number and are never reissued." : ""}
            </p>
            <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>Issued: {selectedInvoice.issueDate}</p>
            <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>
              Due: {selectedInvoice.dueDate}
              {selectedInvoice.paymentTermsDays !== undefined ? ` (Net ${selectedInvoice.paymentTermsDays} days)` : ""}
            </p>
            <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>
              Bill to: {invoiceBillTo(selectedInvoice, selectedInvoiceClient).name}
              {invoiceBillTo(selectedInvoice, selectedInvoiceClient).email ? ` · ${invoiceBillTo(selectedInvoice, selectedInvoiceClient).email}` : ""}
              {invoiceBillTo(selectedInvoice, selectedInvoiceClient).address ? ` · ${invoiceBillTo(selectedInvoice, selectedInvoiceClient).address}` : ""}
            </p>
            {selectedInvoice.seller && (
              <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>
                From: {selectedInvoice.seller.name}
                {selectedInvoice.seller.email ? ` · ${selectedInvoice.seller.email}` : ""}
                {selectedInvoice.seller.address ? ` · ${selectedInvoice.seller.address}` : ""}
              </p>
            )}
            {selectedInvoice.notes && (
              <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>Notes: {selectedInvoice.notes}</p>
            )}
          </section>

          <section style={card} aria-label="Invoice lines">
            <h3 style={h3}>Lines</h3>
            {selectedInvoice.lines.length === 0 ? (
              <p style={mutedText}>No billable lines — the invoiced sessions had no rate set.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {selectedInvoice.lines.map((line) => (
                  <li key={line.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid #F1F5F9", fontSize: 15 }}>
                    <span style={{ color: "#1B1B4B" }}>
                      {line.description} — {line.quantityHours.toFixed(2)}h × {formatMoney(line.rateCents, selectedInvoice.currency)}
                    </span>
                    <span style={{ fontWeight: 700, color: "#1B1B4B", whiteSpace: "nowrap" }}>{formatMoney(line.amountCents, selectedInvoice.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: 15, color: "#1B1B4B", margin: "12px 0 4px" }}>Subtotal: {formatMoney(selectedInvoice.subtotalCents, selectedInvoice.currency)}</p>
            <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>Tax ({selectedInvoice.taxPercent}%): {formatMoney(selectedInvoice.taxCents, selectedInvoice.currency)}</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1B1B4B", margin: "4px 0 0" }}>Total due: {formatMoney(selectedInvoice.totalCents, selectedInvoice.currency)}</p>
          </section>

          <section style={card} aria-label="Invoice actions">
            <h3 style={h3}>Actions</h3>
            {actionError && (
              <p role="alert" style={errorText}>{actionError}</p>
            )}
            <div style={row}>
              {selectedInvoice.status === "draft" && (
                <button type="button" style={primaryButton} onClick={() => handleTransition("sent", selectedInvoice)}>Mark sent</button>
              )}
              {selectedInvoice.status === "sent" && (
                <button type="button" style={primaryButton} onClick={() => handleTransition("paid", selectedInvoice)}>Mark paid</button>
              )}
              {(selectedInvoice.status === "draft" || selectedInvoice.status === "sent") &&
                (confirmVoidId === selectedInvoice.id ? (
                  <button type="button" style={dangerButton} onClick={() => handleTransition("void", selectedInvoice)}>Confirm void</button>
                ) : (
                  <button type="button" style={dangerButton} onClick={() => setConfirmVoidId(selectedInvoice.id)}>Void invoice</button>
                ))}
              <button type="button" style={secondaryButton} disabled={sharing !== null} onClick={() => handleShare("pdf", selectedInvoice)}>
                {sharing === "pdf" ? "Preparing PDF…" : "Share PDF"}
              </button>
              <button type="button" style={secondaryButton} disabled={sharing !== null} onClick={() => handleShare("csv", selectedInvoice)}>
                {sharing === "csv" ? "Preparing CSV…" : "Share CSV"}
              </button>
            </div>
            <p style={{ ...mutedText, marginTop: 12, marginBottom: 0 }}>
              The PDF and CSV open in the system share sheet on the phone (or download in the browser preview). The invoiced sessions are locked on the Time Card — they show this invoice number and can no longer be edited or deleted.
            </p>
          </section>

          <section style={card} aria-label="Invoiced sessions">
            <h3 style={h3}>Sessions on this invoice</h3>
            {doc.entries.filter((e) => e.invoiceId === selectedInvoice.id).length === 0 ? (
              <p style={mutedText}>No sessions recorded on this invoice.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {doc.entries
                  .filter((e) => e.invoiceId === selectedInvoice.id)
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .map((entry) => (
                    <li key={entry.id} style={{ padding: "6px 0", borderTop: "1px solid #F1F5F9", fontSize: 15 }}>
                      {shortDayLabel(entry.date)} —{" "}
                      {entry.mode === "direct" ? `${entry.directHours ?? 0}h (hours only)` : `${entry.startTime}–${entry.endTime}${entry.endsNextDay ? " (+1 day)" : ""}`}
                      {entry.notes ? ` · ${entry.notes}` : ""}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}

      {view === "new" && newClient && (
        <>
          <div style={{ ...row, marginBottom: 12 }}>
            <button type="button" style={secondaryButton} onClick={() => setView("list")}>← All invoices</button>
          </div>

          <section style={card} aria-label="Choose client">
            <h2 style={h2}>New invoice</h2>
            <label style={label} htmlFor="inv-client">Client</label>
            <select id="inv-client" style={input} value={newClient.id} onChange={(e) => changeNewClient(e.target.value)}>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p style={{ ...mutedText, marginTop: 8, marginBottom: 0 }}>
              {formatMoney(newClient.defaultRateCents, newClient.currency)}/hour · {newClient.currency} · Net {newClient.paymentTermsDays} days
            </p>
          </section>

          <section style={card} aria-label="Choose sessions">
            <h3 style={h3}>Sessions to invoice</h3>
            {uninvoicedEntries.length === 0 ? (
              <p style={mutedText}>No uninvoiced sessions for {newClient.name}. Add sessions on the Time Card first.</p>
            ) : (
              <>
                <p style={mutedText}>
                  {selectedEntryIds.length} of {uninvoicedEntries.length} selected · {formatDuration(selectedPaidMinutes)} paid. Overtime is
                  worked out on the client&apos;s full week, so invoicing part of a week stays correct — earlier sessions count as regular first.
                </p>
                {newClientWeeks.map((week) => (
                  <div key={week.weekStart} style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8, marginTop: 8 }}>
                    <p style={{ fontWeight: 700, color: "#1B1B4B", margin: "0 0 4px", fontSize: 15 }}>
                      Week of {shortDayLabel(week.weekStart)}
                    </p>
                    {week.days.map((day) => (
                      <div key={day.date}>
                        {day.entries
                          .filter((item) => item.entry.invoiceId === null)
                          .map(({ entry, paidMinutes, overtimeMinutes, payCents }) => (
                            <label key={entry.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", fontSize: 15, color: "#1B1B4B" }}>
                              <input
                                type="checkbox"
                                checked={selectedEntryIds.includes(entry.id)}
                                onChange={(e) =>
                                  setSelectedEntryIds((prev) =>
                                    e.target.checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id)
                                  )
                                }
                                style={{ marginTop: 4, minWidth: 18, minHeight: 18 }}
                              />
                              <span>
                                {shortDayLabel(entry.date)} —{" "}
                                {entry.mode === "direct"
                                  ? `${entry.directHours ?? 0}h (hours only)`
                                  : `${entry.startTime}–${entry.endTime}${entry.endsNextDay ? " (+1 day)" : ""}`}
                                <br />
                                <span style={{ fontSize: 13, color: "#64748B" }}>
                                  {formatDuration(paidMinutes)} paid
                                  {overtimeMinutes > 0 ? ` · ${formatDuration(overtimeMinutes)} overtime` : ""}
                                  {payCents !== null ? ` · ${formatMoney(payCents, newClient.currency)}` : " · no rate set"}
                                  {entry.notes ? ` · ${entry.notes}` : ""}
                                </span>
                              </span>
                            </label>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </section>

          <section style={card} aria-label="Invoice details">
            <h3 style={h3}>Details</h3>
            <div style={row}>
              <div style={field}>
                <label style={label} htmlFor="inv-issue">Issue date</label>
                <input id="inv-issue" style={input} type="date" value={issueDate} onChange={(e) => handleIssueDateChange(e.target.value)} />
              </div>
              <div style={field}>
                <label style={label} htmlFor="inv-terms">Net terms (days)</label>
                <input id="inv-terms" style={input} inputMode="numeric" value={termsDays} onChange={(e) => handleTermsChange(e.target.value)} />
              </div>
              <div style={field}>
                <label style={label} htmlFor="inv-due">Due date</label>
                <input id="inv-due" style={input} type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} />
              </div>
              <div style={field}>
                <label style={label} htmlFor="inv-tax">Tax (%)</label>
                <input id="inv-tax" style={input} inputMode="decimal" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
              </div>
            </div>
            <div style={row}>
              <div style={field}>
                <label style={label} htmlFor="inv-billto-name">Bill to — name</label>
                <input id="inv-billto-name" style={input} value={billToName} onChange={(e) => setBillToName(e.target.value)} />
              </div>
              <div style={field}>
                <label style={label} htmlFor="inv-billto-email">Bill to — email (optional)</label>
                <input id="inv-billto-email" style={input} type="email" value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} />
              </div>
            </div>
            <div style={field}>
              <label style={label} htmlFor="inv-billto-address">Bill to — address (optional)</label>
              <input id="inv-billto-address" style={input} value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} />
            </div>
            <div style={row}>
              <div style={field}>
                <label style={label} htmlFor="inv-seller-name">From — your name / business (optional)</label>
                <input id="inv-seller-name" style={input} value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
              </div>
              <div style={field}>
                <label style={label} htmlFor="inv-seller-email">From — email (optional)</label>
                <input id="inv-seller-email" style={input} type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} />
              </div>
            </div>
            <div style={field}>
              <label style={label} htmlFor="inv-seller-address">From — address (optional)</label>
              <input id="inv-seller-address" style={input} value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="inv-notes">Notes (optional)</label>
              <input id="inv-notes" style={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <p style={{ ...mutedText, marginBottom: 0 }}>
              Bill-to and seller edits apply to this invoice only — the stored client record is not changed.
            </p>
          </section>

          <section style={card} aria-label="Review invoice">
            <h3 style={h3}>Review</h3>
            {selectedEntryIds.length === 0 ? (
              <p style={mutedText}>Select at least one session to see the invoice preview.</p>
            ) : preview && "error" in preview ? (
              <p role="alert" style={errorText}>{preview.error}</p>
            ) : preview && "preview" in preview ? (
              <>
                <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>
                  {preview.preview.number} · Issue {preview.preview.issueDate} · Due {preview.preview.dueDate} (Net {preview.preview.paymentTermsDays} days)
                </p>
                <ul style={{ listStyle: "none", margin: "8px 0", padding: 0 }}>
                  {preview.preview.lines.length === 0 ? (
                    <li style={{ fontSize: 15, color: "#1B1B4B" }}>No billable lines — the selected sessions have no rate set.</li>
                  ) : (
                    preview.preview.lines.map((line, i) => (
                      <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid #F1F5F9", fontSize: 15 }}>
                        <span style={{ color: "#1B1B4B" }}>
                          {line.description} — {line.quantityHours.toFixed(2)}h × {formatMoney(line.rateCents, preview.preview.currency)}
                        </span>
                        <span style={{ fontWeight: 700, color: "#1B1B4B", whiteSpace: "nowrap" }}>{formatMoney(line.amountCents, preview.preview.currency)}</span>
                      </li>
                    ))
                  )}
                </ul>
                <p style={{ fontSize: 15, color: "#1B1B4B", margin: "8px 0 4px" }}>Subtotal: {formatMoney(preview.preview.subtotalCents, preview.preview.currency)}</p>
                <p style={{ fontSize: 15, color: "#1B1B4B", margin: "0 0 4px" }}>Tax ({preview.preview.taxPercent}%): {formatMoney(preview.preview.taxCents, preview.preview.currency)}</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#1B1B4B", margin: "4px 0 0" }}>Total due: {formatMoney(preview.preview.totalCents, preview.preview.currency)}</p>
              </>
            ) : null}
            {createError && (
              <p role="alert" style={errorText}>{createError}</p>
            )}
            {capHit && (
              <section style={alertBox} aria-label="Free invoice limit reached">
                <p style={{ margin: "0 0 8px" }}>{capHit.message}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/freelancer/pro" style={{ ...primaryButton, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
                    See Pro
                  </Link>
                  <button type="button" style={secondaryButton} disabled={rewarding} onClick={() => void handleRewardedExtraInvoice()}>
                    {rewarding ? "Loading ad…" : "Watch an ad for 1 extra invoice"}
                  </button>
                </div>
              </section>
            )}
            {rewardMessage && (
              <p role="status" style={alertBox}>{rewardMessage}</p>
            )}
            <div style={{ ...row, marginTop: 12 }}>
              <button type="button" style={primaryButton} disabled={creating || selectedEntryIds.length === 0} onClick={handleCreate}>
                {creating ? "Creating…" : "Create invoice"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
