# Tools localization inventory

Permanent project rule (AGENTS.md, owner requirement 2026-11-01):

> All current and future tools must support multiple languages through
> shared localization infrastructure, a manual language dropdown, automatic
> initial language selection, persistent user preference, and RTL where applicable.

## Infrastructure — ONE shared system (unified 2026-11-01)

The two batches previously shipped two competing systems (time-card
`src/lib/i18n/` and landscaping `src/lib/tools/landscaping-i18n.ts` +
`landscaping-locales.ts`). The landscaping system is deleted. All six
tools now use the single shared system:

- `src/lib/i18n/locales.ts` — supported locales, native names, direction,
  detection priority (saved choice > supported browser language >
  English), locale number/date/money formatting, localized number
  parsing (decimal/grouping separators, Arabic-Indic / Eastern Arabic /
  Devanagari digits), fresh-form-only currency defaults.
  Country fallback: the only country information used is the region
  subtag already present in the browser language (e.g. `es-MX` →
  Spanish, MXN default on a fresh empty form). No GPS, no paid
  geolocation API, and no separate country detection exists — do not
  claim otherwise.
- `src/lib/i18n/dictionaries.ts` — shared dictionaries for all six
  tools; English is the fallback for any missing key (a missing
  translation never renders a key name). Key prefixes: `tc.` (time
  card), `htd.` (hours-to-decimal), `wh.` (work hours), `ls.` +
  `mat.` (landscaping), plus shared `common.` keys.
- `src/lib/i18n/provider.tsx` — LanguageProvider + `useLanguage()` hook
  (`t`, `formatNumber`, `formatDate`, `formatMoney`, `parseNumber`).
  The provider sets `html lang`/`dir` (RTL for ar/ur).
- `src/app/tools/layout.tsx` — shared tools layout with the one
  language dropdown (native `<select>`, keyboard accessible, mobile
  friendly, names in native scripts). Initial locale comes from the
  saved cookie, so returning users are server-rendered in their
  language with no flash. Individual tools no longer render their own
  dropdown; the landscaping component's former dropdown was removed
  in the unification commit.
- `src/components/i18n/language-selector.tsx` — the dropdown itself.
- URL strategy: unchanged. Each tool keeps ONE canonical URL; language
  is a preference, not a locale path segment. No thin indexed pages are
  generated for translations. QA noindex stays environment-specific
  (`QA_NOINDEX=1` at build time adds `X-Robots-Tag: noindex, nofollow`;
  it is off by default and is never applied to the live main site by code).

## Coverage — complete for all six tools (integrated branch, verified)

Dictionary coverage is asserted by
`src/lib/i18n/unified-coverage.test.ts` (0 missing keys vs English in
every locale, for every tool prefix): **363 keys, 10 languages, 0
missing in any locale** (276 at integration, +87 across the PDF /
localization quality pass and the premium output standard: report and
invoice labels, landscaping diagram words, page-level FAQ / related /
disclaimer copy, premium footer wording, invoice table headings,
landscaping scenario / tax-amount labels).

| Tool | Route | Localization status |
| --- | --- | --- |
| Work Hours & Time Card Calculator | `/tools/time-card-calculator` | **Complete** — workflow, labels, help, validation, results, import wizard, export controls, privacy, invoice, save, FAQ, related tools; RTL for ar/ur; locale numbers/dates/money; data preserved on switch; import date format independent of language. Midnight break-allocation warning translated (`tc.warnBreakAllocationOvertime`). |
| Hours to Decimal Converter | `/tools/hours-to-decimal` | **Complete** — same infrastructure; locale decimal separator in results and conversion table. |
| Work Hours Calculator | `/tools/work-hours-calculator` | **Complete** — same infrastructure; translated validation, overnight split dates localized. |
| Gravel Calculator | `/tools/gravel-calculator` | **Complete** — workflow, areas, assumptions, results, bagged/bulk costs, save/restore, PDF/CSV/print; RTL for ar/ur; language switch preserves entries, units, currency and results. Page-level sections (FAQ, related tools, footer disclaimer) are server-translated since the 2026-11-01 quality pass — they were English-only at integration and are no longer an exception. |
| Mulch Calculator | `/tools/mulch-calculator` | **Complete** — same as gravel, plus bag-size example chips and the 2–3 inch depth guidance; page-level sections server-translated since the 2026-11-01 quality pass. |
| Topsoil Calculator | `/tools/topsoil-calculator` | **Complete** — same as gravel, plus raised-bed fill mode with its "not interchangeable" note; page-level sections server-translated since the 2026-11-01 quality pass. |

