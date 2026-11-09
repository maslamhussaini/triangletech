/**
 * Freelancer Time & Invoice — CSV / share / invoice-PDF wiring (M1, PDF re-skinned M3).
 *
 * Reuses the lifted engines AS-IS (never edited):
 * - `buildTimesheetCsv` + `buildTimesheetReport` (time-card.ts /
 *   timesheet-report.ts) for per-client timesheets,
 * - `buildPremiumPdfBytes` + `fetchPremiumFontBytes` (premium-pdf.ts)
 *   for branded invoice PDFs (TriangleTech footer, user company header),
 * - `shareOrDownloadBlob` (capacitor.ts) for native share sheet / web download.
 *
 * CSV exports keep a valid, importable schema — no decorative or branding
 * rows are appended to the data (premium-output standard). Branding lives
 * on the companion PDF, not in the CSV.
 *
 * Invoice PDF layout (M3 re-skin): seller block ("From"), bill-to block,
 * invoice number + issue/due dates in the meta lines, line-item table,
 * subtotal / tax / total-due, and the premium footer with page numbers
 * (provided by `buildPremiumPdfBytes`). Amounts are the invoice's stored
 * snapshot values, never recomputed.
 */
import { buildTimesheetCsv, formatMoney } from "@/lib/tools/time-card";
import { buildTimesheetReport } from "@/lib/tools/timesheet-report";
import {
  buildPremiumPdfBytes,
  fetchLogoBytes,
  fetchPremiumFontBytes,
  type PremiumPdfOptions,
} from "@/lib/tools/premium-pdf";
import { dataUrlToCompanyLogo, type ReportBranding } from "@/lib/tools/report-branding";
import { shareOrDownloadBlob } from "@/lib/mobile/capacitor";
import { calculateClientWeekTimesheet } from "./rates";
import { displayInvoiceStatus, invoiceBillTo } from "./invoices";
import type { Client, Invoice, StoreDocument } from "./models";
import type { AppSettings } from "./settings";

/**
 * Per-client, per-week timesheet CSV. `meta` carries the client as the
 * "employee" row and the user's company as the "business" row so the file
 * stays importable under the existing header synonyms.
 */
export function buildClientTimesheetCsv(
  doc: StoreDocument,
  client: Client,
  weekStart: string,
  settings: AppSettings
): string {
  const result = calculateClientWeekTimesheet(doc, client, weekStart, settings);
  return buildTimesheetCsv(result, {
    employee: client.name,
    business: settings.companyName || undefined,
    currency: client.currency,
  });
}

/** Per-client, per-week timesheet report (same numbers as the CSV). */
export function buildClientTimesheetReport(doc: StoreDocument, client: Client, weekStart: string, settings: AppSettings) {
  const result = calculateClientWeekTimesheet(doc, client, weekStart, settings);
  const rates = new Set(doc.entries.filter((e) => e.clientId === client.id).map((e) => e.rateCentsAtEntry));
  const hourlyRate = rates.size === 1 ? (rates.values().next().value ?? null) : null;
  return buildTimesheetReport(result, { hourlyRate: hourlyRate === null ? null : hourlyRate / 100 });
}

/** Share (native share sheet) or download (web fallback) a file. */
export async function shareFreelancerFile(blob: Blob, filename: string): Promise<void> {
  await shareOrDownloadBlob(blob, filename);
}

/**
 * Per-invoice CSV (M3). One row per line, invoice fields repeated per
 * row so the file stays a valid, importable table (no decorative or
 * branding rows, no totals-only footer row). Amounts are whole cents,
 * hours are decimal — the same units the invoice lines snapshot.
 */
export function buildInvoiceCsv(invoice: Invoice, client: Client): string {
  const billTo = invoiceBillTo(invoice, client);
  const header =
    "Invoice number,Issue date,Due date,Status,Client,Bill to,Description,Hours,Rate (cents),Line amount (cents),Tax percent,Subtotal (cents),Tax (cents),Total (cents),Currency";
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const rows = invoice.lines.map((line) =>
    [
      invoice.number,
      invoice.issueDate,
      invoice.dueDate,
      invoice.status,
      client.name,
      billTo.name,
      line.description,
      line.quantityHours,
      line.rateCents,
      line.amountCents,
      invoice.taxPercent,
      invoice.subtotalCents,
      invoice.taxCents,
      invoice.totalCents,
      invoice.currency,
    ]
      .map(esc)
      .join(",")
  );
  return [header, ...rows].join("\n") + "\n";
}

