# MOAT.md — TriangleTech free tools: practical moat audit

Audit date: **2026-11-02**. Branch audited:
`feature/tools-integrated-multilingual` at remote HEAD
`3caf84b05ac3fb15e8f33a369d0bfaff327e4d50` (verified by fetch before
writing). Detailed competitor evidence lives in
`docs/moat-research-2026-11-02.md`; this file is the decision record.

Standing rule: multilingual support, premium design, free access, PDF
exports, and tool count ALONE are not a strong moat. They are table
stakes that competitors already match or can copy quickly.

## 1. Current tool inventory (verified against the branch)

### Implemented and verified (tests + local browser QA + hosted QA smoke)

- **Time Card Calculator** (`/tools/time-card-calculator`): sessions
  with overnight/next-day handling, unpaid breaks, midnight split with
  an explicit break-allocation warning, configurable overtime
  threshold/multiplier/rate, exact regular/overtime pay split,
  weekly and biweekly workweek totals, CSV import and export,
  branded PDF report, browser Print, invoice creation from hours
  (in-page invoice PDF; unit-tested, but its browser end-to-end flow
  is NOT verified — see below). Device persistence via opt-in localStorage
  ("Remember on this device") with delete. Verified: 344-test suite,
  local CDP browser QA 23/23 (0 console errors), hosted QA on
  triangletech-landscaping-qa (six routes 200, real PDF download).
- **Work Hours Calculator** (`/tools/work-hours-calculator`) and
  **Hours-to-Decimal** (`/tools/hours-to-decimal`): single-session
  converters with branded PDF result sheets (inputs, units, result,
  formula). No persistence, no import, no save.
- **Gravel / Mulch / Topsoil Calculators** (one shared component,
  `/tools/gravel-calculator`, `/tools/mulch-calculator`,
  `/tools/topsoil-calculator`): multi-area drafts (rectangle, circle,
  direct area), per-area depth and grouping, extra %, loose-volume
  multiplier, supplier density, bag volume/unit, bulk price, bag
  price, delivery charge, tax, currency, imperial/metric systems,
  bag and bulk scenarios, shopping list, plain-text export, branded
  PDF report. Device persistence via opt-in localStorage, one dataset
  per material per device, with delete. All user-facing copy in the
  shared 10-language system (en/es/fr/de/pt/ar/ur/hi/zh/ja, RTL
  ar/ur); non-Latin PDFs fall back to English with an explicit
  disclosure (shaping not implemented — never claim otherwise).
- Shared: user company branding in PDF headers (name/logo, opt-in
  device storage, local-only processing), TriangleTech footer
  attribution with clickable triangletech.co link and localized
  Page X of Y, polished form controls.

### Implemented but NOT end-to-end browser-verified

- Time Card CSV import: implemented and unit-tested; a real browser
  file-picker import run was NOT verified (desktop file input was
  exercised only for logo upload; mobile file picker is NOT TESTED
  anywhere in this project).
- Time Card invoice creation flow: implemented and unit-tested; the
  hosted browser check saw the "Create invoice" button but did not
  complete an invoice.
