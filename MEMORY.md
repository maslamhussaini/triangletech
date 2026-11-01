# MEMORY.md — triangletech.co (USA Growth project)

## Current phase
Phase 1 planning gate P1-G0 completed and independently reviewed by ChatGPT
(conditionally approved). The technical blueprint was published to the
governance review branch at commit `91e718b1c565d0aa011bc985ac724809f8f51aff`.
The approved governance content from `d5877c3a` was integrated locally into
`feature/usa-growth-phase1` during P1.1, which the owner explicitly authorized.
P1.1 verification passed: `git diff --check` clean; `npm run lint` 0 errors
(5 pre-existing `no-img-element` warnings); `npx tsc --noEmit` clean;
`npm run build` passed (40/40 pages). P1.2 (owner-authorized) then added the
Vitest foundation: `vitest` 3.2.7 devDependency, `test: vitest run` script,
`vitest.config.ts` (Node environment, `@/*` alias), and 10 passing tests for
the existing cost/profit calculator, including a verified negative control;
lint, TypeScript, and build re-verified clean afterwards. P1.3
(owner-authorized) added baseline security headers and a report-only CSP in
`next.config.ts` (HSTS deliberately left to Vercel), with 6 configuration
tests (16 total passing) and live header probes against the local
production build verified on representative routes. P1.4
(owner-authorized) added prop-driven landing primitives under
`src/components/us/` (LandingSection, PremiumCTA, PricingCard/PricingGrid,
TrustSignal, FAQItem) with typed data contracts and pure helpers in
`src/lib/us/landing.ts` — no business content or pricing is hardcoded —
plus one appended, opt-in CSS block in `theme-indigo.css`. 26 tests pass;
SSR output was verified through a temporary local harness page that was
removed before commit. P1.5 (owner-authorized) assembled the landing page
at `/websites-for-us-small-business/` (hero, problems, services explained,
packages, process, trust signals, FAQ, final CTA) from typed data in
`src/lib/us/landing-data.ts`. Pricing-publication safety: plans are
label-priced "Request a Quote" via the new `priceLabel`/`priceDisplayText`
contract — no numeric prices appear in rendered output (verified);
provisional Blueprint v3 figures live only in
`src/lib/us/pricing-review.ts`, which nothing imports, pending the owner's
publication approval. 36 tests pass. P1.6 (owner-authorized) completed
browser-based responsive and accessibility QA of the page at six viewport
widths (evidence in the gitignored `qa-evidence/p1.6/`): no overflow, clean
console after fixes, logical headings/focus order, FAQ keyboard-verified.
Two fixes shipped: the layout's icon metadata pointed at the generated
`/icon` route (was `/favicon.png`, a site-wide 404), and landing FAQ
answers were raised from 2.99:1 to 7.07:1 contrast with a landing-scoped
override (the same legacy color on the existing /faq page was flagged,
not changed). P1.7 (owner-authorized) added the landing page to the
sitemap; generated Service + FAQPage + BreadcrumbList JSON-LD from the
page's own data (no prices/offers/ratings/address; provider references
the global Organization @id; areaServed United States); and built a
consent-first GA4 architecture — nothing loads before an explicit opt-in,
no banner exists unless a valid `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is
configured (none is; no ID has been fabricated), consent can be changed
or withdrawn via a persistent "Privacy choices" control, and the privacy
policy's cookies section now describes this accurately (owner legal
review and the policy's effective-date decision remain open). The
report-only CSP names the exact GA4 hosts individually. 51 tests pass;
the full consent flow was browser-verified locally with a synthetic,
never-committed test ID and stubbed Google endpoints. P1.8
(owner-authorized) implemented secure email-only lead capture: a
consultation form on the landing page (every consultation CTA now anchors
to `#consultation`) posting to a new `POST /api/leads` route guarded by a
shared strict zod schema (`src/lib/leads/schema.ts`), honeypot and
3-second time-trap silent drops, per-IP best-effort in-memory rate
limiting (5 per 15 minutes — best-effort only, NOT a distributed
guarantee), a 16 KB body cap, content-type enforcement, and an env kill
switch (`LEADS_DISABLED`). Delivery sits behind a `LeadStore` interface:
a Resend HTTPS adapter (no SDK; `RESEND_API_KEY` server-only; recipient
hello@triangletech.co, sender notifications@triangletech.co, validated
customer Reply-To, submission reference as the provider idempotency key)
plus a mock adapter for local verification that is structurally
unavailable when `VERCEL_ENV=production`. With no API key configured,
delivery fails safely as not-configured — the form never shows a false
success (browser-verified), preserves the visitor's entries, and offers
the site email as fallback. The privacy policy now describes inquiry
data, delivery via Resend, and retention without fixed periods; its
effective date still awaits the owner's legal decision. 100 tests pass;
the complete flow was browser-verified locally against the mock adapter
(success, validation, delivery failure, keyboard order, 390px layout).
NO real email has been sent: no API key exists, and Resend domain
verification (SPF/DKIM) plus a live delivery test remain owner-side
production prerequisites. P1.9 (owner-authorized) added the deterministic
website project estimator: a pure rules engine at
`src/lib/tools/website-estimator.ts` (RULES_VERSION 1.1.0) and a
three-step wizard section (`#estimator`) on the landing page. Per the
owner's P1.9 directive the estimator is QUALITATIVE — it recommends a
package by name, lists the inclusion-matrix checklist, classifies
complexity and states assumptions, and never computes or exposes a
price: the v3 monetary elements (indicative dollar estimate, adders,
rush multiplier) were deliberately NOT implemented, `pricing-review.ts`
remains unimported, and tests assert zero numeric pricing across the
input space. Structural v3 rules hold: tier comes from the visibility
answers only (pages never change the tier), no double-counting of
included capabilities, custom-scope short-circuits (20+ pages → scoped
individually; online store → Shopify conversation; CRM integration →
technical review), no care plan is ever added. Every result ends with
the not-a-binding-quote disclaimer and a CTA to `#consultation`; no
estimator data enters the lead form or the lead API (the P1.8 strict
schema still rejects such fields — regression-tested). 140 tests pass;
the wizard was browser-verified locally (desktop 1440 + mobile 390:
step validation, tiered + custom results, edit-and-rerun determinism,
CTA navigation to the form, radio keyboard behavior, zero console
errors, zero prices in whole-page visible text or built chunks). The
country-aware contact block remains a future slice. Governance
documents are NOT merged into `main`; no push or production deployment
has been authorized.

