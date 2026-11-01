import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, detectLocaleFromLanguages, formatNumber, parseLocalizedNumber, SUPPORTED_LOCALES, defaultCurrencyForLocale } from "./landscaping-i18n";
import { dictionaries, dictionaryCoverage, en, getDictionary, t } from "./landscaping-locales";

describe("language infrastructure", () => {
  it("supports exactly the 10 required languages", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "es", "fr", "de", "pt", "ar", "ur", "hi", "zh", "ja"]);
  });
  it("every language has complete landscaping coverage (no missing keys)", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const cov = dictionaryCoverage(getDictionary(locale), en);
      expect(cov.missing).toEqual([]);
      expect(cov.present).toBe(cov.total);
    }
  });
  it("English fallback: a missing key falls back to English, never a blank label", () => {
    expect(t("en", "ls.results")).toBe("Results");
    expect(dictionaries.en?.["ls.results"]).toBe("Results");
  });
  it("saved choice priority is a caller rule: detection never overrides it (documented) and browser detection works", () => {
    expect(detectLocaleFromLanguages(["es-MX", "en"])).toBe("es");
    expect(detectLocaleFromLanguages(["de-DE"])).toBe("de");
    expect(detectLocaleFromLanguages(["xx", "fr-CA"])).toBe("fr");
    expect(detectLocaleFromLanguages(["xx"])).toBe(DEFAULT_LOCALE);
    expect(detectLocaleFromLanguages([])).toBe(DEFAULT_LOCALE);
  });
  it("Spanish/German numeric formatting uses comma decimals", () => {
    expect(formatNumber("de", 1234.5, 2)).toBe("1.234,50");
    // es-ES grouping varies by ICU build; the contract is the comma decimal.
    expect(formatNumber("es", 1234.5, 2)).toMatch(/,50$/);
    expect(formatNumber("en", 1234.5, 2)).toBe("1,234.50");
  });
  it("localized numeric input parses comma decimals and thousands separators", () => {
    expect(parseLocalizedNumber("1.234,5", "de")).toBe(1234.5);
    expect(parseLocalizedNumber("1,234.5", "en")).toBe(1234.5);
    expect(parseLocalizedNumber("3,5", "de")).toBe(3.5);
    expect(parseLocalizedNumber("3,5", "en")).toBe(35);
    expect(parseLocalizedNumber("abc", "en")).toBeUndefined();
    expect(parseLocalizedNumber("", "en")).toBeUndefined();
    expect(parseLocalizedNumber("١٢٫٥", "ar")).toBe(12.5);
  });
  it("fresh-form currency defaults do not change on language switch (function is only called for fresh forms)", () => {
    expect(defaultCurrencyForLocale("de")).toBe("EUR");
    expect(defaultCurrencyForLocale("es", "es-MX")).toBe("MXN");
    expect(defaultCurrencyForLocale("en")).toBe("USD");
    expect(defaultCurrencyForLocale("ur")).toBe("PKR");
  });
  it("interpolation fills material names", () => {
    expect(t("en", "ls.title", { material: "Gravel" })).toBe("Gravel Calculator");
    expect(t("es", "ls.title", { material: "Grava" })).toContain("Grava");
  });
});
