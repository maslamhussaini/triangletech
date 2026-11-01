# Landscaping Material Calculators — methodology, scope, and limits

Routes: `/tools/gravel-calculator`, `/tools/mulch-calculator`, `/tools/topsoil-calculator`.
Shared engine: `src/lib/tools/landscaping.ts`. Shared UI: `src/components/tools/landscaping-calculator.tsx`.
Localization: `src/lib/tools/landscaping-i18n.ts`, `src/lib/tools/landscaping-locales.ts`.

## Formulas (calculation contract)

- Rectangle area = length × width.
- Circle area = π × (diameter ÷ 2)².
- Direct area = the area the user enters.
- Base volume = area × depth.
- Ordering volume = base volume × loose-volume multiplier × (1 + extra% / 100).
- Weight = ordering volume × compatible bulk density (only when a density is supplied).
- Bag count = ceiling(ordering quantity ÷ capacity per bag), with a 1e-9
  tolerance so an exact boundary (e.g. exactly 15 bags) does not become 16.
- Bulk orders round up only when the user enables an order increment or
  minimum. A supplier minimum changes the purchased quantity and the cost;
  it never changes the displayed physical requirement.
- Full precision internally; rounding is display-only, except for the
  bag / supplier roundings above.

## Verified unit constants

1 ft = 0.3048 m · 1 yd³ = 27 ft³ · 1 yd³ = 0.764554857984 m³ ·
1 lb = 0.45359237 kg · 1 US short ton = 2,000 lb · 1 tonne = 1,000 kg.
"Tons" is always qualified as US short tons or metric tonnes.

## Hand-checkable cases (all covered by `landscaping.test.ts`)

- A. 10 ft × 12 ft × 3 in = 30 ft³ = 1.111… yd³; 2 ft³ bags, no extra: 15 bags.
- B. Same + 10% extra = 33 ft³; 2 ft³ bags: 17 bags, 34 ft³ purchased.
- C. 100 ft² at 3 in = 25 ft³ = 0.9259… yd³; at an explicitly entered
  density of 100 lb/ft³ (a test input, not a material fact):
  2,500 lb = 1.25 US short tons.
- D. 2 m × 3 m × 0.1 m = 0.6 m³ = 600 L; 50 L bags: 12 bags.
- E. 17 bags × $4.50 + $20 delivery, no tax = $96.50.
- F. Required bulk 1.1 yd³, minimum 2 yd³: requirement stays 1.1 yd³,
  purchased is 2 yd³.

## Density — what is and is not claimed

No universal density preset is shipped. Gravel and topsoil weight fields
are blank by default with an "ask your supplier" placeholder, because
density varies by product, moisture, and supplier. Bag sizes shown as
quick options (e.g. 2 ft³ mulch bags) are labelled as examples only, not
universal packaging. No "one yard equals X tons" conversion is presented
anywhere. If a future preset is added, it must cite a dated, product-
specific source and remain editable.

## Mulch depth guidance — source

The only depth guidance given is: suitable depth depends on material and
use; university extension guidance commonly cites 2–3 inches for most
garden beds. Source checked 2026-11-01: Mississippi State University
Extension Service, "Use mulch for beauty and weed, temperature control"
(published 2022-01-14, updated 2025-08-08), which states a 2–3 inch layer
is sufficient for most applications and warns against piling mulch
against trunks ("do not go up, go out"). No universal depth is prescribed
by the calculator, and no gravel compaction assumption is applied to mulch.

## What the estimate includes / excludes

Includes: area × depth volume, user extra allowance, loose-volume
multiplier, bag rounding, supplier increment/minimum, delivery, and tax
only as configured (including whether delivery is taxable).
Excludes: supplier price verification, product quality, site suitability,
structural design (driveway, foundation, drainage), and any claim that
raised-bed growing mix and topsoil are interchangeable.

## Cost and exports

Prices are user-entered only; with no price entered, quantities are shown
with no fabricated cost. Cost uses the purchased quantity, never the
unrounded requirement. PDF uses the existing dependency-free
`simple-pdf.ts` writer (Helvetica, Latin script only) — see the PDF
limitation below. CSV uses `buildCsv` with formula-injection protection:
cells starting with `=`, `+`, `-`, `@`, tab, or CR are prefixed with `'`.
Print uses the browser's print function. Copy-results reports success or
failure visibly. No project details or export contents are logged.

## PDF script limitation (disclosed, not hidden)

The built-in PDF font supports Latin script only. For Arabic, Urdu,
Hindi, Simplified Chinese, and Japanese, the on-screen tool is fully
translated, but the PDF download is rendered in English and carries an
on-screen notice plus a note inside the PDF; the browser Print path
renders the selected language with system fonts. This is a known
limitation, not full PDF support for those scripts.

## Privacy and storage

All calculations run in the browser. No login, backend, or paid API is
used for core calculations. "Remember on this device" stores the project
in that browser's localStorage only, under
`triangletech-landscaping-<material>`; language choice is stored under
`triangletech-locale` (localStorage + cookie) so it persists across tools
and visits. Saved data can be deleted from the tool. Corrupt saved data
is ignored, never deleted silently.

## QA noindex

`next.config.ts` adds `X-Robots-Tag: noindex, nofollow` only when
`QA_NOINDEX=1` is set in the deployment environment. It is off by
default, so the live main website is never noindexed by this code path.
Verify on QA by checking the response header, not by assuming it.

## Localization inventory

See `docs/tools-localization-inventory.md`. Landscaping tools: complete
in all 10 languages for the landscaping workflow (keys measured by
`landscaping-i18n.test.ts`). Time Card / Work Hours / Hours-to-Decimal:
the landscaping dictionaries do NOT cover them; a separate, in-progress
time-card dictionary exists uncommitted in another worktree and is not
part of this branch. Never mark those tools "complete" for localization
until their keys are measured complete in all 10 languages.

## Deferred enhancements (backlog, not silently dropped)

- Embedded-font PDF (e.g. Noto) for Arabic/Urdu/Devanagari/CJK so PDF
  exports match the on-screen language instead of falling back to English.
- Time Card / Work Hours / Hours-to-Decimal migration onto the shared
  localization infrastructure, with measured coverage per tool.
- Server-side language from the `triangletech-locale` cookie to remove
  the client-side detection step on first paint (current behaviour:
  English first render, then the saved/browser language — no hydration
  mismatch, but a brief first-paint language change is possible).
- Supplier density presets only with dated, product-specific sources.
