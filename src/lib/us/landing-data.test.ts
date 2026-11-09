import { describe, expect, it } from "vitest";
import {
  isValidCtaHref,
  priceDisplayText,
  validateFaqEntry,
  validatePlan,
} from "./landing";
import { FAQS, FINAL_CTA, HERO_CTAS, PLANS, PLAN_CTA, PROCESS_STEPS, TRUST_SIGNALS } from "./landing-data";

describe("package set", () => {
  it("has exactly three packages in funnel order", () => {
    expect(PLANS.map(plan => plan.id)).toEqual([
      "starter-website",
      "growth-seo",
      "ai-visibility",
    ]);
  });

  it("differentiates every tier from the one before it", () => {
    for (const plan of PLANS) {
      expect(plan.features.length).toBeGreaterThanOrEqual(5);
      expect(validatePlan(plan)).toEqual([]);
    }
    for (let i = 1; i < PLANS.length; i += 1) {
      const previous = new Set(PLANS[i - 1].features);
      const uniqueToThisTier = PLANS[i].features.filter(feature => !previous.has(feature));
      expect(uniqueToThisTier.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("marks exactly one featured package", () => {
    expect(PLANS.filter(plan => plan.featured)).toHaveLength(1);
    expect(PLANS.find(plan => plan.featured)?.id).toBe("growth-seo");
  });
});

describe("pricing-publication safety", () => {
  it("publishes no numeric price anywhere in the plan data", () => {
    for (const plan of PLANS) {
      expect(plan.priceAmount).toBeUndefined();
      expect(priceDisplayText(plan)).toBe("Request a Quote");
    }
    expect(JSON.stringify(PLANS)).not.toMatch(/\$\s?\d/);
  });
});

describe("calls to action", () => {
  it("uses only valid, existing destinations", () => {
    const hrefs = [HERO_CTAS.primary.href, HERO_CTAS.secondary.href, PLAN_CTA.href, FINAL_CTA.href];
    for (const href of hrefs) {
      expect(isValidCtaHref(href)).toBe(true);
    }
    // Consultations anchor to the on-page inquiry form section (P1.8) —
    // one conversion path, no invented booking calendar or email address.
    expect(HERO_CTAS.primary.href).toBe("#consultation");
    expect(PLAN_CTA.href).toBe("#consultation");
    expect(FINAL_CTA.href).toBe("#consultation");
    // The secondary hero CTA anchors to the packages section on this page.
    expect(HERO_CTAS.secondary.href).toBe("#packages");
  });
});

describe("supporting content completeness", () => {
  it("covers every required FAQ topic with valid entries", () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(7);
    for (const entry of FAQS) {
      expect(validateFaqEntry(entry)).toEqual([]);
    }
    const questions = FAQS.map(entry => entry.question.toLowerCase()).join(" ");
    for (const topic of ["start", "redesign", "seo included", "ai search", "hosting", "how long", "remotely"]) {
      expect(questions).toContain(topic);
    }
  });

  it("defines the five process steps in order", () => {
    expect(PROCESS_STEPS.map(step => step.title)).toEqual([
      "Discovery",
      "Proposal",
      "Design & Development",
      "Review",
      "Launch",
    ]);
  });

  it("keeps trust signals factual and complete", () => {
    expect(TRUST_SIGNALS.length).toBeGreaterThanOrEqual(5);
    for (const signal of TRUST_SIGNALS) {
      expect(signal.title.trim()).not.toBe("");
      expect(signal.description.trim()).not.toBe("");
    }
  });
});
