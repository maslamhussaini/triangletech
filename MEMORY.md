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
Finding F2: the privacy policy does not state the internal 30-day
deletion standard or 12-month purge period (B2 legal review). Full
report: workspace research `phase1-qa/p1.10-qa-report.md`, including the
16-item release-blocker inventory. No production code changed in P1.10.

## Next exact action
Submit the P1.10-D1 evidence for ChatGPT's independent review (D1 is
fixed; the waiver question is closed). Then request the owner's
authorization for P1.11 (Preview UAT — first branch push; Vercel
dashboard audit is a prerequisite). P1.11 is NOT yet authorized.
Before any production release, the owner
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
