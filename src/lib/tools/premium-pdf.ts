/**
 * Premium branded PDF reports for the TriangleTech free tools.
 *
 * One shared renderer for every tool export (time-card report and
 * invoice, landscaping report, companion result sheets), so every
 * visual document carries the same brand treatment:
 *
 * - Header: Indigo-to-violet gradient band with the USER's company
 *   branding when supplied (company name as plain text and/or logo
 *   tile, proportions preserved) and the report title, meta lines,
 *   and an accent rule. When neither a name nor a logo is supplied
 *   the header carries the report title alone — TriangleTech is
 *   never substituted into the header. Continuation pages repeat a
 *   compact company-branded header (logo + company name + report
 *   title, or the title alone).
 * - Tables: deep-indigo header row, white / very-light alternating
 *   rows, light borders, right-aligned numeric columns, distinct
 *   subtotal and final-total treatments. Header cells break at
 *   hyphens before hard-splitting words, and shrink (10 -> 9 ->
 *   8.5pt) before splitting, so long German compounds never end
 *   in isolated single-letter fragments.
 * - Summary (emphasis) sections get one light-Indigo band behind
 *   the complete section with consistent padding, and a short
 *   emphasis-only section is kept together on one page when it
 *   fits on a fresh page.
 * - Footer on every page: the official TriangleTech logo tile +
 *   "Created with TriangleTech™ · triangletech.co" with a clickable
 *   link annotation to https://triangletech.co/, an optional short
 *   disclaimer, and a localized "Page X of Y" (callers pass the
 *   translated template; the renderer substitutes the numbers).
 * - Tables keep their headings when they span pages; headings never
 *   sit orphaned at a page bottom.
 *
 * Text is native PDF text (selectable/searchable, vector tables, no
 * rasterized pages). Fonts are the built-in Helvetica family, which
 * covers Latin-1 only: for Arabic, Urdu, Hindi, Chinese, and Japanese
 * callers must render the English fallback with an explicit disclosure
 * (see the callers) — non-Latin PDF support is NOT claimed here.
 * This also applies to a user-supplied company name: non-Latin names
 * are sanitized to "?" in PDFs (browser Print renders them fully).
 * The footer logo is passed in as bytes by the caller (fetched from
 * the site's own public asset); when bytes are unavailable the footer
 * still carries the lockup text, URL, and link, but no logo tile.
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

export type CompanyLogo = {
  bytes: Uint8Array;
  kind: "png" | "jpg";
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
  /** Official TriangleTech logo PNG bytes, for the FOOTER attribution. */
  logoBytes?: Uint8Array;
  /** Translated "Page {page} of {total}" template; defaults to English. */
  pageOfTemplate?: string;
  /** User's company name for the HEADER (plain text, trimmed). Empty = absent. */
  companyName?: string;
  /** User's company logo for the HEADER (proportions preserved). */
  companyLogo?: CompanyLogo;
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