- Footer-link click in a real PDF viewer: NOT TESTED (this Chromium
  build's viewer never paints pages); the /Link annotation itself is
  verified exactly (URI https://triangletech.co/, footer-zone rect).
- Hosted ES/DE/AR interactive checks: limited by VM cookie-egress
  handling (cookie-bearing requests hang; not a site failure).
  Hosted locale evidence rests on the identical deployed tree plus
  local browser QA.

### Proposed (not built, not approved as scope)

- The ten hypotheses in §5 (templates, import validation, planned vs
  actual, rota, repeat-period reporting, saved contractor projects,
  supplier profiles, customer quotation, supplier-quote comparison,
  project templates). Plus the older Phase 3 idea (Website Cost
  Estimator as a standalone SaaS for agencies — explicitly not now)
  and the estimator module location (`src/lib/tools/website-estimator.ts`
  does not exist; do not cite it as an implementation).

### Missing (for these six tools)

- Accounts, cloud sync, collaboration, multi-employee management,
  scheduling/rota, payroll integrations, supplier catalogs, named
  multi-project save, customer quotation documents, quote comparison,
  APIs, mobile apps, reminders, search-indexed distribution (tools
  live on a noindex QA host, not on triangletech.co).

### Other repo tools (out of this audit's scope, noted only)

The repository also contains QR Generator, Image Compressor, Pakistan
Sales Tax Calculator, Rental Property Investment Calculator, Product
Cost & Profit Calculator, and Airbnb Booking Profit Calculator. They
were not audited. The 11 tools served by triangletech-utilities-batch-qa
are deployed-only; their source is NOT in this checkout, so they are
not claimed here.

## 2. Competitor comparison (summary; details + links in the research doc)

### Cluster A — Work hours / timesheets

| Rival | Who it serves | Free limit (Oct 2026 checks) | Where it beats us |
|---|---|---|---|
| Clockify | Freelancers, small teams | Free to 5 users; Basic $3.99/seat/mo annual | Cloud history, teams, kiosk, approvals/invoicing on paid tiers |
| Toggl Track | Freelancers, small knowledge teams | Free to 3 users; Starter $9/user/mo annual | Frictionless timer, all platforms, no surveillance |
| Homebase | Hourly shift teams | Free 1 location to 10 employees; then $30/location/mo | Scheduling, GPS clock-in, payroll in one app |
| Calculator.net time card | Anyone needing a printable card | Free, browser-saved values | Simplicity, FLSA explainer, daily/weekly OT modes |
| calculatehours.net | Anyone needing a printable card | Free, multi-employee combined total + PDF | Multi-punch days, multi-employee totals, state OT rules |
| timecardcalculator.net | Anyone needing a printable card | Free, reconstructable report link | CA daily/double-time/7th-day rules |

### Cluster B — Landscaping materials / estimates

| Rival | Who it serves | Free limit / price | Where it beats us |
|---|---|---|---|
| ~15 free calculators (SoilDirect, MulchMath, calcformula, Structure Studios, yardcalculators, landscapedestimate, Renovimo, thegravelcalculator, soilyardage, calculatepilot, diy9lives, mulch-calculator.co, thiscalc, lowesmulchcalculator) | Homeowners, one-off estimators | Free | Search-indexed single-purpose pages; several match our inputs (user prices, density, bag sizes, bulk-vs-bag) |
| Yardbook | Solo/tiny lawn & landscape crews | Free Starter (ad-supported, 1% payment surcharge per comparisons); Business $34.99/user/mo | Customers, scheduling, estimates, invoices, routing, history — in one free account; its app lists mulch/topsoil/gravel calculators |
| Jobber | Home-service businesses | No free plan; Core $29/mo annual (1 user); Connect/Grow/Plus scale with team | Quotes, scheduling, invoices, payments, job costing (Grow) |
| Housecall Pro | Home-service businesses | No free plan; Basic $59/mo annual (1 user) | Booking, estimates, dispatch, payments |

Evidence links and access dates (all accessed 2026-11-02) are in
`docs/moat-research-2026-11-02.md`. Prices rest on comparison pages
citing vendor pages checked in October 2026; re-check vendor pages
before quoting externally. No search volumes, user counts (other than
flagged vendor-reported figures), conversion rates, or revenues are
claimed.

## 3. Moat verdict by cluster

Labels: OBSERVED = seen in this repo or a cited page; INFERENCE =
reasonable conclusion from observed facts; HYPOTHESIS = untested
belief; UNKNOWN = no evidence either way.

### Cluster A — Work hours: WEAK moat today, with one real wedge

- Problem frequency and severity: INFERENCE — weekly/biweekly for
  employees and freelancers; painful when pay is wrong, but the math
  itself is a solved, 5-minute problem. Frequency is high, severity
  of the calculation step is low; severity concentrates in the
  payroll/invoice handoff, which we only partly cover.
- Specific target user: OBSERVED — we serve "anyone, no sign-up"
  rather than a named segment. That breadth is a distribution
  weakness: Clockify/Toggl/Homebase each own a named user.
- Reason to choose us: OBSERVED — no sign-up + CSV import + CSV
  export + invoice + 10 languages + branded PDF in one free page.
  No rival checked combines all six without an account. Each element
  alone is ordinary.
- Reason to return: HYPOTHESIS — weekly repetition SHOULD bring
  users back, but OBSERVED retention mechanics are thin: one
  device-local dataset, no templates, no period-over-period view, no
  reminder, no account. A user who clears browser data loses
  everything. Repeat use is currently hoped for, not engineered.
- Ease of copying: OBSERVED — the entire calculation layer is
  copyable in weeks; calculatehours.net already matches most of it,
  and Clockify/Toggl could ship a no-sign-up calculator in a sprint.
  Our renderer, dictionaries, and branding are reusable assets, not
  barriers.
- Workflow integration: OBSERVED — CSV in/out is real integration
  with payroll and spreadsheets, and it is our best workflow asset.
  No payroll, accounting, or calendar integration exists.
- Distribution advantage: OBSERVED — none. Noindex QA host, no
  triangletech.co presence, no store listing, no measured traffic.
  Free calculators win this dimension today through indexed pages.
- Data advantage: OBSERVED — none. All data is per-device
  localStorage, unaggregated, unpermissioned for any network use.
  No dataset, no learning loop, no network effect mechanism exists;
  none is claimed.
- Trust and calculation transparency: OBSERVED, genuinely strong —
  visible validation (never silent clamping), exact pay split
  (overtime = gross − regular, rounded once), midnight-split warning
  shown as an assumption, explicit threshold/multiplier/rate on the
  report. This is useful differentiation, but it is copyable and
  earns trust only if users arrive — which needs distribution.
- Switching effort without restricting portability: OBSERVED — low
  by design and that is a virtue: CSV export means a user can leave
  in one click. Do NOT manufacture lock-in by degrading export;
  switching cost must come from saved work users value (templates,
  projects), not from holding data hostage.
- Maintenance/support burden: INFERENCE — low. Static calculation,
  no backend, no accounts to support. The burden is content: 10
  locales to keep correct, and PDF/RTL edge cases.
- Monetization fit: HYPOTHESIS — the invoice step is the only
  observed bridge to money (a freelancer who invoices through the
  tool has a reason to pay for more). No pricing, paywall, or
  willingness-to-pay evidence exists. Charging for the calculator
  itself would compete with free rivals and with Clockify/Toggl free
  tiers; charging for workflow (templates, repeat reporting, invoice
  history) is the only plausible shape, and it is unproven.
- **Verdict: WEAK (ordinary features + useful differentiation, no
  proven defensibility).** The wedge is the no-sign-up
  import → calculate → invoice → export chain in 10 languages.
  It is a wedge, not a moat: it wins a first visit, not a second year.

### Cluster B — Landscaping: WEAK moat today, narrower wedge than A

- Problem frequency and severity: INFERENCE — episodic, not weekly:
  a homeowner estimates a few times a year; a contractor estimates
  per job, which IS frequent — but only if the tool holds the
  contractor's jobs, which ours does not (one dataset per material).
  Severity is moderate: ordering wrong costs a delivery fee or a
  second trip, not a payroll error.
- Specific target user: OBSERVED — again "anyone, no sign-up".
  Yardbook owns "solo/tiny crew, free"; Jobber owns "growing crew".
  We own no named segment.
- Reason to choose us: OBSERVED — multi-area projects + bag/bulk/
  delivery/tax + device persistence + branded PDF + 10 languages in
  one free page. Against free calculators this is the best
  combination checked; against Yardbook it loses on customers,
  history, and invoicing.
- Reason to return: HYPOTHESIS, weaker than A — a homeowner has
  little reason to return this year; a contractor would return only
  for saved jobs, which we cannot hold (one dataset per material,
  device-only, no names, no list). Repeat use is currently
  near-absent by construction.
- Ease of copying: OBSERVED — the volume formula is public domain
  (area × depth / 27) and ~15 free calculators already implement it
  with user prices and density. Our multi-area + cost + PDF layer is
  copyable in weeks.
- Workflow integration: OBSERVED — thin. A branded PDF report can be
  handed to a customer, but it is not a quotation (no customer,
  validity, terms, acceptance) and it connects to no supplier,
  ordering, or invoicing system. The plain-text export is a list,
  not an order.
- Distribution advantage: OBSERVED — none (same noindex QA host).
  Free calculators are indexed; Yardbook/Jobber are in app stores
  and roundups.
- Data advantage: OBSERVED — none (same device-local storage, no
  aggregation, no supplier price dataset — and building one without
  permissioned, current supplier data would be a liability, not an
  asset).
- Trust and calculation transparency: OBSERVED — strong in the same
  way as A: assumptions shown (extra %, loose multiplier, density),
  required vs purchased quantities distinguished, bag/bulk scenarios
  side by side. Copyable, but genuinely better than most one-box
  calculators.
- Switching effort: OBSERVED — near zero. Re-entering areas takes
  minutes; there is no saved job to lose. This is the cluster's
  biggest moat hole.
- Maintenance/support burden: INFERENCE — low, same static shape as
  A, plus locale upkeep.
- Monetization fit: HYPOTHESIS — the plausible bridge is the
  contractor's job folder becoming a quotation tool (estimate →
  branded customer quote → follow-up). No evidence of willingness
  to pay exists; Yardbook gives the adjacent workflow away free,
  which caps what a calculator-plus-quote can charge until it is
  clearly better for a named contractor segment.
- **Verdict: WEAK (ordinary features + useful differentiation, no
  proven defensibility).** The wedge is the most complete free
  multi-area estimate in 10 languages. It wins a first estimate, not
  a contractor's season.

### Cross-cluster verdict

- Ordinary features (both clusters): calculation math, PDF export,
  branded report, 10 languages, polished controls, free access.
- Useful differentiation (both clusters): no-sign-up + CSV in/out
  (A) / multi-area + bag-bulk-tax + device persistence (B) +
  calculation transparency + branded output in one page.
- Potential defensibility (unproven): saved work users accumulate
  (templates, projects, supplier profiles, invoice history) and the
  distribution that makes the tool findable in the first place.
- Proven defensibility (either cluster): NONE observed. No network
  effects (no mechanism, no evidence), no proprietary data, no
  distribution, no switching cost, no brand recognition measured.

## 4. Copyable features (assume a competent rival copies these in weeks)

- All calculation math in both clusters (public formulas).
- Branded PDF reports and the Indigo visual system.
- The 10-language UI and RTL layouts (dictionaries are an asset of
  effort, not a barrier).
- CSV import/export, device persistence, polished dropdowns.
- Bag/bulk scenarios, shopping lists, invoice-from-hours.
- The company-branding header concept.

## 5. Proposed advantages (HYPOTHESIS until validated — see §7)

- Saved contractor job folders (B) and work-pattern templates (A):
  accumulated user work that makes the next job faster — the only
  proposed mechanism that creates switching cost without restricting
  portability.
- Import → validation → invoice (A): a trust layer (column mapping,
  overlap/missing-break detection, overtime preview) on top of the
  existing import/invoice chain, turning a calculator into the
  freelancer's billing step.
- Supplier profiles + consistent-basis quote comparison (B): named,
  reusable price sets per supplier, so the same quantities can be
  priced two ways without re-entry.
- Estimate → branded customer quotation (B): a real quote document
  (customer, line items, validity, terms) built from the estimate,
  not just a branded calculation report.

## 6. Prioritized opportunity list and ranking

Evaluated: the ten hypotheses from the audit brief, plus better
alternatives found during research (Yardbook-style free job folder
as the reference implementation; Clockify-style project templates on
a paid tier as the template reference).

### Ranked best three

**1. Saved multi-area contractor projects (B) — build first.**
- User value: a contractor reopens last month's job, duplicates it
  for the same property, or starts a new named project instead of
  overwriting the single per-material dataset. This is the difference
  between a calculator and a job folder.
- Evidence strength: moderate — Yardbook/Jobber win on saved jobs,
  not on math (OBSERVED); that contractors repeat properties is
  INFERENCE, not measured on our users (we have no usage data).
- Repeat-use potential: high — per-job use across a season.
- Differentiation: medium — Yardbook has it, but no free
  single-purpose calculator checked does; combined with our
  multi-area + cost + branded PDF it is a distinct free offer.
- Implementation effort: moderate — named project list, open,
  duplicate, delete on top of existing localStorage persistence;
  no backend, no accounts.
- Ongoing cost: near zero (local-first; locale upkeep only).
- Why first: it fixes the cluster's biggest hole (zero switching
  cost) at the lowest cost, and it is a precondition for the
  quotation and quote-comparison ideas, which need saved jobs to
  compare or quote from.

