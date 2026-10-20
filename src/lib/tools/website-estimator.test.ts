import { describe, expect, it } from "vitest";
import { parseLeadSubmission } from "@/lib/leads/schema";
import {
  estimateProject,
  parseEstimatorInput,
  RULES_VERSION,
  type EstimatorInput,
  type EstimatorTieredResult,
} from "./website-estimator";

/**
 * Expectations in this file are derived independently from the approved
 * rules (Blueprint v3 §4 structure; P1.9 owner directive: qualitative
 * outputs only) and from the package features already published on the
 * landing page — they are written out literally here rather than imported
 * from the implementation.
 */

const BASE: EstimatorInput = {
  projectType: "new",
  businessCategory: "hvac",
  pageBand: "1-3",
  capabilities: [],
  seoInterest: "on-page-basics",
  aiInterest: "not-now",
  contentReadiness: "ready",
  priority: "standard",
};

function run(overrides: Partial<EstimatorInput> = {}) {
  const outcome = estimateProject({ ...BASE, ...overrides });
  if (!outcome.ok) throw new Error(`expected ok, got ${JSON.stringify(outcome.fieldErrors)}`);
  return outcome.result;
}

function tiered(overrides: Partial<EstimatorInput> = {}): EstimatorTieredResult {
  const result = run(overrides);
  if (result.outcome !== "tiered") throw new Error(`expected tiered, got ${result.outcome}`);
  return result;
}

// The package inclusion matrix, as published on the landing page.
const STARTER_INCLUDED = [
  "Mobile-first custom website design",
  "Core pages for your business and services",
  "Click-to-call and contact/inquiry setup",
  "On-page SEO basics: titles, descriptions, headings",
  "Polish of your existing text for clarity",
  "You own your website, domain and content",
];
const GROWTH_ADDS = [
  "Local SEO foundation: keywords, structure, internal linking",
  "Dedicated service and service-area pages",
  "Google Business Profile setup guidance",
  "FAQ content written around real customer questions",
  "Copywriting support for your key pages",
];
const AI_ADDS = [
  "Structured data and clear business identity for search and AI tools",
  "Answer-ready content: FAQs, definitions, comparisons",
  "Crawlability and indexing review",
  "AI-search readiness check with a written summary",
  "Guidance on keeping your business details consistent across the web",
];

describe("rules version", () => {
  it("is 1.1.0 and is stamped on every result", () => {
    expect(RULES_VERSION).toBe("1.1.0");
    expect(run().rulesVersion).toBe("1.1.0");
    expect(run({ pageBand: "20+" }).rulesVersion).toBe("1.1.0");
  });
});

describe("tier selection — driven by the visibility answers only", () => {
  const cases: Array<[Partial<EstimatorInput>, string, string]> = [
    [{ seoInterest: "on-page-basics", aiInterest: "not-now" }, "starter-website", "Starter Website"],
    [{ seoInterest: "local-seo", aiInterest: "not-now" }, "growth-seo", "Growth SEO"],
    [{ seoInterest: "on-page-basics", aiInterest: "ai-visibility" }, "ai-visibility", "AI Visibility"],
    [{ seoInterest: "local-seo", aiInterest: "ai-visibility" }, "ai-visibility", "AI Visibility"],
  ];
  it.each(cases)("seo=%j ai=%j → %s", (overrides, tierId, tierName) => {
    const result = tiered(overrides);
    expect(result.tierId).toBe(tierId);
    expect(result.tierName).toBe(tierName);
  });

  it("page count never changes the tier (pages/tier independence)", () => {
    for (const pageBand of ["1-3", "4-5", "6-10", "11-15", "16-19"] as const) {
      expect(tiered({ pageBand, seoInterest: "local-seo" }).tierId).toBe("growth-seo");
      expect(tiered({ pageBand }).tierId).toBe("starter-website");
    }
  });

  it("business category never changes the tier", () => {
    for (const businessCategory of ["hvac", "plumbing", "electrical", "roofing", "landscaping", "other-home-services", "professional-services", "retail-local", "other"] as const) {
      expect(tiered({ businessCategory, seoInterest: "local-seo" }).tierId).toBe("growth-seo");
    }
  });

  it("project type and content readiness never change the tier", () => {
    expect(tiered({ projectType: "redesign", contentReadiness: "need-help" }).tierId).toBe("starter-website");
  });
});