/**
 * Wrap text to a width. Compound words break at hyphens first
 * ("Material-Zwischensumme" -> "Material-" / "Zwischensumme"), so a
 * long heading never shatters into character fragments; only a single
 * unbreakable token longer than the line is hard-split, and never so
 * that a lone trailing character is left on its own line.
 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): { lines: string[]; hardSplit: boolean } {
  let hardSplit = false;
  const lines: string[] = [];
  // Split a word into hyphen segments, keeping the hyphen on the
  // segment that precedes the break ("Material-", "Zwischensumme").
  const segmentsFor = (word: string): string[] =>
    word.split(/(?<=-)/).filter(s => s.length > 0);
  const hardSplitToken = (token: string): string[] => {
    const out: string[] = [];
    let rest = token;
    while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
      hardSplit = true;
      let cut = rest.length;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
      // Never strand a single trailing character on the next line.
      if (rest.length - cut === 1 && cut > 1) cut -= 1;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest) out.push(rest);
    return out;
  };
  let current = "";
  for (const word of text.split(" ")) {
    const segments = segmentsFor(word);
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      // Continuation segments (j > 0) join directly onto the previous
      // segment; first segments are space-separated from other words.
      const separator = j > 0 ? "" : current ? " " : "";
      const candidate = current + separator + segment;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (font.widthOfTextAtSize(segment, size) <= maxWidth) {
          current = segment;
        } else {
          const pieces = hardSplitToken(segment);
          for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
          current = pieces[pieces.length - 1];
        }
      }
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) lines.push("");
  return { lines, hardSplit };
}

type Block =
  | { kind: "heading"; text: string; height: number }
  | { kind: "line"; text: string; height: number; emphasis: boolean }
  | { kind: "tableHeader"; headers: string[][]; widths: number[]; align: ("left" | "right")[]; height: number; size: number }
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
  const companyName = (opts.companyName ?? "").trim();
  opts = {
    ...opts,
    title: clean(opts.title),
    meta: opts.meta.map(clean),
    sections: cleanSections,
    createdWith: clean(opts.createdWith),
    disclaimer: opts.disclaimer ? clean(opts.disclaimer) : undefined,
    companyName: clean(companyName),
    pageOfTemplate: opts.pageOfTemplate ? clean(opts.pageOfTemplate) : "Page {page} of {total}",
  };
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (opts.logoBytes) {
    try {
      logo = await doc.embedPng(opts.logoBytes);
    } catch {
      logo = null; // Footer lockup text + URL still brand the document.
    }
  }
  // User company logo for the header (proportions preserved); a bad
  // file degrades to the company name alone, never a crash.
  let companyLogo: PDFImage | null = null;
  if (opts.companyLogo) {
    try {
      companyLogo = opts.companyLogo.kind === "jpg"
        ? await doc.embedJpg(opts.companyLogo.bytes)
        : await doc.embedPng(opts.companyLogo.bytes);
    } catch {
      companyLogo = null;
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
  const wrappedMeta = opts.meta.flatMap(m => wrapText(m, font, 11, contentW).lines);

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
  // Height available for content on a fresh continuation page.
  const freshRemaining = (pageH - 64) - contentBottom;
  for (const section of opts.sections) {
    if (remaining < 24 + 40) startPage(false);
    // Keep a short summary (emphasis lines, no table) together: if
    // it fits on a fresh page but not in the space left, move the
    // whole section rather than splitting the pay summary.
    if (section.emphasis && !section.table && section.lines) {
      const totalH = 26 + section.lines.reduce(
        (sum, line) => sum + wrapText(line, font, 11, contentW - 16).lines.length * 15,
        0,
      );
      if (totalH > remaining && totalH <= freshRemaining) startPage(false);
    }
    push({ kind: "heading", text: section.heading, height: 26 });
    for (const line of section.lines ?? []) {
      for (const wrapped of wrapText(line, font, 11, contentW - 16).lines) {
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
      // Long compounds shrink (10 -> 9 -> 8.5pt) before any word is
      // hard-split, so German headings never end in fragments.
      let headerSize = 10;
      let headerLines = table.headers.map((h, i) => wrapText(h, bold, 10, widths[i] - 12));
      if (headerLines.some(c => c.hardSplit)) {
        for (const size of [9, 8.5]) {
          const attempt = table.headers.map((h, i) => wrapText(h, bold, size, widths[i] - 12));
          headerSize = size;
          headerLines = attempt;
          if (!attempt.some(c => c.hardSplit)) break;
        }
      }
      const headerLineHeight = headerSize + 3;
      const headerHeight = Math.max(1, ...headerLines.map(l => l.lines.length)) * headerLineHeight + 8;
      const header: Block = { kind: "tableHeader", headers: headerLines.map(c => c.lines), widths, align, height: headerHeight, size: headerSize };
      need(header.height);
      push(header);
      table.rows.forEach((row, rowIndex) => {
        const cells = row.map((cell, i) => wrapText(cell, font, 10, widths[i] - 12).lines);
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
    const pageText = (opts.pageOfTemplate ?? "Page {page} of {total}")
      .split("{page}").join(String(index + 1))
      .split("{total}").join(String(pageCount));
    pdfPage.drawText(pageText, { x: pageW - margin - font.widthOfTextAtSize(pageText, 9), y, size: 9, font, color: MUTED });
    if (opts.disclaimer) {
      for (const [li, dline] of wrapText(opts.disclaimer, font, 8.5, contentW).lines.slice(0, 2).entries()) {
        pdfPage.drawText(dline, { x: margin, y: 30 - li * 11, size: 8.5, font, color: MUTED });
      }
    }
  };

  pages.forEach((blocks, pageIndex) => {
    const pdfPage = doc.addPage([pageW, pageH]);
    let y: number;
    if (pageIndex === 0) {
      // Gradient brand band (vector strips, Indigo -> Violet). The
      // band carries the USER's company branding: logo tile and/or
      // company name as plain text. With neither, the band stays an
      // empty gradient and the report title below stands alone —
      // TriangleTech is never substituted into the header.
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
      if (companyLogo) {
        const h = 40;
        const w = h * (companyLogo.width / companyLogo.height);
        pdfPage.drawImage(companyLogo, { x: margin, y: bandY + 12, width: w, height: h });
        brandX = margin + w + 12;
      }
      if (opts.companyName) {
        const avail = pageW - margin - brandX;
        // Fit the name: prefer one line, shrinking 17 -> 15 -> 13pt;
        // otherwise wrap at 12pt into at most two band lines.
        let nameLines: string[] = [];
        let nameSize = 12;
        for (const size of [17, 15, 13]) {
          const wrapped = wrapText(opts.companyName, bold, size, avail);
          if (wrapped.lines.length === 1) {
            nameLines = wrapped.lines;
            nameSize = size;
            break;
          }
        }
        if (nameLines.length === 0) {
          const wrapped = wrapText(opts.companyName, bold, 12, avail).lines;
          nameLines = wrapped.slice(0, 2);
          if (wrapped.length > 2) {
            let trimmed = nameLines[1];
            while (trimmed.length > 0 && bold.widthOfTextAtSize(`${trimmed}…`, 12) > avail) trimmed = trimmed.slice(0, -1);
            nameLines[1] = `${trimmed}…`;
          }
        }
        if (nameLines.length === 1) {
          pdfPage.drawText(nameLines[0], { x: brandX, y: bandY + 26, size: nameSize, font: bold, color: rgb(1, 1, 1) });
        } else {
          pdfPage.drawText(nameLines[0], { x: brandX, y: bandY + 40, size: 12, font: bold, color: rgb(1, 1, 1) });
          pdfPage.drawText(nameLines[1], { x: brandX, y: bandY + 20, size: 12, font: bold, color: rgb(1, 1, 1) });
        }
      }
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
      // Compact company-branded continuation header: logo + company
      // name + report title, or the title alone when no company
      // branding is supplied. Never TriangleTech in the header.
      let contX = margin;
      if (companyLogo) {
        const h = 16;
        const w = h * (companyLogo.width / companyLogo.height);
        pdfPage.drawImage(companyLogo, { x: margin, y: pageH - 52, width: w, height: h });
        contX = margin + w + 8;
      }
      const contText = opts.companyName ? `${opts.companyName} · ${opts.title}` : opts.title;
      let contSize = 10;
      let contDrawn = contText;
      if (bold.widthOfTextAtSize(contDrawn, contSize) > pageW - margin - contX) {
        contSize = 9;
        if (bold.widthOfTextAtSize(contDrawn, contSize) > pageW - margin - contX) {
          let trimmed = contDrawn;
          while (trimmed.length > 0 && bold.widthOfTextAtSize(`${trimmed}…`, contSize) > pageW - margin - contX) trimmed = trimmed.slice(0, -1);
          contDrawn = `${trimmed}…`;
        }
      }
      pdfPage.drawText(contDrawn, { x: contX, y: pageH - 48, size: contSize, font: bold, color: INDIGO });
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
      // Band geometry: the first line's glyphs rise ~8pt above its
      // baseline and the last line's descenders fall ~3pt below its
      // baseline, so the band runs from 10pt above the first baseline
      // to 5pt below the last baseline — padding on all sides, never
      // cutting through the first or last line.
      const flushRun = () => {
        if (runStart !== null) {
          pdfPage.drawRectangle({ x: margin, y: runEnd + 10, width: contentW, height: runStart - runEnd, color: LIGHT_BG });
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
            const textW = bold.widthOfTextAtSize(headerLine, block.size);
            const tx = block.align[i] === "right" ? x + w - 6 - textW : x + 6;
            pdfPage.drawText(headerLine, { x: tx, y: top - (block.size + 2) - li * (block.size + 3), size: block.size, font: bold, color: rgb(1, 1, 1) });
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