## Verified completed work (confirmed by direct evidence)
- Repo `maslamhussaini/triangletech`, `main` @ `40cbce8f09cb9a2f358b28f3f3322183b3c04a12`
  (2026-10-05) — unchanged at the time of publication (verified via GitHub API
  before and after the review-branch push).
- GitHub OAuth reconnected as `maslamhussaini`; write access functionally
  verified via successful remote branch creation.
- Remote review branch `review/usa-growth-governance-drafts` created from
  `40cbce8f`. Commit `03621d62866aff0c7fbbb6b5840e7cde55c6b44f` added exactly
  four documentation files (AGENTS.md, CLAUDE.md, MEMORY.md,
  docs/design-tokens.md); remote contents match the validated drafts
  byte-for-byte; no pull requests exist on the branch.
- Vercel: the documentation push triggered Preview deployments in both
  connected projects (`triangletech`, `triangletechco`) at `03621d62`;
  Production deployments unchanged (still `40cbce8f`, 2026-10-05). Preview
  behavior confirmed via the GitHub Deployments API, not dashboard inspection.
- Local branch `feature/usa-growth-phase1` exists in the development workspace
  — separate from the remote review branch. P1.1 added two local governance
  commits on it (integration + this checkpoint); it has never been pushed.
- Baseline checks: `npm ci` clean (lockfile v3, 430 packages, 0 lifecycle
  scripts); `npm run lint` 0 errors (5 pre-existing `no-img-element` warnings);
  `npx tsc --noEmit` clean; `npm run build` passes (40/40 pages); secrets scan
  of tree and full history clean.
