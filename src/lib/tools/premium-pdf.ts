/**
 * Premium branded PDF reports for the TriangleTech free tools.
 *
 * One shared renderer for every tool export (time-card report and
 * invoice, landscaping report, companion result sheets), so every
 * visual document carries the same brand treatment:
 *
 * - Header: Indigo-to-violet gradient band with the official
 *   TriangleTech logo tile (public/triangletech-logo.png, used
 *   unaltered and in proportion) and the TriangleTech™ wordmark,
 *   then the report title, meta lines, and an accent rule.
 * - Tables: deep-indigo header row, white / very-light alternating
 *   rows, light borders, right-aligned numeric columns, distinct
 *   subtotal and final-total treatments.
 * - Footer on every page: logo tile + "Created with TriangleTech™ ·
 *   triangletech.co" with a clickable link annotation to
 *   https://triangletech.co/, an optional short disclaimer, and
 *   "Page X of Y".
 * - Tables keep their headings when they span pages; headings never
 *   sit orphaned at a page bottom.
 *
 * Text is native PDF text (selectable/searchable, vector tables, no
 * rasterized pages). Fonts are the built-in Helvetica family, which
 * covers Latin-1 only: for Arabic, Urdu, Hindi, Chinese, and Japanese
 * callers must render the English fallback with an explicit disclosure
 * (see the callers) — non-Latin PDF support is NOT claimed here.
 * The logo is passed in as bytes by the caller (fetched from the
 * site's own public asset); when bytes are unavailable the report
 * still carries the wordmark, URL, and link, but no logo tile.
 *
 * Callers must dynamic-import this module (e.g. inside the download
 * handler) so pdf-lib stays out of the initial page bundle.
 */
import { PDFDocument, PDFName, PDFArray, PDFString, PDFNumber, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";

export type PremiumTable = {
  headers: string[];
  /** Column widths in points; scaled proportionally to the content width. */
  widths: number[];
  rows: string[][];
  /** Per-column alignment; default left. Numeric columns pass "right". */
  align?: ("left" | "right")[];
  /** Row indexes styled as subtotals (bold, light fill). */
  subtotalRows?: number[];
  /** Row index styled as the final total (bold, Indigo light fill). */
  totalRow?: number;
};

export type PremiumSection = {
  heading: string;
  table?: PremiumTable;
  lines?: string[];
  /** Light Indigo background treatment for a summary section. */
  emphasis?: boolean;
};

export type PremiumPdfOptions = {
  title: string;
  /** Lines under the title (period, project, document reference). */
  meta: string[];
  sections: PremiumSection[];
  /** Translated "Created with" wording; brand name and URL are fixed. */
  createdWith: string;
  /** Optional short disclaimer, rendered in the footer. */
  disclaimer?: string;
  pageSize?: "letter" | "a4";
  /** Official logo PNG bytes (public/triangletech-logo.png). */
  logoBytes?: Uint8Array;
};

export const BRAND_URL = "https://triangletech.co/";
export const BRAND_DOMAIN = "triangletech.co";

const INDIGO = rgb(0.310, 0.275, 0.898); // #4F46E5
const DEEP_INDIGO = rgb(0.192, 0.180, 0.506); // #312E81
const LIGHT_BG = rgb(0.933, 0.941, 1.0); // #EEF0FF
const DARK_TEXT = rgb(0.106, 0.106, 0.294); // #1B1B4B
const BODY_TEXT = rgb(0.2, 0.2, 0.2);
const MUTED = rgb(0.4, 0.467, 0.553);
const BORDER = rgb(0.882, 0.898, 0.941);
const ROW_ALT = rgb(0.973, 0.980, 1.0);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// pdf-lib's built-in Helvetica uses WinAnsi encoding and throws on any
// other character (a stray bidi mark from an RTL locale formatter, for
// example, would otherwise abort the whole download). Sanitize every
// string before measuring or drawing: drop bidi controls, map a few
// common symbols to ASCII, and replace anything else outside the
// Windows-1252 repertoire with "?". Latin punctuation (—, –, ·, ™, €,
// “”, etc.) is preserved.
const WINANSI_EXTRA = new Set(["€", "‚", "ƒ", "„", "…", "†", "‡", "ˆ", "‰", "Š", "‹", "Œ", "Ž", "‘", "’", "“", "”", "•", "–", "—", "˜", "™", "š", "›", "œ", "ž", "Ÿ"]);
const SYMBOL_MAP: Record<string, string> = { "→": "->", "←": "<-", "−": "-" };
export function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .split("")
    .map(ch => {
      if (SYMBOL_MAP[ch]) return SYMBOL_MAP[ch];
      const code = ch.charCodeAt(0);
      if (code <= 0xff && ![0x81, 0x8d, 0x8f, 0x90, 0x9d].includes(code)) return ch;
      if (WINANSI_EXTRA.has(ch)) return ch;
      return "?";
    })
    .join("");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
    while (font.widthOfTextAtSize(current, size) > maxWidth && current.length > 1) {
      // Hard-split an overlong word.
      let cut = current.length;
      while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), size) > maxWidth) cut -= 1;
      lines.push(current.slice(0, cut));
      current = current.slice(cut);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

