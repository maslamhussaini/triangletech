/**
 * Minimal dependency-free PDF writer for tool exports.
 *
 * Produces a valid single-font (Helvetica) PDF with Letter pages. It is
 * deliberately simple: plain text lines, automatic wrapping and page
 * breaks, no images, no embedded fonts. Used by the time-card timesheet
 * and invoice downloads so "Download PDF" is a real PDF file, not a
 * print-to-PDF instruction.
 */

/**
 * Helvetica in a standard PDF uses WinAnsiEncoding, which covers Latin-1
 * plus a few punctuation marks (smart quotes, dashes, €). Those are
 * emitted as octal escapes so Spanish/French/German/Portuguese accents
 * survive. Anything outside WinAnsi (Arabic, Urdu, Devanagari, CJK)
 * cannot be represented in this font and is replaced with "?" — which
 * is why the time-card PDF falls back to English for those locales
 * with an explicit disclosure line, instead of producing broken text.
 */
const WINANSI_EXTRA: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

function escapePdfText(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (ch >= " " && ch <= "~") out += ch;
    else if (ch.charCodeAt(0) >= 0xa0 && ch.charCodeAt(0) <= 0xff) out += `\\${ch.charCodeAt(0).toString(8).padStart(3, "0")}`;
    else if (ch in WINANSI_EXTRA) out += `\\${WINANSI_EXTRA[ch].toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return out;
}

function wrapLine(line: string, maxChars = 96): string[] {
  if (line.length <= maxChars) return [line];
  const words = line.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
    while (current.length > maxChars) {
      out.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) out.push(current);
  return out;
}

export function buildPdfBytes(title: string, lines: string[]): Uint8Array {
  const wrapped: string[] = [];
  lines.forEach(line => wrapped.push(...wrapLine(line)));
  const linesPerPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) pages.push(wrapped.slice(i, i + linesPerPage));
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
  // 1: catalog, 2: pages, 3: font. Page objects start at 4, content objects follow.
  const pageCount = pages.length;
  const contentStart = 4 + pageCount;
  const kids = pages.map((_, i) => `${4 + i} 0 R`).join(" ");
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, pageIndex) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentStart + pageIndex} 0 R >>`
    );
  });
  pages.forEach((pageLines, pageIndex) => {
    const contentLines: string[] = [];
    contentLines.push("BT /F1 11 Tf 54 740 Td");
    if (pageIndex === 0) {
      contentLines.push(`(${escapePdfText(title)}) Tj 0 -22 Td`);
      contentLines.push(`(${escapePdfText("Powered by TriangleTech")}) Tj 0 -18 Td`);
    }
    pageLines.forEach(line => {
      contentLines.push(`(${escapePdfText(line)}) Tj 0 -15 Td`);
    });
    contentLines.push("ET");
    const stream = contentLines.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

/* ------------------------------------------------------------------ */
/* Structured report PDF (Time Card report).                           */
/*                                                                     */
/* Unlike buildPdfBytes above, this renderer lays out real tables:     */
/* a brand header and title on page 1, a running brand header on       */
/* later pages, table headings repeated when a table spans pages,      */
/* and "Page X of Y" in the footer of every page. Content is           */
/* paginated before rendering so the total page count is known.        */
/* ------------------------------------------------------------------ */

export type ReportTable = {
  headers: string[];
  /** Column widths in points; must sum to <= 504 (Letter, 54pt margins). */
  widths: number[];
  rows: string[][];
};

export type ReportSection = {
  heading: string;
  table?: ReportTable;
  lines?: string[];
};

export type ReportPdfOptions = {
  brand: string;
  title: string;
  /** Lines shown under the title on page 1 (period, employee, ...). */
  meta: string[];
  sections: ReportSection[];
};

const REPORT_MARGIN = 54;
const REPORT_WIDTH = 504;
const REPORT_BOTTOM = 60;

function reportText(x: number, y: number, font: string, size: number, color: string, text: string): string {
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
}

function wrapCell(text: string, colWidth: number, fontSize: number): string[] {
  const chars = Math.max(4, Math.floor(colWidth / (fontSize * 0.55)));
  return wrapLine(text, chars);
}

type PlacedBlock =
  | { kind: "heading"; text: string; height: number }
  | { kind: "line"; text: string; height: number }
  | { kind: "tableHeader"; headers: string[]; widths: number[]; height: number }
  | { kind: "tableRow"; cells: string[][]; widths: number[]; height: number };

function paginateReport(opts: ReportPdfOptions): PlacedBlock[][] {
  const pages: PlacedBlock[][] = [];
  let page: PlacedBlock[] = [];
  let yTop = 0; // set per page by the renderer; pagination tracks remaining space
  let remaining = 0;
  const startPage = (first: boolean) => {
    if (page.length > 0) pages.push(page);
    page = [];
    // Page 1 header block consumes down to y=694 minus meta lines;
    // later pages consume down to y=720. Pagination works in heights,
    // so track the usable height from the content start to the footer.
    const contentTop = first ? 694 - opts.meta.length * 16 - 12 : 720;
    remaining = contentTop - REPORT_BOTTOM;
    yTop = contentTop;
    void yTop;
  };
  const need = (height: number) => {
    if (height > remaining) startPage(false);
  };
  const push = (block: PlacedBlock) => {
    page.push(block);
    remaining -= block.height;
  };

  startPage(true);
  for (const section of opts.sections) {
    // Keep a heading with at least one following block on the same page.
    if (remaining < 22 + 40) startPage(false);
    push({ kind: "heading", text: section.heading, height: 24 });
    for (const line of section.lines ?? []) {
      for (const wrapped of wrapLine(line, 92)) {
        need(15);
        push({ kind: "line", text: wrapped, height: 15 });
      }
    }
    const table = section.table;
    if (table) {
      const headerBlock: PlacedBlock = { kind: "tableHeader", headers: table.headers, widths: table.widths, height: 22 };
      need(headerBlock.height);
      push(headerBlock);
      for (const row of table.rows) {
        const cells = row.map((cell, i) => wrapCell(cell, table.widths[i] - 12, 10));
        const lines = Math.max(1, ...cells.map(c => c.length));
        const height = lines * 13 + 6;
        if (height > remaining) {
          startPage(false);
          push(headerBlock);
        }
        push({ kind: "tableRow", cells, widths: table.widths, height });
      }
    }
  }
  if (page.length > 0 || pages.length === 0) pages.push(page);
  return pages;
}

function renderReportPage(
  blocks: PlacedBlock[],
  pageIndex: number,
  pageCount: number,
  opts: ReportPdfOptions
): string {
  const cmds: string[] = [];
  let y: number;
  if (pageIndex === 0) {
    cmds.push(reportText(REPORT_MARGIN, 748, "F2", 15, "0.310 0.275 0.898", opts.brand));
    cmds.push(reportText(REPORT_MARGIN, 722, "F2", 20, "0.106 0.106 0.294", opts.title));
    cmds.push("0.310 0.275 0.898 RG 1.2 w 54 710 m 558 710 l S");
    y = 692;
    for (const metaLine of opts.meta) {
      cmds.push(reportText(REPORT_MARGIN, y, "F1", 11, "0.278 0.333 0.412", metaLine));
      y -= 16;
    }
    y -= 10;
  } else {
    cmds.push(reportText(REPORT_MARGIN, 748, "F2", 10, "0.310 0.275 0.898", opts.brand));
    cmds.push("0.882 0.898 0.941 RG 0.8 w 54 738 m 558 738 l S");
    y = 720;
  }
  for (const block of blocks) {
    if (block.kind === "heading") {
      y -= 8;
      cmds.push(reportText(REPORT_MARGIN, y, "F2", 13, "0.106 0.106 0.294", block.text));
      y -= 16;
    } else if (block.kind === "line") {
      cmds.push(reportText(REPORT_MARGIN, y, "F1", 11, "0.200 0.200 0.200", block.text));
      y -= 15;
    } else if (block.kind === "tableHeader") {
      const top = y;
      cmds.push(`0.933 0.941 1 rg ${REPORT_MARGIN} ${top - 16} ${REPORT_WIDTH} 20 re f`);
      let x = REPORT_MARGIN;
      block.headers.forEach((h, i) => {
        cmds.push(reportText(x + 6, top - 13, "F2", 10, "0.106 0.106 0.294", h));
        x += block.widths[i];
      });
      cmds.push("0.882 0.898 0.941 RG 0.8 w 54 " + (top - 16) + " m 558 " + (top - 16) + " l S");
      y -= 22;
    } else {
      const top = y;
      let x = REPORT_MARGIN;
      block.cells.forEach((cellLines, i) => {
        cellLines.forEach((cellLine, li) => {
          cmds.push(reportText(x + 6, top - 12 - li * 13, "F1", 10, "0.200 0.200 0.200", cellLine));
        });
        x += block.widths[i];
      });
      cmds.push("0.929 0.937 0.949 RG 0.5 w 54 " + (top - block.height + 2) + " m 558 " + (top - block.height + 2) + " l S");
      y -= block.height;
    }
  }
  cmds.push(reportText(REPORT_MARGIN, 40, "F1", 9, "0.400 0.467 0.553", "Powered by TriangleTech"));
  const pageText = `Page ${pageIndex + 1} of ${pageCount}`;
  cmds.push(reportText(558 - pageText.length * 4.5, 40, "F1", 9, "0.400 0.467 0.553", pageText));
  return cmds.join("\n");
}

export function buildReportPdfBytes(opts: ReportPdfOptions): Uint8Array {
  const pages = paginateReport(opts);
  const pageCount = pages.length;
  const contentStart = 5 + pageCount;
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i} 0 R`).join(" ")}] /Count ${pageCount} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  pages.forEach((blocks, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentStart + i} 0 R >>`
    );
  });
  pages.forEach((blocks, i) => {
    const stream = renderReportPage(blocks, i, pageCount, opts);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function buildReportPdfBlob(opts: ReportPdfOptions): Blob {
  const bytes = buildReportPdfBytes(opts);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export function buildPdfBlob(title: string, lines: string[]): Blob {
  const bytes = buildPdfBytes(title, lines);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
