"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  detectLocaleFromLanguages,
  formatLocaleDate,
  formatLocaleMoney,
  formatLocaleNumber,
  isLocale,
  parseLocalizedNumber,
  type Locale,
} from "./locales";
import { getDictionary, translate } from "./dictionaries";

type LanguageContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  /** Translate a key, with English fallback and {var} interpolation / pluralization. */
  t: (key: string, vars?: Record<string, string | number>, count?: number) => string;
  formatNumber: (value: number, fractionDigits?: number) => string;
  formatDate: (date: string) => string;
  formatMoney: (cents: number | null, currency?: string) => string;
  parseNumber: (value: string) => number | null;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // First-visit automatic detection: only when no saved choice exists.
  // A saved choice (cookie/localStorage) always wins and is rendered by the
  // server from the cookie, so returning users see no language flash.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved && isLocale(saved)) {
        if (saved !== locale) setLocaleState(saved);
        return;
      }
      const detected = detectLocaleFromLanguages(navigator.languages ?? [navigator.language]);
      if (detected !== locale) setLocaleState(detected);
    } catch {
      /* storage / navigator unavailable: keep the server-rendered locale */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].intl;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {
      /* preference still applies in this tab even if storage is blocked */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dir: LOCALE_META[locale].dir,
      setLocale,
      t: (key, vars, count) => translate(locale, dict, getDictionary(DEFAULT_LOCALE), key, vars, count),
      formatNumber: (v, f) => formatLocaleNumber(locale, v, f),
      formatDate: (d) => formatLocaleDate(locale, d),
      formatMoney: (c, cur) => formatLocaleMoney(locale, c, cur),
      parseNumber: (v) => parseLocalizedNumber(v, locale),
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside the tools LanguageProvider");
  return ctx;
}
