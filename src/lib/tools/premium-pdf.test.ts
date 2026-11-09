import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { buildPremiumPdfBytes, sanitizePdfText } from "./premium-pdf";

// 1x1 transparent PNG, base64.
const TINY_PNG = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
));

// 2x2 RGB PNG, base64 — distinct bytes from TINY_PNG so a company logo
// and the footer logo never collapse into one image object.
const COMPANY_PNG = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EkABzxA/0tEma7AAAAAElFTkSuQmCC",
  "base64"
));

const baseOpts = {
  title: "Work Hours & Time Card",
  meta: ["Period: 2026-11-02 to 2026-11-08 (weekly)", "Employee: Alex Rivera"],
  createdWith: "Created with",
  sections: [
    {
      heading: "Sessions",
      table: {
        headers: ["Date", "Start", "End", "Next day", "Break (min)", "Paid"],
        widths: [104, 80, 80, 80, 80, 80],
        align: ["left", "left", "left", "left", "right", "right"] as ("left" | "right")[],
        rows: [["2026-11-02", "9:00 AM", "5:00 PM", "No", "30", "7h 30m"]],
      },
    },
    {
      heading: "Pay summary",
      emphasis: true,
      lines: ["Total hours: 7h 30m", "Estimated gross pay: $67.50"],
    },
  ],
};

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

/** Extract selectable text from one page's content stream(s). */
async function extractPageTexts(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const out: string[] = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    let text = "";
    if (contents) {
      const resolved = doc.context.lookup(contents as never) as unknown;
      const items: unknown[] =
        resolved && typeof (resolved as { asArray?: unknown }).asArray === "function"
          ? (resolved as { asArray: () => unknown[] }).asArray()
          : [resolved];
      for (const item of items) {
        const stream = doc.context.lookup(item as never) as unknown as {
          getContentsString?: () => string;
          getContents?: () => Uint8Array;
        };
        if (!stream || typeof stream.getContents !== "function") continue;
        const candidates: string[] = [];
        try {
          if (typeof stream.getContentsString === "function") candidates.push(stream.getContentsString());
        } catch { /* fall through to inflate */ }
        try {
          candidates.push(inflateSync(stream.getContents()).toString("latin1"));
        } catch { /* not flate-encoded */ }
        let best = "";
        for (const candidate of candidates) {
          const extracted = tjText(candidate);
          if (extracted.length > best.length) best = extracted;
        }
        text += best;
      }
    }
    out.push(text);
  }
  return out;
}

/** Extract selectable text by inflating every stream in the raw PDF bytes. */
async function extractText(bytes: Uint8Array): Promise<string> {
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
    // Trailing newline before endstream is not stream data.
    if (chunk.length > 0 && chunk[chunk.length - 1] === 0x0a) chunk = chunk.subarray(0, chunk.length - 1);
    if (chunk.length > 0 && chunk[chunk.length - 1] === 0x0d) chunk = chunk.subarray(0, chunk.length - 1);
    try {
      const text = inflateSync(chunk).toString("latin1");
      for (const m of text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        out += Buffer.from(m[1], "hex").toString("latin1") + " ";
      }
      for (const m of text.matchAll(/\((?:[^()\\]|\\.)*\)\s*Tj/g)) {
        out += m[0].replace(/\\([()\\])/g, "$1").slice(1, -3) + " ";
      }
    } catch {
      // Not a Flate content stream (e.g. image data); skip.
    }
    searchFrom = end + 9;
  }
  return out;
}

