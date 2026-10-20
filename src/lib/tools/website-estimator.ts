/**
 * Deterministic website project estimator (P1.9) — RULES_VERSION 1.1.0.
 *
 * A pure rules engine: identical inputs always produce identical outputs.
 * No AI calls, no external APIs, no database, no randomness, no dates.
 *
 * PRICING SAFETY (owner directive for this slice): the engine is
 * QUALITATIVE. It recommends a package by name, lists what that package
 * includes, classifies complexity and states its assumptions — it never
 * computes, stores or returns a price, a range or a delivery guarantee.
 * The provisional figures in src/lib/us/pricing-review.ts are not
 * imported here and must never be: this module ships in the client
 * bundle. A result always ends with the planning-guide disclaimer in
 * `assumptions`: a written proposal confirms scope, price and timeline.
 *
 * Structural rules (from the approved Blueprint v3 §4, monetary elements
 * removed per the directive above):
 * - The recommended tier comes from the visibility answers ONLY
 *   (AI interest → AI Visibility; else local SEO → Growth SEO; else
 *   Starter). Page count NEVER changes the tier; it changes scope notes
 *   and complexity instead.
 * - Package inclusions are cumulative and fixed (the inclusion matrix):
 *   a capability a package already includes is never also listed as
 *   additional scope (no double-counting).
 * - Custom-scope short-circuits, checked in this fixed order: 20+ pages,
 *   then an online store (routed to the Shopify conversation), then a
 *   CRM/system integration (needs its own technical review).
 * - A care plan or retainer is never added, suggested as selected, or
 *   priced by this engine.
 */

export const RULES_VERSION = "1.1.0";

