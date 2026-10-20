# TriangleTech USA Growth — Phase 1 Technical Audit, Architecture & Execution Blueprint

**Gate:** P1-G0 (planning only) · **Date:** 2026-10-20 · **Prepared by:** Muse (Principal Architect / Senior Next.js Engineer / Security / QA / Technical SEO review roles)
**Authorization for this gate:** read-only inspection and reporting only. No code, configuration, governance file, branch, commit, push, PR, merge, deployment, dependency, or external state was modified during this audit.
**Repository:** `maslamhussaini/triangletech` · **Production baseline:** `40cbce8f09cb9a2f358b28f3f3322183b3c04a12` · **Governance source:** remote commit `d5877c3a4bf926ce0ab0d918b597f688f0381b14` on `review/usa-growth-governance-drafts`, fetched and inspected directly via the GitHub API at that exact SHA (not from local copies, not from `03621d62`).
**Commercial spec source:** Blueprint v3 (`triangletech-usa-blueprint-v3.md`) — prices provisional, estimator `RULES_VERSION 1.1.0`, all subject to the gates in §K.
**Status at end of this report: STOPPED.** Awaiting ChatGPT's architectural review and the owner's approval of the first development slice (§L).

Evidence convention: **[V]** verified by direct inspection in this gate (command/file/line cited in §M) · **[H]** historical result from Gate 0, accepted earlier, **not** re-run in this gate · **[P]** proposal/recommendation, not yet implemented · **[D]** decision required from the owner.

---

## A. Executive assessment

**Verdict: The codebase is well-suited to the planned Phase 1 extension, and the plan is buildable exactly as specified in Blueprint v3 — but implementation must not start until Slice P1.1 (safe synchronization + governance integration) is approved and executed, because the local working copy and the remote history are structurally divergent (content-identical, history-divergent — see §B).**

The single most important finding of this audit is reassuring: **the divergence is content-free.** The four governance files staged locally have git blob SHAs identical to the remote tree at `d5877c3a`. Nothing local would be lost by aligning history, and nothing remote is missing locally. Synchronization is therefore a low-risk, mechanical, one-commit operation — but it is still a write operation and remains behind owner approval.

Major findings (detail in §B–§F):

1. **Synchronization (§B).** Local clone is on branch `review/usa-growth-governance-drafts` at HEAD `40cbce8f` with the four corrected governance files **staged as new files** (+185 lines) and no other changes — no untracked files, no stash, clean unstaged state. Remote `main` is still `40cbce8f` [V]; remote review branch is `d5877c3a` [V]. Local branches `main`, `feature/usa-growth-phase1`, and `review/usa-growth-governance-drafts` all sit at `40cbce8f`. The remote commits `03621d62` and `d5877c3a` exist only remotely (created via the GitHub API). A safe, non-destructive synchronization sequence is specified step-by-step in §B.4.
2. **The pending MEMORY.md minor update is identified precisely (· [V]).** The `MEMORY.md` inside commit `d5877c3a` describes the corrections as *"prepared, awaiting owner approval to publish"* and gives a next action of *"submit the changes for owner/ChatGPT review"* — text written before the correction commit existed, describing a pre-publication state from inside the publication itself. This is the minor status update the owner flagged. Proposed replacement wording is provided in §B.5 for the owner/ChatGPT to approve; it is **not** applied anywhere in this gate.
3. **Architecture is additive-friendly (· [V]).** Content is centralized in `src/lib/site.ts` (business identity, navigation, services, products, FAQs, `pageMetadata()`); routes follow one repeated pattern (server `page.tsx` with `pageMetadata()` + optional JSON-LD + client island); the two existing calculators establish the exact pattern the estimator must follow (pure typed functions in `src/lib/tools/*.ts`, server page shell, client component). Phase 1 needs **no changes to existing pages' behavior** — only the additive exceptions Blueprint v3 already sanctions (sitemap entries, nav/footer links, appended CSS).
4. **One dependency is already present but completely unused: `zod` (^4.1.13) · [V].** Zero imports in `src/`. The lead endpoint's server-side validation therefore needs **no new dependency** — a material simplification of the security and lead slices.
5. **Security baseline is "Vercel defaults only" (· [V]).** Live response headers for `https://triangletech.co/` show HSTS (Vercel default) but **no CSP, no X-Content-Type-Options, no frame protection, no Referrer-Policy, no Permissions-Policy**; `next.config.ts` is effectively empty and there is no middleware. The one API route shows good hygiene (server-only secret, input caps, generic errors, no logging), but its validation is manual (not schema-based) and its rate limiter is in-memory and trusts `x-forwarded-for` — acceptable as a documented reference, not as a template to copy blindly (consistent with the corrected AGENTS.md).
6. **No tests exist (· [V]).** No test script, no test files, no runner in the lockfile. Historical Gate 0 results (build/lint/tsc pass, `npm ci` clean) are recorded as [H], not re-verified here. Vitest remains the right-sized choice; the smallest maintainable stack and first-slice acceptance criteria are specified in §F. The Vitest dependency approval requested earlier is still pending and is **not** assumed by this report.
7. **Privacy text currently contradicts the Phase 1 analytics plan (· [V]).** `src/app/privacy/page.tsx` states the site *"does not embed third-party analytics or advertising trackers"* and sets no tracking cookies. Adding GA4 + a consent banner (Blueprint v3 §8) therefore **requires** the Privacy/Terms update (blocker B2) to ship in the same release train — it cannot follow later. Conversely, the current no-analytics state means the consent/analytics slice can be sequenced late without any interim exposure.
8. **Design system verified again, from the corrected remote document (· [V]).** All 24 documented classes exist in `theme-indigo.css`; all documented token values match (36 exact; `--gradient-hero` differs only by a line-break in the CSS source; `--muted` is a cross-reference to the older token defined in `globals.css`, not an Indigo token). Zero substantive discrepancies; `docs/design-tokens.md` needs no correction. The landing page can be composed almost entirely from existing primitives (§D).
9. **Commercial ambiguity is contained but real (· [D], §G.4/§K).** Blueprint v3 fixes prices, inclusions, revision rounds, payment milestones, and timelines. What it deliberately does **not** fix — and this report does not invent — is contract-level language: what counts as a "revision", third-party fee pass-through wording, care-plan billing mechanics, and refund terms beyond what §3 states. These are owner decisions listed in §K, needed before the landing page copy is finalized, not before the first coding slice.
10. **Release exposure remains the top risk (· [V]/[H]).** Two Vercel projects auto-deploy `main` to Production; branch pushes create Previews in both. The dashboard audit (domain assignment, Preview toggles) is still outstanding and is a hard prerequisite for the production gate (P1.12), though not for local development slices.

**Readiness by area:**

| Area | State | Gate before build |
|---|---|---|
| Governance | Approved for planning (AGENTS, CLAUDE, tokens); MEMORY minor update pending | P1.1 integrates + updates MEMORY |
| Repository sync | Content-identical, history-divergent | P1.1 (owner approval) |
| Architecture | Ready; patterns identified for every Phase 1 feature | None |
| Design system | Verified; primitives sufficient | None |
| Testing | Absent; stack specified | P1.2 + Vitest dependency approval |
| Security headers | Absent; design specified | P1.3 |
| Landing page | Copy drafted (v3 §5); component plan ready | Prices/copy approval before P1.5 completes |
| Estimator | Rules spec complete (v1.1.0); module design ready | P1.2 test foundation first |
| Lead capture | Architecture ready; storage blocked | Supabase audit **or** email-only decision |
| SEO/AEO/GEO | Foundations present; gaps listed | P1.7 |
| Privacy/legal | Text exists; US-lead update blocked (B2) | Before any production release |
| Vercel/release | Behavior observed; dashboard unverified | Before P1.11/P1.12 |

---

## B. Repository state and synchronization audit

### B.1 Remote state (fetched this gate via GitHub API)

| Ref | SHA | Evidence |
|---|---|---|
| `main` | `40cbce8f09cb9a2f358b28f3f3322183b3c04a12` | `list_commits` on `main`, this gate [V] — unchanged from baseline |
| `review/usa-growth-governance-drafts` | `d5877c3a4bf926ce0ab0d918b597f688f0381b14` | `list_commits` on the branch, this gate [V] |
| Governance files at `d5877c3a` | AGENTS.md blob `3cb0133f…`, CLAUDE.md blob `68b37cdb…`, MEMORY.md blob `255e1d5f…`, docs/design-tokens.md blob `4175605f…` | `get_file_contents` with `sha=d5877c3a…`, this gate [V] |

Corrected-content markers confirmed in the remote files at that SHA: AGENTS.md carries the provisional-pricing section ("Proposed starting prices … provisional (owner approval required before public publication)"), the estimator paragraph ("The proposed estimator module location is `src/lib/tools/website-estimator.ts`. It does not exist yet … `RULES_VERSION = "1.1.0"` is the approved planning specification version, not evidence of an implementation"), the API-security-principles paragraph (chat route "a reference implementation, not a mandatory template"), and the branch/deployment authorization tiers. CLAUDE.md carries the approved multi-step authorization policy verbatim ("Do not request redundant approvals for actions already explicitly authorized within the current slice…"). MEMORY.md records the reconnect, functional write verification, publication, and the preserved blocker list.

### B.2 Local state (inspected this gate, non-destructive commands only)

| Item | Value |
|---|---|
| Clone | `~/workspace/repos/triangletech` |
| Current branch | `review/usa-growth-governance-drafts` |
| Local HEAD | `40cbce8f09cb9a2f358b28f3f3322183b3c04a12` |
| Local branches | `main` @ 40cbce8f [origin/main], `feature/usa-growth-phase1` @ 40cbce8f, `review/usa-growth-governance-drafts` @ 40cbce8f |
| Working tree | **Staged only:** `A AGENTS.md`, `A CLAUDE.md`, `A MEMORY.md`, `A docs/design-tokens.md` (+185 lines total: 50/16/57/62). **Unstaged:** none. **Untracked:** none. **Stash:** empty. |
| Remotes | `origin https://github.com/maslamhussaini/triangletech.git` (fetch/push) |
| Ignored artifacts present | `node_modules/`, `.next/`, `tsconfig.tsbuildinfo` (all gitignored — not part of the divergence) |

### B.3 Divergence analysis

- **Nature:** purely historical. Remote history is `40cbce8f → 03621d62 → d5877c3a`; local history stops at `40cbce8f` because the remote commits were created through the GitHub API, not local git. The local index stages, as additions on `40cbce8f`, content that is **byte-identical** to the remote tree at `d5877c3a` — proven by git blob SHA equality for all four files (`git ls-files -s` vs the API-returned blob SHAs, §B.1) and by direct `diff` of staged content against the API-fetched remote content (identical, all four) [V].
- **Local-only changes:** none in content. The only local-only artifact is the *staged state itself*.
- **Remote-only changes:** none in content; two commits of history.
- **Risk if ignored:** if implementation started on `feature/usa-growth-phase1` today, the branch would lack the governance files entirely (they exist only in the index of the review-branch checkout), and any later attempt to reconcile the review branch would risk a duplicated/conflicting add of the same files. Coding on top of an uncommitted index also risks losing the staged state in an accidental branch operation.
- **Authoritative baseline determination [P]:** code baseline = `40cbce8f` (identical everywhere). Governance content baseline = the tree at remote `d5877c3a` (identical to local staged content). The review branch should be treated as a **frozen review artifact** after integration; the feature branch becomes the single working line for Phase 1, per the governance MEMORY.md decision ("All Phase 1 implementation work happens on `feature/usa-growth-phase1`").

### B.4 Safe synchronization proposal (exact sequence — P1.1, requires owner approval; NOT executed in this gate)

