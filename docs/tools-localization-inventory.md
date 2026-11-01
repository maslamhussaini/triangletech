# Tools localization inventory

Permanent project rule (AGENTS.md, owner requirement 2026-11-01):

> All current and future tools must support multiple languages through
> shared localization infrastructure, a manual language dropdown, automatic
> initial language selection, persistent user preference, and RTL where applicable.

## Infrastructure (shared, reusable for existing and future tools)

- `src/lib/i18n/locales.ts` — supported locales, native names, direction,
  detection priority (saved > browser language > English), locale number/
  date/money formatting, localized number parsing (decimal/grouping
  separators, Arabic-Indic / Eastern Arabic / Devanagari digits),
  fresh-form-only currency defaults.
- `src/lib/i18n/dictionaries.ts` + `src/lib/i18n/error-dictionaries.ts` —
  shared dictionaries for the time-card scope; English is the fallback
  for any missing key (a missing translation never renders a key name).
- `src/lib/i18n/provider.tsx` — LanguageProvider + `useLanguage()` hook
  (`t`, `formatNumber`, `formatDate`, `formatMoney`, `parseNumber`).
- `src/app/tools/layout.tsx` — shared tools layout with the language
  dropdown (native `<select>`, keyboard accessible, mobile friendly,
  names in native scripts). Initial locale comes from the saved cookie,
  so returning users are server-rendered in their language with no flash.
- `src/components/i18n/language-selector.tsx` — the dropdown itself.
- URL strategy: unchanged. Each tool keeps ONE canonical URL; language
  is a preference, not a locale path segment. No thin indexed pages are
  generated for translations. QA noindex stays environment-specific
  (`QA_NOINDEX=1` at build time adds `X-Robots-Tag: noindex, nofollow`;
  it is off by default and is never applied to the live main site by code).

## Coverage — complete for the time-card scope (2026-11-01, verified)

Dictionary coverage is asserted by `src/lib/i18n/i18n.test.ts`
(`dictionaryCoverage` per locale): **100% of keys present in all 10
languages** for the time-card scope, including validation errors and
import row errors (structured codes, not English strings).

| Tool | Route | Localization status |
| --- | --- | --- |
| Work Hours & Time Card Calculator | `/tools/time-card-calculator` | **Complete** — workflow, labels, help, validation, results, import wizard, export controls, privacy, invoice, save, FAQ, related tools; 10 languages; RTL for ar/ur; locale numbers/dates/money; data preserved on switch; import date format independent of language. |
| Hours to Decimal Converter | `/tools/hours-to-decimal` | **Complete** — same infrastructure; locale decimal separator in results and conversion table. |
| Work Hours Calculator | `/tools/work-hours-calculator` | **Complete** — same infrastructure; translated validation, overnight split dates localized. |

## PDF / print support — disclosed limitation

- Latin-script languages (en, es, fr, de, pt): PDF exports are fully
  translated; the writer uses WinAnsi Latin-1 so accents survive
  (verified: Spanish PDF contains accented characters, not `?`).
- Arabic, Urdu, Hindi, Simplified Chinese, Japanese: the built-in
  Helvetica PDF font cannot shape these scripts. The PDF therefore
  falls back to English **with an explicit first line disclosing that
  limitation** (verified: Arabic PDF contains the English disclosure).
  Browser Print renders the fully translated page correctly via system
  fonts, so a fully translated copy is always available via Print.
  This is a disclosed limitation, not full PDF support for those scripts.

## Not yet migrated — do NOT mark complete

The following tools exist in this checkout and remain English-only.
They share the tools-layout dropdown (the dropdown itself is translated
and switches the layout), but their own workflows are not yet translated
and must not be described as localized:

| Tool | Route | Status |
| --- | --- | --- |
| Rental Property Investment Calculator | `/tools/rental-property-investment-calculator` | Not migrated |
| Airbnb Booking Profit Calculator | `/tools/airbnb-booking-profit-calculator` | Not migrated |
| Product Cost & Profit Calculator | `/tools/product-cost-profit-calculator` | Not migrated |
| Pakistan Sales Tax Calculator | `/tools/pakistan-sales-tax-calculator` | Not migrated |
| Free QR Code Generator | `/tools/qr-code-generator` | Not migrated |
| Image Compressor to Target KB | `/tools/image-compressor` | Not migrated |

Migration path for each: wrap its client in `useLanguage()`, move its
user-facing strings into `src/lib/i18n/dictionaries.ts` (English first,
then the other 9 languages), keep calculations in the existing pure
modules, and re-run the coverage test so a missing key fails loudly.

## Not present in this checkout — cannot be localized here

- **Gravel / Mulch / Topsoil calculator(s):** no such tool, route, or
  source exists in the canonical `maslamhussaini/triangletech` checkout
  (filesystem + registry search, 2026-11-01). Localization cannot be
  applied to a tool that is not here. Next action: owner to confirm
  whether this tool should be built as a new tool (with localization
  from day one under this standard) or whether its source lives in
  another session/project and should be recovered first. It is NOT
  claimed as built or localized in this delivery.

## Verification (2026-11-01)

- Unit: 294 tests pass, including 11 i18n tests (detection, fallback,
  pluralization, es/de number formatting and parsing, RTL markers,
  currency defaults, 100% dictionary coverage, calculation consistency
  across locales — pay in cents identical, only formatting differs).
- Browser (real Chromium via Playwright, local production build):
  17/17 i18n checks pass — dropdown with native names, Spanish switch
  preserves example totals (41h 30m / $845), French import step,
  German comma decimal (8,50), Arabic `dir=rtl` + `lang=ar-EG`,
  saved Arabic choice persists across reload, import date format
  unchanged by a language switch, Spanish PDF accents preserved,
  Arabic PDF English fallback with disclosure, 390px mobile dropdown
  usable with no overflow, 0 console errors.
- Known limitation (documented, not hidden): the root `<html lang>`
  attribute starts as `en` and is corrected by the tools provider on
  mount; tool *content* language is server-rendered from the saved
  cookie, so there is no content-language flash for returning users.
  First-visit browser detection happens on the client after mount.
- Translations are initial translations written for this delivery;
  they have not been reviewed by native speakers. English fallback
  covers any key found missing in future edits.