/** Download/share a per-invoice CSV via the native share sheet / web download. */
export async function downloadInvoiceCsv(invoice: Invoice, client: Client): Promise<void> {
  const blob = new Blob([buildInvoiceCsv(invoice, client)], { type: "text/csv;charset=utf-8" });
  await shareFreelancerFile(blob, `${invoice.number}.csv`);
}

/**
 * Build a branded invoice PDF with the real pdf-lib pipeline (no stubs).
 *
 * Layout (M3 re-skin): the header carries the seller's company name /
 * logo (user branding), the meta lines carry the invoice number, issue
 * + due dates and status, then a "Bill to" block, the line-item table,
 * and subtotal / tax / total-due. The premium footer (TriangleTech
 * attribution + "Page X of Y") is rendered by `buildPremiumPdfBytes`.
 * `displayStatus` is the DERIVED status for the meta line (overdue
 * when sent + past due); it is display-only and never stored.
 */
export async function buildInvoicePdfBytes(
  invoice: Invoice,
  client: Client,
  branding: ReportBranding,
  opts: { fontBytes?: { regular: Uint8Array; bold: Uint8Array }; displayStatus?: string } = {}
): Promise<Uint8Array> {
  const fontBytes = opts.fontBytes ?? (await fetchPremiumFontBytes().catch(() => undefined));
  // Official TriangleTech logo for the footer attribution (premium-output
  // standard). Falls back to no logo tile when the asset is unreachable.
  const logoBytes = await fetchLogoBytes().catch(() => undefined);
  const billTo = invoiceBillTo(invoice, client);
  const seller = invoice.seller;
  const sellerName = seller?.name || branding.companyName || undefined;
  const statusText = opts.displayStatus ?? displayInvoiceStatus(invoice);
  const billToLines = [
    `Bill to: ${billTo.name}`,
    ...(billTo.email ? [`Email: ${billTo.email}`] : []),
    ...(billTo.address ? [`Address: ${billTo.address}`] : []),
  ];
  const sellerLines =
    seller && (seller.email || seller.address)
      ? [
          `From: ${seller.name}`,
          ...(seller.email ? [`Email: ${seller.email}`] : []),
          ...(seller.address ? [`Address: ${seller.address}`] : []),
        ]
      : sellerName
        ? [`From: ${sellerName}`]
        : [];
  const pdfOpts: PremiumPdfOptions = {
    title: `Invoice ${invoice.number}`,
    meta: [
      `Issue date: ${invoice.issueDate} · Due date: ${invoice.dueDate}`,
      `Status: ${statusText}`,
      ...(invoice.paymentTermsDays !== undefined ? [`Payment terms: Net ${invoice.paymentTermsDays} days`] : []),
      ...(invoice.notes ? [`Notes: ${invoice.notes}`] : []),
    ],
    createdWith: "Created with",
    sections: [
      ...(sellerLines.length > 0 || billToLines.length > 0
        ? [
            {
              heading: "Invoice details",
              lines: [...sellerLines, ...billToLines],
            },
          ]
        : []),
      {
        heading: "Invoice lines",
        table: {
          headers: ["Description", "Hours", "Rate", "Amount"],
          widths: [250, 70, 80, 104],
          align: ["left", "right", "right", "right"],
          rows: invoice.lines.map((line) => [
            line.description,
            line.quantityHours.toFixed(2),
            formatMoney(line.rateCents, invoice.currency),
            formatMoney(line.amountCents, invoice.currency),
          ]),
        },
      },
      {
        heading: "Totals",
        emphasis: true,
        lines: [
          `Subtotal: ${formatMoney(invoice.subtotalCents, invoice.currency)}`,
          `Tax (${invoice.taxPercent}%): ${formatMoney(invoice.taxCents, invoice.currency)}`,
          `Total due: ${formatMoney(invoice.totalCents, invoice.currency)}`,
          "Amounts are stored invoice values and never recomputed from current rates.",
        ],
      },
    ],
    companyName: sellerName,
    companyLogo: branding.logoDataUrl && branding.logoMime ? dataUrlToCompanyLogo(branding.logoDataUrl, branding.logoMime) ?? undefined : undefined,
    fontBytes,
    logoBytes,
  };
  return buildPremiumPdfBytes(pdfOpts);
}

/** Download/share an invoice PDF (fetch fonts + footer logo, then share). */
export async function downloadInvoicePdf(
  invoice: Invoice,
  client: Client,
  branding: ReportBranding,
  opts: { displayStatus?: string } = {}
): Promise<void> {
  const bytes = await buildInvoicePdfBytes(invoice, client, branding, { displayStatus: opts.displayStatus });
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  await shareFreelancerFile(blob, `${invoice.number}.pdf`);
}
