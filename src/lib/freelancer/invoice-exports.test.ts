import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { formatMoney } from "@/lib/tools/time-card";
import { buildInvoiceCsv, buildInvoicePdfBytes } from "./exports";
import { EMPTY_BRANDING } from "@/lib/tools/report-branding";
import { displayInvoiceStatus } from "./invoices";
import { addEntries, makeClient, openTestStore, testSettings, WEEK_45H } from "./test-helpers";

function realFontBytes(): { regular: Uint8Array; bold: Uint8Array } {
  const root = process.cwd();
  return {
    regular: new Uint8Array(readFileSync(join(root, "public/fonts/LiberationSans-Regular.ttf"))),
    bold: new Uint8Array(readFileSync(join(root, "public/fonts/LiberationSans-Bold.ttf"))),
  };
}

/** Same Tj-text extraction approach as premium-pdf.test.ts: embedded-font
 *  text is hex-encoded in the content stream, so a raw substring search
 *  would miss it. */
function tjText(decoded: string): string {
  let text = "";
  for (const m of decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
    text += Buffer.from(m[1], "hex").toString("latin1") + " ";
  }
  for (const m of decoded.matchAll(/\((?:[^()\\]|\\.)*\)\s*Tj/g)) {
    text += m[0].replace(/\\([()\\])/g, "$1").slice(1, -3) + " ";
  }
  return text;
}

/** Extract selectable text by inflating every stream in the raw PDF bytes
 *  (same approach as premium-pdf.test.ts). */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const raw = Buffer.from(bytes);
  let out = "";
  let searchFrom = 0;
  for (;;) {
    const start = raw.indexOf(Buffer.from("stream\n"), searchFrom);
    if (start === -1) break;
    const dataStart = start + 7;
    const end = raw.indexOf(Buffer.from("endstream"), dataStart);
    if (end === -1) break;
    let chunk: Buffer = raw.subarray(dataStart, end);
    if (chunk.length > 0 && chunk[chunk.length - 1] === 0x0a) chunk = chunk.subarray(0, chunk.length - 1);
    if (chunk.length > 0 && chunk[chunk.length - 1] === 0x0d) chunk = chunk.subarray(0, chunk.length - 1);
    try {
      const text = inflateSync(chunk).toString("latin1");
      out += tjText(text);
    } catch {
      // Not a Flate content stream (e.g. image data); skip.
    }
    searchFrom = end + 9;
  }
  return out;
}

describe("invoice exports M3: branded PDF invoice (re-skin)", () => {
  it("renders number, dates, bill-to, seller, lines and totals via the real pdf-lib pipeline", async () => {
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
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 },
      settings
    );
    // No fontBytes and no network fetch in Node: Helvetica fallback, so
    // the Tj extractor recovers the text (same approach as
    // premium-pdf.test.ts).
    const bytes = await buildInvoicePdfBytes(invoice, client, { ...EMPTY_BRANDING, companyName: "Solo Studio" });
    expect(bytes[0]).toBe(0x25); // "%PDF"
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const text = await extractPdfText(bytes);
    expect(text).toContain("INV-20261102-001");
    expect(text).toContain("2026-11-02"); // issue date
    expect(text).toContain("2026-11-16"); // due date
    expect(text).toContain("Bill to: Acme Corp");
    expect(text).toContain("billing@acme.test");
    expect(text).toContain("From: Solo Studio");
    expect(text).toContain("Regular hours");
    expect(text).toContain("Overtime hours");
    expect(text).toContain(`Subtotal: ${formatMoney(237500, "USD")}`);
    expect(text).toContain(`Total due: ${formatMoney(261250, "USD")}`);
    // Premium footer: TriangleTech attribution + page numbers.
    expect(text).toContain("TriangleTech");
    expect(text).toContain("triangletech.co");
    expect(text).toContain("Page 1 of 1");
  });

  it("embeds the Liberation Sans fonts when real font bytes are supplied", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { name: "Acme Corp", defaultRateCents: 5000 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    const bytes = await buildInvoicePdfBytes(invoice, client, EMPTY_BRANDING, { fontBytes: realFontBytes() });
    expect(bytes[0]).toBe(0x25);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("LiberationSans");
  });

  it("shows the derived overdue status in the PDF meta when sent and past due", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { name: "Acme Corp", defaultRateCents: 5000 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02" },
      settings
    );
    await store.markInvoiceSent(invoice.id);
    const sent = store.getInvoice(invoice.id);
    expect(sent).toBeDefined();
    expect(displayInvoiceStatus(sent as NonNullable<typeof sent>, "2026-11-20")).toBe("overdue");
    const bytes = await buildInvoicePdfBytes(sent as NonNullable<typeof sent>, client, EMPTY_BRANDING, {
      displayStatus: displayInvoiceStatus(sent as NonNullable<typeof sent>, "2026-11-20"),
    });
    const text = await extractPdfText(bytes);
    expect(text).toContain("Status: overdue");
  });
});

describe("invoice exports M3: per-invoice CSV", () => {
  it("builds one importable row per line with invoice fields, lines and totals", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, {
      name: "Acme Corp",
      defaultRateCents: 5000,
      overtimeEnabled: true,
      overtimeThresholdHours: 40,
      overtimeMultiplier: 1.5,
    });
    const entries = await addEntries(store, client.id, WEEK_45H, settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 },
      settings
    );
    const csv = buildInvoiceCsv(invoice, client);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "Invoice number,Issue date,Due date,Status,Client,Bill to,Description,Hours,Rate (cents),Line amount (cents),Tax percent,Subtotal (cents),Tax (cents),Total (cents),Currency"
    );
    expect(lines).toHaveLength(3); // header + 2 lines (regular + overtime)
    expect(csv).toContain("INV-20261102-001");
    expect(csv).toContain("2026-11-02");
    expect(csv).toContain("2026-11-16");
    expect(csv).toContain("Acme Corp");
    expect(csv).toContain("Regular hours");
    expect(csv).toContain("Overtime hours");
    expect(csv).toContain("40"); // regular hours
    expect(csv).toContain("200000"); // regular amount cents
    expect(csv).toContain("37500"); // overtime amount cents
    expect(csv).toContain("237500"); // subtotal cents
    expect(csv).toContain("23750"); // tax cents
    expect(csv).toContain("261250"); // total cents
    // No decorative/branding rows in the data.
    expect(csv).not.toContain("TriangleTech");
  });
});
