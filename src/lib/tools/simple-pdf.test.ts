import { describe, expect, it } from "vitest";
import { buildPdfBytes } from "./simple-pdf";

describe("simple PDF writer", () => {
  it("produces a PDF header and contains the title text", () => {
    const bytes = buildPdfBytes("Work Hours & Time Card", ["Total: 8h", "Estimated gross pay: $160.00"]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Work Hours");
    expect(text).toContain("Estimated gross pay");
    expect(text).toContain("%%EOF");
  });
  it("preserves Latin-1 accents (Spanish/French/German) instead of replacing them with ?", () => {
    const bytes = buildPdfBytes("Calculadora de horas", ["Período: 2026-11-02", "Salário bruto estimado"]);
    const text = new TextDecoder("latin1").decode(bytes);
    // í in WinAnsi is 0xED -> octal \355; á is 0xE1 -> \341
    expect(text).toContain("\\355");
    expect(text).toContain("\\341");
    expect(text).not.toContain("Per?odo");
  });
  it("wraps long lines instead of dropping them", () => {
    const longLine = "A ".repeat(200).trim();
    const bytes = buildPdfBytes("Test", [longLine]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("A A A");
    expect(text.length).toBeGreaterThan(longLine.length);
  });
});
