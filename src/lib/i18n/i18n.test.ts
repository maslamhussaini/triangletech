import { describe, expect, it } from "vitest";
import { dictionaries, dictionaryCoverage, en, translate, tServer } from "./dictionaries";
import {
  SUPPORTED_LOCALES,
  detectLocaleFromLanguages,
  formatLocaleMoney,
  formatLocaleNumber,
  localeFromValue,
  parseLocalizedNumber,
  LOCALE_META,
  defaultCurrencyForLocale,
} from "./locales";
import { calculateTimesheet } from "../tools/time-card";

describe("language detection and fallback", () => {
  it("saved choice wins over browser languages (caller order: saved first)", () => {
    expect(localeFromValue("es")).toBe("es");
    expect(localeFromValue("xx")).toBe("en");
    expect(localeFromValue(undefined)).toBe("en");
  });
  it("detects exact then base browser languages, country region never overrides a base match incorrectly", () => {
    expect(detectLocaleFromLanguages(["es-MX", "en-US"])).toBe("es");
    expect(detectLocaleFromLanguages(["pt-BR"])).toBe("pt");
    expect(detectLocaleFromLanguages(["zh-Hans-CN"])).toBe("zh");
    expect(detectLocaleFromLanguages(["xx", "fr-CA"])).toBe("fr");
    expect(detectLocaleFromLanguages(["xx"])).toBe("en");
    expect(detectLocaleFromLanguages([])).toBe("en");
  });
  it("falls back to English for missing keys instead of rendering a key name", () => {
    expect(tServer("es", "nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
    // A key present only in English (simulate by deleting from a copy) falls back.
    const partial = { ...dictionaries.es };
    delete partial["tc.summary"];
    expect(translate("es", partial, en, "tc.summary")).toBe("Summary");
  });
  it("pluralization uses Intl plural rules", () => {
    expect(tServer("en", "tc.previewValid", { count: 1 }, 1)).toBe("1 valid row");
    expect(tServer("en", "tc.previewValid", { count: 3 }, 3)).toBe("3 valid rows");
    expect(tServer("es", "tc.previewValid", { count: 1 }, 1)).toBe("1 fila válida");
    expect(tServer("es", "tc.previewValid", { count: 3 }, 3)).toBe("3 filas válidas");
  });
  it("RTL locales are marked rtl, others ltr", () => {
    expect(LOCALE_META.ar.dir).toBe("rtl");
    expect(LOCALE_META.ur.dir).toBe("rtl");
    expect(LOCALE_META.en.dir).toBe("ltr");
    expect(LOCALE_META.ja.dir).toBe("ltr");
  });
});

describe("locale number formatting and parsing", () => {
  it("formats Spanish/German numbers with a comma decimal separator", () => {
    expect(formatLocaleNumber("de", 1234.5, 2)).toBe("1.234,50");
    expect(formatLocaleNumber("es", 8.5, 2)).toBe("8,50");
  });
  it("parses localized input, including grouping and non-Latin digits", () => {
    expect(parseLocalizedNumber("1.234,50", "de")).toBe(1234.5);
    expect(parseLocalizedNumber("8,50", "es")).toBe(8.5);
    expect(parseLocalizedNumber("١٢٣٫٥", "ar")).toBe(123.5); // Arabic-Indic digits + Arabic decimal separator
    expect(parseLocalizedNumber("۱۲۳", "ur")).toBe(123);
    expect(parseLocalizedNumber("abc", "en")).toBeNull();
    expect(parseLocalizedNumber("12.34.56", "en")).toBeNull();
  });
  it("currency defaults are only for a fresh form (pure function, no side effects)", () => {
    expect(defaultCurrencyForLocale("de")).toBe("EUR");
    expect(defaultCurrencyForLocale("es", "es-MX")).toBe("MXN");
    expect(defaultCurrencyForLocale("es", "es-ES")).toBe("EUR");
    expect(defaultCurrencyForLocale("ja")).toBe("JPY");
    expect(defaultCurrencyForLocale("en", "en-GB")).toBe("GBP");
  });
});

describe("dictionary coverage for the time-card scope", () => {
  it("every supported locale is present", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(dictionaries[locale], `missing dictionary for ${locale}`).toBeDefined();
    }
  });
  it("reports coverage per locale (no silent gaps)", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const cov = dictionaryCoverage(dictionaries[locale]!, en);
      // Full coverage is the goal for the time-card scope; report missing keys in the failure.
      expect(cov.missing, `${locale} missing: ${cov.missing.join(", ")}`).toEqual([]);
    }
  });
});

describe("calculation consistency across languages", () => {
  it("pay in cents is identical regardless of display locale; only formatting differs", () => {
    const sessions = [{ id: "s1", date: "2026-11-02", start: "09:00", end: "17:30", endsNextDay: false, breakMinutes: 30 }];
    const result = calculateTimesheet({ weekStart: "2026-11-02", period: "weekly", sessions, hourlyRate: 20, overtimeThresholdHours: 40, overtimeMultiplier: 1.5 });
    expect(result.payCents).toBe(16000);
    expect(formatLocaleMoney("en", result.payCents, "USD")).toBe("$160.00");
    expect(formatLocaleMoney("de", result.payCents, "USD")).not.toBe("$160.00");
    expect(formatLocaleMoney("de", result.payCents, "USD")).toContain("160");
  });
});