1. **Pre-flight re-verification.** Re-fetch remote refs via the API; confirm `main` = `40cbce8f` and review branch = `d5877c3a`. If either moved, stop and report.
2. **`git fetch origin`** in the local clone. (Updates remote-tracking refs only; touches no working files. Note: this is itself a local-state change, which is why it sits inside P1.1, not this gate.)
3. **Identity re-check.** Compare `git ls-files -s` blob SHAs for the four staged files against `origin/review/usa-growth-governance-drafts` blob SHAs. Expected: identical (as proven today). If any differ, stop — do not proceed on assumption.
4. **Switch to the feature branch with the index intact:** `git switch feature/usa-growth-phase1`. Both branches are at `40cbce8f`, so the staged additions carry over unchanged. Verify `git status` shows the same four staged additions and nothing else.
5. **One governance-integration commit on the feature branch** containing exactly the four files, message: `docs: integrate approved USA growth governance documents`. This gives the feature branch a tree identical to `d5877c3a` for those paths, with honest local lineage (it does not rewrite or fabricate the remote review history).
6. **MEMORY.md status update as a second, separate commit** on the feature branch, using the wording approved under §B.5 — kept separate so the integration commit remains a byte-exact copy of the reviewed documents.
7. **Leave the local review branch untouched** in this slice. Optional later alignment (pointer-only `git branch -f review/usa-growth-governance-drafts origin/review/usa-growth-governance-drafts` after the staged files are committed elsewhere) is safe because content is preserved, but it is not required for Phase 1 and should only be done under its own explicit instruction.
8. **Post-checks:** `git status` clean; `git log --oneline` shows the two new commits on top of `40cbce8f`; `git diff origin/main --stat` shows only the four governance files; **no push** (a push of the feature branch is a separate authorization and would trigger Vercel Previews in both projects — see §I.4).

Explicitly prohibited in the sequence: `reset --hard`, `clean -fd`, force-push, rebase, merge of the review branch — none is needed, because the fast path (commit the identical content on the feature branch) loses nothing.

### B.5 The pending MEMORY.md minor update — exact identification and proposed wording [P]/[D]

**Stale lines in `MEMORY.md` at `d5877c3a` (§ "Current phase"):** *"…ChatGPT independently reviewed all four documents; corrections were requested before approval (corrections prepared, awaiting owner approval to publish)."* and (§ "Next exact action") *"Prepare the corrected governance drafts, validate the diff, and submit the changes for owner/ChatGPT review before any merge or Phase 1 implementation."* Both describe the state **before** the correction commit that contains them.

**Proposed replacement (for owner/ChatGPT approval, applied only in P1.1 step 6):**

> **Current phase:** Phase 1 planning gate P1-G0 complete. Governance drafts published to `review/usa-growth-governance-drafts`; corrections published at `d5877c3a`; AGENTS.md, CLAUDE.md and docs/design-tokens.md approved for Phase 1 planning; this MEMORY.md status update applied on `feature/usa-growth-phase1` during synchronization (P1.1). Governance documents are NOT merged into `main` and publication is not production approval.
>
> **Next exact action:** Await ChatGPT's architectural review of the P1-G0 blueprint and the owner's approval of the first development slice (recommended: P1.2 testing infrastructure, after P1.1). No merge, push, or Phase 1 coding before that approval.


---

## C. Architecture inventory

### C.1 Routes (all under `src/app/`, App Router) [V]

| Route | File pattern | Notes for Phase 1 |
|---|---|---|
| `/` | `page.tsx` | Homepage sections are the landing page's composition reference (§G) |
| `/about`, `/faq`, `/privacy`, `/terms`, `/contact` | static pages | FAQ uses native `<details>` accordion; contact = mailto-draft form |
| `/services`, `/services/[id]` | index + dynamic (`generateStaticParams`, `dynamicParams=false`) | Service JSON-LD pattern lives here (§H.3) |
| `/products`, `/products/[id]` + 3 dedicated product pages | index + dynamic + static | Long-form product page patterns |
| `/case-studies`, `/case-studies/[slug]` | index + dynamic | Source of the landing page's "websites we've built" section |
| `/tools` | index | Registry-driven from `src/lib/tools.ts`; BreadcrumbList + ItemList schema |
| `/tools/product-cost-profit-calculator`, `/tools/pakistan-sales-tax-calculator` | `page.tsx` (server shell) + `calculator-client.tsx` (client island) | **The estimator's structural precedent** |
| `/api/chat` | `route.ts` (POST, `runtime="nodejs"`) | Only API route; reference for endpoint hygiene (§E) |
| `/opengraph-image`, `/favicon.*`, `/icon.tsx` | metadata files | OG image is a single shared asset via `pageMetadata()` |
| `sitemap.ts`, `robots.ts` | metadata routes | §H.1 |

**Routing conventions [V]:** every page is a server component exporting `metadata` via `pageMetadata(title, description, path)` from `src/lib/site.ts`; interactive parts are isolated `"use client"` components; dynamic segments validate against the central data arrays and `notFound()` on miss; new public URLs must be added to `sitemap.ts` explicitly (confirmed: `staticPages` is a literal list and tool sub-routes are **not** auto-included — the two live calculators are in fact absent from the sitemap today, a pre-existing gap §H.1 records).

### C.2 Business-information source of truth [V]

