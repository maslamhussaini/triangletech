"use client";

import { useState, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  consentAfterChoice,
  isValidMeasurementId,
  parseStoredConsent,
  type ConsentChoice,
} from "@/lib/analytics/consent";

const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/** Sentinel returned during SSR/hydration, before the real value is read. */
const SSR_SNAPSHOT = "ssr";

function subscribeToConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredConsent(): string | null {
  return window.localStorage.getItem(CONSENT_STORAGE_KEY);
}

/**
 * Analytics consent UI.
 * - Renders NOTHING when no valid GA4 measurement ID is configured:
 *   with analytics unconfigured there is nothing to consent to.
 * - Shows the banner only until the visitor makes an explicit choice;
 *   the choice (and only the choice) is then persisted in localStorage.
 * - Afterwards a small "Privacy choices" control stays available so the
 *   visitor can change or withdraw consent at any time. Accept and
 *   Reject are presented with equal prominence.
 */
export function AnalyticsConsent() {
  const stored = useSyncExternalStore(
    subscribeToConsent,
    readStoredConsent,
    () => SSR_SNAPSHOT,
  );
  // null = follow the stored state (banner iff no choice recorded yet);
  // true/false = the visitor explicitly opened/closed the panel.
  const [panelOverride, setPanelOverride] = useState<boolean | null>(null);

  if (stored === SSR_SNAPSHOT || !isValidMeasurementId(measurementId)) return null;

  const consent = parseStoredConsent(stored);
  const hasChoice = stored !== null && consent !== "unknown";
  const panelOpen = panelOverride ?? !hasChoice;

  const choose = (choice: ConsentChoice) => {
    const next = consentAfterChoice(consent, choice);
    window.localStorage.setItem(CONSENT_STORAGE_KEY, next);
    setPanelOverride(false);
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  };

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="consent-reopen"
        onClick={() => setPanelOverride(true)}
      >
        Privacy choices
      </button>
    );
  }

  return (
    <div className="consent-banner" role="dialog" aria-label="Analytics consent">
      <p>
        <strong>Your privacy first.</strong> We only use analytics cookies if you accept.
        They help us understand, in aggregate, which pages are useful — nothing is loaded
        before you choose, and you can change your mind anytime.{" "}
        <a href="/privacy">Privacy policy</a>
      </p>
      <div className="consent-actions">
        {consent === "granted" ? (
          <>
            <span className="consent-status">Analytics is currently on.</span>
            <button type="button" className="button-indigo" onClick={() => choose("withdraw")}>
              Withdraw consent
            </button>
            <button
              type="button"
              className="button-indigo-secondary"
              onClick={() => setPanelOverride(false)}
            >
              Keep it on
            </button>
          </>
        ) : consent === "denied" ? (
          <>
            <span className="consent-status">Analytics is currently off.</span>
            <button type="button" className="button-indigo" onClick={() => choose("accept")}>
              Accept analytics
            </button>
            <button
              type="button"
              className="button-indigo-secondary"
              onClick={() => setPanelOverride(false)}
            >
              Keep it off
            </button>
          </>
        ) : (
          <>
            <button type="button" className="button-indigo" onClick={() => choose("accept")}>
              Accept analytics
            </button>
            <button type="button" className="button-indigo-secondary" onClick={() => choose("reject")}>
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
