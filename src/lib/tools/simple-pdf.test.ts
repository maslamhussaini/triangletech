import { describe, expect, it } from "vitest";
import { buildPdfBytes, buildReportPdfBytes } from "./simple-pdf";

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

describe("structured report PDF", () => {
  const shortReport = {
    brand: "TriangleTech",
    title: "Work Hours & Time Card",
    meta: ["Period: 2026-11-02 to 2026-11-08 (weekly)", "Employee: Alex Rivera"],
    sections: [
      {
        heading: "Sessions",
        table: {
          headers: ["Date", "Start", "End", "Next day", "Break", "Paid"],
          widths: [104, 80, 80, 80, 80, 80],
          rows: [["2026-11-02", "9:00 AM", "5:00 PM", "No", "30", "7h 30m"]],
        },
      },
      {
        heading: "Pay summary",
        lines: ["Total hours: 7h 30m", "Estimated gross pay: $67.50"],
      },
    ],
  };

  it("renders brand, title, meta and a table on one page with a page number", () => {
    const text = new TextDecoder().decode(buildReportPdfBytes(shortReport));
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("TriangleTech");
    expect(text).toContain("Work Hours");
    expect(text).toContain("Alex Rivera");
    expect(text).toContain("7h 30m");
    expect(text).toContain("Page 1 of 1");
    expect(text).toContain("%%EOF");
  });

  it("repeats table headings and numbers pages on a multi-page table", () => {
    const rows = Array.from({ length: 60 }, (_, i) => [
      `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
      "9:00 AM",
      "5:00 PM",
      "No",
      "30",
      "7h 30m",
    ]);
    const text = new TextDecoder().decode(
      buildReportPdfBytes({
        ...shortReport,
        sections: [{ heading: "Sessions", table: { headers: ["Date", "Start", "End", "Next day", "Break", "Paid"], widths: [104, 80, 80, 80, 80, 80], rows } }],
      })
    );
    expect(text).toContain("Page 1 of 2");
    expect(text).toContain("Page 2 of 2");
    // The table heading appears once per page (twice), not once.
    expect(text.split("(Date)").length - 1).toBe(2);
  });
});
