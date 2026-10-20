import { describe, expect, it } from "vitest";
import {
  consentAfterChoice,
  ga4ScriptUrl,
  isValidMeasurementId,
  parseStoredConsent,
  shouldLoadAnalytics,
} from "./consent";

const VALID_ID = "G-ABC123XYZ9";

describe("measurement ID validation", () => {
  it("accepts well-formed GA4 IDs and rejects everything else", () => {
    expect(isValidMeasurementId(VALID_ID)).toBe(true);
    expect(isValidMeasurementId("G-")).toBe(false);
    expect(isValidMeasurementId("UA-123456-1")).toBe(false);
    expect(isValidMeasurementId("")).toBe(false);
    expect(isValidMeasurementId(undefined)).toBe(false);
    expect(isValidMeasurementId(null)).toBe(false);
    expect(isValidMeasurementId("G-abc123")).toBe(false);
  });
});

describe("stored consent parsing", () => {
  it("defaults to unknown for anything not explicitly recorded", () => {
    expect(parseStoredConsent(null)).toBe("unknown");
    expect(parseStoredConsent("")).toBe("unknown");
    expect(parseStoredConsent("yes")).toBe("unknown");
    expect(parseStoredConsent("granted")).toBe("granted");
    expect(parseStoredConsent("denied")).toBe("denied");
  });
});

describe("consent state transitions", () => {
  it("accept grants from any state; reject and withdraw deny", () => {
    expect(consentAfterChoice("unknown", "accept")).toBe("granted");
    expect(consentAfterChoice("denied", "accept")).toBe("granted");
    expect(consentAfterChoice("unknown", "reject")).toBe("denied");
    expect(consentAfterChoice("granted", "reject")).toBe("denied");
    expect(consentAfterChoice("granted", "withdraw")).toBe("denied");
  });
});

describe("analytics load gate", () => {
  it("loads only with granted consent AND a valid measurement ID", () => {
    expect(shouldLoadAnalytics("granted", VALID_ID)).toBe(true);
    expect(shouldLoadAnalytics("unknown", VALID_ID)).toBe(false);
    expect(shouldLoadAnalytics("denied", VALID_ID)).toBe(false);
  });

  it("stays disabled when no measurement ID is configured", () => {
    expect(shouldLoadAnalytics("granted", undefined)).toBe(false);
    expect(shouldLoadAnalytics("granted", null)).toBe(false);
    expect(shouldLoadAnalytics("granted", "not-an-id")).toBe(false);
  });

  it("builds the GA4 script URL from the configured ID only", () => {
    expect(ga4ScriptUrl(VALID_ID)).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9",
    );
  });
});