## Premium output standard (2026-11-01, mandatory for all current and future tools)

All six tools export through the shared branded renderer
`src/lib/tools/premium-pdf.ts` (pdf-lib, dynamic-imported so it stays
out of the initial page bundle): official `public/triangletech-logo.png`
used unaltered and in proportion, Indigo (#4F46E5) to violet (#7C5CFF)
gradient header band, "Created with TriangleTech™ · triangletech.co"
footer lockup with a clickable link annotation to
https://triangletech.co/ and "Page X of Y" on every page, repeating
table headings, alternating rows, right-aligned numeric columns, and
distinct subtotal / final-total treatments. Report labels and footer
wording are translated; the brand name and URL never are. Form-only
labels (such as "(optional)") never appear in finished reports, and
empty optional fields are hidden. CSV exports keep their importable
schema untouched; the branded PDF is their companion. Time Card PDF:
chronological sessions, daily totals, biweekly workweek totals,
overtime settings, rates, regular / overtime / gross pay (parts sum
exactly). Landscaping PDF: project / area table, assumptions,
required-vs-purchased quantities, bag / bulk scenarios with delivery
and tax breakdown, shopping list. Companion converters: compact
branded result sheets with inputs, units, result and formula.

## PDF / print support — disclosed limitation (unchanged by unification, renderer changed)

The renderer changed from the dependency-free writer to pdf-lib in the
2026-11-01 premium pass; the font limitation is unchanged (built-in
Helvetica, WinAnsi Latin-1). Additionally, every string is sanitized
before rendering (`sanitizePdfText`): bidi controls are stripped, a few
symbols are mapped to ASCII (→ becomes ->), and characters outside
Windows-1252 become "?". This exists because an RTL locale formatter
can inject a U+200F mark into clock/money strings, which previously
aborted the Arabic PDF download entirely; the callers also format
clocks and money in ASCII for the non-Latin fallback, so "?" should
never appear in a shipped fallback report.

- Latin-script languages (en, es, fr, de, pt): PDF exports are fully
  translated; the writer uses WinAnsi Latin-1 so accents survive
  (verified: Spanish PDF contains accented characters, not `?`).
- Arabic, Urdu, Hindi, Simplified Chinese, Japanese: the built-in
  Helvetica PDF font cannot shape these scripts. The PDF therefore
  falls back to English **with an explicit disclosure line** (verified:
  Arabic PDF contains the English disclosure). Browser Print renders
  the fully translated page correctly via system fonts, so a fully
  translated copy is always available via Print.
  This is a disclosed limitation, not full PDF support for those scripts.
- Why no embedded font was added: true support needs more than a font
  file. Arabic and Urdu need joining-form shaping and Hindi needs
  conjunct shaping, which the dependency-free PDF writer does not do;
  an embedded font without shaping would render those scripts
  incorrectly, which is worse than the honest English fallback. CJK
  glyphs alone would still need font subsetting and a ToUnicode map.
  No font library or font asset exists in this repo, and no new
  dependency was added for this integration. Revisit only with a
  shaping-capable PDF library and reviewed fonts.

## Midnight break allocation — documented assumption

- Overnight sessions are split at midnight; unpaid break minutes are
  allocated across the midnight segments in proportion to each
  segment's length (integer minutes, remainder to the earliest
  segments), shown per segment. This is an assumption about where the
  break was taken, not a measurement.