export const PROJECT_TYPES = ["new", "redesign"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const BUSINESS_CATEGORIES = [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "landscaping",
  "other-home-services",
  "professional-services",
  "retail-local",
  "other",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  hvac: "HVAC",
  plumbing: "plumbing",
  electrical: "electrical",
  roofing: "roofing",
  landscaping: "landscaping",
  "other-home-services": "home services",
  "professional-services": "professional services",
  "retail-local": "retail / local shop",
  other: "small business",
};

export const PAGE_BANDS = ["1-3", "4-5", "6-10", "11-15", "16-19", "20+"] as const;
export type PageBand = (typeof PAGE_BANDS)[number];

export const PAGE_BAND_LABELS: Record<PageBand, string> = {
  "1-3": "1–3",
  "4-5": "4–5",
  "6-10": "6–10",
  "11-15": "11–15",
  "16-19": "16–19",
  "20+": "20 or more",
};

/** Rank used only for scope comparison — never displayed as a count. */
const PAGE_BAND_RANK: Record<PageBand, number> = {
  "1-3": 0,
  "4-5": 1,
  "6-10": 2,
  "11-15": 3,
  "16-19": 4,
  "20+": 5,
};

export const CAPABILITIES = [
  "online-booking",
  "blog",
  "photo-gallery",
  "multiple-locations",
  "copywriting-support",
  "online-store",
  "crm-integration",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  "online-booking": "Online booking",
  blog: "Blog or news section",
  "photo-gallery": "Photo gallery",
  "multiple-locations": "More than one business location",
  "copywriting-support": "Help writing the pages (copywriting)",
  "online-store": "Selling products online (online store)",
  "crm-integration": "Connect to a CRM or other business system",
};

/** Additional-scope wording per capability, in CAPABILITIES order. */
const CAPABILITY_SCOPE_LINES: Partial<Record<Capability, string>> = {
  "online-booking": "Online booking setup",
  blog: "Blog / news section setup",
  "photo-gallery": "Photo gallery",
  "multiple-locations": "Support for multiple business locations",
  "copywriting-support": "Copywriting support for your key pages",
};

export const SEO_INTERESTS = ["on-page-basics", "local-seo"] as const;
export type SeoInterest = (typeof SEO_INTERESTS)[number];

export const AI_INTERESTS = ["not-now", "ai-visibility"] as const;
export type AiInterest = (typeof AI_INTERESTS)[number];

export const CONTENT_READINESS = ["ready", "partial", "need-help"] as const;
export type ContentReadiness = (typeof CONTENT_READINESS)[number];

export const PRIORITIES = ["standard", "priority"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface EstimatorInput {
  projectType: ProjectType;
  businessCategory: BusinessCategory;
  pageBand: PageBand;
  capabilities: Capability[];
  seoInterest: SeoInterest;
  aiInterest: AiInterest;
  contentReadiness: ContentReadiness;
  priority: Priority;
}

export type EstimatorField = keyof EstimatorInput;

export type TierId = "starter-website" | "growth-seo" | "ai-visibility";

export const TIER_NAMES: Record<TierId, string> = {
  "starter-website": "Starter Website",
  "growth-seo": "Growth SEO",
  "ai-visibility": "AI Visibility",
};

/** The inclusion matrix: cumulative, fixed order, identical to the
 *  package features already published on the landing page. */
const STARTER_INCLUDED: readonly string[] = [
  "Mobile-first custom website design",
  "Core pages for your business and services",
  "Click-to-call and contact/inquiry setup",
  "On-page SEO basics: titles, descriptions, headings",
  "Polish of your existing text for clarity",
  "You own your website, domain and content",
];

const GROWTH_ADDS: readonly string[] = [
  "Local SEO foundation: keywords, structure, internal linking",
  "Dedicated service and service-area pages",
  "Google Business Profile setup guidance",
  "FAQ content written around real customer questions",
  "Copywriting support for your key pages",
];

const AI_VISIBILITY_ADDS: readonly string[] = [
  "Structured data and clear business identity for search and AI tools",
  "Answer-ready content: FAQs, definitions, comparisons",
  "Crawlability and indexing review",
  "AI-search readiness check with a written summary",
  "Guidance on keeping your business details consistent across the web",
];

function includedForTier(tier: TierId): string[] {
  if (tier === "starter-website") return [...STARTER_INCLUDED];
  if (tier === "growth-seo") return [...STARTER_INCLUDED, ...GROWTH_ADDS];
  return [...STARTER_INCLUDED, ...GROWTH_ADDS, ...AI_VISIBILITY_ADDS];
}

/** Highest page band inside each package's standard scope (v3 inclusion
 *  matrix, expressed qualitatively — the counts themselves stay internal). */
const TIER_STANDARD_BAND_RANK: Record<TierId, number> = {
  "starter-website": 0,
  "growth-seo": 1,
  "ai-visibility": 3,
};

const COMPLEXITY_POINTS: Record<PageBand, number> = {
  "1-3": 0,
  "4-5": 1,
  "6-10": 2,
  "11-15": 3,
  "16-19": 4,
  "20+": 0, // short-circuits before scoring
};

export type ComplexityLevel = "straightforward" | "moderate" | "complex" | "custom";

export interface EstimatorComplexity {
  level: ComplexityLevel;
  label: string;
  reasons: string[];
}

interface EstimatorResultBase {
  rulesVersion: string;
  scopeSummary: string[];
  complexity: EstimatorComplexity;
  assumptions: string[];
  nextStep: { label: string; href: "#consultation" };
}

export interface EstimatorTieredResult extends EstimatorResultBase {
  outcome: "tiered";
  tierId: TierId;
  tierName: string;
  included: string[];
  additionalScope: string[];
}

export type CustomReason = "pages" | "ecommerce" | "crm";

export interface EstimatorCustomResult extends EstimatorResultBase {
  outcome: "custom";
  reason: CustomReason;
  heading: string;
  explanation: string;
}

export type EstimatorResult = EstimatorTieredResult | EstimatorCustomResult;

const NEXT_STEP = { label: "Request a Free Consultation", href: "#consultation" } as const;

const DISCLAIMER =
  "This estimate is a planning guide, not a binding quote. Your written proposal confirms scope, price and timeline before any work begins.";

const FIELD_MESSAGES: Record<EstimatorField, string> = {
  projectType: "Please choose whether this is a new website or a redesign.",
  businessCategory: "Please choose the category closest to your business.",
  pageBand: "Please choose the approximate number of pages.",
  capabilities: "Please review the capabilities list.",
  seoInterest: "Please choose your SEO interest.",
  aiInterest: "Please choose whether AI search visibility matters to you.",
  contentReadiness: "Please tell us how ready your content is.",
  priority: "Please choose your project priority.",
};

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/**
 * Strict input validation. With `onlyFields`, just those fields are
 * checked (the wizard validates one step at a time); capabilities may be
 * an empty array but must contain only known ids. Unknown top-level keys
 * are rejected when validating the full input.
 */
export function parseEstimatorInput(
  input: unknown,
  onlyFields?: readonly EstimatorField[],
): { ok: true; input: EstimatorInput } | { ok: false; fieldErrors: Partial<Record<EstimatorField, string>> } {
  const wanted = (field: EstimatorField) => !onlyFields || onlyFields.includes(field);
  const fieldErrors: Partial<Record<EstimatorField, string>> = {};

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, fieldErrors: { projectType: FIELD_MESSAGES.projectType } };
  }
  const raw = input as Record<string, unknown>;

  if (!onlyFields) {
    const known = new Set<string>([
      "projectType", "businessCategory", "pageBand", "capabilities",
      "seoInterest", "aiInterest", "contentReadiness", "priority",
    ]);
    if (Object.keys(raw).some(key => !known.has(key))) {
      return { ok: false, fieldErrors: { capabilities: "This estimate request contains fields we do not accept." } };
    }
  }

  if (wanted("projectType") && !isOneOf(raw.projectType, PROJECT_TYPES)) fieldErrors.projectType = FIELD_MESSAGES.projectType;
  if (wanted("businessCategory") && !isOneOf(raw.businessCategory, BUSINESS_CATEGORIES)) fieldErrors.businessCategory = FIELD_MESSAGES.businessCategory;
  if (wanted("pageBand") && !isOneOf(raw.pageBand, PAGE_BANDS)) fieldErrors.pageBand = FIELD_MESSAGES.pageBand;
  if (wanted("capabilities")) {
    const caps = raw.capabilities;
    if (!Array.isArray(caps) || caps.some(cap => !isOneOf(cap, CAPABILITIES))) {
      fieldErrors.capabilities = FIELD_MESSAGES.capabilities;
    }
  }
  if (wanted("seoInterest") && !isOneOf(raw.seoInterest, SEO_INTERESTS)) fieldErrors.seoInterest = FIELD_MESSAGES.seoInterest;
  if (wanted("aiInterest") && !isOneOf(raw.aiInterest, AI_INTERESTS)) fieldErrors.aiInterest = FIELD_MESSAGES.aiInterest;
  if (wanted("contentReadiness") && !isOneOf(raw.contentReadiness, CONTENT_READINESS)) fieldErrors.contentReadiness = FIELD_MESSAGES.contentReadiness;
  if (wanted("priority") && !isOneOf(raw.priority, PRIORITIES)) fieldErrors.priority = FIELD_MESSAGES.priority;

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  // Normalize capabilities: deduplicated, in CAPABILITIES definition order.
  const capsRaw = Array.isArray(raw.capabilities) ? (raw.capabilities as Capability[]) : [];
  const capabilities = CAPABILITIES.filter(cap => capsRaw.includes(cap));

  return {
    ok: true,
    input: {
      projectType: raw.projectType as ProjectType,
      businessCategory: raw.businessCategory as BusinessCategory,
      pageBand: raw.pageBand as PageBand,
      capabilities,
      seoInterest: raw.seoInterest as SeoInterest,
      aiInterest: raw.aiInterest as AiInterest,
      contentReadiness: raw.contentReadiness as ContentReadiness,
      priority: raw.priority as Priority,
    },
  };
}

