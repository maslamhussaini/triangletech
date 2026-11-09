/**
 * ⚠️ OWNER-REVIEW ONLY — PROVISIONAL PRICING, NOT APPROVED FOR PUBLICATION.
 *
 * These figures (Blueprint v3) exist so the owner can review and approve
 * them. They must NEVER be imported by a page, component, metadata,
 * JSON-LD, sitemap entry or test fixture. Public surfaces price through
 * the non-numeric labels in landing-data.ts ("Request a Quote") until the
 * owner explicitly approves publishing numeric prices, at which point the
 * approved amounts move into the page data in a separately authorized
 * change.
 */
export const PROVISIONAL_PLANS_REVIEW_ONLY = [
  { id: "starter-website", amountUsd: 899 },
  { id: "growth-seo", amountUsd: 1999 },
  { id: "ai-visibility", amountUsd: 3799 },
] as const;

export const PROVISIONAL_CARE_PLANS_REVIEW_ONLY = [
  { id: "essential-care", monthlyUsd: 79 },
  { id: "growth-care", monthlyUsd: 149 },
  { id: "ai-visibility-optimization", monthlyUsd: 299 },
] as const;