- Gaps confirmed: no security headers, no cookie-consent banner, no test script.
- 2026-10-23: Free QR Code Generator built (owner brief titled "Tool #3") at
  `/tools/qr-code-generator`, local only on `feature/usa-growth-phase1`, NOT
  committed/pushed. Pure payload/validation/contrast logic in
  `src/lib/tools/qr-code.ts`; encoding via `qrcode` 1.5.4 (MIT) wrapped in
  `src/lib/tools/qr-generation.ts` (dev-only decode deps jsqr/pngjs). Six types
  (URL, text, Wi-Fi with escaped payloads + open/hidden, email, phone, vCard
  3.0 escaped), PNG 512/1024/2048 + SVG downloads, EC L/M/Q/H, 4-module quiet
  zone, contrast safeguard (inverted or <3:1 blocked, 3–4.5:1 warned), exact
  payload printed in UI, static-code explanation, hidden future ad region,
  registry entry (Image & Media, `qr` icon) + sitemap entry. Verified:
  266/266 tests (37 new QR: 32 payload/generation + 5 jsQR independent-decode),
  tsc clean, lint 0 errors / 5 pre-existing warnings, build 46/46 (route
  static), git diff --check clean, local prod HTTP 200 with unique
  title/canonical. Real-browser QA (Chromium CDP rig,
  `qa-evidence/qr-generator/`): 17/17 PASS locally AND 17/17 on the hosted QA
  deployment, 0 console errors — live preview/download PNGs decoded with jsQR
  back to the exact URL, Wi-Fi and vCard payloads; validation, live update,
  colour+EC-H decode, contrast block, reset, desktop + 390px + 440px all
  PASS; Tab trail reaches every tool control; synthetic Enter activation
  NOT TESTED (CDP rig limitation; controls are native elements). Physical
  phone scanning NOT TESTED. Vercel Preview (owner-authorized, isolated
  project `triangletech-qr-qa`, prj_CdrLWxWZS4W1RNnOvrknhI6PTsZp, deployed
  from an isolated copy — repo never linked, no secrets uploaded): preview
  deployment dpl_7EHxDkNYEJRAxEZU8kbjckm4qX3W READY at
  https://triangletech-qr-134cofypo-aslams-projects-6ad7cbd6.vercel.app —
  target=preview, X-Robots-Tag: noindex verified (anonymous + authenticated
  200), Deployment Protection (Vercel Authentication) ON so the preview URL
  needs a Vercel sign-in. First deploy of the new project was auto-assigned
  as the QA project's own production target (platform behaviour; no --prod
  was run), so https://triangletech-qr-qa.vercel.app also serves the same
  build publicly as the QA alias — it carries no noindex. triangletech.co
  untouched (route 404 there, verified). Evidence:
  `qa-evidence/qr-generator/vercel-preview.md`.

## Decisions
- All Phase 1 implementation work happens on `feature/usa-growth-phase1`
  (from `40cbce8f`). Never develop on or push to `main`.
- Test runner: Vitest (Phase 1, needs separate dependency approval).
- Estimator module location is proposed as `src/lib/tools/website-estimator.ts`
  (not yet implemented); normative planning spec `RULES_VERSION = "1.1.0"`.
- Lead endpoint will be built behind a storage interface; Supabase NOT approved —
  email-only fallback until the database audit completes.
- Provisional commercial spec (Blueprint v3): Starter $899 · Growth SEO $1,999 ·
  AI Visibility $3,799; care plans opt-in only. Prices require owner approval
  before public publication.
- Vercel Git integration is ACTIVE: pushes to `main` auto-deploy to Production.
  Branch pushes create Preview deployments (observed, not dashboard-verified).

## Open blockers
- Vercel dashboard configuration review (Preview toggles, domain assignment) —
  still outstanding.
- Supabase database audit · Privacy/Terms legal text · US lead inbox
  (hello@triangletech.co decided in P1.8; mailbox creation/monitoring is
  owner-side) · Resend domain verification (SPF/DKIM for
  notifications@triangletech.co) and API key · Search Console access.
- `npm audit` blocked by environment registry policy (403) — recorded as
  UNVERIFIED, not passed.

