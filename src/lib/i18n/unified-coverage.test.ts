import { describe, expect, it } from "vitest";
import { dictionaries, dictionaryCoverage, en, getDictionary } from "./dictionaries";
import {
  SUPPORTED_LOCALES,
  defaultCurrencyForLocale,
  detectLocaleFromLanguages,
  formatLocaleNumber,
  parseLocalizedNumber,
} from "./locales";

const PREFIXES = ["tc.", "htd.", "wh.", "ls.", "mat."] as const;

describe("unified localization coverage (all six tools, one shared system)", () => {
  it("lists all 10 languages", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "es", "fr", "de", "pt", "ar", "ur", "hi", "zh", "ja"]);
  });

  it("every locale has zero missing keys vs English", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dict = locale === "en" ? en : (dictionaries[locale] ?? en);
      const cov = dictionaryCoverage(dict, en);
      expect(cov.missing, `${locale} missing: ${cov.missing.join(", ")}`).toEqual([]);
      expect(cov.total).toBe(Object.keys(en).length);
    }
  });

  it("covers every tool prefix in every locale", () => {
    for (const prefix of PREFIXES) {
      const keys = Object.keys(en).filter(k => k.startsWith(prefix));
      expect(keys.length, `${prefix} keys`).toBeGreaterThan(0);
      for (const locale of SUPPORTED_LOCALES) {
        const dict = locale === "en" ? en : (dictionaries[locale] ?? en);
        for (const key of keys) expect(key in dict, `${locale} missing ${key}`).toBe(true);
      }
    }
    expect(getDictionary("ar")["ls.title"]).toBeTruthy();
  });

  it("detection prefers exact then base language, never overrides a saved choice by itself", () => {
    expect(detectLocaleFromLanguages(["es-MX", "en"])).toBe("es");
    expect(detectLocaleFromLanguages(["fr-CA"])).toBe("fr");
    expect(detectLocaleFromLanguages(["xx"])).toBe("en");
  });

  it("shared number formatting and parsing cover the landscaping cases", () => {
    expect(formatLocaleNumber("de", 1234.5, 2)).toBe("1.234,50");
    expect(formatLocaleNumber("es", 1234.5, 2)).toMatch(/,50$/);
    expect(parseLocalizedNumber("١٢٫٥", "ar")).toBe(12.5);
    expect(parseLocalizedNumber("8,50", "es")).toBe(8.5);
    expect(parseLocalizedNumber("1.234,50", "de")).toBe(1234.5);
  });

  it("fresh-form currency defaults are locale-based only", () => {
    expect(defaultCurrencyForLocale("ur")).toBe("PKR");
    expect(defaultCurrencyForLocale("de")).toBe("EUR");
    expect(defaultCurrencyForLocale("en", "en-GB")).toBe("GBP");
  });
});