describe("inclusion matrix and additional scope", () => {
  it("Starter includes exactly the six published Starter features, in order", () => {
    expect(tiered().included).toEqual(STARTER_INCLUDED);
  });

  it("Growth SEO includes Starter + the five Growth features, in order", () => {
    expect(tiered({ seoInterest: "local-seo" }).included).toEqual([...STARTER_INCLUDED, ...GROWTH_ADDS]);
  });

  it("AI Visibility includes all sixteen features, in order", () => {
    expect(tiered({ aiInterest: "ai-visibility" }).included).toEqual([...STARTER_INCLUDED, ...GROWTH_ADDS, ...AI_ADDS]);
  });

  it("never double-counts copywriting: included on Growth+, additional on Starter", () => {
    const growth = tiered({ seoInterest: "local-seo", capabilities: ["copywriting-support"] });
    expect(growth.included).toContain("Copywriting support for your key pages");
    expect(growth.additionalScope).not.toContain("Copywriting support for your key pages");

    const starter = tiered({ capabilities: ["copywriting-support"] });
    expect(starter.included).not.toContain("Copywriting support for your key pages");
    expect(starter.additionalScope).toEqual(["Copywriting support for your key pages"]);
  });

  it("lists selected add-on capabilities in definition order, whatever the input order", () => {
    const result = tiered({ capabilities: ["multiple-locations", "photo-gallery", "blog", "online-booking"] });
    expect(result.additionalScope).toEqual([
      "Online booking setup",
      "Blog / news section setup",
      "Photo gallery",
      "Support for multiple business locations",
    ]);
  });

  it("has no additional scope when nothing extra is selected", () => {
    expect(tiered().additionalScope).toEqual([]);
  });
});

describe("custom-scope short-circuits", () => {
  it("20+ pages → custom (pages), checked before other short-circuits", () => {
    const result = run({ pageBand: "20+", capabilities: ["online-store", "crm-integration"] });
    expect(result.outcome).toBe("custom");
    if (result.outcome !== "custom") return;
    expect(result.reason).toBe("pages");
    expect(result.complexity.level).toBe("custom");
  });

  it("an online store → custom (ecommerce, Shopify conversation)", () => {
    const result = run({ capabilities: ["online-store"] });
    expect(result.outcome).toBe("custom");
    if (result.outcome !== "custom") return;
    expect(result.reason).toBe("ecommerce");
    expect(result.explanation).toContain("Shopify");
  });

  it("a CRM integration → custom (crm)", () => {
    const result = run({ capabilities: ["crm-integration"] });
    expect(result.outcome).toBe("custom");
    if (result.outcome !== "custom") return;
    expect(result.reason).toBe("crm");
  });
});

describe("complexity classification", () => {
  it("a minimal new site is straightforward with no reasons", () => {
    const result = tiered();
    expect(result.complexity.level).toBe("straightforward");
    expect(result.complexity.label).toBe("Straightforward project");
    expect(result.complexity.reasons).toEqual([]);
  });

  it("boundary: 2 points is straightforward, 3 is moderate, 6 is complex", () => {
    // 4-5 pages (1) + priority (1) = 2
    expect(tiered({ pageBand: "4-5", priority: "priority" }).complexity.level).toBe("straightforward");
    // 6-10 pages (2) + redesign (1) = 3
    expect(tiered({ pageBand: "6-10", projectType: "redesign" }).complexity.level).toBe("moderate");
    // 11-15 pages (3) + 3 capabilities (3) = 6
    expect(
      tiered({ pageBand: "11-15", capabilities: ["online-booking", "blog", "photo-gallery"] }).complexity.level,
    ).toBe("complex");
  });

  it("reasons name the contributing factors in fixed order", () => {
    const result = tiered({
      pageBand: "6-10",
      projectType: "redesign",
      capabilities: ["online-booking"],
      contentReadiness: "need-help",
      priority: "priority",
    });
    expect(result.complexity.reasons[0]).toBe("6–10 pages");
    expect(result.complexity.reasons[1]).toBe("Redesign of an existing website");
    expect(result.complexity.reasons[2]).toContain("Online booking");
    expect(result.complexity.reasons[3]).toBe("Content still to be written");
    expect(result.complexity.reasons[4]).toBe("Priority timeline requested");
  });
});

