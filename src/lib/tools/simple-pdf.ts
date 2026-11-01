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