**2. Reusable employee/work-pattern templates (A) — build second.**
- User value: a weekly user saves "Mon–Fri 09:00–17:30, 30-min
  break" once and applies it to each new period, editing exceptions
  instead of re-entering every session.
- Evidence strength: moderate — Clockify ships project templates
  on a paid tier (OBSERVED); that our weekly users re-enter the same
  pattern is INFERENCE from the workflow, not measured.
- Repeat-use potential: high — weekly, the highest-frequency loop
  in either cluster.
- Differentiation: low-medium alone (templates are a known pattern),
  but high in combination with CSV import and invoice: template →
  period → invoice is a complete weekly loop no free rival checked
  offers without an account.
- Implementation effort: low-moderate — template save/apply on the
  existing sessions model; no backend.
- Ongoing cost: near zero.
- Why second: cheapest retention play in the highest-frequency
  cluster, and it composes with the existing import/invoice chain
  instead of competing with Homebase's scheduling.

**3. Timesheet import → validation → invoice, hardened (A) — build third.**
- User value: a freelancer imports a timesheet, gets a validation
  report (unmapped columns, overlapping sessions, missing breaks,
  overtime preview) instead of silent failures, then invoices from
  the validated totals.
- Evidence strength: moderate — import and invoice already exist
  (OBSERVED); the gap is validation and repeatability, and paid
  rivals put invoicing behind paywalls (OBSERVED), which makes the
  free last-mile-to-money a real wedge. That users will pay for it
  is HYPOTHESIS.