- When that split crosses a workweek boundary it can change weekly
  overtime. The engine then emits a `break-allocation-overtime`
  warning, shown above the results in the time-card tool, and the exact
  route is to split the shift at midnight into two sessions with each
  part's actual break minutes (there is no per-segment break input).
  See `src/lib/tools/time-card.ts` header and the time-card test
  "break allocation across a workweek boundary".

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

## Verification — 2026-11-01 PDF / localization quality pass + premium standard

- Screenshot scenario (30 total hours, 20 regular, 10 overtime, $315
  gross): the screenshot's actual inputs were never recorded anywhere
  searchable (memory, daily notes, QA evidence, side chats) and are
  documented as **unknown**, not reconstructed. Reproducible
  equivalent, unit-tested in `src/lib/tools/timesheet-report.test.ts`:
  Mon–Fri 2026-11-02…06, 09:00–15:00 (30h), threshold 20, rate $9,
  multiplier 1.5 → 20h regular / 10h overtime / $315.00 gross. Control:
  the same 30h at the default threshold 40 → 30h regular / 0 overtime /
  $270 gross; the configurable threshold behavior was NOT changed to
  match the screenshot.
- Browser QA (local production build, real Chromium, CDP harness
  `~/workspace/qa-evidence/premium-qa/cdp-premium.mjs`): 10/10 pass, 0
  console errors — EN short + biweekly time-card PDFs, ES time-card
  PDF, AR fallback PDF, EN gravel PDF, ES gravel FAQ translation
  (Spanish question present, English question absent), DE mulch PDF,
  EN hours-to-decimal + work-hours result sheets.
- Visual PDF inspection (rendered with pdftoppm, not signature-only):
  short EN, biweekly p2, ES, AR fallback, gravel EN (long project
  name), mulch DE, both companions, 45-row multipage (repeated
  headings, Page 2 of 2), A4 (595.28 × 841.89 pt), and a grayscale
  render (contrast readable). Defects found and fixed in this pass:
  cost-table header overlap (headers now wrap with dynamic height),
  missing emphasis band (pdf-lib SVG paths use top-left coordinates;
  bands now use drawRectangle), Arabic PDF crash on U+200F (sanitizer
  + ASCII clocks/money in the fallback), no-price note inflating a
  narrow money column (moved to Notes, "—" in the table).
