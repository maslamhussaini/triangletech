import { describe, expect, it } from "vitest";
import {
  focusTargetAfterViewChange,
  formatStartingPrice,
  formatUsd,
  isValidCtaHref,
  planBadgeLabel,
  priceDisplayText,
  pricingCardClass,
  validateFaqEntry,
  validatePlan,
  type LandingPlan,
} from "./landing";

// Fixture data only — generic sample content, not real plans or prices.
const samplePlan: LandingPlan = {
  id: "sample",
  name: "Sample Plan",
  tagline: "A sample tagline.",
  priceAmount: 500,
  billingNote: "one-time",
  features: ["Feature one", "Feature two"],
};

describe("price formatting", () => {
  it("formats whole dollars with US grouping", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(500)).toBe("$500");
    expect(formatUsd(2500)).toBe("$2,500");
    expect(formatUsd(1000000)).toBe("$1,000,000");
  });

  it("rejects negative and non-finite amounts", () => {
    expect(() => formatUsd(-1)).toThrow(RangeError);
    expect(() => formatUsd(Number.NaN)).toThrow(RangeError);
    expect(() => formatUsd(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("adds the starting-price prefix", () => {
    expect(formatStartingPrice(500)).toBe("from $500");
  });
});

describe("CTA destination validation", () => {
  it("accepts internal paths, anchors, web URLs and mail/tel links", () => {
    for (const href of ["/contact", "/websites#pricing", "#faq", "https://example.com", "mailto:hi@example.com", "tel:+10000000000"]) {
      expect(isValidCtaHref(href)).toBe(true);
    }
  });

  it("rejects script-bearing schemes, protocol-relative and empty destinations", () => {
    for (const href of ["", "  ", "javascript:alert(1)", "data:text/html;base64,PGI+", "//evil.example", "ftp://example.com"]) {
      expect(isValidCtaHref(href)).toBe(false);
    }
  });
});

describe("plan card presentation contract", () => {
  it("gives featured plans the brand treatment class", () => {
    expect(pricingCardClass(samplePlan)).toBe("card-premium plan-card");
    expect(pricingCardClass({ ...samplePlan, featured: true })).toBe(
      "card-premium plan-card is-brand",
    );
  });

  it("labels featured plans only", () => {
    expect(planBadgeLabel(samplePlan)).toBeNull();
    expect(planBadgeLabel({ ...samplePlan, featured: true })).toBe("Most chosen");
    expect(planBadgeLabel({ ...samplePlan, featured: true, badge: "Best value" })).toBe("Best value");
  });
});

describe("content data contracts", () => {
  it("accepts a well-formed plan", () => {
    expect(validatePlan(samplePlan)).toEqual([]);
  });

  it("flags missing plan fields", () => {
    const problems = validatePlan({
      ...samplePlan,
      name: " ",
      priceAmount: -5,
      features: [],
    });
    expect(problems).toContain("plan.name is required");
    expect(problems).toContain(
      "plan requires a non-empty priceLabel or a non-negative priceAmount",
    );
    expect(problems).toContain("plan.features must contain at least one non-empty feature");
  });

  it("accepts a label-priced plan with no numeric amount", () => {
    const labelOnly: LandingPlan = {
      id: samplePlan.id,
      name: samplePlan.name,
      tagline: samplePlan.tagline,
      billingNote: samplePlan.billingNote,
      features: samplePlan.features,
      priceLabel: "Request a Quote",
    };
    expect(validatePlan(labelOnly)).toEqual([]);
    expect(labelOnly.priceAmount).toBeUndefined();
  });

  it("displays the non-numeric label instead of any numeric price", () => {
    expect(priceDisplayText(samplePlan)).toBe("from $500");
    expect(priceDisplayText({ ...samplePlan, priceLabel: "Request a Quote" })).toBe(
      "Request a Quote",
    );
  });

  it("flags incomplete FAQ entries and accepts complete ones", () => {
    expect(validateFaqEntry({ question: "Q?", answer: "A." })).toEqual([]);
    expect(validateFaqEntry({ question: "", answer: "" })).toEqual([
      "faq.question is required",
      "faq.answer is required",
    ]);
  });
});

describe("focusTargetAfterViewChange (P1.10 D1)", () => {
  it("never moves focus on initial mount (no focus steal on page load)", () => {
    expect(focusTargetAfterViewChange(null, "step-0")).toBeNull();
    expect(focusTargetAfterViewChange(null, "result")).toBeNull();
  });

  it("does not move focus when the view did not change", () => {
    expect(focusTargetAfterViewChange("step-0", "step-0")).toBeNull();
    expect(focusTargetAfterViewChange("step-1", "step-1")).toBeNull();
    expect(focusTargetAfterViewChange("result", "result")).toBeNull();
  });

  it("targets the step heading on forward step transitions", () => {
    expect(focusTargetAfterViewChange("step-0", "step-1")).toBe("step-heading");
    expect(focusTargetAfterViewChange("step-1", "step-2")).toBe("step-heading");
  });

  it("targets the step heading on Back navigation", () => {
    expect(focusTargetAfterViewChange("step-2", "step-1")).toBe("step-heading");
    expect(focusTargetAfterViewChange("step-1", "step-0")).toBe("step-heading");
  });

  it("targets the result heading when the result replaces the wizard", () => {
    expect(focusTargetAfterViewChange("step-2", "result")).toBe("result-heading");
  });

  it("targets the step heading for Edit and for Start Over from the result", () => {
    expect(focusTargetAfterViewChange("result", "step-0")).toBe("step-heading");
  });

  it("targets the step heading for Start Over from a later step", () => {
    expect(focusTargetAfterViewChange("step-2", "step-0")).toBe("step-heading");
    expect(focusTargetAfterViewChange("step-1", "step-0")).toBe("step-heading");
  });
});
