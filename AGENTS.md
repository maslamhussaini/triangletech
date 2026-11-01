# AGENTS.md — triangletech.co website

## Stack
Next.js 16 App Router under `src/`, React 19, TypeScript 5 (strict), Tailwind CSS 3.4.
Scripts: `dev` / `build` / `start` / `lint`. Tests: Vitest (Phase 1+).

## Rules for agents
- `src/lib/site.ts` is the content source of truth (business info, navigation, copy).
  Never hardcode contact details or prices in components.
- `src/app/theme-indigo.css` is ADDITIVE ONLY: new styles via opt-in class names
  (see `docs/design-tokens.md`). Never restyle existing components without
  regression checks on existing pages.
- Every page uses `pageMetadata()` from `src/lib/site.ts`. Add new public URLs to
  `src/app/sitemap.ts` explicitly — sub-routes are not auto-included.
- API routes must follow these security principles (`src/app/api/chat/route.ts`
  is a reference implementation, not a mandatory template):
  appropriate server runtime; schema/input validation; authentication and
  authorization where applicable; abuse prevention and rate limiting where
  applicable; server-only secret handling; privacy-safe logging; clear error
  handling; explicit testing.
- Never commit secrets. This repository is public.
- Never claim a US office, US address, US phone number, testimonials, rankings,
  or client results. TriangleTech is Pakistan-based and serves US clients remotely.
- US-facing pages use American English. Schema: `Organization` (+ `Service` with
  `areaServed: "United States"` where valid). No `LocalBusiness` schema.
- Branch and deployment boundaries:
  - Authorized local development happens on feature branches
    (e.g. `feature/usa-growth-phase1`).
  - Commits and pushes to a dedicated review branch
    (e.g. `review/usa-growth-governance-drafts`) require explicit owner
    approval for that specific push.
  - Never push to `main`. Never merge without owner approval.
  - External side effects — deployments, emails, prospect outreach, paid
    services — require their own explicit authorization. A code or document
    approval is not a deployment approval.
- No force-pushes.
- MOAT STANDARD (permanent project rule, owner requirement 2026-11-02):
  "Every new tool or significant feature proposal must include demand evidence, competitor alternatives, differentiation, copyability, retention, distribution, economics, and an explicit moat verdict. Hypotheses must not be presented as proven advantages."
  See `MOAT.md` (audit 2026-11-02) and `docs/moat-research-2026-11-02.md`.
- MULTILINGUAL STANDARD (permanent project rule, owner requirement 2026-11-01):
  "All current and future tools must support multiple languages through
  shared localization infrastructure, a manual language dropdown, automatic
  initial language selection, persistent user preference, and RTL where applicable."
  Implementation: `src/lib/i18n/` (locales, dictionaries, provider),
  `src/app/tools/layout.tsx` (shared dropdown), `src/components/i18n/`.
  Languages: English, Spanish, French, German, Portuguese, Arabic, Urdu,
  Hindi, Simplified Chinese, Japanese. Language is a saved preference
  (cookie + localStorage), NOT a URL segment: each tool keeps one canonical
  URL and no locale pages are indexed. Automatic selection priority:
  saved choice > supported browser language (exact, then base language;
  a region subtag is country information already present in the browser)
  > English. No GPS, no paid geolocation API. Calculations stay
  independent of translated text. Language switches must preserve entered
  data and must never silently change currency, units, dates, or results;
  currency defaults apply only to a fresh empty form. PDF exports use
  WinAnsi Latin-1 for Latin-script languages; for Arabic, Urdu, Hindi,
  Chinese, and Japanese the PDF falls back to English with an explicit
  disclosure line (the built-in Helvetica font cannot shape those
  scripts) — never broken glyphs, never a claim of full PDF support.
  Print renders the fully translated page via the browser. Never mark
  an untranslated tool complete: see `docs/tools-localization-inventory.md`.
