/**
 * Consent-first analytics logic (pure, framework-free).
 *
 * Rules enforced here and relied on by the components:
 * - Analytics defaults to DENIED: "unknown" (no choice recorded) never loads.
 * - Nothing loads without BOTH an explicit "granted" choice AND a valid
 *   configured measurement ID.
 * - The consent choice is the only thing ever persisted (localStorage),
 *   and only after the visitor makes an explicit choice.
 */

export type AnalyticsConsent = "unknown" | "granted" | "denied";

export const CONSENT_STORAGE_KEY = "tt-analytics-consent";

/** Window event fired after the stored choice changes. */
export const CONSENT_CHANGED_EVENT = "tt-consent-changed";

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export function isValidMeasurementId(
  id: string | undefined | null,
): id is string {
  return typeof id === "string" && MEASUREMENT_ID_PATTERN.test(id.trim());
}

export function parseStoredConsent(raw: string | null): AnalyticsConsent {
  if (raw === "granted" || raw === "denied") return raw;
  return "unknown";
}

export type ConsentChoice = "accept" | "reject" | "withdraw";

/**
 * State transitions:
 * - accept  -> granted (from any state)
 * - reject  -> denied  (from any state)
 * - withdraw -> denied (meaningful from granted; collection stops and the
 *   denial is persisted so analytics stays off until a new explicit choice)
 */
export function consentAfterChoice(
  _current: AnalyticsConsent,
  choice: ConsentChoice,
): AnalyticsConsent {
  switch (choice) {
    case "accept":
      return "granted";
    case "reject":
    case "withdraw":
      return "denied";
  }
}

/** The single gate every analytics load must pass. */
export function shouldLoadAnalytics(
  consent: AnalyticsConsent,
  measurementId: string | undefined | null,
): boolean {
  return consent === "granted" && isValidMeasurementId(measurementId);
}

export function ga4ScriptUrl(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
}