- Repeat-use potential: medium-high — per pay period / per client.
- Differentiation: medium — the trust layer (explicit validation
  report) fits our demonstrated transparency strength.
- Implementation effort: moderate — column mapping, validation
  rules, and report UI on existing import/invoice code.
- Ongoing cost: low (no backend; validation rules need locale upkeep).
- Why third: it is the monetization bridge, but it builds on a
  partially existing chain, so its marginal value is smaller than
  the two retention plays — and it monetizes best once templates
  and saved work give users a reason to stay.

### Considered and ranked below the top three

- Repeat-period reporting (A): "same as last week" / period-over-
  period totals. Genuinely useful, but largely subsumed by templates
  (rank 2); build as part of templates, not as a separate feature.
- Planned shifts vs actual hours (A): useful variance view, but it
  needs a "plan" object first — which templates (rank 2) provide.
  Sequence it after templates, not before.
- Supplier-specific bag sizes and user-entered prices (B): partly
  EXISTS (bag volume/unit and prices are already user-entered and
  persisted inside the one dataset). The missing piece is named,
  reusable supplier profiles — fold into rank 1's project model
  rather than shipping alone.
- Materials estimate → branded customer quotation (B): strong
  monetization candidate, but it needs saved jobs (rank 1) first,
  and it competes with Yardbook's free estimates. Sequence after
  rank 1, validated by whether contractors actually save projects.
