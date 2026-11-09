/**
 * Shared localization infrastructure for TriangleTech tools.
 *
 * Permanent project rule (AGENTS.md / MEMORY.md):
 * "All current and future tools must support multiple languages through
 * shared localization infrastructure, a manual language dropdown, automatic
 * initial language selection, persistent user preference, and RTL where applicable."
 *
 * URL strategy: unchanged from the existing site. Each tool keeps ONE
 * canonical URL (e.g. /tools/time-card-calculator). Language is a saved
 * user preference (cookie + localStorage), never a new locale URL segment,
 * so no thin indexed pages are generated for translations.
 *
 * Automatic selection priority:
 *  1. The user's explicitly saved choice (cookie triangletech-locale).
 *  2. A supported browser language (navigator.languages, exact then base
 *     language; a region subtag such as es-MX is reliable country/language
 *     information already present in the browser, and it never overrides a
 *     saved choice).
 *  3. English fallback. No GPS permission is requested and no paid
 *     geolocation API is used; when no reliable information is available,
 *     the tool works in English.
 *
 * Calculations are independent of translated text: the time-card engine
 * works in integer minutes and money in cents, and locale only changes
 * how numbers, dates, and labels are displayed.
 */

export const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "pt", "ar", "ur", "hi", "zh", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "triangletech-locale";
export const LOCALE_STORAGE_KEY = "triangletech-locale";

export type LocaleMeta = {
  code: Locale;
  /** Language name in its own script, as shown in the dropdown. */
  nativeName: string;
  englishName: string;
  /** BCP 47 tag for Intl APIs. */
  intl: string;
  dir: "ltr" | "rtl";
  /** Script family for the PDF limitation disclosure. */
  script: "latin" | "arabic" | "devanagari" | "cjk";
  scriptName: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", nativeName: "English", englishName: "English", intl: "en-US", dir: "ltr", script: "latin", scriptName: "Latin" },
  es: { code: "es", nativeName: "Español", englishName: "Spanish", intl: "es-ES", dir: "ltr", script: "latin", scriptName: "Latin" },
  fr: { code: "fr", nativeName: "Français", englishName: "French", intl: "fr-FR", dir: "ltr", script: "latin", scriptName: "Latin" },
  de: { code: "de", nativeName: "Deutsch", englishName: "German", intl: "de-DE", dir: "ltr", script: "latin", scriptName: "Latin" },
  pt: { code: "pt", nativeName: "Português", englishName: "Portuguese", intl: "pt-PT", dir: "ltr", script: "latin", scriptName: "Latin" },
  ar: { code: "ar", nativeName: "العربية", englishName: "Arabic", intl: "ar-EG", dir: "rtl", script: "arabic", scriptName: "Arabic" },
  ur: { code: "ur", nativeName: "اردو", englishName: "Urdu", intl: "ur-PK", dir: "rtl", script: "arabic", scriptName: "Arabic (Urdu)" },
  hi: { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", intl: "hi-IN", dir: "ltr", script: "devanagari", scriptName: "Devanagari" },
  zh: { code: "zh", nativeName: "简体中文", englishName: "Simplified Chinese", intl: "zh-CN", dir: "ltr", script: "cjk", scriptName: "Simplified Chinese" },
  ja: { code: "ja", nativeName: "日本語", englishName: "Japanese", intl: "ja-JP", dir: "ltr", script: "cjk", scriptName: "Japanese" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeFromValue(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Detect a locale from browser languages: exact match, then base language. Never overrides a saved choice (callers check saved first). */
export function detectLocaleFromLanguages(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const lower = lang.toLowerCase();
    if (isLocale(lower)) return lower;
    const base = lower.split("-")[0];
    if (isLocale(base)) return base;
    // zh-Hans / zh-Hant / pt-BR style tags: base language already handled above.
  }
  return DEFAULT_LOCALE;
}

/** Currency default for a FRESH, EMPTY form only. Never applied on a language switch when data already exists. */
export function defaultCurrencyForLocale(locale: Locale, browserLanguage?: string): string {
  const region = browserLanguage?.split("-")[1]?.toUpperCase();
  switch (locale) {
    case "de":
    case "fr":
      return "EUR";
    case "es":
      return region === "MX" ? "MXN" : region === "US" ? "USD" : "EUR";
    case "pt":
      return region === "BR" ? "BRL" : "EUR";
    case "ja":
      return "JPY";
    case "hi":
      return "INR";
    case "zh":
      return "CNY";
    case "ar":
      return region === "EG" ? "EGP" : "SAR";
    case "ur":
      return "PKR";
    default:
      return region === "GB" ? "GBP" : "USD";
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

/** Format a number for display in a locale (grouping + decimal separator via Intl). */
export function formatLocaleNumber(locale: Locale, value: number, fractionDigits = 2): string {
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].intl, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

/** Parse user-typed localized numbers: locale decimal/grouping separators and non-Latin digits are handled explicitly. Returns null when unparseable. */
export function parseLocalizedNumber(value: string, locale: Locale): number | null {
  const latin = toLatinDigits(value.trim());
  if (!latin) return null;
  // Determine the locale's separators from a known sample.
  let decimalSep = ".";
  let groupSep: string | null = null;
  try {
    const parts = new Intl.NumberFormat(LOCALE_META[locale].intl).formatToParts(1234.5);
    decimalSep = parts.find(p => p.type === "decimal")?.value ?? ".";
    // No group part (e.g. es-ES formats 1234 without a separator) means
    // there is NO grouping separator to strip — never default to "," here,
    // or a decimal comma would be stripped and 8,50 would parse as 850.
    groupSep = parts.find(p => p.type === "group")?.value ?? null;
  } catch {
    /* fall back to en-US separators */
  }
  let normalized = latin;
  if (groupSep) normalized = normalized.split(groupSep).join("");
  if (decimalSep !== ".") normalized = normalized.split(decimalSep).join(".");
  // A trailing/leading minus sign is allowed; anything else is not a number.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Format a YYYY-MM-DD date for display in a locale. */
export function formatLocaleDate(locale: Locale, date: string): string {
  try {
    const dt = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) return date;
    return new Intl.DateTimeFormat(LOCALE_META[locale].intl, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(dt);
  } catch {
    return date;
  }
}

/** Format money in a locale + currency. Amount is in cents. */
export function formatLocaleMoney(locale: Locale, cents: number | null, currency = "USD"): string {
  if (cents === null) return "—";
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].intl, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