describe("premium PDF renderer", () => {
  it("renders brand, title, footer lockup, link and page number", async () => {
    const bytes = await buildPremiumPdfBytes({ ...baseOpts, logoBytes: TINY_PNG });
    const text = await extractText(bytes);
    expect(text).toContain("TriangleTech");
    expect(text).toContain("Alex Rivera");
    expect(text).toContain("triangletech.co");
    expect(text).toContain("Page 1 of 1");
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw).toContain("/Subtype /Image");
    expect(raw).toContain("/URI (https://triangletech.co/)");
    const doc = await PDFDocument.load(bytes);
    const annots = doc.getPages()[0].node.lookup(PDFName.of("Annots")) as unknown as { asArray: () => unknown[] };
    const annot = doc.context.lookup(annots.asArray()[0] as never) as unknown as { lookup: (k: unknown) => { lookup: (k2: unknown) => { decodeText: () => string } } };
    expect(annot.lookup(PDFName.of("A")).lookup(PDFName.of("URI")).decodeText()).toBe("https://triangletech.co/");
  });

  it("renders without logo bytes (footer lockup + URL still brand it)", async () => {
    const bytes = await buildPremiumPdfBytes(baseOpts);
    const text = await extractText(bytes);
    expect(text).toContain("TriangleTech");
    expect(text).toContain("triangletech.co");
  });

  it("keeps TriangleTech out of the header when no company branding is set", async () => {
    const bytes = await buildPremiumPdfBytes(baseOpts);
    const text = await extractText(bytes);
    // Exactly one occurrence: the footer lockup. The old header
    // wordmark would have made this two.
    expect(text.split("TriangleTech").length - 1).toBe(1);
    expect(text).toContain("triangletech.co");
  });

  it("renders company name + logo in the header and keeps TriangleTech in the footer", async () => {
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      logoBytes: TINY_PNG,
      companyName: "Rivera Landscaping LLC",
      companyLogo: { bytes: COMPANY_PNG, kind: "png" },
    });
    const text = await extractText(bytes);
    expect(text).toContain("Rivera Landscaping LLC");
    expect(text).toContain("TriangleTech");
    expect(text).toContain("triangletech.co");
    // Three image objects: footer logo + its transparency mask +
    // company logo (the opaque company PNG has no mask).
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw.split("/Subtype /Image").length - 1).toBe(3);
  });

  it("renders a logo-only header with no substituted wordmark", async () => {
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      companyLogo: { bytes: COMPANY_PNG, kind: "png" },
    });
    const text = await extractText(bytes);
    expect(text.split("TriangleTech").length - 1).toBe(1);
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw.split("/Subtype /Image").length - 1).toBe(1);
  });

  it("wraps a long company name across the header band", async () => {
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      companyName: "Rivera Landscaping and Garden Design Company of North Carolina LLC",
    });
    const text = await extractText(bytes);
    expect(text).toContain("Rivera Landscaping");
    expect(text).toContain("North Carolina LLC");
  });

  it("repeats the company-branded continuation header on later pages", async () => {
    const rows = Array.from({ length: 45 }, (_, i) => [
      `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
      "9:00 AM",
      "5:00 PM",
      "No",
      "30",
      "7h 30m",
    ]);
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      companyName: "Rivera Landscaping LLC",
      sections: [{
        heading: "Sessions",
        table: {
          headers: ["Date", "Start", "End", "Next day", "Break (min)", "Paid"],
          widths: [104, 80, 80, 80, 80, 80],
          align: ["left", "left", "left", "left", "right", "right"] as ("left" | "right")[],
          rows,
        },
      }],
    });
    const pages = await extractPageTexts(bytes);
    expect(pages.length).toBe(2);
    expect(pages[1]).toContain("Rivera Landscaping LLC");
  });

  it("keeps a short pay summary together instead of splitting it", async () => {
    // Page 1: heading (26) + header (21) + 21 one-line rows (441) =
    // 488 of 570 available, leaving 82 — above the 64pt move threshold
    // but below the 131pt summary height, so only the keep-together
    // rule moves the section.
    const rows = Array.from({ length: 21 }, (_, i) => [
      `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
      "9:00 AM",
      "5:00 PM",
      "No",
      "30",
      "7h 30m",
    ]);
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      sections: [
        {
          heading: "Sessions",
          table: {
            headers: ["Date", "Start", "End", "Next day", "Break (min)", "Paid"],
            widths: [104, 80, 80, 80, 80, 80],
            align: ["left", "left", "left", "left", "right", "right"] as ("left" | "right")[],
            rows,
          },
        },
        {
          heading: "Pay summary",
          emphasis: true,
          lines: [
            "Total hours: 41h 30m",
            "Regular hours: 40h",
            "Overtime hours: 1h 30m",
            "Overtime threshold: 40 hours per week",
            "Overtime multiplier: 1.5x",
            "Regular pay: $800.00",
            "Estimated gross pay: $845.00",
          ],
        },
      ],
    });
    const pages = await extractPageTexts(bytes);
    expect(pages.length).toBe(2);
    expect(pages[0]).not.toContain("Estimated gross pay");
    expect(pages[1]).toContain("Estimated gross pay");
    expect(pages[1]).toContain("Pay summary");
  });

  it("renders German scenario headings without shattered fragments", async () => {
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      sections: [{
        heading: "Kosten",
        table: {
          headers: ["Szenario", "Benötigt", "Gekauft (nach Rundung)", "Material-Zwischensumme", "Liefergebühr", "Steuer", "Geschätzte Gesamtsumme"],
          widths: [60, 62, 62, 96, 72, 52, 100],
          align: ["left", "right", "right", "right", "right", "right", "right"] as ("left" | "right")[],
          rows: [["Sack-Option", "30,00 ft³", "30,00 ft³", "—", "0,00 €", "—", "—"]],
        },
      }],
    });
    const text = await extractText(bytes);
    expect(text).toContain("Zwischensumme");
    // The old hard-split produced "schensumm" as its own fragment
    // (followed by a lone "e"); the intact word is followed by "e"
    // with no space, so the spaced form is the fragment signature.
    expect(text).not.toContain("schensumm ");
  });

  it("renders a translated Page X of Y from the caller template", async () => {
    const bytes = await buildPremiumPdfBytes({ ...baseOpts, pageOfTemplate: "Seite {page} von {total}" });
    const text = await extractText(bytes);
    expect(text).toContain("Seite 1 von 1");
    expect(text).not.toContain("Page 1 of 1");
  });

  it("numbers a multi-page table and repeats its headings", async () => {
    const rows = Array.from({ length: 45 }, (_, i) => [
      `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
      "9:00 AM",
      "5:00 PM",
      "No",
      "30",
      "7h 30m",
    ]);
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      sections: [{
        heading: "Sessions",
        table: {
          headers: ["Date", "Start", "End", "Next day", "Break (min)", "Paid"],
          widths: [104, 80, 80, 80, 80, 80],
          align: ["left", "left", "left", "left", "right", "right"] as ("left" | "right")[],
          rows,
        },
      }],
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    const text = await extractText(bytes);
    expect(text).toContain("Page 1 of 2");
    expect(text).toContain("Page 2 of 2");
    expect(text.split("Break (min)").length - 1).toBe(2);
  });

  it("sanitizes bidi marks and unencodable symbols instead of crashing", () => {
    expect(sanitizePdfText("9:00 ‏AM")).toBe("9:00 AM");
    expect(sanitizePdfText("Hours → decimal")).toBe("Hours -> decimal");
    expect(sanitizePdfText("Café — TriangleTech™ · 50€")).toBe("Café — TriangleTech™ · 50€");
    expect(sanitizePdfText("Price ₹100")).toBe("Price ?100");
  });

  it("builds a PDF even when a cell contains a bidi mark", async () => {
    const bytes = await buildPremiumPdfBytes({
      ...baseOpts,
      sections: [{ heading: "Sessions ‏", lines: ["9:00 ‏AM test"] }],
    });
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("supports A4 page size", async () => {
    const bytes = await buildPremiumPdfBytes({ ...baseOpts, pageSize: "a4" });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPages()[0].getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.getPages()[0].getHeight()).toBeCloseTo(841.89, 1);
  });
});

describe("embedded report font", () => {
  const fontBytes = () => ({
    regular: new Uint8Array(readFileSync("public/fonts/LiberationSans-Regular.ttf")),
    bold: new Uint8Array(readFileSync("public/fonts/LiberationSans-Bold.ttf")),
  });

  it("embeds the supplied font program with a ToUnicode map, so spacing is viewer-independent and text stays extractable", async () => {
    const bytes = await buildPremiumPdfBytes({ ...baseOpts, fontBytes: fontBytes() });
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("/FontFile2");
    expect(raw).toContain("/ToUnicode");
  });

  it("falls back to the built-in Helvetica family when no font bytes are supplied", async () => {
    const bytes = await buildPremiumPdfBytes(baseOpts);
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).not.toContain("/FontFile2");
    expect(raw).toContain("/BaseFont /Helvetica");
  });

  it("falls back as a pair when the supplied bold font is corrupt", async () => {
    const broken = fontBytes();
    broken.bold = new Uint8Array([0, 1, 2, 3]);
    const bytes = await buildPremiumPdfBytes({ ...baseOpts, fontBytes: broken });
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).not.toContain("/FontFile2");
    expect(raw).toContain("/BaseFont /Helvetica");
  });
});