- Comparing supplier quotes on a consistent quantity basis (B):
  valuable only once supplier profiles exist; without them it is a
  second price column users must re-enter. Sequence after rank 1.

### Rejected / deferred (with reasons)

- Employee availability → employer rota (A): DEFERRED. It fights
  Homebase's free tier (1 location, 10 employees, scheduling +
  payroll) head-on, needs multi-user accounts and notifications,
  and has the highest effort and support burden of any candidate.
  Revisit only if templates + import/invoice show real employer
  demand.
- Paid tiers now: REJECTED as a next step. No distribution, no
  usage data, no willingness-to-pay evidence. Charging now would
  price against free rivals and free SaaS tiers with nothing
  retained to sell.
- Accounts / cloud sync now: DEFERRED. It adds cost, privacy, and
  support burden before retention is proven. Local-first saved work
  (ranks 1–2) tests the retention hypothesis without it.
- Network effects claims: REJECTED. No mechanism and no evidence;
  do not use in positioning or planning.
- Supplier price dataset (scraped or bundled): REJECTED. Prices vary
  by store, region, and time (several calculator pages say so
  explicitly); a stale dataset would damage the trust advantage.
  User-entered supplier profiles only.

## 7. Validation experiments (proposals — thresholds are PROPOSED, not observed)

