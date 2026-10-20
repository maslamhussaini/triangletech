import { describe, expect, it } from "vitest";
import { firstInvalidField, LEAD_FIELD_ORDER, parseLeadSubmission } from "./schema";

const VALID = {
  fullName: "Jamie Carter",
  businessName: "Carter HVAC LLC",
  email: "jamie@carterhvac.com",
  serviceInterest: "growth-seo",
  projectDescription: "We need a new website for our HVAC company in Cary.",
  consent: true,
  elapsedMs: 12_000,
};

describe("parseLeadSubmission — valid submissions", () => {
  it("accepts a complete submission without a website URL", () => {
    const result = parseLeadSubmission(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.fullName).toBe("Jamie Carter");
    expect(result.lead.websiteUrl).toBeUndefined();
    expect(result.lead.consent).toBe(true);
    // Anti-spam controls are separated from the lead itself.
    expect("faxNumber" in result.lead).toBe(false);
    expect("elapsedMs" in result.lead).toBe(false);
    expect(result.elapsedMs).toBe(12_000);
  });

  it("accepts a valid optional website URL", () => {
    const result = parseLeadSubmission({ ...VALID, websiteUrl: "https://carterhvac.com" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.websiteUrl).toBe("https://carterhvac.com");
  });

  it("trims surrounding whitespace from string fields", () => {
    const result = parseLeadSubmission({ ...VALID, fullName: "  Jamie Carter  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.fullName).toBe("Jamie Carter");
  });

  it("treats a blank website URL as absent", () => {
    const result = parseLeadSubmission({ ...VALID, websiteUrl: "   " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead.websiteUrl).toBeUndefined();
  });

  it("accepts every allowed service interest", () => {
    for (const serviceInterest of ["starter-website", "growth-seo", "ai-visibility", "website-redesign", "other"]) {
      expect(parseLeadSubmission({ ...VALID, serviceInterest }).ok).toBe(true);
    }
  });
});

describe("parseLeadSubmission — invalid submissions", () => {
  it("rejects a missing full name", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.fullName;
    const result = parseLeadSubmission(rest);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.fullName).toBeTruthy();
  });

  it("rejects every missing required field with a field-specific message", () => {
    for (const field of ["businessName", "email", "serviceInterest", "projectDescription", "consent"] as const) {
      const partial: Record<string, unknown> = { ...VALID };
      delete partial[field];
      const result = parseLeadSubmission(partial);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.fieldErrors[field]).toBeTruthy();
    }
  });

  it("rejects an invalid email address", () => {
    for (const email of ["not-an-email", "jamie@", "@example.com", "jamie @example.com"]) {
      const result = parseLeadSubmission({ ...VALID, email });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.fieldErrors.email).toBeTruthy();
    }
  });

  it("rejects an invalid optional website URL", () => {
    for (const websiteUrl of ["carterhvac.com", "ftp://example.com", "javascript:alert(1)"]) {
      const result = parseLeadSubmission({ ...VALID, websiteUrl });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.fieldErrors.websiteUrl).toBeTruthy();
    }
  });

  it("rejects an unknown service selection", () => {
    const result = parseLeadSubmission({ ...VALID, serviceInterest: "platinum-deluxe" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.serviceInterest).toBeTruthy();
  });

  it("rejects missing or false consent", () => {
    for (const consent of [false, undefined, "yes"]) {
      const result = parseLeadSubmission({ ...VALID, consent });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.fieldErrors.consent).toBeTruthy();
    }
  });

  it("rejects over-length fields", () => {
    const result = parseLeadSubmission({
      ...VALID,
      fullName: "x".repeat(81),
      projectDescription: "x".repeat(2001),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.fullName).toBeTruthy();
    expect(result.fieldErrors.projectDescription).toBeTruthy();
  });

  it("rejects a too-short project description", () => {
    const result = parseLeadSubmission({ ...VALID, projectDescription: "New site." });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.projectDescription).toBeTruthy();
  });

  it("rejects unknown fields (strict whitelist)", () => {
    const result = parseLeadSubmission({ ...VALID, estimateTotal: 1999, admin: true });
    expect(result.ok).toBe(false);
  });

  it("rejects non-object input", () => {
    for (const input of [null, "text", 42, [1, 2, 3]]) {
      expect(parseLeadSubmission(input).ok).toBe(false);
    }
  });
});

describe("firstInvalidField (P1.10 D1)", () => {
  it("returns null when there are no errors", () => {
    expect(firstInvalidField({})).toBeNull();
  });

  it("returns the only invalid field", () => {
    expect(firstInvalidField({ email: "Enter a valid email address." })).toBe("email");
    expect(firstInvalidField({ consent: "Please confirm so we can respond." })).toBe("consent");
  });

  it("follows the form's visual order, not object key order", () => {
    expect(
      firstInvalidField({ projectDescription: "x", email: "y", fullName: "z" }),
    ).toBe("fullName");
    expect(firstInvalidField({ consent: "x", serviceInterest: "y" })).toBe("serviceInterest");
    expect(firstInvalidField({ projectDescription: "x", websiteUrl: "y" })).toBe("websiteUrl");
  });

  it("covers every lead field exactly once in LEAD_FIELD_ORDER", () => {
    const fields = [...LEAD_FIELD_ORDER].sort();
    expect(fields).toEqual(
      [
        "businessName",
        "consent",
        "email",
        "fullName",
        "projectDescription",
        "serviceInterest",
        "websiteUrl",
      ].sort(),
    );
  });
});