type Block =
  | { kind: "heading"; text: string; height: number }
  | { kind: "line"; text: string; height: number; emphasis: boolean }
  | { kind: "tableHeader"; headers: string[][]; widths: number[]; align: ("left" | "right")[]; height: number }
  | { kind: "tableRow"; cells: string[][]; widths: number[]; align: ("left" | "right")[]; height: number; style: "normal" | "subtotal" | "total"; rowIndex: number };

export async function buildPremiumPdfBytes(opts: PremiumPdfOptions): Promise<Uint8Array> {
  const clean = (s: string) => sanitizePdfText(s);
  const cleanTable = (t: PremiumTable): PremiumTable => ({
    ...t,
    headers: t.headers.map(clean),
    rows: t.rows.map(r => r.map(clean)),
  });
  const cleanSections = opts.sections.map(s => ({
    ...s,
    heading: clean(s.heading),
    lines: s.lines?.map(clean),
    table: s.table ? cleanTable(s.table) : undefined,
  }));
  opts = {
    ...opts,
    title: clean(opts.title),
    meta: opts.meta.map(clean),
    sections: cleanSections,
    createdWith: clean(opts.createdWith),
    disclaimer: opts.disclaimer ? clean(opts.disclaimer) : undefined,
  };
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (opts.logoBytes) {
    try {
      logo = await doc.embedPng(opts.logoBytes);
    } catch {
      logo = null; // Wordmark + URL still brand the document.
    }
  }

  const pageW = opts.pageSize === "a4" ? 595.28 : 612;
  const pageH = opts.pageSize === "a4" ? 841.89 : 792;
  const margin = 48;
  const contentW = pageW - margin * 2;
  const footerTop = opts.disclaimer ? 66 : 54;
  const contentBottom = footerTop + 8;
  // Meta lines wrap at the content width so a long project name or
  // disclosure can never overflow the page edge.
  const wrappedMeta = opts.meta.flatMap(m => wrapText(m, font, 11, contentW));

  // ---- Pagination (heights in points) ----
  const pages: Block[][] = [];
  let page: Block[] = [];
  let remaining = 0;
  const startPage = (first: boolean) => {
    if (page.length > 0) pages.push(page);
    page = [];
    const contentTop = first ? pageH - 64 - 30 - 16 - wrappedMeta.length * 16 - 18 : pageH - 64;
    remaining = contentTop - contentBottom;
  };
  const need = (h: number) => {
    if (h > remaining) startPage(false);
  };
  const push = (b: Block) => {
    page.push(b);
    remaining -= b.height;
  };
  startPage(true);
  for (const section of opts.sections) {
    if (remaining < 24 + 40) startPage(false);
    push({ kind: "heading", text: section.heading, height: 26 });
    for (const line of section.lines ?? []) {
      for (const wrapped of wrapText(line, font, 11, contentW - 16)) {
        need(15);
        push({ kind: "line", text: wrapped, height: 15, emphasis: !!section.emphasis });
      }
    }
    const table = section.table;
    if (table) {
      const totalW = table.widths.reduce((s, w) => s + w, 0) || 1;
      const widths = table.widths.map(w => (w / totalW) * contentW);
      const align = table.headers.map((_, i) => table.align?.[i] ?? "left");
      // Header text wraps like cell text; the header row grows so long
      // headings (e.g. "Purchased (after rounding)") never overlap.
      const headerLines = table.headers.map((h, i) => wrapText(h, bold, 10, widths[i] - 12));
      const headerHeight = Math.max(1, ...headerLines.map(l => l.length)) * 13 + 8;
      const header: Block = { kind: "tableHeader", headers: headerLines, widths, align, height: headerHeight };
      need(header.height);
      push(header);
      table.rows.forEach((row, rowIndex) => {
        const cells = row.map((cell, i) => wrapText(cell, font, 10, widths[i] - 12));
        const lines = Math.max(1, ...cells.map(c => c.length));
        const height = lines * 13 + 8;
        const style = rowIndex === table.totalRow ? "total" : (table.subtotalRows?.includes(rowIndex) ? "subtotal" : "normal");
        if (height > remaining) {
          startPage(false);
          push(header);
        }
        push({ kind: "tableRow", cells, widths, align, height, style, rowIndex });
      });
    }
  }
  if (page.length > 0 || pages.length === 0) pages.push(page);
  const pageCount = pages.length;

  // ---- Rendering ----
  const drawFooter = (pdfPage: PDFPage, index: number) => {
    const y = 44;
    pdfPage.drawLine({ start: { x: margin, y: y + 12 }, end: { x: pageW - margin, y: y + 12 }, thickness: 0.6, color: BORDER });
    let textX = margin;
    if (logo) {
      const h = 20;
      const w = h * (logo.width / logo.height);
      pdfPage.drawImage(logo, { x: margin, y: y - 4, width: w, height: h });
      textX = margin + w + 8;
    }
    const lockup = `${opts.createdWith} TriangleTech™ · ${BRAND_DOMAIN}`;
    pdfPage.drawText(lockup, { x: textX, y, size: 9, font, color: DARK_TEXT });
    // Clickable link over the domain part of the lockup.
    const prefix = `${opts.createdWith} TriangleTech™ · `;
    const urlX = textX + font.widthOfTextAtSize(prefix, 9);
    const urlW = font.widthOfTextAtSize(BRAND_DOMAIN, 9);
    const annot = doc.context.obj({
      Type: PDFName.of("Annot"),
      Subtype: PDFName.of("Link"),
      Rect: doc.context.obj([PDFNumber.of(urlX), PDFNumber.of(y - 2), PDFNumber.of(urlX + urlW), PDFNumber.of(y + 10)]),
      Border: doc.context.obj([PDFNumber.of(0), PDFNumber.of(0), PDFNumber.of(0)]),
      A: doc.context.obj({ S: PDFName.of("URI"), URI: PDFString.of(BRAND_URL) }),
    });
    const annots = pdfPage.node.get(PDFName.of("Annots"));
    if (annots && annots instanceof PDFArray) {
      annots.push(doc.context.register(annot));
    } else {
      pdfPage.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(annot)]));
    }
    const pageText = `Page ${index + 1} of ${pageCount}`;
    pdfPage.drawText(pageText, { x: pageW - margin - font.widthOfTextAtSize(pageText, 9), y, size: 9, font, color: MUTED });
    if (opts.disclaimer) {
      for (const [li, dline] of wrapText(opts.disclaimer, font, 8.5, contentW).slice(0, 2).entries()) {
        pdfPage.drawText(dline, { x: margin, y: 30 - li * 11, size: 8.5, font, color: MUTED });
      }
    }
  };

  pages.forEach((blocks, pageIndex) => {
    const pdfPage = doc.addPage([pageW, pageH]);
    let y: number;
    if (pageIndex === 0) {
      // Gradient brand band (vector strips, Indigo -> Violet).
      const bandH = 64;
      const bandY = pageH - bandH;
      const strips = 64;
      for (let i = 0; i < strips; i++) {
        const t = i / (strips - 1);
        pdfPage.drawRectangle({
          x: (pageW / strips) * i,
          y: bandY,
          width: pageW / strips + 1,
          height: bandH,
          color: rgb(lerp(0.310, 0.486, t), lerp(0.275, 0.361, t), lerp(0.898, 1.0, t)),
        });
      }
      let brandX = margin;
      if (logo) {
        const h = 40;
        const w = h * (logo.width / logo.height);
        pdfPage.drawImage(logo, { x: margin, y: bandY + 12, width: w, height: h });
        brandX = margin + w + 12;
      }
      pdfPage.drawText("TriangleTech™", { x: brandX, y: bandY + 26, size: 17, font: bold, color: rgb(1, 1, 1) });
      y = bandY - 28;
      pdfPage.drawText(opts.title, { x: margin, y, size: 20, font: bold, color: DARK_TEXT });
      y -= 22;
      for (const metaLine of wrappedMeta) {
        pdfPage.drawText(metaLine, { x: margin, y, size: 11, font, color: MUTED });
        y -= 16;
      }
      y -= 4;
      pdfPage.drawLine({ start: { x: margin, y: y + 6 }, end: { x: pageW - margin, y: y + 6 }, thickness: 1.2, color: INDIGO });
      y -= 10;
    } else {
      pdfPage.drawText("TriangleTech™", { x: margin, y: pageH - 48, size: 10, font: bold, color: INDIGO });
      pdfPage.drawLine({ start: { x: margin, y: pageH - 56 }, end: { x: pageW - margin, y: pageH - 56 }, thickness: 0.8, color: BORDER });
      y = pageH - 72;
    }
    // Emphasis runs (consecutive emphasis lines) get one light-Indigo
    // summary band behind them, drawn before the text. drawRectangle
    // is used deliberately: pdf-lib's drawSvgPath interprets paths in
    // SVG (top-left) coordinates, which would flip the band.
    {
      let cursor = y;
      let runStart: number | null = null;
      let runEnd = 0;
      const flushRun = () => {
        if (runStart !== null) {
          pdfPage.drawRectangle({ x: margin, y: runEnd - 2, width: contentW, height: runStart - runEnd + 4, color: LIGHT_BG });
        }
        runStart = null;
      };
      for (const block of blocks) {
        if (block.kind === "heading") {
          flushRun();
          cursor -= 26;
        } else if (block.kind === "line") {
          if (block.emphasis) {
            if (runStart === null) runStart = cursor;
            runEnd = cursor - 15;
          } else {
            flushRun();
          }
          cursor -= 15;
        } else if (block.kind === "tableHeader") {
          flushRun();
          cursor -= block.height;
        } else {
          flushRun();
          cursor -= block.height;
        }
      }
      flushRun();
    }
    for (const block of blocks) {
      if (block.kind === "heading") {
        y -= 10;
        pdfPage.drawText(block.text, { x: margin, y, size: 13, font: bold, color: DEEP_INDIGO });
        y -= 16;
      } else if (block.kind === "line") {
        pdfPage.drawText(block.text, { x: margin + (block.emphasis ? 8 : 0), y, size: 11, font, color: BODY_TEXT });
        y -= 15;
      } else if (block.kind === "tableHeader") {
        const top = y;
        pdfPage.drawRectangle({ x: margin, y: top - block.height + 2, width: contentW, height: block.height - 2, color: DEEP_INDIGO });
        let x = margin;
        block.headers.forEach((headerCellLines, i) => {
          const w = block.widths[i];
          headerCellLines.forEach((headerLine, li) => {
            const textW = bold.widthOfTextAtSize(headerLine, 10);
            const tx = block.align[i] === "right" ? x + w - 6 - textW : x + 6;
            pdfPage.drawText(headerLine, { x: tx, y: top - 12 - li * 13, size: 10, font: bold, color: rgb(1, 1, 1) });
          });
          x += w;
        });
        y -= block.height;
      } else {
        const top = y;
        const fill = block.style === "total" ? LIGHT_BG : block.style === "subtotal" ? LIGHT_BG : block.rowIndex % 2 === 1 ? ROW_ALT : rgb(1, 1, 1);
        pdfPage.drawRectangle({ x: margin, y: top - block.height + 2, width: contentW, height: block.height - 2, color: fill });
        if (block.style === "total" || block.style === "subtotal") {
          pdfPage.drawLine({ start: { x: margin, y: top + 1 }, end: { x: pageW - margin, y: top + 1 }, thickness: block.style === "total" ? 1.2 : 0.8, color: INDIGO });
        }
        let x = margin;
        block.cells.forEach((cellLines, i) => {
          const w = block.widths[i];
          const f = block.style === "normal" ? font : bold;
          cellLines.forEach((cellLine, li) => {
            const textW = f.widthOfTextAtSize(cellLine, 10);
            const tx = block.align[i] === "right" ? x + w - 6 - textW : x + 6;
            pdfPage.drawText(cellLine, { x: tx, y: top - 12 - li * 13, size: 10, font: f, color: BODY_TEXT });
          });
          x += w;
        });
        pdfPage.drawLine({ start: { x: margin, y: top - block.height + 2 }, end: { x: pageW - margin, y: top - block.height + 2 }, thickness: 0.5, color: BORDER });
        y -= block.height;
      }
    }
    // Outer table borders are drawn by the row separators; the footer
    // is drawn after all pages exist so the total count is known.
    drawFooter(pdfPage, pageIndex);
  });

  return doc.save({ useObjectStreams: false });
}

/** Fetch the official logo bytes from the site's public asset. */
export async function fetchLogoBytes(): Promise<Uint8Array | undefined> {
  try {
    const res = await fetch("/triangletech-logo.png");
    if (!res.ok) return undefined;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

export async function downloadPremiumPdf(opts: PremiumPdfOptions & { filename: string }): Promise<void> {
  const { filename, ...rest } = opts;
  const bytes = await buildPremiumPdfBytes(rest);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