describe("assumptions", () => {
  it("flags pages above the tier's standard scope — and only then", () => {
    const starter = tiered({ pageBand: "6-10" });
    expect(starter.assumptions.some(a => a.includes("above the Starter Website package's standard scope"))).toBe(true);
    const growth = tiered({ pageBand: "6-10", seoInterest: "local-seo" });
    expect(growth.assumptions.some(a => a.includes("above the Growth SEO package's standard scope"))).toBe(true);
    const ai = tiered({ pageBand: "6-10", aiInterest: "ai-visibility" });
    expect(ai.assumptions.some(a => a.includes("standard scope"))).toBe(false);
  });

  it("states the redesign review for redesigns", () => {
    expect(tiered({ projectType: "redesign" }).assumptions.some(a => a.includes("review your current website"))).toBe(true);
    expect(tiered().assumptions.some(a => a.includes("review your current website"))).toBe(false);
  });

  it("priority wording depends on content readiness (no promise either way)", () => {
    const ready = tiered({ priority: "priority", contentReadiness: "ready" });
    expect(ready.assumptions.some(a => a.includes("fastest realistic schedule"))).toBe(true);
    const partial = tiered({ priority: "priority", contentReadiness: "partial" });
    expect(partial.assumptions.some(a => a.includes("depend on content being ready"))).toBe(true);
  });

  it("every result ends with the not-a-binding-quote disclaimer", () => {
    for (const result of [run(), run({ pageBand: "20+" }), run({ capabilities: ["online-store"] })]) {
      const last = result.assumptions[result.assumptions.length - 1];
      expect(last).toContain("not a binding quote");
      expect(last).toContain("written proposal confirms scope, price and timeline");
    }
  });
});

describe("determinism and ordering", () => {
  it("identical inputs produce deeply identical outputs", () => {
    const input = { ...BASE, pageBand: "6-10", capabilities: ["blog", "online-booking"], seoInterest: "local-seo" };
    expect(estimateProject(input)).toEqual(estimateProject(input));
  });

  it("capability input order does not affect the output", () => {
    const a = estimateProject({ ...BASE, capabilities: ["blog", "online-booking", "photo-gallery"] });
    const b = estimateProject({ ...BASE, capabilities: ["photo-gallery", "blog", "online-booking"] });
    expect(a).toEqual(b);
  });

  it("duplicate capabilities are normalized away", () => {
    const parsed = parseEstimatorInput({ ...BASE, capabilities: ["blog", "blog"] });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.capabilities).toEqual(["blog"]);
  });
});

describe("input validation", () => {
  it("rejects each invalid field with a field-specific error", () => {
    const bad: Array<[Partial<EstimatorInput>, keyof EstimatorInput]> = [
      [{ projectType: "unsure" as never }, "projectType"],
      [{ businessCategory: "space-tourism" as never }, "businessCategory"],
      [{ pageBand: "100" as never }, "pageBand"],
      [{ seoInterest: "everything" as never }, "seoInterest"],
      [{ aiInterest: "maybe" as never }, "aiInterest"],
      [{ contentReadiness: "dunno" as never }, "contentReadiness"],
      [{ priority: "whenever" as never }, "priority"],
    ];
    for (const [overrides, field] of bad) {
      const outcome = estimateProject({ ...BASE, ...overrides });
      expect(outcome.ok).toBe(false);
      if (outcome.ok) continue;
      expect(outcome.fieldErrors[field]).toBeTruthy();
    }
  });

  it("rejects unknown capabilities and unknown top-level fields", () => {
    expect(estimateProject({ ...BASE, capabilities: ["teleportation"] }).ok).toBe(false);
    expect(estimateProject({ ...BASE, discount: true }).ok).toBe(false);
    expect(estimateProject(null).ok).toBe(false);
    expect(estimateProject("growth please").ok).toBe(false);
  });

  it("supports step-wise validation for the wizard", () => {
    const stepOnly = parseEstimatorInput({ projectType: "new" }, ["projectType"]);
    expect(stepOnly.ok).toBe(true);
    const missing = parseEstimatorInput({}, ["projectType"]);
    expect(missing.ok).toBe(false);
  });

  it("accepts a boundary page band at both ends", () => {
    expect(estimateProject({ ...BASE, pageBand: "1-3" }).ok).toBe(true);
    expect(estimateProject({ ...BASE, pageBand: "20+" }).ok).toBe(true);
  });
});