P1.10 (owner-authorized) completed end-to-end QA against Blueprint v3
acceptance tests AT-1…AT-7 as adapted (email-only mode; qualitative
estimator): AT-1, AT-2, AT-3, AT-4 (drill), AT-5 and AT-7 PASS; AT-6
PARTIAL (headers/consent/keyboard verified; Lighthouse and axe
UNVERIFIED — no tooling in this environment). Integrated journeys pass:
estimator → result → consultation → mock-delivered success with exactly
one API call and zero network activity from the estimator itself;
analytics fully inert without a measurement ID. One defect found —
**D1: keyboard focus is not managed across estimator step/result
transitions or the form's success replacement (focus resets to the
document top)**; a fix slice or an owner waiver is required before UAT.
P1.10-D1 (owner-authorized) FIXED D1: the estimator now moves focus to
the incoming step/result heading on every view change (pure decision
table `focusTargetAfterViewChange` in `src/lib/us/landing.ts`; never on
initial mount, never when the view doesn't change; answers preserved);
the lead form focuses the confirmation heading on success (the success
panel's `role="status"` was removed so the confirmation is announced
once, via the focus move), returns focus to the submit button on
delivery failure (values preserved; the error still announces via
`role="alert"`), focuses the first invalid field in visual order on
validation rejection (`firstInvalidField` + `LEAD_FIELD_ORDER` in the
lead schema module), and returns focus to the first field after "Send
another inquiry". Verified by 11 new unit tests (151 total) and a
19-assertion real-browser suite (qa-evidence/p1.10-d1/) recording
`document.activeElement` after every transition, mouse and keyboard,
desktop 1440 and mobile 390, zero console errors. Note: the repo has no
DOM test environment (Node-only Vitest; no jsdom) — DOM focus behavior
is covered by the browser suite, decision logic by unit tests.
P1.11 COMPLETE (owner-authorized Preview UAT; full report: workspace
research `phase1-qa/p1.11-preview-uat-report.md`). Stage A: safe
Preview configuration documented (`phase1-qa/p1.11-safe-preview-
configuration.md`) — no Resend key or GA4 ID exists and the mock flag
is unset, so Preview lead submissions resolve to the honest-503 store
and no analytics can fire; this was later CONFIRMED empirically on the
hosted Preview (a valid form submission returned the honest
delivery-failure message; no success, no email). Stage B: the branch
was pushed via the GitHub connector's snapshot route (the git CLI has
no credentials by design): remote branch created at `40cbce8`, snapshot
commit `9f168266ca5ad88507c05451c0387018e08a60e5` carries the 43-file
delta, all verified byte-identical to local HEAD by blob SHA; the
remote history is snapshot commits, not the local commit history
(which remains local). Deployments: both projects' Previews ultimately
SUCCEEDED on the final tree (remote head `420dc273`, Stage F fix). The
first "triangletech" build failed inside Vercel's Turbopack Google
Fonts step (`Can't resolve '@vercel/turbopack-next/internal/font/
google/font'` in the Sora font module) — a platform flake, proven by
three successful builds of the identical tree (the other project, an
owner redeploy, and the retry commit); noted for P1.12 monitoring, not
a code defect. Both projects' Preview deployments sit behind Vercel
Authentication (SSO) — verified by redirect; the Preview is not
public. Hosted UAT (Stage C) passed every observable check: page,
title and H1 correct on both projects' aliases; zero pricing strings;
sitemap lists the landing URL exactly once; robots as expected;
estimator recommends Growth SEO for the canonical inputs and Edit
preserves all answers; empty form shows 6 field errors; valid form
shows the honest failure (above). Checks the hosted toolset could not
observe (meta description, canonical, JSON-LD, response headers,
exact focus targets, viewport measurements, direct POST status) stand
on identical-build local evidence and are recorded as hosted-
UNVERIFIED in the report. Stage D: axe-core (local, final tree) —
zero critical violations in all states; the Stage F fix below removed
all 25 color-contrast nodes; the only remaining axe findings are
three pre-existing site-chrome items shared with the homepage
(footer-social aria-label, logo-link accessible name, WhatsApp
landmark) — owner decision, not Phase 1 regressions. Lighthouse
remains UNVERIFIED: the hosted URL is SSO-walled to this sandbox and
the sandbox Chromium's Local Network Access interstitial blocks
Lighthouse's navigation to the local build (four documented
attempts); no scores are claimed. Screen readers remain UNVERIFIED.
Stage E: Preview isolation confirmed (SSO + no key + failure message);
rate limiting re-verified on the final tree (5 processed, then 429)
— still in-memory/best-effort; a durable distributed limiter remains
a production release blocker. Stage F fix (commit `08e87cf`): axe
found 25 color-contrast nodes on the landing page (legacy --blue at
3.69:1 and --muted at 2.99:1 on small text; --text-muted measured
4.49:1 against its documented AA target). Fixed landing-scoped,
reusing the design system's own brand tokens (eyebrows ->
--brand-strong, FAQ numbers and text links -> --brand, process copy
-> --text-secondary; `.us-section` scope class added to
LandingSection) and --text-muted darkened one step to #626D87 (5.1:1).
Post-fix axe: zero contrast nodes, estimator and form states fully
clean; gates 151/151, lint 0 errors / 5 baseline warnings, build
42/42. `main` untouched throughout; no Production deployment, no real
email, no analytics activation, no price publication.
Finding F2: the privacy policy does not state the internal 30-day
deletion standard or 12-month purge period (B2 legal review). Full
report: workspace research `phase1-qa/p1.10-qa-report.md`, including the
16-item release-blocker inventory. No production code changed in P1.10.
Free Tools track (separate from Phase 1): on 2026-10-23 the owner
authorized a second free tool — **Rental Property Investment
Calculator** ("Should I Buy This Rental Property?") at
`/tools/rental-property-investment-calculator`, built LOCAL ONLY on
`feature/usa-growth-phase1` on top of the still-uncommitted
image-compressor work — NOT committed, pushed or deployed. Pure engine
`src/lib/tools/rental-property.ts`: standard amortisation; NOI strictly
excludes debt service; cash invested = down payment + closing +
furnishing only; platform/management fees on rental revenue only;
cleaning modelled per stay; break-even occupancy solves per-night
contribution against fixed costs + debt service and may exceed 100%
(surfaced as a warning, never hidden); scenarios move only nightly
rate (±10%) and occupancy (±10 points); assessment is preliminary,
never a buy/pass recommendation. Verified: 203/203 tests (33 new,
including a fully hand-worked canonical case and the standard
$300k/6%/30yr = $1,798.65 payment), tsc clean, lint 0 errors / 5
pre-existing warnings, build passes with the route static; local
production-server smoke check returned 200 with SSR figures matching
hand calculation for the illustrative defaults (gross $50,839/yr, NOI
$24,287/yr, cash flow $254/mo, CoC 3.3%), sitemap and /tools registry
include the tool, zero AdSense references (empty hidden ad region
only, not activated). Client-side only: no APIs, auth, database or
scraping. The two older calculator routes
(product-cost-profit, pakistan-sales-tax) were at that point still
missing from the sitemap — pre-existing gap, untouched in that slice.
Free Tools FAST BUILD SPRINT (owner-commissioned 2026-10-23; standing
goal 12–15 USA-focused tools per development day where feasible, one
named tool per owner prompt, no new tool without the owner naming it):
(1) Rental calculator silent-clamp defect FIXED — `validateRentalInputs`
computes field errors on the raw as-entered values (percentages 0–100,
non-negative amounts, available nights 0–365, loan-term sanity,
combined platform+management >100%); the engine still calculates at the
nearest valid limit but `RentalResult.validationErrors` travels with
every result, the UI stores values exactly as typed, flags fields
(aria-invalid + inline error), and shows a provisional-results banner;
defaults and the canonical case validate clean. (2) Rental labels
audited — annual/monthly periods consistent across cards, chart, copy
summary and scenarios; break-even behaviour re-verified by tests.
(3) The stale /tools "Nothing here is live yet" copy and the two
missing sitemap routes were found ALREADY FIXED in the uncommitted
tree at sprint start (not by this sprint's author); verified accurate
against the registry and locked in with a new sitemap regression test:
every registry-live tool must appear exactly once in the sitemap, and
no non-live tool may appear. (4) Tool #3 BUILT — **Airbnb Booking
Profit Calculator** at `/tools/airbnb-booking-profit-calculator`:
per-booking contribution only (never labelled total profit); fees on
gross booking revenue (accommodation + guest cleaning fee + additional
charges), fee base labelled everywhere, no percentage presented as an
official Airbnb rate; pass-through taxes excluded. Mandatory fixture
verified exactly in engine AND live UI: $150×3 + $75 → gross $525,
platform $15.75, management $105, contribution $329.25 ($109.75/night).
Gates: 225/225 tests (22 new: 6 rental validation, 2 sitemap, 14
Airbnb), tsc clean, lint 0 errors / 5 pre-existing warnings, build
45/45 with all five tool routes static, diff-check clean. REAL BROWSER
QA (Chromium 152 via the CDP Fetch-bridge rig, evidence in gitignored
`qa-evidence/free-tools-sprint/`): 16/16 scenarios PASS, 0 console
errors — rental validation banner + field error + clearing, Airbnb
fixture + live recalculation ($444.75 at 4 nights) + validation, Image
Compressor with a real generated 1600×1200 PNG fixture (1,586,701
bytes) canvas-encoded to 88.5 KB against a 100 KB target ("Target met",
quality 92%), /tools copy + 5 live cards, no horizontal overflow at
1440px or 390px on any tool. Still NOT TESTED: Safari, real mobile
file-picker and drag-and-drop upload, screen readers. All sprint work
remains LOCAL ONLY — not committed, pushed or deployed.

## Next exact action
Submit the P1.11 evidence for ChatGPT's independent review, then
request the owner's authorization for P1.12 (Release Readiness).
P1.12 is NOT authorized — no merge to `main`, no Production
deployment. Before any production release, the owner
must: verify the sending domain with Resend (SPF/DKIM for
notifications@triangletech.co), create the `RESEND_API_KEY`, confirm the
hello@triangletech.co inbox is created and monitored, decide on durable
distributed rate limiting for production (the in-memory limiter is
best-effort only), and run the P1.11 UAT live-send test. Publishing
numeric package prices requires its own separate owner approval (see
`src/lib/us/pricing-review.ts`); if prices are ever approved, the
estimator's quantitative mode from Blueprint v3 §4 would be a separate
authorized change — the shipped engine is qualitative only. A real GA4
measurement ID, the privacy policy's effective-date/legal sign-off, the
two calculator routes missing from the sitemap, and CSP enforcement
each remain separate owner decisions. Do not push branches, open PRs,
merge into main, or deploy without the relevant authorization.

## 2026-11-01 — Work Hours & Time Card Calculator + multilingual standard (feature branch, NOT merged, NOT deployed to QA)

Owner-authorized (brief 2026-11-01 04:49 PST, plus additional multilingual
requirement 2026-11-01 05:09 PST): build the time-card feature end to end
on `feature/usa-growth-phase1`, push that branch, and update the existing
Vercel QA project `triangletech-utilities-batch-qa` — subject to the
preservation rule in the brief (§C), which is what happened below.

Implementation (all in this checkout, `feature/usa-growth-phase1`):
- `/tools/time-card-calculator` — weekly/biweekly timesheet, multiple
  sessions per day, explicit overnight, unpaid breaks with proportional
  midnight allocation, per-workweek overtime (never a single 80h
  threshold), integer minutes, documented cent rounding, estimated gross
  pay only (no tax/payroll/labor-law claims), CSV/XLSX import wizard
  (Upload → Map → Validate/Preview → Confirm, explicit date format,
  row-numbered errors, append/replace, one employee per calculator,
  local parsing, formulas never executed, formula-injection neutralized
  in exports), editable freelancer invoice PDF, optional localStorage
  save ("Remember on this device"), duplicate-week with shifted dates,
  PDF/CSV export. Pure engine `src/lib/tools/time-card.ts`,
  dependency-free PDF writer `src/lib/tools/simple-pdf.ts`.
- Companions sharing the engine: `/tools/hours-to-decimal`
  (bidirectional converter + table) and `/tools/work-hours-calculator`
  (single shift, overnight, optional pay estimate). All three registered
  in `src/lib/tools.ts` (category "Work & Time", clock icon) and in
  `src/app/sitemap.ts` (sitemap test enforces registry parity).
- Dependency: `xlsx@0.18.5` added for local XLSX parsing only.
- QA noindex: `QA_NOINDEX=1` at BUILD time adds
  `X-Robots-Tag: noindex, nofollow` in `next.config.ts`; it is off by
  default. Verified 2026-11-01: a build made with `QA_NOINDEX=1` in the
  build environment serves `X-Robots-Tag: noindex, nofollow` on
  `/tools/time-card-calculator` (200); a server started with the
  variable set only at runtime did NOT add the header — so a QA
  deployment must set it in the project's build environment. Never
  applied to the live main site by code.

Multilingual standard (permanent rule, AGENTS.md + this file):
"All current and future tools must support multiple languages through
shared localization infrastructure, a manual language dropdown, automatic
initial language selection, persistent user preference, and RTL where applicable."
Infrastructure: `src/lib/i18n/` (locales, dictionaries, provider),
shared tools layout dropdown (`src/app/tools/layout.tsx`), language as
a saved cookie+localStorage preference (not a URL segment; no locale
pages indexed). Languages: en, es, fr, de, pt, ar, ur, hi, zh, ja.
Dictionary coverage for the time-card scope is 100% in all 10 languages
(asserted in `src/lib/i18n/i18n.test.ts`). Validation errors are
translated via structured codes in the engine (not English strings).
PDF: WinAnsi Latin-1 for Latin-script languages (accents verified);
Arabic/Urdu/Hindi/Chinese/Japanese PDFs fall back to English with an
explicit disclosure line (Helvetica cannot shape those scripts);
browser Print renders the fully translated page. Full inventory,
including tools NOT yet migrated (rental, airbnb, product-cost,
pakistan-tax, qr, image-compressor — English-only, never mark complete)
and the Gravel/Mulch/Topsoil tool (not present in this checkout at all;
not built, not localized here): `docs/tools-localization-inventory.md`.

Verified checks (2026-11-01, local production build):
- 294 tests pass (was 282; +11 i18n, +1 PDF accent test), typecheck
  clean, lint 0 errors (7 pre-existing warnings).
- Build passes (49 routes; tools routes dynamic because the tools
  layout reads the saved-language cookie; non-tool pages stay static).
- Real-browser QA (Playwright Chromium, local build): original
  time-card suite 15/16 script checks + 1 corrected check (rental page
  H1 is "Should I Buy This Rental Property?" — title correct) and
  XLSX import (2 rows, 15h 30m) all pass; i18n suite 17/17 pass
  (Spanish/French/German/Arabic switches, totals preserved, import
  date format unchanged by switch, RTL, persistence, mobile 390px,
  Spanish/Arabic PDFs, 0 console errors).
- Hand cases A–D pass in unit tests (8h; 7h 30m overnight; $980 at
  46h/40h/$20/1.5×; biweekly 46+30 → 6 overtime hours).

BLOCKED — QA deployment (do not redeploy over the existing project):
1. Preservation: the live `triangletech-utilities-batch-qa` deployment
   serves 11 tools whose source trees are NOT in this checkout
   (2026-10-23 audit: two tool batches exist only as Vercel
   deployments). Deploying this checkout there would remove them.
   Per brief §C, the implementation was finished and pushed instead,
   with a prepared isolated deploy copy (see below), and no replacement
   project was created and no domain was changed.
2. Vercel connector `not_connected` in this session (MCP); CLI auth
   from the 2026-10-23 rental session is a separate path and was not
   relied on here.
Next action (exact): recover the utilities-batch source from its
originating session, or get owner direction, before any redeploy of
`triangletech-utilities-batch-qa`; set `QA_NOINDEX=1` in that project's
build environment when redeploying. No merge to main, no production
deployment, no purchase, no domain change was made or authorized here.
## 2026-11-01: Landscaping Material Calculators + multilingual standard (feature/landscaping-material-calculators)

- Branch: feature/landscaping-material-calculators, cut from d26d5cb (Time Card preservation commit on feature/usa-growth-phase1). Work was done in an isolated worktree (~/workspace/repos/triangletech-landscaping) because a separate, in-progress time-card i18n dictionary appeared uncommitted in the main worktree during this task; that work was NOT touched, staged, or included here.
- Built: /tools/gravel-calculator, /tools/mulch-calculator, /tools/topsoil-calculator, sharing src/lib/tools/landscaping.ts (pure engine) and src/components/tools/landscaping-calculator.tsx. Tools index gains "Landscaping & Construction" category; sitemap gains all three routes. Time Card / hours-to-decimal / work-hours routes preserved unchanged.
- Engine contract verified by tests (landscaping.test.ts, 17 tests): cases A–F from the brief, circle/rectangle/direct area, multi-area + different depths, imperial/metric equivalence, density conversions (short tons vs tonnes), extra + loose multiplier direction, exact bag boundaries, supplier minimums/increments, cost basis + delivery-taxable on/off, no fabricated cost without a price, CSV formula-injection protection.
- No universal density preset shipped: gravel/topsoil weight is blank until the user enters a supplier density. Mulch needs no density and gets no gravel compaction assumptions. Mulch depth guidance only: extension guidance commonly cites 2–3 inches for most garden beds (Mississippi State University Extension, 2022; see docs/landscaping-calculators.md).
- Multilingual: shared infrastructure in src/lib/tools/landscaping-i18n.ts + landscaping-locales.ts, 10 languages (en, es, fr, de, pt, ar, ur, hi, zh, ja), native-script dropdown on each landscaping tool, saved choice > browser language > English, RTL for ar/ur, locale number parsing/formatting, language switch preserves entries/currency/units/results, fresh-form-only currency/unit defaults. Coverage measured: 0 missing keys in all 10 languages (landscaping-i18n.test.ts, 8 tests). Permanent rule recorded in AGENTS.md and docs/tools-localization-inventory.md. Time Card / Work Hours / Hours-to-Decimal are NOT localized in this branch — never mark them complete.
- Known PDF limitation (disclosed): built-in simple-pdf Helvetica supports Latin only. For ar/ur/hi/zh/ja, PDF downloads render in English with an on-screen and in-PDF note; browser Print renders the selected language. Do not claim full translated PDF support for those scripts.
- Exports: real PDF (simple-pdf), real CSV, copy-results with success/error feedback, printable shopping list (project, areas, measurements, material, assumptions, density where used, quantities, price basis, totals). No fake buttons.
- QA noindex: next.config.ts adds X-Robots-Tag: noindex, nofollow only when QA_NOINDEX=1 (off by default; live site never noindexed by this path). Verify the header on QA, do not assume it.
- Verification: full suite 307/307 passed, tsc clean, eslint 0 errors. Production build succeeded (NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 was needed for Google Fonts fetching in this VM; all 3 routes in build output). Real-browser QA via local headless Chromium (Playwright, port 3200): 21/21 checks passed after correcting 2 script errors (weight expectation, uppercase index heading) — example 30 ft³/1.111 yd³/15 bags, add/duplicate/remove, metric preservation 10 ft → 3.048 m, density 100 lb/ft³ → 3,000 lb/1.500 short tons, pricing, save/restore, reset, Spanish + Arabic RTL, raised-bed note, real PDF (topsoil-calculator.pdf, %PDF-1.4, 2 pages for 56 areas) + CSV downloads, copy success, no overflow at desktop or 390px, mobile dropdown focus, tools index, existing time-card tool loads, 0 console errors. Muse browser task for localhost was BLOCKED (localhost navigation rejected) — NOT counted as QA; local Chromium QA is the evidence above. QA_NOINDEX verified only as a BUILD-time env var: runtime env alone did not add the header; a QA_NOINDEX=1 build returned X-Robots-Tag: noindex, nofollow.
- BLOCKERS known at branch cut: (1) Vercel MCP connector not connected (vercel status: not_connected), so the triangletech-utilities-batch-qa deployment cannot be updated from this environment until William connects Vercel; (2) the live triangletech-utilities-batch-qa.vercel.app /tools index is a DIFFERENT, larger tools collection (PDF/image tools) than this repo — deploying this repo over it would replace deployed-only tools, so it must NOT be overwritten until that collection's source is preserved. See final report for the exact preservation blocker.

## 2026-11-01 — Tools integration: Time Card + Landscaping unified (feature/tools-integrated-multilingual)

- Base: remote feature/usa-growth-phase1 head d1c3792 (verified 2026-11-01; remote history is a snapshot rewrite, so reconciliation was by tree comparison, not SHA ancestry — remote tree is a strict subset of the local trees, with no remote-only files).
- Local sources preserved before reconciliation: Git bundle ~/workspace/backups/triangletech-tools-preservation-2026-11-01.bundle (SHA-256 7c943152fbb6fa3911d3ec8406804a94aef264fbe0649ca2747dbb63519c2d45; refs: local feature/usa-growth-phase1 7ea2d2e, local feature/landscaping-material-calculators d8c81b, remote feature d1c3792, main 40cbce8). Original branches untouched; no reset, no force-push, no main push.
- Integration branch built by cherry-pick onto the remote base (sprint preservation, time-card batch, time-card i18n, landscaping batch), then two focused commits: (1) unify localization into shared src/lib/i18n (landscaping's competing system deleted; landscaping calculator migrated to the shared provider/layout dropdown; dictionaries merged to 276 keys, 0 missing in all 10 languages, asserted by unified-coverage test), (2) warn on overnight break allocation crossing a workweek boundary, plus a fix commit honouring the explicit locale in landscaping adapters (caught by local browser QA: Arabic PDF titles had rendered as ????? before the fix).
- Midnight break allocation: proportional across midnight segments, shown per segment; when the split crosses a workweek boundary it can change weekly overtime, so the engine emits a break-allocation-overtime warning shown above the results, and the exact route is splitting the shift at midnight into two sessions with each part's actual break minutes.
- PDF limitation (unchanged, disclosed): Latin scripts fully translated; ar/ur/hi/zh/ja fall back to English with an explicit disclosure line; Print renders the translated page. No shaping engine or font asset exists in the repo, and an embedded font without shaping would render Arabic/Devanagari incorrectly, so no font was added.
- Verification (integrated tree, local): 319 tests pass, typecheck clean, lint 0 errors (5 pre-existing <img> warnings in unrelated pages), production build passes with all six routes. Local headless-Chromium QA 17/17 (all six tools, Spanish persistence, Arabic RTL, PDF/CSV downloads, Arabic PDF English fallback, mobile 390px, existing rental tool, 0 console errors) plus a real UI warning-banner check for the week-boundary case.
- Push: GitHub connector (shell git has no credentials), per-commit push_files in local order plus delete_file for the 3 superseded landscaping i18n files; remote branch feature/tools-integrated-multilingual verified by fetch — remote tree is identical to local HEAD e0d4cf8 (content), remote HEAD c2b82955 (API-created commits, so SHAs differ by design).
- QA deployment: triangletech-landscaping-qa (prj_OTH8SCumuGUHJAvIyNZ1vJsxquwd) updated with the integrated build, deployment dpl_7bBAsD7Gmmmi2JZ7PXgQp84hisTt (Production, Ready, QA_NOINDEX=1 at build time, X-Robots-Tag: noindex, nofollow on the stable hostname). All six routes return 200 on https://triangletech-landscaping-qa.vercel.app. triangletech-utilities-batch-qa and triangletech.co untouched.
