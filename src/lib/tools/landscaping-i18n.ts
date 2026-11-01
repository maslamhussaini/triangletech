/**
 * Shared localization for the landscaping calculators.
 *
 * This is the landscaping scope's shared infrastructure: a manual
 * language dropdown, automatic initial selection, a persistent saved
 * choice, and RTL support. It deliberately uses ONE canonical URL per
 * tool (no locale URL segments), so no thin indexed pages are created
 * for translations. Calculations never read translated text.
 *
 * Automatic selection priority (prompt: multilingual §2):
 *   1. explicitly saved choice (localStorage + cookie `triangletech-locale`)
 *   2. supported browser language (navigator.languages, exact then base;
 *      a region subtag such as es-MX is country information already
 *      present in the browser and never overrides a saved choice)
 *   3. English fallback
 * No GPS permission is requested and no paid geolocation API is used.
 * Language changes never change currency, units, dates, or results:
 * currency/unit defaults are applied only to a fresh, empty form.
 */

export const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "pt", "ar", "ur", "hi", "zh", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "triangletech-locale";

export interface LocaleMeta {
  code: Locale;
  nativeName: string;
  intl: string;
  dir: "ltr" | "rtl";
  script: "latin" | "arabic" | "devanagari" | "cjk";
  scriptName: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", nativeName: "English", intl: "en-US", dir: "ltr", script: "latin", scriptName: "Latin" },
  es: { code: "es", nativeName: "Español", intl: "es-ES", dir: "ltr", script: "latin", scriptName: "Latin" },
  fr: { code: "fr", nativeName: "Français", intl: "fr-FR", dir: "ltr", script: "latin", scriptName: "Latin" },
  de: { code: "de", nativeName: "Deutsch", intl: "de-DE", dir: "ltr", script: "latin", scriptName: "Latin" },
  pt: { code: "pt", nativeName: "Português", intl: "pt-PT", dir: "ltr", script: "latin", scriptName: "Latin" },
  ar: { code: "ar", nativeName: "العربية", intl: "ar-EG", dir: "rtl", script: "arabic", scriptName: "Arabic" },
  ur: { code: "ur", nativeName: "اردو", intl: "ur-PK", dir: "rtl", script: "arabic", scriptName: "Arabic (Urdu)" },
  hi: { code: "hi", nativeName: "हिन्दी", intl: "hi-IN", dir: "ltr", script: "devanagari", scriptName: "Devanagari" },
  zh: { code: "zh", nativeName: "简体中文", intl: "zh-CN", dir: "ltr", script: "cjk", scriptName: "Simplified Chinese" },
  ja: { code: "ja", nativeName: "日本語", intl: "ja-JP", dir: "ltr", script: "cjk", scriptName: "Japanese" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectLocaleFromLanguages(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const lower = lang.toLowerCase();
    if (isLocale(lower)) return lower;
    const base = lower.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Currency default for a FRESH, EMPTY form only. Never on language switch. */
export function defaultCurrencyForLocale(locale: Locale, browserLanguage?: string): string {
  const region = browserLanguage?.split("-")[1]?.toUpperCase();
  switch (locale) {
    case "de": case "fr": return "EUR";
    case "es": return region === "MX" ? "MXN" : region === "US" ? "USD" : "EUR";
    case "pt": return region === "BR" ? "BRL" : "EUR";
    case "ja": return "JPY";
    case "hi": return "INR";
    case "zh": return "CNY";
    case "ar": return region === "EG" ? "EGP" : "SAR";
    case "ur": return "PKR";
    default: return region === "GB" ? "GBP" : "USD";
  }
}

const DIGIT_MAP: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function toLatinDigits(value: string): string {
  return value.split("").map(ch => DIGIT_MAP[ch] ?? ch).join("");
}

/**
 * Parse a number the user typed, accepting the locale's decimal
 * separator as well as the plain ASCII form. Rules: if both "," and "."
 * appear, the last one is the decimal separator; if only "," appears and
 * the locale uses "," as decimal, it is the decimal separator; otherwise
 * "," is a thousands separator. Returns undefined for empty/invalid input.
 */
export function parseLocalizedNumber(raw: string, locale: Locale): number | undefined {
  const trimmed = toLatinDigits(raw.trim()).replace(/٫/g, ".").replace(/٬/g, "");
  if (!trimmed) return undefined;
  const intl = LOCALE_META[locale].intl;
  let decimal = ".";
  try {
    const parts = new Intl.NumberFormat(intl).formatToParts(1234.5);
    decimal = parts.find(p => p.type === "decimal")?.value ?? ".";
  } catch { /* keep "." */ }
  let s = trimmed.replace(/\s/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = decimal === "," ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function formatNumber(locale: Locale, value: number, fractionDigits = 2): string {
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].intl, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

export function formatCompact(locale: Locale, value: number): string {
  return formatNumber(locale, value, Math.abs(value) >= 100 ? 0 : value >= 10 ? 1 : 2);
}
