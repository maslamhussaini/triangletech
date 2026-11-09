import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { buildClientTimesheetCsv, buildClientTimesheetReport, buildInvoicePdfBytes } from "./exports";
import { EMPTY_BRANDING } from "@/lib/tools/report-branding";
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

describe("exports: per-client timesheet CSV (plan §3 item 10)", () => {
  it("builds a valid, importable CSV for one client's week with the client as employee", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { name: "Acme Corp", defaultRateCents: 5000 });
    await addEntries(store, client.id, WEEK_45H.slice(0, 2), settings);
    const csv = buildClientTimesheetCsv(store.document, client, "2026-11-02", settings);
    expect(csv).toContain("Date,Entry mode,Start,End,Ends next day");
    expect(csv).toContain("Acme Corp");
    expect(csv).toContain("2026-11-02");
    expect(csv).toContain("18h"); // 2 × 9h paid
    expect(csv).toContain("Estimated gross pay");
    // No decorative/branding rows in the data.
    expect(csv).not.toContain("TriangleTech");
  });

  it("the report builder agrees with the CSV totals", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { defaultRateCents: 5000 });
    await addEntries(store, client.id, WEEK_45H.slice(0, 2), settings);
    const report = buildClientTimesheetReport(store.document, client, "2026-11-02", settings);
    expect(report.totalMinutes).toBe(2 * 9 * 60);
    expect(report.grossPayCents).toBe(90000); // 18h × $50
    expect(report.regularPayCents).toBe(90000);
    expect(report.overtimePayCents).toBe(0);
  });
});

describe("exports: invoice PDF via the real pdf-lib pipeline (plan §3 item 9)", () => {
  it("generates a parseable branded PDF with the Liberation Sans fonts embedded", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { name: "Acme Corp", defaultRateCents: 5000 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 },
      settings
    );
    const bytes = await buildInvoicePdfBytes(invoice, client, { ...EMPTY_BRANDING, companyName: "Acme Corp" }, { fontBytes: realFontBytes() });
    expect(bytes[0]).toBe(0x25); // "%PDF"
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    // Embedded Liberation Sans (not the Helvetica fallback) is present.
    // NOTE: with a subset embedded font, pdf-lib writes glyph IDs rather
    // than character codes, so the naive Tj extractor cannot recover the
    // text — the invoice-number assertion lives in the Helvetica test
    // below, which uses the identical builder and sections.
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("LiberationSans");
  });

  it("renders the invoice number and footer text (Helvetica build, text-extractable)", async () => {
    const { store } = await openTestStore();
    const settings = testSettings();
    const client = await makeClient(store, { name: "Acme Corp", defaultRateCents: 5000 });
    const entries = await addEntries(store, client.id, WEEK_45H.slice(0, 1), settings);
    const invoice = await store.createInvoice(
      { clientId: client.id, entryIds: entries.map((e) => e.id), issueDate: "2026-11-02", taxPercent: 10 },
      settings
    );
    // No fontBytes and no network fetch in Node: fetchPremiumFontBytes
    // returns undefined, buildPremiumPdfBytes uses Helvetica (WinAnsi, so
    // the Tj extractor recovers the text — same approach as
    // premium-pdf.test.ts).
    const bytes = await buildInvoicePdfBytes(invoice, client, EMPTY_BRANDING);
    expect(bytes[0]).toBe(0x25);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const text = await extractPdfText(bytes);
    expect(text).toContain("INV-20261102-001");
    expect(text).toContain("TriangleTech");
    expect(text).toContain("triangletech.co");
  });
});
