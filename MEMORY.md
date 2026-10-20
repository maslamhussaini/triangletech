# MEMORY.md — triangletech.co (USA Growth project)

## Current phase
Phase 0 — Gate 0 baseline verification accepted 2026-10-20. Branch
`feature/usa-growth-phase1` created locally from `40cbce8f`. Awaiting approval
of exact file contents before creating governance files. No push authorized.

## Verified completed work
- Repo `maslamhussaini/triangletech`, `main` @ `40cbce8f` (2026-10-05), clean tree,
  in sync with `origin/main`.
- `npm ci` from lockfile: clean (lockfile v3, 430 packages, 0 lifecycle scripts).
- `npm run lint`: 0 errors, 5 pre-existing `no-img-element` warnings.
- `npx tsc --noEmit`: clean.
- `npm run build`: passes, 40/40 pages. (Sandbox TLS quirk for Google Fonts
  worked around with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`.)
- Secrets scan of tree and full history: clean.
- Gaps confirmed: no security headers, no cookie-consent banner, no test script.

## Decisions
- Branch for all Phase 1 work: `feature/usa-growth-phase1`, from `40cbce8f`.
  Never develop on or push to `main`.
- Test runner: Vitest (Phase 1, needs separate dependency approval).
- Estimator = pure rule module `src/lib/tools/website-estimator.ts`,
  normative `RULES_VERSION = "1.1.0"`.
- Lead endpoint built behind a storage interface; Supabase NOT approved —
  email-only fallback until the database audit completes.
- Active commercial spec: Blueprint v3 ($899 / $1,999 / $3,799; care plans
  opt-in only).
- Vercel Git integration is ACTIVE: pushes to `main` auto-deploy to Production.
  Branch pushes are expected to create Preview deployments (Vercel default).

## Open blockers
- GitHub App installation scope unverified (owner to confirm repo restriction).
- Vercel dashboard settings (confirm preview/production behavior).
- Supabase database audit · Privacy/Terms legal text · US inbox alias ·
  Search Console access.
- `npm audit` blocked by environment registry policy (403) — recorded as
  UNVERIFIED, not passed.

## Next exact action
After owner approves the exact file contents: create AGENTS.md / CLAUDE.md /
MEMORY.md / docs/design-tokens.md locally on `feature/usa-growth-phase1`,
run `git diff --check`, lint, `tsc --noEmit`, and `next build`, review the diff,
and update this file's verified state. Do not commit, push, open a PR, or deploy.
