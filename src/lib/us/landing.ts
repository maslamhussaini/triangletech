/**
 * Typed data contracts and pure helpers for the USA growth landing-page
 * primitives (src/components/us/).
 *
 * This module intentionally contains NO business content: plan names,
 * prices and copy are supplied by the caller as data (and, for the real
 * page, will live in src/lib/site.ts once approved). Prices in this
 * project are provisional until the owner approves publication.
 */

export interface LandingPlan {
  id: string;
  name: string;
  tagline: string;
  /** One-time price in whole US dollars. Display adds the "from" prefix. */
  priceAmount?: number;
  /**
   * Non-numeric price label (e.g. "Request a Quote"). When present it is
   * displayed INSTEAD of any numeric price — the mechanism that keeps
   * unpublished provisional pricing out of rendered output.
   */
  priceLabel?: string;
  /** Short billing note shown under the price, e.g. "one-time" or a milestone split. */
  billingNote: string;
  features: string[];
  exclusions?: string[];
  featured?: boolean;
  /** Badge text for a featured plan; defaults to "Most chosen". */
  badge?: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface TrustSignalData {
  title: string;
  description: string;
  /** Key into the Icon registry in components/icons.tsx. */
  icon?: string;
}

/** Format a whole-dollar amount as US currency, e.g. 1999 -> "$1,999". */
export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`formatUsd expects a non-negative finite amount, got ${amount}`);
  }
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/** Starting-price label used on plan cards, e.g. 899 -> "from $899". */
export function formatStartingPrice(amount: number): string {
  return `from ${formatUsd(amount)}`;
}

/**
 * The price text a plan card displays: the non-numeric label wins whenever
 * one is set, so a label-priced plan can never leak a numeric amount.
 */
export function priceDisplayText(plan: LandingPlan): string {
  if (plan.priceLabel?.trim()) return plan.priceLabel.trim();
  if (plan.priceAmount !== undefined) return formatStartingPrice(plan.priceAmount);
  return "";
}

const ALLOWED_HREF_PREFIXES = ["/", "#", "https://", "http://", "mailto:", "tel:"] as const;

/**
 * CTA destination contract: internal paths, in-page anchors, web URLs and
 * mail/tel links are allowed. Script-bearing schemes (javascript:, data:),
 * protocol-relative URLs and empty destinations are rejected.
 */
export function isValidCtaHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("//")) return false;
  return ALLOWED_HREF_PREFIXES.some(prefix => value.startsWith(prefix));
}

/** Class list for a plan card; featured plans get the Indigo brand treatment. */
export function pricingCardClass(plan: LandingPlan): string {
  return plan.featured ? "card-premium plan-card is-brand" : "card-premium plan-card";
}

/** Badge label for a plan, or null when the plan carries no badge. */
export function planBadgeLabel(plan: LandingPlan): string | null {
  if (!plan.featured) return null;
  return plan.badge?.trim() ? plan.badge.trim() : "Most chosen";
}

/** Data-contract check for plan content; returns human-readable problems. */
export function validatePlan(plan: LandingPlan): string[] {
  const problems: string[] = [];
  if (!plan.id.trim()) problems.push("plan.id is required");
  if (!plan.name.trim()) problems.push("plan.name is required");
  if (!plan.tagline.trim()) problems.push("plan.tagline is required");
  const hasLabel = Boolean(plan.priceLabel?.trim());
  const hasValidAmount =
    plan.priceAmount !== undefined &&
    Number.isFinite(plan.priceAmount) &&
    plan.priceAmount >= 0;
  if (!hasLabel && !hasValidAmount) {
    problems.push("plan requires a non-empty priceLabel or a non-negative priceAmount");
  }
  if (!plan.billingNote.trim()) problems.push("plan.billingNote is required");
  if (plan.features.length === 0 || plan.features.some(f => !f.trim())) {
    problems.push("plan.features must contain at least one non-empty feature");
  }
  return problems;
}

/** Data-contract check for an FAQ entry; returns human-readable problems. */
export function validateFaqEntry(entry: FaqEntry): string[] {
  const problems: string[] = [];
  if (!entry.question.trim()) problems.push("faq.question is required");
  if (!entry.answer.trim()) problems.push("faq.answer is required");
  return problems;
}

/**
 * Focus management for view transitions (P1.10 defect D1).
 *
 * Interactive views that replace themselves (the estimator's steps and
 * result) unmount the control the user just activated, and the browser
 * drops focus to <body>. The component therefore moves focus to the new
 * view's heading on every genuine view change. This pure function is the
 * decision table behind that effect:
 *
 * - initial mount (previousView === null) → null: never steal focus on
 *   page load;
 * - no view change → null: validation errors and re-renders must not
 *   move focus;
 * - any change → the incoming view's heading target.
 *
 * View keys are "step-0" | "step-1" | "step-2" | "result".
 */
export type ViewFocusTarget = "step-heading" | "result-heading";

export function focusTargetAfterViewChange(
  previousView: string | null,
  currentView: string,
): ViewFocusTarget | null {
  if (previousView === null || previousView === currentView) return null;
  return currentView === "result" ? "result-heading" : "step-heading";
}