- Link annotation: verified at object level in
  `src/lib/tools/premium-pdf.test.ts` (Link annotation, URI
  https://triangletech.co/, Rect over the domain text). A viewer click
  on the footer link was NOT TESTED.
- Full suite at this pass: 331 tests, typecheck clean, lint 0 errors.

## Verification (integrated branch — actual counts, not summed batches)

- Unit: see the final integration report for the actual integrated
  test count (the earlier 294 and 307 suites overlap and came from
  different trees; they must not be added together).
- Browser QA is recorded in the final integration report, per tool,
  with PASS / FAIL / NOT RUN kept separate.
- Translations are initial translations written for these deliveries;
  they have not been reviewed by native speakers. English fallback
  covers any key found missing in future edits.

## Phase 2 — combined integration (2026-11-02): dropdown fix + premium PDFs + user company branding

- Dictionary: 378 keys, 0 missing in all 10 locales (coverage test
  enforces this). New keys: `common.pageOf` ("Page {page} of {total}",
  translated in all 10 locales, incl. de "Seite {page} von {total}",
  es/pt "Página {page} de {total}", fr "Page {page} sur {total}",
  ar/ur/hi/zh/ja translated forms) and `rb.*` (14 Report branding
  keys: title, companyName, companyNamePlaceholder, logoLabel,
  chooseLogo, removeLogo, preview, saveOnDevice, sessionNote,
  clearSaved, invalidType, tooLarge, unreadable, latinPdfNote).
  Translations are in-session authored, NOT native-reviewed (same
  caveat as all other keys).
- Landscaping units fix: the PDF area cell, plain-text export lines,
  and the area/depth table headers now use the user-selected unit
  (`ft²`/`m²`, `in`/`cm`) instead of a hardcoded `m²` area label.
  Previously an imperial session rendered "11,15 m²" beside a
  "3,00 in" depth. CSV schemas unchanged.
- German heading fragmentation fixed in the shared renderer:
  hyphen-aware segmentation (hyphen stays on the preceding segment),
  header font shrink 10 → 9 → 8.5 pt, no hard-split stranding a
  1-character fragment. Verified: "Material-Zwischensumme" renders as
  "Material-" / "Zwischensumme", never "Material-Zwi / schensumm / e".
- Summary emphasis bands: geometry fixed so the band spans the full
  wrapped content with consistent padding (previously the band top
  cut through the first line's glyphs). Short pay summaries are kept
  together on one page when they fit a fresh page.
- Non-Latin PDF limitation RETAINED: ar/ur/hi/zh/ja PDFs still fall
  back to English with the explicit disclosure line, including for
  company names (a non-Latin company name sanitizes to "?" in the
  PDF header; the `rb.latinPdfNote` hint says so, and browser Print
  renders the name fully). SVG/WebP logos are rejected by design
  (PNG/JPEG only).
- Full suite at this pass: 344 tests, typecheck clean, lint 0 errors.
  Browser QA (raw CDP, local prod build): 23/23 checks pass, 0 console
  errors — dropdown white controls + SVG chevrons, units relabeling,
  branded header/footer in all four branding states (name+logo,
  name-only, logo-only, neither), long names, invalid SVG rejection,
  biweekly multipage with branded continuation header, DE headings /
  units / page text, ES page text, AR RTL + English fallback, Print
  header parity, footer link annotation (exactly 1 /Link annot, URI
  https://triangletech.co/, rect [196.4, 42, 255.1, 54] in the footer
  zone of a 612×792 page). Footer-link click in a real PDF viewer:
  NOT TESTED — this Chromium build's viewer loads its UI but never
  paints pages (verified visually headless and under Xvfb), so no
  click coordinate exists; the annotation itself is verified exactly.

## Phase 3 — direct-hours entry mode for Time Card (2026-11-02)

- Dictionary: 437 merged keys, 0 missing in all 10 locales (coverage test
  enforces this). New in this delivery: 19 main keys + 11 error/warning
  keys, translated in all 10 locales (in-session authored, NOT
  native-reviewed, same caveat as all other keys). Main keys:
  `tc.entryMode`, `tc.modeTimes`, `tc.modeHours`, `tc.paidHoursWorked`,
  `tc.paidHoursHint` (decimals are fractions of an hour: 7.30 = 7h 18m),
  `tc.addHoursEntry`, `tc.switchModeWarning`, `tc.switchDiscard`,
  `tc.switchKeep`, `tc.mapPaidHours`, `tc.mapModesNote`,
  `tc.importConflictTitle`, `tc.importConflictNote`, `tc.importUseHours`,
  `tc.importUseTimes`, `tc.importApplyAllHours`, `tc.importApplyAllTimes`,
  `tc.previewConflicts`, `tc.howHoursOnly`. Error/warning keys:
  `tc.err.hours-incomplete`, `tc.err.hours-malformed`,
  `tc.err.hours-non-positive`, `tc.err.hours-over-24h`,
  `tc.err.day-over-24h`, `tc.err.mixed-mode-day`,
  `tc.err.import-paid-hours-malformed`,
  `tc.err.import-paid-hours-out-of-range`, `tc.err.import-no-entry`,
  `tc.warn.import-conflict`, `tc.warn.import-mixed-mode-day`.
- Non-Latin PDF limitation RETAINED (unchanged): ar/ur/hi/zh/ja PDF
  reports render in English via the existing fallback, including the
  new "Hours only" / "Start / End times" mode labels; browser Print
  renders the fully translated page. CSV headers stay English (as
  before) so files stay importable under the header synonyms; the
  mode value "Hours only" in CSV matches that convention.
- Saved-data rule: only canonical integer paidMinutes is persisted
  for hours-only rows (transient edit text is never saved), so a
  locale switch can never reinterpret saved hours. Older saves
  without `mode`/`paidMinutes` still load as start/end rows.