function recommendTier(input: EstimatorInput): TierId {
  if (input.aiInterest === "ai-visibility") return "ai-visibility";
  if (input.seoInterest === "local-seo") return "growth-seo";
  return "starter-website";
}

function customReason(input: EstimatorInput): CustomReason | null {
  if (input.pageBand === "20+") return "pages";
  if (input.capabilities.includes("online-store")) return "ecommerce";
  if (input.capabilities.includes("crm-integration")) return "crm";
  return null;
}

const CUSTOM_COPY: Record<CustomReason, { heading: string; explanation: string }> = {
  pages: {
    heading: "A project of this size is scoped individually",
    explanation:
      "Websites with 20 or more pages vary too much for a standard package. The right next step is a consultation so we can map your pages and quote the project properly — in writing, before any work begins.",
  },
  ecommerce: {
    heading: "Online selling is scoped as its own project",
    explanation:
      "Selling products online changes the shape of the project. We build online stores through our Shopify service, so the right next step is a consultation about your products and how you want to sell — with scope and price confirmed in a written proposal.",
  },
  crm: {
    heading: "System integrations need a technical review first",
    explanation:
      "Connecting a website to a CRM or another business system depends on the system you use. The right next step is a consultation so we can review the integration and confirm what is involved in a written proposal.",
  },
};

function scopeSummaryFor(input: EstimatorInput): string[] {
  return [
    `${input.projectType === "new" ? "A new website" : "A redesign of your existing website"} for a ${CATEGORY_LABELS[input.businessCategory]} business`,
    `Approximately ${PAGE_BAND_LABELS[input.pageBand]} pages`,
  ];
}

