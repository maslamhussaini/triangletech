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