`src/lib/site.ts` (321 lines) exports: `business` (name, URL, email `info.triangletech@gmail.com`, two +92 WhatsApp links+labels), `navigation` (flat array — there is **no Services dropdown**; Blueprint v3's "one Services-menu link" therefore translates to a navigation/footer addition, decided in P1.5), `hero`, `stats`, `services`, `products`, `featureNotes`, `demoOptions`, `trustPoints`, `howItWorks`, `finderQuestions`, `videos`, `guides`, `caseStudies`, `technologies`, `faqs`, and `pageMetadata()`. Per corrected AGENTS.md, Phase 1 content (packages, prices, estimator config references, US FAQ entries) belongs here or in a dedicated `src/lib/` module — never hardcoded in components.

### C.3 Components (21 in `src/components/`) and Phase 1 reuse [V]

| Component | Role | Landing/estimator reuse |
|---|---|---|
| `navigation.tsx` (`Header`, `NavigationProvider`, `RouteLink`) | Site chrome | Reuse as-is; nav additions only via `site.ts` |
| `page-parts.tsx` (`PageIntro`, `ContactCTA`, `ContactDetails`, `Footer`) | Section scaffolding, footer with floating WhatsApp button | Reuse; country-aware behavior targets `ContactDetails`/footer (§G.5) |
| `guided-finder.tsx` (`GuidedProductFinder`) | Multi-step quiz with progress bar, weighted scoring | **Direct interaction precedent for the estimator UI** (`.finder-*` classes) |
| `demo-form.tsx` (`DemoRequestForm`) | Accessible form: `useId`, `aria-invalid`/`aria-describedby`, focus-first-error, `.field-premium/.input-premium/.error-premium` | **Form pattern precedent for the lead form** (behavior differs: mailto draft, no server submit) |
| `feature-card.tsx`, `service-card.tsx`, `tool-card.tsx` | Card primitives | Problem cards, package cards, tools cross-links |
| `scroll-reveal.tsx` | IntersectionObserver reveal (`data-reveal`) | Reuse; respects reduced-motion via CSS |
| `icons.tsx` (`Icon`, `ServiceVisual`) | Icon registry | New icons only if genuinely missing |
| `chat-widget.tsx` / `chat-trigger-button.tsx` | AI assistant + lead capture into chat | Out of scope; untouched in Phase 1 |
| `mobile-cta.tsx` | Sticky mobile CTA | Pattern reference for the landing sticky CTA (v3: only after a US contact route exists) |
| `brand.tsx`, `dashboard-mockup.tsx`, `device-frame.tsx`, `hero-visual.tsx`, `product-mockups.tsx`, `product-showcase.tsx`, `portfolio-section.tsx`, `screen-walkthrough.tsx`, `video-guide-cards.tsx`, `product-cta.tsx` | Product/marketing visuals | `portfolio-section.tsx` feeds landing §7 (case studies) |

### C.4 Library modules (`src/lib/`) [V]

| Module | Contents | Phase 1 relevance |
|---|---|---|
| `site.ts` | See §C.2 | Add US packages data (P1.4) |
| `tools.ts` | Tool registry — metadata only, explicitly no logic; statuses `live/coming-first/coming-soon` | Estimator registers here when its route goes live |
| `tools/cost-profit.ts` | Pure calculator: discriminated-union inputs/results, `calculate()` dispatcher, safe-math helpers (`clampFinite`, `safeDiv`, `safePercent`), result-carried `validationError`, exported defaults | **Estimator engine's code-style precedent** (§H.1) |
| `tools/pakistan-sales-tax.ts` | Pure tax calculator | Same pattern |
| `tools/exchange-rate.ts` | Rate fetch/convert helpers used by calculator client | Shows client-side fetch conventions |
| `ai/product-knowledge.ts` | Chat knowledge base + matcher | Untouched |
| `portfolio.ts` | Case-study data | Landing §7 data source |

### C.5 Configuration [V]

- `package.json`: Next 16.0.8, React 19.2.1, react-dom 19.2.1, **zod ^4.1.13 (unused)**, devDeps: TypeScript ^5, ESLint ^9 + eslint-config-next 16.0.8, Tailwind 3.4.19, PostCSS/autoprefixer, @types/*. Scripts: `dev/build/start/lint` only — **no test script**.
- `package-lock.json`: lockfileVersion 3; zero `vitest` entries — no test runner installed.
- `next.config.ts`: empty config object — no headers, no image config, no redirects.
- `tsconfig.json`: strict, `noEmit`, bundler resolution, `@/* → ./src/*` alias.
- `eslint.config.mjs`: flat config, `eslint-config-next/core-web-vitals` + typescript.
- No middleware/proxy file; no `.github/` (no CI); no `vercel.json`.
- `.gitignore`: covers `node_modules`, `.next`, `.env*`, `*.pem`, `/coverage` (already test-ready).
- Fonts: `next/font/google` Inter (400/500/600) + Sora (500–800), `display:"swap"`, CSS variables — the sandbox TLS quirk affecting font fetch at build time is an environment note [H], not a code defect.

### C.6 Forms and data flows today [V]

1. **Demo/contact form** (`demo-form.tsx`): client-side validation only; composes a `mailto:` draft — the site transmits nothing; success state honestly says "nothing has been sent yet." No consent checkbox (nothing to consent to — the visitor sends their own email). **Implication:** Phase 1's lead form is the site's **first** real server submission; it introduces the site's first PII transmission, storage, and consent obligations. It must not be presented as "the same form pattern" operationally, only visually.
2. **Chat widget**: collects name/email/phone/business in-browser and posts them with messages to `/api/chat`; the route uses only the first name for the prompt. Privacy page §3/§8 already discloses this processing.
3. **Calculators**: fully client-side; no data leaves the browser. The estimator preserves this property for the estimate itself (v3 §7.1).

### C.7 Error handling and resilience [V]

- `src/app/loading.tsx` exists; no custom `error.tsx`/`not-found.tsx` (Next defaults apply; dynamic routes call `notFound()`).
- API route: try/catch with generic 500, structured 400/429 JSON errors, demo-mode fallback when the AI key is absent or the provider fails — a graceful-degradation precedent the lead endpoint should mirror (never lose a lead silently; §H.2).
- Zero `console.*` calls anywhere in `src/` [V] — logging is currently absent rather than unsafe; the lead slice must keep PII out of any logging it introduces.

### C.8 Architectural inconsistencies (recorded, not fixed in this gate) [V]

1. `zod` declared but unused — validation is hand-rolled in the chat route. (Phase 1 resolves this by using zod in the lead endpoint; no cleanup needed.)
2. Tailwind config comment admits brand colors "had drifted" historically and notes no Tailwind color utilities are actually used — styling is effectively CSS-class driven (globals + theme-indigo), with Tailwind available but lightly used. New work should follow the CSS-class reality, not assume utility-first.
3. Sitemap omits the two live calculator routes (see §C.1) — pre-existing SEO gap.
4. `qa-screenshots/` is tracked in git (part of the 306 tracked files) — repository hygiene note only; out of Phase 1 scope.
5. Homepage `em` accent color comes from `globals.css` (cyan) while Indigo pages use `.gradient-text` — cosmetic duality to respect when composing the landing hero (use the Indigo primitives, §D).
6. Terms page is a single unstructured page without section anchors (privacy page has anchored sections) — relevant when B2 legal updates are drafted; anchor parity is recommended there, not in a code slice.

---

## D. Design-system audit — Indigo Glass

### D.1 Verification performed this gate [V]

`docs/design-tokens.md` **as fetched from remote commit `d5877c3a`** was programmatically compared against the local `src/app/theme-indigo.css` (3,026 lines, identical baseline `40cbce8f`):

- **Classes:** 24/24 documented classes exist in the stylesheet (`.button-indigo`, `.button-indigo-secondary`, `.on-dark`, `.hero-indigo`, `.eyebrow-indigo`, `.gradient-text`, `.hero-orb`, `.card-premium`, `.glass-panel`, `.metric-card`, `.hover-lift`, `.field-premium`, `.label-premium`, `.input-premium`, `.helper-premium`, `.error-premium`, `.input-affix`, `.finder-section`, `.finder-panel`, `.finder-progress`, `.finder-option`, `.faq-preview`, `.process-grid`, `.tools-hero`). The stylesheet additionally provides `.result-card` (documented in its own section comments), which suits the estimator result display.
- **Tokens:** 36 documented token values match exactly; `--gradient-hero` matches modulo a source line-break; `--muted` appears in the doc only as a cross-reference ("not the older `--muted`") and is defined in `globals.css :root` (`#8592ad`), not in theme-indigo — consistent with the doc's wording. **Substantive discrepancies: 0.** The document needs no correction (consistent with the earlier verification [H], now re-confirmed against the corrected remote version).

### D.2 System characteristics [V]

- **Brand:** `--brand #4F46E5`, `--brand-strong #312E81`, `--brand-soft #EEF0FF`, `--brand-secondary #7C5CFF` (accent only), `--brand-ink #1B1B4B`; gradients `--gradient-brand`, `--gradient-hero` (dark hero), `--gradient-soft`.
- **Surfaces:** `--surface`/`--surface-soft` alias existing neutrals; `--surface-elevated #FFFFFF`; glass `--surface-glass rgba(255,255,255,.72)`, `--surface-glass-dark rgba(20,20,56,.55)`.
- **Text:** `--text-primary` (= `--text` #1a2338, 14.5:1), `--text-secondary #4A5573`, `--text-muted #6B7690` (~4.9:1 — secondary copy only), `--text-on-brand`, `--text-inverse-soft #C9CCF5`. Doc records contrast ratios; new copy must hold WCAG 2.2 AA (≥4.5:1 body).
- **Focus:** two cooperating systems — sitewide `globals.css` rule (`:focus-visible` 3px outline in `--brand-secondary`, chosen and commented for ≥3:1 non-text contrast on both light and dark grounds) and `--focus-ring` token in theme-indigo (33 focus-related rules). New interactive primitives must be visibly focusable under both.
- **Motion:** `--dur-fast 140ms / --dur-base 220ms / --dur-slow 420ms`, `--ease-out-soft`; `prefers-reduced-motion: reduce` honored in **6** blocks in theme-indigo plus globals; a `forced-colors: active` block also exists (a genuine accessibility plus rarely present in marketing sites).
- **Shape/controls:** radii 8/12/16px; `--control-height: 48px` (≥44px touch targets mandated by the doc).
- **Breakpoints in theme-indigo:** predominantly `max-width: 799px` (15 blocks — the primary mobile breakpoint), plus 480/560/370 (small phones), 900, 1023, 1100/1101, 1411. Landing components should use the 799px convention for consistency rather than introduce Tailwind breakpoints.
- **Additive-only rule:** theme-indigo is imported after globals in `layout.tsx` and wins on equal specificity; every primitive is opt-in. **No global restyling is recommended** — no defect found that requires it.

### D.3 Reusable primitives mapped to the landing page [P]

| Landing section (v3 §5) | Primitives |
|---|---|
| Hero | `.hero-indigo`, `.eyebrow-indigo`, `.gradient-text`, `.hero-orb`, `.button-indigo`, `.button-indigo-secondary.on-dark` |
| Problem cards | `.card-premium`, `.hover-lift`, `.metric-card` (stats only if truthful) |
| Packages | `.card-premium` / `.glass-panel` composition; "Most chosen" badge via existing eyebrow styling |
| Comparison table | **Gap (minor):** no table/compare primitive exists → §D.4 |
| Care plans | `.card-premium` row with explicit opt-in wording; no toggle component exists, none needed |
| Process | `.process-grid` |
| Estimator band | `.finder-section`, `.tools-hero` |
| FAQ | `.faq-preview` + native `<details>` pattern from `/faq` |
| Forms | `.field-premium`, `.label-premium`, `.input-premium`, `.helper-premium`, `.error-premium`, `.input-affix` |
| Estimator UI | `.finder-panel`, `.finder-progress`, `.finder-option`, `.result-card` |

### D.4 Genuinely missing primitives (complete list) [P]

1. A pricing **comparison table** style (responsive: stacked cards <800px, table ≥800px).
2. A **plan-card featured** variant (border/badge emphasis for "Most chosen") — may be composable from `.card-premium` + `.is-brand`-style modifier; decide in P1.4 with a visual check.
3. A **sticky mobile CTA bar** variant for the landing page (pattern exists in `mobile-cta.tsx`/globals for the existing CTA; an Indigo variant may be needed).

Everything else composes from existing classes. Any new classes are appended to `theme-indigo.css` as opt-in additions in P1.4 — estimated ≤6 classes — with the Gate 0 visual-regression method (rebuilt existing card vs production) as the guard. No new design system, no global restyle.


---

## E. Security and privacy findings

Severity scale: **High** = exploitable or compliance-blocking for Phase 1 · **Medium** = material weakness to fix in the Phase 1 train · **Low** = hygiene/defense-in-depth. No finding in this audit is accompanied by a claim of legal compliance; privacy/legal items require the owner's (and where noted, legal) review.

### E.1 Findings register

**S-1 — No HTTP security headers · Medium · [V]**
*Evidence:* live `curl -sI https://triangletech.co/` (this gate): `Strict-Transport-Security: max-age=63072000` present (Vercel platform default); **absent:** Content-Security-Policy, X-Content-Type-Options, X-Frame-Options / frame-ancestors, Referrer-Policy, Permissions-Policy. `next.config.ts` is an empty config; no middleware exists; no `headers()` anywhere in code.
*Risk:* clickjacking framing, MIME sniffing, referrer leakage, and no CSP containment if any future script injection occurs. HSTS is already handled by the platform.
*Mitigation [P]:* `headers()` in `next.config.ts` in P1.3 (§J) with a report-only-then-enforce CSP path (§E.2). *Owner decision:* approve header set + CSP mode. *Slice:* P1.3.

**S-2 — CSP readiness: good preconditions, one structural caveat · Medium · [V]**
*Evidence:* no analytics, no third-party embeds/scripts in `src/` today; JSON-LD is injected via `dangerouslySetInnerHTML` with `<` escaped (`.replace(/</g,"\\u003c")`) consistently across layout/services/tools pages — a sound existing practice. Inline `<noscript><style>` exists in the root layout, and Next.js injects inline runtime scripts, so a strict `script-src 'self'` will break the app **unless** the CSP is nonce- or hash-based (Next supports nonce via middleware) or starts in report-only mode.
*Mitigation [P]:* Phase CSP in P1.3: (1) ship the non-CSP headers + `Content-Security-Policy-Report-Only` with a conservative policy; (2) evaluate violations on Preview; (3) enforce only after a clean report window, using `'unsafe-inline'` for `style-src` initially (documents the layout's inline style) and a nonce strategy decision for scripts (§E.2). *Owner decision:* accept phased CSP vs. middleware-nonce CSP from day one (more work, stronger). *Slice:* P1.3.

**S-3 — API validation is manual; zod available but unused · Low (now) → Medium (at lead launch) · [V]**
*Evidence:* `src/app/api/chat/route.ts` hand-checks types and caps lengths (800 chars/message, 12 history); `zod ^4.1.13` is a runtime dependency with zero imports.
*Risk:* hand-rolled validation drifts as endpoints multiply; the lead endpoint will accept richer PII payloads where schema validation matters more.
*Mitigation [P]:* lead endpoint (P1.8) validates with a zod schema shared (as types) with client-side checks; chat route left untouched in Phase 1 (governance AGENTS.md: principles, not template-copying — and no unrelated refactors). *Owner decision:* none. *Slice:* P1.8.

**S-4 — Rate limiting is best-effort, in-memory, IP-spoofable · Low · [V]**
*Evidence:* chat route limiter (20 req / 5 min / IP) stores buckets in a module-level `Map` (resets on redeploy, per-instance on serverless) and keys on `x-forwarded-for` first value, which a client can spoof where the platform doesn't overwrite it. The code comments honestly document this ("not a hard guarantee").
*Mitigation [P]:* for the lead endpoint, keep the same pattern **plus** honeypot + minimum-interaction-time + payload caps (v3 §4.8/§8), and treat rate limiting as abuse deterrence, not a security boundary. Do not buy a CAPTCHA service in Phase 1 (v3: no CAPTCHA on first use). *Owner decision:* accept residual spam risk for email-only mode (§H.2). *Slice:* P1.8.

**S-5 — Secret handling is correct · Informational · [V]**
*Evidence:* only two `process.env` reads, both in the chat route (`AI_PROVIDER_API_KEY`, `AI_MODEL`), server-only, no `NEXT_PUBLIC_` secrets, no env files tracked, `.env*` gitignored, secrets scan of tree and history clean [H]. Repository is public — the "never commit secrets" rule in AGENTS.md is the operative control.
*Mitigation:* none required; lead slice must keep all provider keys server-side and add any new env names to the release checklist (§I). *Slice:* ongoing.

**S-6 — No logging exists; lead slice must not introduce PII logging · Low · [V]**
*Evidence:* zero `console.*` in `src/`. The privacy page states assistant conversations "stay in your browser session" for profiling purposes; the chat route logs nothing.
*Mitigation [P]:* P1.8 coding standard: log only event type, timestamp, and a non-reversible reference; never names, emails, message bodies, or estimate inputs tied to identity. Add a grep-based check (`console.` + payload fields) to the slice's manual verification. *Slice:* P1.8.

**S-7 — Form spam protection: none exists today because no form transmits · Medium (at lead launch) · [V]**
*Evidence:* demo form is a mailto draft (no endpoint). The first real endpoint arrives with P1.8.
*Mitigation [P]:* honeypot field (hidden, aria-hidden, tabindex −1), time-trap (reject <3s completions), zod schema with strict field whitelist + length caps, per-IP best-effort limit, and a server-side kill switch (env flag) to disable submissions without a deploy rollback. *Slice:* P1.8.

**S-8 — Email delivery security is unestablished · Medium · [D]**
*Evidence:* current "delivery" is the visitor's own mail client. Phase 1 email-only mode (§H.2) introduces server-sent mail (lead notification + optional breakdown email) — SPF/DKIM/DMARC for the sending domain, a sending provider, and bounce handling are all undecided and unverified.
*Risk:* notifications landing in spam = silently lost leads — the exact failure mode email-only mode must engineer against (§H.2: dual-path notification + daily reconciliation summary).
*Owner decision [D]:* sending provider + sending domain (recommendation: send from the domain that owns the US alias once A2 is resolved; verify SPF/DKIM before P1.11 UAT with real test sends). *Slice:* P1.8 (build), P1.11 (verification).

**S-9 — Dependency risk is UNVERIFIED · Medium · [V]/[H]**
*Evidence:* `npm audit` returns HTTP 403 from this environment's registry policy — recorded as **UNVERIFIED**, never as passed (standing rule). Dependency set is small (4 runtime deps) [V], `npm ci` was clean with zero lifecycle scripts [H].
*Mitigation [P]:* owner enables Dependabot alerts on the repository (GitHub Advisory DB path, unaffected by the 403) and/or runs `npm audit` on an owner machine before P1.12; Vitest's 35-package tree (pre-vetted [H]) gets the same check when installed in P1.2. *Owner decision:* Dependabot on/off (asked previously, still pending). *Slice:* P1.2/P1.12 gates.

**S-10 — Privacy policy does not yet cover US lead processing · High (for launch, not for coding) · [V]**
*Evidence:* `/privacy` covers the demo form (mailto), chat assistant, accounts, and a general retention principle ("only as long as needed…"), with anchored sections and an effective date of 5 October 2026. It does **not** cover: website-lead storage, the 12-month unconverted-lead maximum (v3 §7.3), estimator breakdown emails, marketing consent, GA4/analytics (it affirmatively states the opposite — §A finding 7), or US-specific deletion workflow.
*Mitigation:* B2 legal drafting (owner/legal) feeding a pre-launch privacy/terms update slice; code slices P1.7/P1.8 must not ship to production ahead of it. This is a **release blocker**, not a development blocker. *Slice:* P1.12 gate.

**S-11 — Cookie/analytics consent does not exist — and currently needs not to · Low · [V]**
*Evidence:* no cookies set by site code, no analytics. *Implication:* no consent banner is required for the site as it stands; the banner becomes necessary exactly when GA4 lands (P1.7). Build order must keep "analytics code present" and "consent mechanism live" in the **same** slice, and the privacy text must change in the same release (§S-10). Blueprint v3's consent-mode design (analytics loads only after consent, IP anonymization, no PII in events) is adopted as the P1.7 acceptance standard.

**S-12 — HTTPS/platform assumptions · Informational · [V]**
Production is served by Vercel with HSTS; canonical/metadataBase are absolute `https://triangletech.co` in `site.ts`/`layout.tsx`. Country detection for §G.5 will rely on platform headers (`x-vercel-ip-country`) — coarse, header-trusted, fail-to-unknown; no geolocation data may be stored (v3 §6).

### E.2 Recommended header set (P1.3) [P]

Applied via `async headers()` in `next.config.ts` for all paths:

| Header | Proposed value | Note |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | — |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | — |
| `X-Frame-Options` | `SAMEORIGIN` | Plus CSP `frame-ancestors 'self'` when CSP enforces |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Tighten only after checking chat widget needs (it uses none of these today [V]) |
| `Strict-Transport-Security` | leave to Vercel (already `max-age=63072000`) | Do not duplicate in app config |
| `Content-Security-Policy-Report-Only` → `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' (phase 1); style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com (chat) + GA endpoints (only after P1.7); frame-ancestors 'self'; base-uri 'self'; form-action 'self'` | `'unsafe-inline'` for scripts is a documented phase-1 compromise forced by Next's inline runtime without middleware nonces; the upgrade path (middleware + nonce, dropping `'unsafe-inline'`) is recorded as a Phase 2 candidate. GA directives are added in P1.7, not before, to keep P1.3 verifiable against today's site. |

Verification (P1.3): build + full route crawl on Preview/local prod server; header presence asserted by a script; zero CSP report violations across all existing routes in report-only window before enforcement is proposed (enforcement itself is a separate owner-visible step inside P1.3's approval).

---

## F. Testing strategy

### F.1 Current state [V]/[H]

No test script, no test files, no runner in `package.json`/`package-lock.json`. Historical baseline [H]: `npm ci` clean, `tsc --noEmit` clean, ESLint 0 errors / 5 pre-existing `no-img-element` warnings (in `brand.tsx`, `portfolio-section.tsx`, two product pages — matching the 5 `<img` occurrences found this gate [V]), production build 40/40 pages. These are **historical** results; P1.1/P1.2 re-run them as their entry gate.

### F.2 Suitability assessment

Vitest is suitable for every Phase 1 test need:

| Need | Fit |
|---|---|
| Pure business rules (estimator) | Native — plain TS, no DOM; the primary use case |
| Deterministic output tests (byte-identical) | Native — string/JSON equality on pure function output |
| API input validation (lead route) | Good — route handler invoked with constructed `Request` objects in Node environment; provider calls mocked at the module boundary |
| Form validation logic | Good if validation lives in a shared pure module (recommended, §H.2) — test the module, not the DOM |
| React component tests | Adequate with React Testing Library + jsdom, but **deferred**: Phase 1 components are presentational; the high-value tests are rules + API. Adding RTL now would double the test-stack surface for low marginal value. Revisit if estimator UI state logic grows. |
| E2E | Out of scope for the initial stack; P1.10 uses scripted manual + build-level checks. Playwright is a Phase 2 candidate, recorded not adopted. |

### F.3 Recommended smallest maintainable stack [P]

- **Dependencies (one approval):** `vitest` only (pre-vetted: `vitest@5.0.5`, 35 packages, zero lifecycle scripts, MIT [H] — **re-check the latest version at install time**, as previously advised). No jsdom, no RTL, no coverage provider in the first slice.
- **Script:** `"test": "vitest run"` (single addition to `package.json` scripts).
- **Config:** one `vitest.config.ts` at repo root: Node environment, `include: ["src/**/*.test.ts"]`, alias `@/*` mirroring tsconfig. (If Vitest resolves the tsconfig alias natively via its config, keep the config minimal — the P1.2 implementer verifies and keeps whichever single mechanism works; do not add `vite-tsconfig-paths` unless proven necessary.)
- **Conventions:** tests co-located as `<module>.test.ts` beside the module under test (matches the codebase's `calculator-client.tsx`-beside-`page.tsx` co-location habit); test data as typed fixtures in the test file; no snapshot tests for pricing (explicit expected values only — a price change must fail loudly, not update a snapshot silently).
- **Coverage:** Vitest's built-in coverage (v8 provider ships with Vitest) enabled via CLI flag in CI later; in P1.2, run coverage once manually to record the estimator module's baseline (target: 100% of the estimator module's branches when P1.9 lands — the rules are small enough that anything less hides an untested rule). No coverage *gate* in the first slice.
- **CI compatibility:** no CI exists today (no `.github/`). The stack is CI-ready (`npm ci && npm test` is the whole contract); adding a GitHub Actions workflow is proposed as an optional part of P1.10, not assumed.

### F.4 First testing-infrastructure slice (P1.2) acceptance criteria [P]

1. `package.json` diff contains exactly: `+ "test": "vitest run"` and `+ "vitest": "<approved version>"` in devDependencies. `package-lock.json` updated by the install, nothing else hand-edited.
2. `vitest.config.ts` exists with Node environment and the `@/*` alias working (proven by a test importing `@/lib/tools/cost-profit`).
3. **Smoke suite proves the harness on existing code** (no new production code): ≥6 tests against `src/lib/tools/cost-profit.ts` covering profit mode, price mode, the ≥100% margin validation error, and divide-by-zero safety — all passing.
4. `npm test`, `npm run build`, `npm run lint`, `npx tsc --noEmit` all pass; lint shows no new warnings beyond the 5 historical ones.
5. A deliberately broken assertion, run once during the slice, fails the suite (negative control) — then is removed. Recorded in the slice report.
6. Dependency note recorded: audit status of the new tree = UNVERIFIED (403) unless the owner-side check (§S-9) has been done; Dependabot recommendation restated.
7. Rollback = revert the single commit (config + lockfile + smoke test); no production code touched, so rollback cannot affect the live site even if the branch were merged — it won't be, per gates.


---

## G. USA landing-page blueprint

**Route:** `/websites-for-us-small-business/` — implemented as `src/app/websites-for-us-small-business/page.tsx` (server component) + small client islands only where interaction requires them (FAQ accordion can be native `<details>` like `/faq` [V], so the page can ship with **zero** custom client JS beyond shared chrome — a performance advantage §I.3 relies on). **Content source:** a new `usWebsites` data block in `src/lib/site.ts` (packages, inclusions/exclusions, FAQs, process steps) so copy changes never touch components [P, per AGENTS.md source-of-truth rule]. **Copy:** Blueprint v3 §5 draft, subject to the open decisions in §K (notably F1/F2 wording standardization and contract-language decisions) and the prices-publication approval. Nothing in this section authorizes publishing prices.

### G.1 Page structure mapped to the prompt's 12-part architecture

| # | Section | Implementation | Reuse |
|---|---|---|---|
| 1 | Hero | `.hero-indigo` dark hero; H1 "A website that rings your phone."; dual CTA (estimator, pricing anchor); trust line naming OrderMate/FBR Digital/WaterFlow factually | §D.3 primitives; homepage hero composition |
| 2 | Trust & positioning | Honesty panel: Pakistan-based, worldwide clients, no US office — stated, not hidden (v3 §5/§6). No testimonials, no logos wall, no metrics (none exist to claim) | `.glass-panel` |
| 3 | Problem → service overview | 3 problem cards (v3 §2 copy) bridging into the service overview | `.card-premium`, `FeatureCard` pattern |
| 4 | Three plans | Plan cards from `site.ts` data: "from $899 / $1,999 / $3,799", inclusions, explicit exclusions, payment milestone line, timeline line | §D.4 plan-card variant |
| 5 | Plan comparison | Responsive comparison table (inclusions matrix mirroring estimator §4.3) | New primitive §D.4(1) |
| 6 | Optional care plans | $79/$149/$299 cards with opt-in wording verbatim in spirit: optional, separately consented, never automatic; cancellation terms as approved in v3 §3.3 for the $299 plan, §K decision for $79/$149 wording parity | `.card-premium` |
| 7 | Process & deliverables | 4 steps + "clock starts at completed intake" note | `.process-grid`, `howItWorks` pattern |
| 8 | SEO/AEO/GEO explanation | Plain-language section: on-page SEO, GBP, citations, schema, `llms.txt` (AI Visibility), review system; **no ranking promises** — v3 §5.9 FAQ language governs | `.card-premium` grid |
| 9 | FAQ | v3 §5.9 eight Q&As, native `<details>`, FAQPage JSON-LD (§I.2) | `/faq` pattern, `.faq-preview` |
| 10 | Estimator band + lead capture | Estimator teaser band linking to `/tools/website-cost-estimator/`; lead form section (§H.2 fields) with package pre-selection via query param (`?plan=growth`) — validated against the plan enum server-side, mirroring the contact page's `interest` handling [V] | `.finder-section`, `DemoRequestForm` pattern |
| 11 | Contact & consultation CTA | Country-aware contact block (§G.5): email + consultation CTA primary for international/US; +92 details unchanged for PK; business identity never geo-masked | `ContactDetails`/`ContactCTA` (extended additively) |
| 12 | Legal links | Existing footer already links Privacy/Terms; the page adds no new legal surface until B2 text ships | Footer as-is |

### G.2 Conversion and mobile design rules [P]

- One primary CTA per viewport-height on mobile: hero → estimator; pricing → plan select (scrolls to lead form with plan pre-chosen); final → lead form.
- Sticky mobile CTA (v3: only once a US contact route exists — satisfied by this page's own lead form + email CTA; **never** the +92 WhatsApp float for US-context visitors on this page; the site-wide floating WhatsApp button behavior on this route is a §K decision — recommendation: suppress the float on the two US routes only, via a route-level flag in `page-parts` rendering, decided in P1.4 and verified in P1.6).
- Click-to-call is **not** offered to US visitors (no US number exists — B1). US CTAs are: estimator, lead form, email. Anything else would imply a presence TriangleTech does not have.
- Page weight budget: no new images beyond the shared OG asset and existing case-study imagery; icons from the existing registry; performance targets in §I.3.

### G.3 Content strategy [P]

- US English spellings throughout (governance rule); Raleigh–Durham–Cary named as the initial focus area truthfully ("we're currently onboarding HVAC and plumbing businesses in the Raleigh–Durham–Cary area") — framed as service focus, never as physical presence.
- Case studies (§7 of v3 copy): the three real client websites with honest labels; caption per v3.
- Market-gap claims remain **blocked** (§10 of v3) until re-verified at build time; the P1.5 copy checklist includes a line-item re-verification step or the claims stay out.
- Every price carries "from" + the v3 footnote (ownership, transfer, bug-fix window, no lock-in, final price in writing).

### G.4 Commercial implementation implications (§9 of the brief) [P]/[D]

| Topic | What the code/page must express | Status |
|---|---|---|
| "Starting price" wording | "from $X" everywhere; estimator always "indicative estimate" + the exact v3 §4.6 explanation | Specified (v3) |
| Scope limitations | Inclusion/exclusion lists per plan rendered from `site.ts` data so page and estimator matrix cannot drift | Specified (v3 §3/§4.3) |
| Revision limits | 1 round (Starter) / 2 rounds (Growth, AI Visibility) stated on cards | Specified; **definition of a "round" is an open decision (§K)** |
| Payment milestones | 100% upfront / 50-50 ($1,000+$999) / 40-30-30 ($1,520/$1,140/$1,139) stated on cards | Specified (v3 §3) |
| Third-party fees | Booking tools, domains, premium plugins etc. excluded — estimator booking adder already discloses "third-party booking fees separate" | Specified for estimator; **page wording is an open decision (§K)** |
| Maintenance exclusions | Retainer exclusion list exists for $299 plan (v3 §3.3); Essential/Growth care contents are named and priced but their inclusion lists are thinner in v3 | **Open decision (§K): publish care-plan inclusion lists or keep care plans as a consultation topic in Phase 1** |
| Optional care subscriptions | Never pre-selected anywhere (estimator rule §4.1(3) + form rule §H.2); cancellation language per v3 §3.3 | Specified |
| Lead qualification | Lead form captures trade, plan interest, estimate snapshot, preferred contact method (§H.2) — enough to qualify without a sales call script | Specified (v3 §7) |

This report invents no contractual terms: every row marked "open decision" goes to §K and blocks only the copy-finalization step of P1.5, not the component work in P1.4.

### G.5 Country-aware contact (v3 §6) — technical design [P]

- **Detection:** server component reads the platform country header (`x-vercel-ip-country`) via `headers()` in the US routes only; values: `PK` → existing +92 phone/WhatsApp block unchanged; any other present value → international variant (email + consultation CTA primary, WhatsApp as an explicit secondary link); header absent/unrecognized → unknown variant = email/form (same as international minus any country-specific wording).
- **Boundaries:** the header is trusted only for presentation, never for access control or pricing; the resolved country is **not stored** with leads (v3: coarse only, nothing collected); the footer business identity (Pakistan-based) renders identically for all variants.
- **Testing:** header spoofing in local/preview verification for the three variants (v3 Day-4 test gate carried into P1.5/P1.10).
- **Scope guard:** existing pages (including `/contact` and the PK demo flow) are untouched; the country-aware block ships only on the two US routes in Phase 1.

---

## H. Estimator and lead architecture

### H.1 Deterministic estimator — `src/lib/tools/website-estimator.ts` [P]

**Status:** module does not exist [V]; location and `RULES_VERSION = "1.1.0"` are approved planning specification (corrected AGENTS.md). **Design follows the `cost-profit.ts` precedent exactly** (§C.4): pure functions, discriminated-union types, no I/O, no `Date`/`Math.random`, no imports beyond types.

**Module structure:**

```ts
export const RULES_VERSION = "1.1.0" as const;

// Owner-controlled pricing configuration — the ONLY place numbers live.
export const ESTIMATOR_CONFIG = {
  tiers: {
    starter:       { basePrice: 899,  includedPages: 3,  label: "Starter Website" },
    growth:        { basePrice: 1999, includedPages: 5,  label: "Growth SEO" },
    ai_visibility: { basePrice: 3799, includedPages: 15, label: "AI Visibility" },
  },
  extraPagePrice: 99,
  adders: { redesign: 150, online_booking: 150, blog: 100, photo_gallery: 75,
            multiLocationPerExtra: 150,
            copywritingByTier: { starter: 150, growth: 300, ai_visibility: 500 } },
  rushMultiplier: 1.15,
  timelines: { starter: "~7 days", growth: "2–3 weeks", ai_visibility: "4–6 weeks" },
} as const;
```

(Prices shown are the provisional v3 figures; they enter the config **only** under the prices approval — the module's tests import the same config, so an approved price change updates code and expectations together, while the *worked examples* in tests pin the arithmetic independently.)

**Types:**

```ts
export type ProjectType = "new" | "redesign";
export type Trade = "hvac" | "plumbing" | "electrical" | "roofing" | "landscaping" | "other";
export type Tier = keyof typeof ESTIMATOR_CONFIG.tiers;
export type Feature = "online_booking" | "quote_forms" | "blog" | "photo_gallery"
                    | "multi_location" | "ecommerce" | "crm_integration";
export type ContentReadiness = "have_content" | "need_copywriting" | "need_photo_direction";
export type VisibilityNeed = "none" | "local_seo" | "ai_visibility";
export type Timeline = "asap" | "standard" | "flexible";

export interface EstimatorInputs {
  projectType: ProjectType;
  trade: Trade;
  tier: Tier;                    // visitor-chosen; UI defaults it to the recommendation
  pages: number | "20+";
  features: Feature[];
  locationCount?: number;       // required iff features includes multi_location; 2–10
  content: ContentReadiness;
  visibilityNeed: VisibilityNeed;
  timeline: Timeline;
}

export type EstimateResult =
  | { kind: "estimate"; rulesVersion: typeof RULES_VERSION;
      recommendedTier: Tier; chosenTier: Tier;
      lineItems: { id: string; label: string; amount: number }[];
      total: number;                 // one-time indicative estimate, whole dollars
      rushApplied: boolean; notes: string[];   // deterministic note ids → UI copy map
      coverageNote?: string;         // set when chosen tier < recommended
      timelineLabel: string;
      retainerInfo: boolean }        // true → UI shows the opt-in info box; NEVER a line item
  | { kind: "custom_quote"; rulesVersion: typeof RULES_VERSION;
      reasons: string[]; notes: string[] }     // §4.5 order: 20+ → ecommerce → crm
  | { kind: "invalid"; rulesVersion: typeof RULES_VERSION;
      fieldErrors: Partial<Record<string, string>> };
```

**Function contract:** `normalizeInputs(raw: unknown): EstimatorInputs | fieldErrors` (sorting `features` into the canonical §4.4 order, deduplicating, coercing `locationCount` 1 → feature dropped per §4.8, forcing `timeline: "asap" → "standard"` with a note when `content !== "have_content"`) followed by `calculateEstimate(normalized): EstimateResult` implementing §4.5's fixed order: validate → custom-quote short-circuit (first match wins, others as notes) → recommendation → base + pages + adders → rush on the adder-inclusive subtotal, rounded to the nearest dollar. **Determinism:** identical normalized inputs → byte-identical `JSON.stringify(result)`; the function reads nothing outside its arguments and `ESTIMATOR_CONFIG`.

**Validation strategy:** the module validates its own inputs (it cannot trust the client); the estimator *page* additionally validates with the same rules for inline UX. If the estimate is ever submitted to the lead endpoint, the server re-runs `calculateEstimate` on the submitted inputs and stores the **server-computed** snapshot — a tampered client total can never enter a lead record.

**Test requirements (P1.9 acceptance):** the 40 scripted pairs from v3 §4.9 including worked examples A–E verbatim (A $1,999 · B $1,349 · C $4,199 · D $1,196 + coverage note · E custom), tier/pages independence, no-double-charge, no-auto-retainer (assert no line item and no total ever contains the $299 figure), indicative-wording (the exact §4.6 explanation string is a UI constant asserted in a test), determinism property test (100 shuffled-feature-order runs → identical JSON), rush gating, and every §4.8 edge case.

**UI (separate slice scope, P1.9 second half):** route `/tools/website-cost-estimator/` = server shell (`pageMetadata` + BreadcrumbList, following the calculator pages [V]) + `estimator-client.tsx` using `.finder-panel/.finder-progress/.finder-option` and `.result-card`; native controls (radios/selects/stepper) for keyboard operation; the tools registry entry flips to `live` in the same slice; sitemap gains both new tool/landing URLs explicitly. JS budget <30 KB for the estimator island (v3 §8) — trivially met by a single component importing the pure module. Graceful degradation: with JS disabled the page shows the packages summary + lead form link (v3 §9).

### H.2 Lead capture — privacy-conscious architecture [P]

**Endpoint:** `POST /api/leads` (`src/app/api/leads/route.ts`, `runtime = "nodejs"`, following the chat route's hygiene precedent and the AGENTS.md security principles).

**Request flow:**

1. Client form (landing page §10 and estimator breakdown form share one component) → zod schema validation **client-side for UX** (shared schema module `src/lib/leads/schema.ts` — pure, unit-tested) → POST.
2. Server: content-type + body-size cap → honeypot check → time-trap (issued-at token) → zod `safeParse` (strict whitelist, length caps, email format) → best-effort per-IP rate limit (chat-route pattern) → **storage adapter** → notification → `{ ok: true, reference }` (opaque, non-sequential).
3. Failure discipline: validation → 400 with field errors; spam signals → silent 200 (never teach bots); storage/notification failure → 500 **and** the client offers the mailto fallback with the same data pre-composed (the existing demo-form behavior) so a lead is never lost to an outage without the visitor knowing.

**Fields (v3 §7.1–7.2, minimized):** name, business name, email (required); phone (optional); trade; plan interest; preferred contact method (email / call with window); estimator inputs + server-recomputed snapshot + `RULES_VERSION` (when originating from the estimator); consent record `{ marketing: boolean, timestamp, policyVersion }` — the marketing checkbox is independent and unchecked by default; the breakdown-request itself is the transactional basis for the reply email and is recorded separately from marketing consent. Source page path only — no referrer fingerprinting, no tracking IDs.

**Storage abstraction:**

```ts
interface LeadStore { save(lead: LeadRecord): Promise<{ reference: string }> }
```

Two implementations behind one interface, chosen by env at deploy time:
- **`EmailOnlyLeadStore` (Phase 1 default):** formats the lead as a structured email to the US alias (A2) via the approved sending provider (§S-8 decision). *Operational limitations, stated plainly:* no queryable database (qualification/reporting is inbox work), retention/deletion = mailbox discipline (the 12-month rule becomes a documented manual purge until a store exists), delivery risk concentrated in one mailbox (mitigated by the provider's send log + a daily digest reconciliation), no automated purge job (v3 §7.3's automation assumes a database). These limitations are the documented trade for launching without the blocked Supabase audit (A4), and they are acceptable for Phase 1 lead volumes **only** with the owner's explicit acceptance (§K).
- **`SupabaseLeadStore` (blocked):** implemented only after the §10 database audit returns; isolated `us_leads` table, RLS team-only, per v3 §7.2. The interface exists so this is a new file, not a refactor.

**Spam/abuse:** §S-7 set (honeypot, time-trap, rate limit, strict schema) + env kill switch. **Confirmation UX:** success panel states exactly what happens next and the response promise (first response within 1 US business day, v3 §7.2) — and the thank-you state is part of the page (no separate indexable thank-you URL; if one is later created it must be `noindex` per v3 §8). **PDF breakdown:** deferred behind the same endpoint (server-generated from the snapshot) — recommended as a P1.8 stretch item, **not** a launch dependency; the email breakdown (plain, complete) ships first. Rationale: PDF generation adds a dependency and an attachment-scanning surface for zero qualification value in Phase 1.

**Decisions required before P1.8 implementation (§K):** email-only acceptance; sending provider + domain + SPF/DKIM ownership; US alias creation (A2); retention mechanics in email-only mode (who purges, when, how recorded); policy version string for consent records (ties to B2 text).

### H.3 Where this leaves the "one form endpoint" boundary

Blueprint v3 §9 allows exactly one form endpoint in Phase 1. This design keeps it: the chat route is pre-existing and untouched; `/api/leads` is the one new endpoint; the estimator itself makes **no** network call to produce an estimate (v3 §7.1 step 1).

---

## I. SEO / AEO / GEO strategy and release architecture

### I.1 Existing technical SEO state [V]

- **Metadata:** every page via `pageMetadata()` — absolute title template, description, canonical (`alternates.canonical`, resolved against `metadataBase = https://triangletech.co` in the root layout), Open Graph + Twitter cards with the shared `/opengraph-image` (1200×630). Consistent and correct.
- **Sitemap:** generated from `site.ts` data + a literal `staticPages` list. **Gap:** the two live calculator routes are missing (they are sub-routes, not auto-included — the exact trap AGENTS.md warns about). No `lastModified`/priority (acceptable; Google largely ignores the latter).
- **Robots:** allow-all with sitemap reference.
- **Structured data today:** `Organization` (root layout, `@id …/#organization`), `Service` on `/services` + `/services/[id]` (with `provider` @id reference — the pattern to extend), `BreadcrumbList` (tools pages), `ItemList`/`CollectionPage` (/tools). **No `FAQPage` anywhere** despite a full FAQ page; **no `areaServed`** anywhere yet.
- **Semantic/a11y foundations:** single `<main id="main-content">`, skip link, semantic sections, `<details>` FAQs — a solid base for answer-oriented structure.
- **Indexability:** static prerender confirmed live (`X-Nextjs-Prerender: 1`, Vercel cache HIT) [V].

### I.2 Recommendations for the new routes [P]

1. **Landing page schema:** one JSON-LD graph emitted with the established escaping pattern: `Service` (`name`, `description`, `provider: {"@id": "…/#organization"}`, `areaServed: {"@type": "Country", "name": "United States"}`, `serviceType: "Website design"`, offers referencing the three plans with `priceSpecification` **only after** prices approval) + `FAQPage` built from the same `site.ts` FAQ array that renders the visible accordion (single source — schema can never drift from visible copy) + `BreadcrumbList` (Home → Websites for US Small Businesses). **Never** `LocalBusiness`, never an address, never `geo`.
2. **Estimator page schema:** `BreadcrumbList` (Home → Tools → Website Cost Estimator) mirroring the existing calculator pages; the tool itself described in the registry/ItemList on `/tools` when it goes live.
3. **Sitemap:** add `/websites-for-us-small-business` and `/tools/website-cost-estimator` explicitly; also add the two existing calculators (one-line fix of the §C.8(3) gap, included in P1.7 as a separately listed diff line for owner visibility).
4. **Internal linking:** from `/services/web-apps` and `/services/ui-ux-design` detail pages (contextual sentence + link), from `/tools` (registry), one footer link, and one homepage services-section link — the complete set v3 §9 sanctions; no other existing page is modified.
5. **AEO/GEO (answer readiness, no promises):** answer-first copy blocks (each FAQ answer is self-contained in ≤60 words before elaboration), the comparison matrix as a real HTML table (machine-readable), `llms.txt` is a **deliverable of the AI Visibility package for clients**, and for TriangleTech's own site it is optional — P1.7 includes a minimal `/llms.txt` (static public file summarizing the company + the US offering with links) as a low-cost experiment, clearly labeled as such; no citation or ranking outcome is promised anywhere (v3).
6. **Geographic truthfulness:** Raleigh–Durham–Cary appears as *service focus* language; `areaServed` at country level only (a state/city `areaServed` is permissible schema-wise for a service genuinely offered there remotely — recommendation: country-level in Phase 1 to avoid any implication of local presence; revisit with the owner in P1.7).
7. **Search Console (B3):** owner confirms property access; on launch, submit the sitemap and request indexing for the two URLs — a P1.12 checklist item, not a code task.

### I.3 Performance and quality targets (§15 of the brief) [P]

Targets are **recommended targets**, not measurements. The only measured baseline is historical [H]: build passes 40/40 pages. No Lighthouse scores exist yet and none are claimed.

| Metric | Target (both new pages, mobile, mid-tier 4G) | How verified |
|---|---|---|
| LCP | ≤ 2.5s | Lighthouse on Preview (P1.6/P1.11) |
| INP | ≤ 200ms | Lighthouse/lab + field later |
| CLS | ≤ 0.1 | Lighthouse |
| Lighthouse categories | ≥ 90 (Performance, Accessibility, Best Practices, SEO) | P1.6 gate |
| Estimator JS | < 30 KB (island, gzip) | Build output inspection |
| Landing custom JS | ~0 beyond shared chrome (FAQ native) | Build output inspection |
| Images | `next/image` with AVIF/WebP for any new raster imagery; existing `<img>` warnings untouched (not Phase 1 scope) | Lint + review |
| Fonts | No new families; existing Inter/Sora subsets | — |
| Accessibility | WCAG 2.2 AA; axe 0 critical; keyboard-complete estimator; focus visible everywhere | P1.6 checklist (§J) |
| Regression | Existing routes' build output unchanged except sanctioned additions (sitemap entries, links) | Diff of build route list in P1.10 |

### I.4 Vercel and release-control plan (§13 of the brief) [P]

**Known state [V]/[H]:** projects `triangletech` + `triangletechco` under one account; every `main` commit has produced Production deployments in both; branch ref creation alone produced none; branch commit pushes produced Previews in both; which project holds the `triangletech.co` domain and each project's Preview toggle remain **dashboard-unverified**.

**Branch strategy:** `feature/usa-growth-phase1` is the only Phase 1 working branch (from `40cbce8f` + P1.1 governance commits). One commit per slice (§J). No other feature branches; the review branch is frozen.

**Preview verification:** the **first push of the feature branch** is itself a controlled experiment requiring its own owner authorization (it will likely create Previews in both projects — desirable for UAT, but an external side effect). Before that push, the owner completes the dashboard audit (domain assignment, Production Branch = `main` on both projects, Preview toggles) so Preview behavior is known rather than inferred. All UAT (P1.11) happens on Preview URLs; both projects' Previews are checked because both exist.

**Environment isolation:** Phase 1 needs at most: lead-endpoint env (sending provider key, destination alias, kill switch) set for **Preview + Production separately** in the dashboard (owner action); no env changes are made by code slices. Estimator and landing are static/client-side and env-free.

**Deployment checks (per release):** build passes locally → push (authorized) → Preview deployment READY in the intended project(s) → smoke suite (§J P1.11) → owner production approval → merge to `main` (the production trigger) → post-deploy smoke on `triangletech.co` (both project production URLs checked to detect divergence).

**Rollback readiness:** Phase 1 is additive; rollback = revert the merge commit on `main` (redeploys prior state) or, pre-merge, abandon the branch. The estimator/landing slices keep the v3 §9 property: deleting the two routes + endpoint + links restores the prior site (verified as acceptance test AT-7 in P1.10).

**Production approval:** a named, written owner approval per release (P1.12) — never inferred from slice approvals, per the governance authorization tiers.


---

## J. Implementation roadmap — Phase 1 slices

Dependency order (evidence-driven): **P1.1 → P1.2 → P1.3 → P1.4 → P1.5 → P1.6 → P1.7 → P1.8 → P1.9 → P1.10 → P1.11 → P1.12.** Rationale: synchronization before everything (nothing may be built on a divergent base); test foundation before the estimator (its test contract is the spec) but the landing page does not wait for the estimator (P1.5 before P1.9 — the page links to the estimator, the estimator does not block the page; the estimator band renders a "coming soon"-free design by linking only once P1.9 lands — sequencing note: P1.5 ships the band with the link target created in P1.9, so **neither page is production-released before P1.10**, which is consistent with the single release train in P1.12); security headers early (P1.3) so every later Preview is built under them; lead capture (P1.8) after the landing page exists to host the form; SEO (P1.7) after both pages' content stabilizes.

Every slice: work on `feature/usa-growth-phase1` only · one commit per slice · slice report in the §11 status format of the Master Prompt · **no push without its own authorization** (the first push is called out in P1.4's gate).

### P1.1 — Safe repository synchronization and governance integration
- **Objective:** execute §B.4 exactly; feature branch gains the four governance files (byte-identical to `d5877c3a`) + the approved MEMORY.md status update.
- **Files:** `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `docs/design-tokens.md` (additions only; MEMORY.md additionally modified by the §B.5 wording in its own commit).
- **Dependencies:** owner approval of this slice + of the §B.5 wording (or ChatGPT-amended wording).
- **Acceptance criteria:** pre-flight SHAs re-verified; blob-identity check passes post-fetch; two commits exactly as §B.4(5–6); `git status` clean; diff vs `origin/main` = the four files only.
- **Automated tests:** none (docs). Entry re-check: `npm run build` still passes on the feature branch [re-runs the [H] baseline].
- **Manual verification:** `git log`, `git diff --stat`, byte-compare of the three unmodified files against remote `d5877c3a` content.
- **Security:** no secrets involved; confirms the public-repo rule (nothing sensitive in the four files — verified this gate).
- **Definition of Done:** branch state reported with SHAs; stopped for next approval. **No push in this slice.**
- **Owner approval required:** yes — slice execution + §B.5 wording.
- **Rollback:** `git reset --soft 40cbce8f` on the local feature branch restores the exact pre-slice state (staged files return to the index); nothing remote exists to roll back.

### P1.2 — Testing infrastructure
- **Objective:** §F.3 stack; harness proven against existing `cost-profit.ts`.
- **Files:** `package.json` (script + devDependency), `package-lock.json` (install-generated), `vitest.config.ts` (new), `src/lib/tools/cost-profit.test.ts` (new).
- **Dependencies:** P1.1; **Vitest dependency approval** (pending from earlier package; re-check latest version at install).
- **Acceptance criteria:** §F.4 items 1–7, all of them.
- **Automated tests:** the ≥6 smoke tests + negative control (§F.4.5).
- **Manual verification:** diff inspection of `package.json` (exactly two additions); build/lint/tsc parity with baseline.
- **Security:** new-dependency note; audit UNVERIFIED unless owner-side check done (§S-9); zero lifecycle scripts confirmed in the install output.
- **DoD:** `npm test` green from a clean `npm ci`; slice report with exact versions. No push.
- **Owner approval required:** dependency approval (distinct from slice approval).
- **Rollback:** revert the single commit; lockfile restores exactly (verify with `npm ci`).

### P1.3 — Security baseline (headers + phased CSP)
- **Objective:** §E.2 header set live in code; CSP report-only first.
- **Files:** `next.config.ts` only.
- **Dependencies:** P1.1 (P1.2 not required).
- **Acceptance criteria:** all §E.2 headers present on every route of a production build served locally; CSP-Report-Only emits zero violations across a full route crawl; build/lint/tsc green; chat route still functions in demo mode.
- **Automated tests:** a header-assertion script (curl-based) run against the local prod server, output attached to the slice report. (A Vitest test of the config object is optional; the curl check is the evidence.)
- **Manual verification:** route crawl checklist (all routes from §C.1); visual spot-check of home, a product page, a calculator.
- **Security:** this slice *is* the security slice; enforcement of CSP (dropping Report-Only) happens only after a clean Preview report window and a separate owner-visible confirmation inside the P1.11 gate.
- **DoD:** headers verified with evidence; CSP phase-2 (enforce) explicitly listed as pending, not silently assumed.
- **Owner approval required:** slice + header set (§E.2 table).
- **Rollback:** revert commit — config returns to empty; zero content impact.

### P1.4 — Reusable landing-page component architecture
- **Objective:** the additive design primitives (§D.4) and presentational components for plans/comparison/process, built and verified in isolation before page assembly.
- **Files:** `src/app/theme-indigo.css` (appended opt-in classes only, ≤6), new components under `src/components/us/` (`plan-card.tsx`, `plan-comparison.tsx`, `process-steps.tsx`, `us-faq.tsx` — final names at implementation), `src/lib/site.ts` (additive `usWebsites` data block — copy per v3 §5 as approved), a temporary local preview route **not** committed (or Storybook-free harness page deleted before commit).
- **Dependencies:** P1.1; prices/copy approval for the data block content (components can be built with placeholder-free real copy only — do not invent interim copy).
- **Acceptance criteria:** zero changes to existing classes (CSS diff is append-only, proven by diff); existing-page visual regression check (Gate 0 method: rebuilt existing card vs production screenshot — no perceptible difference); components render all three plans + comparison from `site.ts` data alone.
- **Automated tests:** Vitest render-free tests of the data block invariants (prices match the approved figures; every plan has inclusions+exclusions; FAQ array non-empty) — data tests, not DOM tests (§F.2).
- **Manual verification:** keyboard tab order through plan cards; 360px and 1280px layouts; forced-colors spot check.
- **Security:** no new attack surface (presentational). Sticky-CTA/WhatsApp-float decision (§G.2) recorded here.
- **DoD:** components + data committed; demoed via local build; **first branch push may be requested at this point** (Preview side effect in both Vercel projects — separate explicit authorization).
- **Owner approval required:** slice; §D.4 primitives; §G.2 float decision; push authorization when requested.
- **Rollback:** revert commit; appended CSS is inert if components are removed with it.

### P1.5 — USA landing-page implementation
- **Objective:** assemble `/websites-for-us-small-business/` per §G.1 with country-aware contact block (§G.5) and the lead-form **UI** wired to a disabled-until-P1.8 submit state (form renders, validates client-side, and shows the honest "consultation requests open by email" interim state — or the slice lands together with P1.8 if the owner prefers no interim state; ordering option presented at slice approval).
- **Files:** `src/app/websites-for-us-small-business/page.tsx` (new), `src/lib/site.ts` (page data if not completed in P1.4), `src/app/sitemap.ts` (+1 line — flagged as an existing-file modification for approval visibility), internal-link additions on `/services/web-apps` + `/services/ui-ux-design` + footer (each a listed diff line).
- **Dependencies:** P1.4; copy-finalization decisions (§K items on revision definition, third-party fees wording, care-plan inclusions, F1/F2).
- **Acceptance criteria:** all 12 §G.1 sections present; honesty checklist passes (no LocalBusiness, no invented claims, US spellings, Pakistan-based visible, "from" pricing, prices match `site.ts`); country variants render correctly under header spoofing (PK / US / absent); metadata via `pageMetadata()`; JSON-LD per §I.2(1) validates (structured-data tester output attached).
- **Automated tests:** data-invariant tests extended (schema FAQ array === rendered FAQ array is guaranteed by construction — single source — and asserted in a unit test of the data module).
- **Manual verification:** full-page review at 360/768/1280px; screen-reader pass over headings/landmarks; link check.
- **Security:** query-param plan pre-selection validated against the enum (mirror of the contact-page pattern [V]); no PII in URLs.
- **DoD:** page complete on Preview/local; not released (release is P1.12).
- **Owner approval required:** slice + final copy + the existing-file modifications list.
- **Rollback:** delete the route + revert link/sitemap lines (AT-7 property preserved).

### P1.6 — Responsive and accessibility verification
- **Objective:** prove §I.3 quality targets on the new page(s) as they exist so far; fix defects found (fixes are the only code changes).
- **Files:** only defect fixes in P1.4/P1.5 files, each listed.
- **Dependencies:** P1.5 (runs again after P1.9 for the estimator page).
- **Acceptance criteria:** Lighthouse (mobile) ≥90 all categories on the landing page; axe 0 critical/serious; keyboard-only completion of every interactive element; contrast spot-checks against §D.2 values; 200% zoom reflow; reduced-motion behavior confirmed.
- **Automated tests:** Lighthouse CI-style scripted run (local) with reports attached; axe via browser tooling.
- **Manual verification:** the P1.6 checklist itself, signed off line-by-line in the slice report; **no invented scores** — reports are attached or the item is marked unmeasured.
- **Security:** none.
- **DoD:** measured results table (actual numbers) delivered; unmet targets listed as defects with owners, not rounded up.
- **Owner approval required:** slice (verification-only scope + fix list).
- **Rollback:** n/a (fixes revert individually if a fix regresses).

### P1.7 — SEO / AEO / GEO implementation
- **Objective:** §I.2 items 1–5 across both new routes (estimator route may be a metadata-complete shell if P1.9 has not landed — sequencing decided at slice approval; the sitemap additions for a route happen only when that route exists).
- **Files:** landing page file (schema block), estimator page file (schema block), `src/app/sitemap.ts` (entries incl. the two existing calculators), `public/llms.txt` (new, if approved), internal-link lines (if not already in P1.5).
- **Dependencies:** P1.5; P1.9 for estimator-route items.
- **Acceptance criteria:** schema validates; canonicals absolute; sitemap contains exactly the intended additions; `llms.txt` contains no unverified claims; GA4 + consent are **not** in this slice unless the owner moves them here — default: analytics/consent ships as its own mini-slice (P1.7b) together with the B2 privacy text dependency made explicit, because §S-11 requires analytics + consent + privacy text to move together.
- **Automated tests:** sitemap content assertion (unit test or build-output grep) listing expected URLs.
- **Manual verification:** structured-data validation output; view-source inspection of both pages; robots/sitemap fetch on Preview.
- **Security:** JSON-LD escaping pattern reused exactly [V]; no user input reaches schema.
- **DoD:** SEO checklist (§I.2) evidenced item by item.
- **Owner approval required:** slice; `llms.txt` inclusion; `areaServed` granularity (§I.2.6).
- **Rollback:** revert commit; sitemap returns to current state.

### P1.8 — Lead capture foundation
- **Objective:** §H.2 end to end in email-only mode: shared zod schema, `/api/leads`, `EmailOnlyLeadStore`, form integration on the landing page + estimator breakdown form, confirmation UX, kill switch.
- **Files:** `src/lib/leads/schema.ts` (new), `src/lib/leads/store.ts` (new, interface + email implementation), `src/app/api/leads/route.ts` (new), lead form component (new, `src/components/us/lead-form.tsx`), landing/estimator page integrations, `.env.example`-style documentation **in the slice report only** (no env files committed).
- **Dependencies:** P1.5; **§K decisions**: email-only acceptance, sending provider + domain + SPF/DKIM verified, US alias live (A2), retention mechanics in email mode, consent policy-version string. Supabase remains blocked and unused.
- **Acceptance criteria:** 20 test submissions incl. attack payloads (v3 Day-4 gate): valid → stored(emailed) + reference; invalid → 400 field errors; honeypot/time-trap → silent drop; oversized → rejected; kill switch → form shows email fallback; **no PII in any log line** (grep evidence); server recomputes estimate snapshots (tampered totals rejected); consent record reflects exactly the boxes checked; confirmation states the 1-business-day promise.
- **Automated tests:** Vitest suite for the schema (valid/invalid matrix) and for the route handler with the store mocked (status codes, spam drops, kill switch, snapshot recomputation).
- **Manual verification:** real send to the alias from Preview; spam-folder check; SPF/DKIM pass on the received message (authentication headers inspected); mailto fallback exercised.
- **Security:** §S-3/S-4/S-6/S-7 controls all land here; secrets server-only via dashboard env (§I.4); rate limiting labeled best-effort in code comments as the chat route does.
- **DoD:** evidence pack (test results + received-email headers + log grep) in the slice report.
- **Owner approval required:** slice + every §K decision above (they are the slice's entry gate).
- **Rollback:** kill switch instantly; revert commit removes the endpoint; the form falls back to the email CTA state.

### P1.9 — Deterministic estimator
- **Objective:** §H.1 module + UI + the full v3 §4.9 test contract.
- **Files:** `src/lib/tools/website-estimator.ts` (new), `src/lib/tools/website-estimator.test.ts` (new), `src/app/tools/website-cost-estimator/page.tsx` + `estimator-client.tsx` (new), `src/lib/tools.ts` (registry entry → `live`), `src/app/sitemap.ts` (+1 line, if not done in P1.7).
- **Dependencies:** P1.2 (test foundation); P1.4 (finder primitives exist in CSS already [V] — components may not be needed); prices approval (figures enter `ESTIMATOR_CONFIG`).
- **Acceptance criteria:** 40 scripted pairs pass incl. examples A–E; determinism property test passes; no-auto-retainer and no-double-charge tests pass; indicative wording asserted; module coverage 100% branches; estimator island <30 KB; keyboard-complete run; no network call on estimate (verified in devtools).
- **Automated tests:** the §H.1 test requirements, complete.
- **Manual verification:** worked examples recomputed by hand from the UI; reduced-motion + 360px pass; JS-disabled degradation check.
- **Security:** pure client computation; any submitted snapshot is server-recomputed (P1.8) — no trust in client totals.
- **DoD:** test output + bundle size evidence in the slice report; P1.6 re-run for this page scheduled inside P1.10.
- **Owner approval required:** slice (figures already approved separately as prices).
- **Rollback:** delete route + module + registry line; landing estimator band link reverts to a section anchor (listed in the rollback diff).

### P1.10 — End-to-end quality verification
- **Objective:** whole-feature verification against v3 acceptance tests AT-1…AT-7 (adapted to email-only mode: AT-4's automated purge becomes a documented manual-purge drill on a test lead).
- **Files:** test files only, plus a `docs/phase1-qa/` evidence folder **in the workspace research area, not the repo**, unless the owner wants QA docs committed.
- **Dependencies:** P1.5–P1.9 complete.
- **Acceptance criteria:** AT-1…AT-7 each marked pass/fail **with evidence**; build route-list diff vs baseline shows only sanctioned additions; full `npm test`, build, lint, tsc green.
- **Automated tests:** entire suite + header assertions (P1.3) + sitemap assertions (P1.7) re-run.
- **Manual verification:** cross-browser pass (Chrome/Safari/Firefox mobile+desktop), keyboard-only estimator + form, screen-reader smoke pass.
- **Security:** final secrets scan of the branch diff; dependency status restated (UNVERIFIED or owner-checked).
- **DoD:** QA report delivered; every failure is a listed defect with a fix slice or an owner-accepted waiver — no silent passes.
- **Owner approval required:** QA scope; any waivers.
- **Rollback:** n/a.

### P1.11 — Preview UAT
- **Objective:** owner + reviewer UAT on Vercel Preview (both projects) with production-identical content.
- **Files:** none (defect fixes return to their owning slices).
- **Dependencies:** first-push authorization (if not already granted at P1.4); Vercel dashboard audit completed by the owner (domain assignment, Production Branch, Preview toggles — §I.4); CSP report window reviewed → CSP enforcement decision.
- **Acceptance criteria:** UAT checklist (owner-supplied scenarios + AT spot checks) signed; lead test email received at the alias from the Preview origin; country variants verified on real Preview URLs; Preview URLs confirmed **not** indexed (Vercel preview protection/noindex headers inspected).
- **Automated tests:** smoke script against Preview URLs (status, headers, schema presence).
- **Manual verification:** the UAT session itself.
- **Security:** confirm no env secrets leak into Preview client bundles (build-output grep); confirm Preview env values are the test values, not production.
- **DoD:** written UAT sign-off from the owner.
- **Owner approval required:** UAT participation + sign-off; CSP enforcement go/no-go.
- **Rollback:** branch remains unmerged; Previews can be left or the branch deleted (owner decision).

### P1.12 — Production release readiness
- **Objective:** the release gate — not the release itself.
- **Files:** release checklist + rollback rehearsal record (workspace docs); the merge is a separate, explicitly authorized act after this gate.
- **Dependencies:** P1.10/P1.11 sign-offs; **B2 Privacy/Terms updates drafted, reviewed, and ready to ship in the same merge**; A2 alias monitored; B3 Search Console access confirmed; dependency check completed owner-side or the risk formally accepted in writing; prices publication approval (final).
- **Acceptance criteria:** every §13 staging-readiness item from Blueprint v3 re-checked with current evidence; rollback rehearsed on Preview (revert of a test merge in a scratch branch or documented equivalent); post-deploy smoke script ready (§I.4).
- **Automated tests:** full suite green on the exact merge candidate SHA.
- **Manual verification:** checklist walk-through with the owner.
- **Security:** final header verification plan for production URLs; env production values confirmed in the dashboard by the owner.
- **DoD:** a single written go/no-go from the owner. **The merge to `main` and its Production deployments in both Vercel projects happen only under that go**, as their own authorized step, followed by post-deploy smoke tests and sitemap submission (B3).
- **Owner approval required:** the go/no-go itself.
- **Rollback:** post-merge revert procedure documented and rehearsed (§I.4).

---

## K. Risks and open decisions

### K.1 Risk register

| # | Risk | Severity | Likelihood | Mitigation | Blocking? |
|---|---|---|---|---|---|
| R1 | Push to `main` (or an ill-judged merge) triggers Production deployments in **both** Vercel projects | Critical | Low (process controls) | Branch discipline (governance tiers); merge only via P1.12 go; dashboard audit confirms Production Branch settings | Blocks P1.12 only |
| R2 | Local/remote divergence causes lost or duplicated governance work | Medium | Low after P1.1 | §B.4 sequence; blob-identity proof; frozen review branch | **Blocks all coding until P1.1** |
| R3 | No automated tests → regressions in existing pages go unnoticed | Medium | Medium | P1.2 foundation; data-invariant tests; build route-list diffing in P1.10 | Blocks P1.9 (estimator) by design |
| R4 | Dependency vulnerabilities unknown (npm audit 403) | Medium | Unknown | Dependabot (owner) or owner-machine audit; small dependency footprint; zero-lifecycle-script installs | Blocks P1.12 unless formally accepted |
| R5 | Security-header gaps persist into the US launch | Medium | Low (P1.3 scheduled early) | §E.2 set; phased CSP with evidence gates | Blocks P1.12 |
| R6 | Privacy/consent text lags the features (GA4, lead storage) | High (legal/trust) | Medium | B2 text ships in the same merge (P1.12 gate); analytics+consent+text move together (§S-11) | **Blocks production release** |
| R7 | Email-only lead delivery silently loses leads (spam folder, mailbox outage) | High (revenue) | Medium | SPF/DKIM verified pre-UAT; provider send-log reconciliation; mailto fallback on failure; alias monitoring (A2) | Blocks P1.8 until §K decisions land |
| R8 | Pricing/scope ambiguity produces disputes ("from" prices, revision rounds, care-plan contents) | Medium | Medium | §K decisions before P1.5 copy finalization; estimator's written-explanation pattern; "final price in writing" as the site-wide promise | Blocks P1.5 copy finalization |
| R9 | Scope creep (country-aware expands to all pages; PDF breakdown; Supabase "while we're at it") | Medium | Medium | v3 §9 boundaries restated per slice; PDF deferred (§H.2); Supabase hard-blocked behind its audit | No (process) |
| R10 | Accessibility regression on new pages (custom widgets, color-only states) | Medium | Low | Native controls; `.finder-*` precedent; P1.6 measured gate with attached reports | Blocks P1.10 sign-off |
| R11 | Third-party/platform risk (Vercel header trust for country detection; Anthropic for chat — pre-existing) | Low | Low | Country header used for presentation only, fail-to-unknown; chat untouched | No |
| R12 | Starter-tier economics (5.7% contribution buffer, v3 §2) erode if build hours overrun | Medium (commercial) | Medium | A1 measurement on first 3 builds (Phase 1.11 of the master roadmap, post-launch); estimator scope discipline; not a code risk | No (post-launch measurement) |

### K.2 Open decisions for the owner (grouped by when they bite)

**Before P1.1:** (1) §B.5 MEMORY.md replacement wording — approve or amend.
**Before P1.2:** (2) Vitest dependency approval (version re-checked at install). (3) Dependabot alerts — enable or defer (§S-9).
**Before P1.4/P1.5 (copy & components):** (4) Final prices publication approval ($899/$1,999/$3,799 + care $79/$149/$299) — required before any public surface, requested here for the data block. (5) Definition of a "revision round" (what counts, turnaround). (6) Third-party fee wording for the landing page. (7) Care-plan inclusion lists for Essential $79 / Growth $149 (publish contents, or consultation-only in Phase 1). (8) F1 — landing §6 "Answer 7 questions" vs the 8 estimator inputs: standardize the count wording (recommendation: name the steps as the UI presents them at build time and make copy and UI agree; flag carried from the earlier v3 verification). (9) F2 — retainer info-box wording: adopt the v3 §4.6 exact string everywhere (recommendation: yes). (10) WhatsApp float behavior on the two US routes (§G.2 recommendation: suppress on those routes only).
**Before P1.7:** (11) `llms.txt` for triangletech.co — include or skip. (12) `areaServed` granularity — country-level (recommended) vs including NC.
**Before P1.8:** (13) Email-only lead mode — explicit acceptance of §H.2's stated limitations. (14) Sending provider + sending domain; SPF/DKIM/DMARC ownership. (15) US inbox alias (A2) created + monitored; retention mechanics in email mode (who purges unconverted leads at 12 months, how it's logged). (16) Consent policy-version string (from B2 drafting).
**Before P1.11/P1.12:** (17) Vercel dashboard audit results (domain assignment, Production Branch, Preview toggles, both projects). (18) CSP enforcement go/no-go after the report window. (19) B2 Privacy/Terms final text + legal review decision. (20) B3 Search Console access confirmation. (21) First-push authorization for `feature/usa-growth-phase1` (if not granted at P1.4).

No other decisions are needed to begin: P1.1 + P1.2 require only items (1)–(3).

---

## L. Next exact action

**Recommended first coding slice: P1.2 — Testing infrastructure — executed immediately after P1.1 (synchronization), which is its precondition.** If only one slice may be named, it is **P1.1**, because no code may be written on a divergent base; but the first slice that changes the product's engineering capability — and the one ChatGPT's review should scrutinize as "the first development slice" — is P1.2. Its proposed execution scope, in full:

> **P1.1 (precondition, docs-only):** execute §B.4 steps 1–8 verbatim; two commits on `feature/usa-growth-phase1`; no push.
> **P1.2 (the first development slice):** install the approved Vitest version as a devDependency (exact `package.json` diff per §F.4.1); add `"test": "vitest run"`; add `vitest.config.ts` (Node env, `@/*` alias, `src/**/*.test.ts`); add `src/lib/tools/cost-profit.test.ts` with ≥6 tests against the **existing** calculator (profit mode, price mode, ≥100%-margin validation error, divide-by-zero safety); run the §F.4.5 negative control; verify `npm test` + `npm run build` + `npm run lint` + `npx tsc --noEmit` all pass with no new warnings; record the dependency-audit status honestly (UNVERIFIED unless owner-side check done). **No production source file is modified in P1.2. No push.** Slice report in the Master Prompt §11 format, then stop for the next approval (P1.3).

Why this order and not the landing page first: the estimator's test contract (40 pairs) is a *specification* artifact — building the harness first converts Blueprint v3 §4 from prose into executable checks before any pricing code exists, and it de-risks every later slice's regression story (R3) at the cost of one small, fully reversible commit.

---

## M. Verification evidence (this gate)

### M.1 Commands and inspections actually performed

| # | Action | Result |
|---|---|---|
| 1 | GitHub API `get_file_contents` for AGENTS.md, CLAUDE.md, MEMORY.md, docs/design-tokens.md at `sha=d5877c3a…` | All four retrieved; blob SHAs `3cb0133f… / 68b37cdb… / 255e1d5f… / 4175605f…`; correction markers confirmed (§B.1) |
| 2 | GitHub API `list_commits` for `main` and `review/usa-growth-governance-drafts` | `main` HEAD `40cbce8f…` (unchanged); review HEAD `d5877c3a…` |
| 3 | Local git (read-only): `branch --show-current`, `rev-parse HEAD`, `branch -vv`, `status --porcelain`, `diff --cached --stat`, `ls-files --others`, `stash list`, `remote -v` | §B.2 table — staged 4 files only; no untracked; no stash |
| 4 | Blob-identity proof: `git ls-files -s` vs API blob SHAs; `diff` staged content vs API-fetched remote content ×4 | **Identical, all four files** |
| 5 | Repository tree listing: `src/app`, `src/components`, `src/lib`, root configs; searches for tests, middleware, `.github` | §C.1/C.5 inventories; no tests, no middleware, no CI |
| 6 | File reads: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.js`, `src/lib/site.ts` (full), `layout.tsx`, `sitemap.ts`, `robots.ts`, `api/chat/route.ts` (full), `contact/page.tsx`, `demo-form.tsx` (full), `lib/tools.ts`, `lib/tools/cost-profit.ts` (full), calculator page/client, `guided-finder.tsx`, `services/[id]/page.tsx`, `faq/page.tsx`, `privacy/page.tsx` (targeted greps), `terms/page.tsx` (structure greps) | §C–§I findings as cited |
| 7 | Codebase greps: `zod`, `console.`, analytics/GTM terms, `cookie`, `process.env`, `headers()`, `<img` count, `next/image`, `localStorage`, `dangerouslySetInnerHTML`, JSON-LD `@type` census, `target=_blank` rel audit | zod unused; zero console.*; no analytics; 5 `<img`, 0 `next/image`; JSON-LD census §I.1; external links carry `noopener noreferrer` |
| 8 | Design-system programmatic comparison: documented tokens (with values) + classes from remote `design-tokens.md` vs `theme-indigo.css`; breakpoint/focus/reduced-motion/forced-colors census | 24/24 classes; tokens per §D.1 (0 substantive discrepancies); 6 reduced-motion blocks; 1 forced-colors block; 33 focus rules |
| 9 | Live read-only check: `curl -sI https://triangletech.co/` | §E.1 S-1 header evidence; HSTS present; CSP/nosniff/frame/referrer/permissions absent; Vercel + prerender headers confirmed |
| 10 | Blueprint v3 re-read in full (§§3–13) to ground §G/§H/§J in the approved spec | Estimator rules, worked examples, lead flow, NFRs, AT-1…AT-7, blockers A1–A4/B1–B3 as cited |
| 11 | Memory check: `~/MEMORY.md` read + `muse.memory_search` (3 queries) before starting | Prior state reconciled; this report's facts supersede where they differ (notably §B.5) |

### M.2 Limitations of this gate (named explicitly, per the standing delivery requirement)

- **Historical results were not re-run.** Build/lint/tsc/`npm ci` outcomes are Gate 0 [H] results. This gate was read-only *reporting*; executing builds would have written `.next/`/artifacts into the clone. P1.1/P1.2 re-run them as entry gates, so no Phase 1 decision rests on stale verification.
- **`npm audit` remains UNVERIFIED** (environment registry policy, HTTP 403) — §S-9. No dependency-safety claim is made anywhere in this report.
- **Vercel dashboard state is unverified** (domain assignment, Preview toggles) — all deployment-behavior statements rest on GitHub Deployments API history and the live header check, and are labeled as such.
- **CSP violation behavior was assessed statically**, not by serving the site with a report-only policy (that is P1.3's work). The §E.2 policy is a starting draft for that slice, not a verified-clean policy.
- **No Lighthouse/axe measurements exist** for any page; §I.3 contains targets only.
- **Legal sufficiency of privacy/terms text was not assessed** — §S-10 identifies coverage gaps against Blueprint v3's own requirements; closing them is owner/legal work (B2), not an engineering judgment this report can make.
- **The §B.5 MEMORY.md wording is a proposal.** The owner stated a minor update is pending; its exact intended text was not supplied, so §B.5 was derived from the file's own stale lines and is offered for approval, not asserted as the intended wording.

### M.3 Gate close

Nothing was modified outside this report file: no repository files (local clone untouched — all git commands were read-only), no governance documents, no branches, no commits, no pushes, no PRs, no deployments, no dependency changes, no external messages.

**STOPPED — awaiting ChatGPT's architectural review and owner approval of the first development slice (§L).**
