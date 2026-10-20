# MEMORY.md — triangletech.co (USA Growth project)

## Current phase
Phase 0 — Gate 0 baseline verification accepted 2026-10-20. Governance drafts
published to the remote review branch `review/usa-growth-governance-drafts`
for independent review. These drafts are NOT approved for production use.
ChatGPT independently reviewed all four documents; corrections were requested
before approval (corrections prepared, awaiting owner approval to publish).

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
  — separate from the remote review branch; no commits, no push.
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
- Supabase database audit · Privacy/Terms legal text · US inbox alias ·
  Search Console access.
- `npm audit` blocked by environment registry policy (403) — recorded as
  UNVERIFIED, not passed.

## Next exact action
Prepare the corrected governance drafts, validate the diff, and submit the
changes for owner/ChatGPT review before any merge or Phase 1 implementation.