function assumptionsFor(input: EstimatorInput, tier: TierId | null): string[] {
  const assumptions: string[] = [];
  if (tier && PAGE_BAND_RANK[input.pageBand] > TIER_STANDARD_BAND_RANK[tier]) {
    assumptions.push(
      `Your page count is above the ${TIER_NAMES[tier]} package's standard scope; the additional pages are confirmed in your written proposal.`,
    );
  }
  if (input.projectType === "redesign") {
    assumptions.push(
      "We will review your current website first and keep what still works — content, pages and search presence.",
    );
  }
  if (input.contentReadiness === "partial") {
    assumptions.push(
      "You have some content ready; we will polish what exists and agree with you what still needs to be written.",
    );
  }
  if (input.contentReadiness === "need-help") {
    assumptions.push(
      "Your pages still need to be written; copywriting help is available and is confirmed in your written proposal.",
    );
  }
  if (input.priority === "priority" && input.contentReadiness === "ready") {
    assumptions.push(
      "You asked for a priority timeline and your content is ready — we will confirm the fastest realistic schedule in your proposal.",
    );
  }
  if (input.priority === "priority" && input.contentReadiness !== "ready") {
    assumptions.push(
      "Priority timelines depend on content being ready; we will confirm what is realistic in your proposal before any commitment.",
    );
  }
  assumptions.push(DISCLAIMER);
  return assumptions;
}

function complexityFor(input: EstimatorInput): EstimatorComplexity {
  let points = COMPLEXITY_POINTS[input.pageBand];
  const reasons: string[] = [];
  if (COMPLEXITY_POINTS[input.pageBand] > 0) reasons.push(`${PAGE_BAND_LABELS[input.pageBand]} pages`);
  if (input.projectType === "redesign") {
    points += 1;
    reasons.push("Redesign of an existing website");
  }
  const scopedCaps = input.capabilities.filter(cap => cap in CAPABILITY_SCOPE_LINES);
  if (scopedCaps.length > 0) {
    points += scopedCaps.length;
    reasons.push(
      `${scopedCaps.length} additional ${scopedCaps.length === 1 ? "capability" : "capabilities"} (${scopedCaps.map(cap => CAPABILITY_LABELS[cap]).join(", ")})`,
    );
  }
  if (input.contentReadiness === "need-help") {
    points += 1;
    reasons.push("Content still to be written");
  }
  if (input.priority === "priority") {
    points += 1;
    reasons.push("Priority timeline requested");
  }
  if (points <= 2) return { level: "straightforward", label: "Straightforward project", reasons };
  if (points <= 5) return { level: "moderate", label: "Moderately involved project", reasons };
  return { level: "complex", label: "Complex project", reasons };
}

/**
 * Runs the estimator. Pure and deterministic: the same normalized input
 * always returns a deeply equal result, with every list in its documented
 * fixed order.
 */
export function estimateProject(
  input: unknown,
): { ok: true; result: EstimatorResult } | { ok: false; fieldErrors: Partial<Record<EstimatorField, string>> } {
  const parsed = parseEstimatorInput(input);
  if (!parsed.ok) return parsed;
  const valid = parsed.input;

  const reason = customReason(valid);
  if (reason) {
    return {
      ok: true,
      result: {
        outcome: "custom",
        reason,
        heading: CUSTOM_COPY[reason].heading,
        explanation: CUSTOM_COPY[reason].explanation,
        rulesVersion: RULES_VERSION,
        scopeSummary: scopeSummaryFor(valid),
        complexity: { level: "custom", label: "Scoped individually", reasons: [] },
        assumptions: assumptionsFor(valid, null),
        nextStep: { ...NEXT_STEP },
      },
    };
  }

  const tierId = recommendTier(valid);
  const included = includedForTier(tierId);
  const additionalScope: string[] = [];
  for (const cap of CAPABILITIES) {
    if (!valid.capabilities.includes(cap)) continue;
    const line = CAPABILITY_SCOPE_LINES[cap];
    if (!line) continue;
    // Inclusion matrix guard: never list as additional what the package
    // already includes (e.g. copywriting on Growth SEO and above).
    if (included.includes(line)) continue;
    additionalScope.push(line);
  }

  return {
    ok: true,
    result: {
      outcome: "tiered",
      tierId,
      tierName: TIER_NAMES[tierId],
      rulesVersion: RULES_VERSION,
      scopeSummary: [
        ...scopeSummaryFor(valid),
        `Recommended package: ${TIER_NAMES[tierId]}`,
        tierId === "ai-visibility"
          ? "Visibility focus: local SEO plus AI search readiness"
          : tierId === "growth-seo"
            ? "Visibility focus: local SEO foundation"
            : "Visibility focus: on-page SEO basics",
      ],
      included,
      additionalScope,
      complexity: complexityFor(valid),
      assumptions: assumptionsFor(valid, tierId),
      nextStep: { ...NEXT_STEP },
    },
  };
}