describe("worked examples (qualitative mirrors of the approved v3 examples)", () => {
  it("A: HVAC, 4-5 pages, local SEO, content ready → Growth SEO, straightforward", () => {
    const result = tiered({ pageBand: "4-5", seoInterest: "local-seo" });
    expect(result.tierId).toBe("growth-seo");
    expect(result.included).toHaveLength(11);
    expect(result.complexity.level).toBe("straightforward");
  });

  it("B: plumbing redesign, 6-10 pages, booking + gallery → Starter with add-ons, moderate", () => {
    const result = tiered({
      projectType: "redesign",
      businessCategory: "plumbing",
      pageBand: "6-10",
      capabilities: ["online-booking", "photo-gallery"],
      contentReadiness: "partial",
    });
    expect(result.tierId).toBe("starter-website");
    expect(result.additionalScope).toEqual(["Online booking setup", "Photo gallery"]);
    expect(result.complexity.level).toBe("moderate");
  });

  it("C: electrical, 11-15 pages, AI visibility + copywriting → AI Visibility, nothing double-counted", () => {
    const result = tiered({
      businessCategory: "electrical",
      pageBand: "11-15",
      seoInterest: "local-seo",
      aiInterest: "ai-visibility",
      capabilities: ["copywriting-support"],
    });
    expect(result.tierId).toBe("ai-visibility");
    expect(result.included).toHaveLength(16);
    expect(result.additionalScope).toEqual([]);
  });

  it("D: roofing, 4-5 pages, priority with content ready → Starter, priority noted, no promise", () => {
    const result = tiered({ businessCategory: "roofing", pageBand: "4-5", priority: "priority" });
    expect(result.tierId).toBe("starter-website");
    expect(result.assumptions.some(a => a.includes("fastest realistic schedule"))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/guarantee|within \d|business days/i);
  });

  it("E: 20+ pages → custom scope, no tier recommended", () => {
    const result = run({ pageBand: "20+" });
    expect(result.outcome).toBe("custom");
    expect("tierId" in result).toBe(false);
  });
});

describe("pricing safety and promise safety across the input space", () => {
  const capabilitySets: string[][] = [
    [],
    ...["online-booking", "blog", "photo-gallery", "multiple-locations", "copywriting-support", "online-store", "crm-integration"].map(c => [c]),
    ["online-booking", "blog", "photo-gallery", "multiple-locations", "copywriting-support"],
  ];

  it("no result ever contains a price, a retainer, or a delivery promise", () => {
    let checked = 0;
    for (const projectType of ["new", "redesign"] as const)
      for (const pageBand of ["1-3", "4-5", "6-10", "11-15", "16-19", "20+"] as const)
        for (const seoInterest of ["on-page-basics", "local-seo"] as const)
          for (const aiInterest of ["not-now", "ai-visibility"] as const)
            for (const contentReadiness of ["ready", "partial", "need-help"] as const)
              for (const priority of ["standard", "priority"] as const)
                for (const capabilities of capabilitySets) {
                  const outcome = estimateProject({
                    projectType, businessCategory: "hvac", pageBand, seoInterest,
                    aiInterest, contentReadiness, priority, capabilities,
                  });
                  expect(outcome.ok).toBe(true);
                  if (!outcome.ok) continue;
                  const json = JSON.stringify(outcome.result);
                  expect(json).not.toMatch(/\$\s?\d/);
                  expect(json).not.toContain("899");
                  expect(json).not.toContain("1999");
                  expect(json).not.toContain("3799");
                  expect(json).not.toMatch(/retainer|care plan|per month|\/month/i);
                  expect(json).not.toMatch(/guarantee|guaranteed|\b\d+\s?(business\s)?days\b|\b\d+\s?weeks\b/i);
                  checked += 1;
                }
    expect(checked).toBe(2 * 6 * 2 * 2 * 3 * 2 * capabilitySets.length);
  });

  it("no result object carries a price-like field at any depth", () => {
    const keys: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === "object") {
        for (const [key, inner] of Object.entries(value)) {
          keys.push(key);
          walk(inner);
        }
      }
    };
    walk(run({ seoInterest: "local-seo", capabilities: ["online-booking"] }));
    walk(run({ pageBand: "20+" }));
    for (const key of keys) expect(key).not.toMatch(/price|cost|total|amount|usd|fee/i);
  });
});

describe("lead-capture integration safety", () => {
  it("the next step is the consultation anchor, and only that", () => {
    expect(run().nextStep).toEqual({ label: "Request a Free Consultation", href: "#consultation" });
    expect(run({ pageBand: "20+" }).nextStep.href).toBe("#consultation");
  });

  it("estimator output cannot be smuggled into the lead API: the P1.8 schema still rejects it", () => {
    const lead = {
      fullName: "Jamie Carter",
      businessName: "Carter HVAC LLC",
      email: "jamie@carterhvac.com",
      serviceInterest: "growth-seo",
      projectDescription: "We need a new website for our HVAC company in Cary.",
      consent: true,
      elapsedMs: 12_000,
    };
    expect(parseLeadSubmission(lead).ok).toBe(true);
    expect(parseLeadSubmission({ ...lead, estimate: run() }).ok).toBe(false);
    expect(parseLeadSubmission({ ...lead, tierId: "growth-seo" }).ok).toBe(false);
  });
});
