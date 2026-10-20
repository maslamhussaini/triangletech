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
- API routes follow `src/app/api/chat/route.ts`: `nodejs` runtime, input
  validation, IP rate limiting, server-only env secrets, no PII in logs.
- Never commit secrets. This repository is public.
- Never claim a US office, US address, US phone number, testimonials, rankings,
  or client results. TriangleTech is Pakistan-based and serves US clients remotely.
- US-facing pages use American English. Schema: `Organization` (+ `Service` with
  `areaServed: "United States"` where valid). No `LocalBusiness` schema.
- Work on feature branches (`feature/usa-growth-phase1`). Never develop on `main`.
  No force-pushes. No merges, no deploys, no prospect outreach without owner approval.
- The estimator rule module is `src/lib/tools/website-estimator.ts`.
  `RULES_VERSION` is normative; every result carries it. Identical normalized
  inputs must produce identical outputs.

## Active project
TriangleTech USA Growth — website-design client acquisition (Blueprint v3).
Prices: Starter $899 · Growth SEO $1,999 · AI Visibility $3,799.
Care plans are opt-in only and never compensate for build margins.
