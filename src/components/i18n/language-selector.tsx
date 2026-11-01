"use client";

import { LOCALE_META, SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { useLanguage } from "@/lib/i18n/provider";

/**
 * Shared, clearly visible language dropdown for all tools.
 * Native <select>: keyboard accessible, mobile friendly, no custom
 * focus management needed. Names are shown in their native scripts.
 * Changing it never reloads the page and never clears tool state —
 * it only changes the language context above the tool.
 */
export function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
      <span>{t("common.language")}:</span>
      <select
        className="select-premium"
        aria-label={t("common.languageLabel")}
        value={locale}
        onChange={e => {
          const next = e.target.value;
          if (SUPPORTED_LOCALES.includes(next as (typeof SUPPORTED_LOCALES)[number])) {
            setLocale(next as (typeof SUPPORTED_LOCALES)[number]);
          }
        }}
        style={{ minHeight: 44, minWidth: 160 }}
      >
        {SUPPORTED_LOCALES.map(code => (
          <option key={code} value={code}>
            {LOCALE_META[code].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