- PREMIUM OUTPUT STANDARD (permanent project rule, owner requirement 2026-11-01;
  header rule corrected 2026-11-02: the header carries the USER's company
  branding, never TriangleTech):
  Every visual output of every current and future tool must carry
  branding, implemented by the shared renderer in
  `src/lib/tools/premium-pdf.ts` (pdf-lib, dynamic-imported so it stays
  out of the initial page bundle):
  - Footer (platform attribution, unchanged): the existing
    `public/triangletech-logo.png` asset only, used unaltered and in
    proportion (never redrawn or replaced). Brand spelling is always
    "TriangleTech"; the footer uses "TriangleTech™" (never ® without
    verified registration) and the website address triangletech.co,
    with a clickable link annotation to https://triangletech.co/
    wherever the format supports links. Footer lockup:
    "Created with TriangleTech™ · triangletech.co" (the "Created with"
    wording is translated; the brand name and URL are never
    translated). "Page X of Y" is translated through the shared i18n
    system (`common.pageOf`).
  - Header (user company branding, owner correction 2026-11-02): the
    Indigo (#4F46E5) to violet (#7C5CFF) gradient band carries the
    user's company name and/or uploaded company logo, plus the
    report/tool title, period/project/document reference, and an
    accent rule separating header from content. Reusable "Report
    branding" fields (Company name, Logo upload, Remove logo, Preview)
    sit above each tool's export controls. The company name is
    rendered as text, never as HTML; logo proportions are preserved;
    only PNG/JPEG up to 2 MB are accepted, with a visible error
    otherwise. Name-only or logo-only input is shown cleanly; with
    neither, the header shows the report title alone — TriangleTech
    is NEVER substituted into the header. A compact company-branded
    header (logo + `name · title`, or title alone) repeats on
    continuation pages. Logos are processed locally in the browser;
    branding is saved on the device only when the user ticks the
    opt-in, and can be cleared. The same branding applies to PDF and
    browser Print, without changing calculations or CSV schemas.
    Header text auto-fits (size steps, then wrapping with ellipsis)
    so long company names never clip; table headings use hyphen-aware
    wrapping and shrink 10 → 9 → 8.5 pt so long localized words
    (e.g. German compounds) never shatter into isolated fragments.
    Deep Indigo #312E81, light background #EEF0FF, dark text #1B1B4B,
    white #FFFFFF. Footer on every page: logo tile + lockup + link +
    "Page X of Y" + an optional short disclaimer, with adequate bottom
    margin. Table headings repeat across pages; no overlap, clipped
    rows, orphan headings, or excessive empty space.
  - Tables: deep-Indigo header row, predominantly white/light rows
    (subtle alternating fill, print-friendly), right-aligned numeric
    columns, distinct subtotal and final-total treatments, clear unit
    and currency labels. Hide empty optional fields and form-only
    labels (such as "(optional)") from finished reports. Keep all
    calculation details needed to understand the result.
  - CSV and other machine-readable exports keep a valid, importable
    schema: never append decorative/branding rows to the data. The
    branded PDF report is the companion for branding.
  - Report labels and footer wording go through the shared i18n
    system; the brand name and URL stay fixed. PDF text is native
    (selectable/searchable, vector tables, never a rasterized page).
    Non-Latin PDF support is never claimed until shaping and glyph
    rendering are actually verified (current state: English fallback
    with an explicit disclosure, per the multilingual rule above).
  - Export QA is visual: render and inspect a short report, a
    multipage report, a biweekly report, a long landscaping report,
    Spanish/German output, and the Arabic/Urdu fallback, on Letter and
    A4. Never mark export QA PASS from a PDF signature or a successful
    download alone.
- The proposed estimator module location is `src/lib/tools/website-estimator.ts`.
  It does not exist yet; do not create it in documentation slices.
  `RULES_VERSION = "1.1.0"` is the approved planning specification version,
  not evidence of an implementation. Future estimate results must carry it;
  identical normalized inputs must produce identical outputs.

## Commercial — provisional (owner approval required before public publication)
Proposed starting prices:
- Starter Website: $899
- Growth SEO: $1,999
- AI Visibility: $3,799
Care plans (Essential $79 / Growth $149 / AI Visibility Optimization $299):
optional only, separately consented to, never automatically selected, and never
assumed to compensate for unprofitable builds.