No users were contacted, no surveys published, no analytics added,
and no personal data collected during this audit. The experiments
below are proposals for owner approval; any user contact or data
collection needs separate authorization.

Measurement principle (all experiments): count events, never
contents. Repeat use can be measured without collecting timesheet
or customer contents by keeping local-only counters (e.g. "projects
opened", "templates applied", "exports completed") on the device,
visible to the user, with no timesheet rows, names, prices, or
customer details leaving the device. Any transmission of even
aggregate counts must be opt-in, anonymous, and separately approved.

### Experiment 1 — Saved contractor projects (supports rank 1)

- Target user: small landscaping contractor doing repeat jobs.
- Hypothesis (HYPOTHESIS): contractors will save named projects and
  reopen them, because re-entering multi-area jobs is the painful
  part of re-estimating.
- Cheapest useful experiment: ship named project save/open/
  duplicate/delete on top of existing localStorage persistence
  (no backend, no accounts), with local-only counters for
  projects-saved, projects-reopened, and exports-per-project.
- What will be measured: share of devices with ≥2 saved projects;
  share of saved projects reopened at least once; exports completed
  from reopened projects. No project contents measured.
- Proposed success criteria (PROPOSED, not observed): within a
  4-week window after release, ≥25% of devices that save a project
  save a second one, and ≥30% of saved projects are reopened. If
  met, proceed to the quotation idea; if not, interview (with owner
  approval) before building more.
- Proposed failure criteria (PROPOSED): <10% second-project rate
  or near-zero reopens → the job-folder hypothesis is wrong for
  this audience; stop and re-examine whether homeowners, not
  contractors, are the real user.
- Decision that follows: success → design the customer quotation
  on top of saved projects; failure → do not build quotation or
  quote comparison; revisit target user.

### Experiment 2 — Work-pattern templates (supports rank 2)

- Target user: employee or freelancer with a regular weekly pattern.
- Hypothesis (HYPOTHESIS): applying a saved pattern beats re-entry,
  so weekly users will save and reuse templates.
- Cheapest useful experiment: template save/apply for one
  employee's standard week (days, times, break), with local-only
  counters for templates-saved, templates-applied, and
  sessions-edited-after-apply.
- What will be measured: templates saved per device; share of new
  periods started from a template vs from scratch; edits after
  apply (a proxy for fit). No session contents measured.
- Proposed success criteria (PROPOSED): within 4 weeks, ≥30% of
  new periods on devices with a template start from that template,
  and median edits-after-apply stay ≤2 sessions (template fits).
- Proposed failure criteria (PROPOSED): templates saved but rarely
  applied, or heavy edits after apply → patterns vary too much to
  template; fold the effort into repeat-period reporting instead.
- Decision that follows: success → make templates the default
  starting point for new periods and sequence planned-vs-actual on
  top; failure → stop template work and prioritize import/invoice
  hardening.

### Experiment 3 — Import validation report (supports rank 3)

- Target user: freelancer importing a timesheet to invoice a client.
- Hypothesis (HYPOTHESIS): a validation report (what mapped, what
  failed, overlaps, missing breaks, overtime preview) converts
  imports into invoices more often than silent import does.
- Cheapest useful experiment: add column mapping + a validation
  report page to the existing import, with local-only counters for
  imports-attempted, imports-validated-clean, imports-with-warnings,
  and invoices-created-from-import.
- What will be measured: import success rate (clean + warnings
  resolved); share of validated imports that proceed to invoice;
  most common warning type (category only, no contents).
- Proposed success criteria (PROPOSED): within 4 weeks, ≥50% of
  imports reach a clean-or-warnings-resolved state, and ≥25% of
  validated imports proceed to invoice creation.
- Proposed failure criteria (PROPOSED): imports rarely proceed to
  invoice, or the same warning category dominates → the mapping or
  the invoice step, not validation, is the blocker; fix that step
  before adding more validation.
- Decision that follows: success → treat import→invoice as the
  monetization bridge and test a paid tier around invoice history
  only after distribution exists; failure → keep import/invoice
  free and unexpanded.

## 8. Recommended next feature (single)

**Saved multi-area contractor projects** (rank 1). It is the only
shortlisted improvement that repairs a structural hole — zero
switching cost and zero repeat-use mechanism in cluster B — at
moderate effort and near-zero ongoing cost, and it unlocks the
quotation and quote-comparison ideas. It is NOT owner-approved
implementation scope; it is this audit's recommendation, awaiting
William's decision.

## 9. Unknowns and evidence needed

- Who actually uses the six tools today: UNKNOWN (no analytics, no
  accounts, no measured traffic). Every retention claim in this
  audit is HYPOTHESIS until Experiment 1 or 2 produces counts.
- Whether contractors or homeowners dominate cluster B: UNKNOWN.
  It decides whether rank 1 or a homeowner-focused simplification
  matters more.
- Competitor language support, mobile quality, support quality:
  UNKNOWN (not assessed).
- Vendor pricing pages were not opened directly; all prices rest on
  October 2026 comparison checks. Re-check before external use.
- Willingness to pay for anything: UNKNOWN. No pricing experiment
  has run.
- Distribution: what search terms, if any, would find these tools
  once indexed: UNKNOWN (no keyword or traffic data was collected
  or invented here).
- The 30h/20/10/$315 screenshot scenario's actual inputs remain
  unknown (documented in the 2026-11-01 quality pass); unrelated to
  this audit but still open.

## 10. Permanent rule (also recorded in AGENTS.md)

"Every new tool or significant feature proposal must include demand
evidence, competitor alternatives, differentiation, copyability,
retention, distribution, economics, and an explicit moat verdict.
Hypotheses must not be presented as proven advantages."

## 11. What this audit did NOT do

- No new features were built; no application or dependency changes
  were made. This commit is documentation only.
- No users were contacted, no surveys published, no analytics added,
  no personal data collected.
- No main merge, no production promotion, no manual deployment.
  (If Git integration automatically creates a Preview for this
  branch push, it is reported in the delivery message, not here.)
- No recommendations in this file are owner-approved implementation
  decisions. The recommended next feature awaits William's approval.
