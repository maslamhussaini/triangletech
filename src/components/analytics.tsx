"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  ga4ScriptUrl,
  parseStoredConsent,
  shouldLoadAnalytics,
} from "@/lib/analytics/consent";

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

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/**
 * GA4 loader — consent-first by construction:
 * - renders nothing and loads nothing unless shouldLoadAnalytics() passes
 *   (explicit "granted" choice AND a valid configured measurement ID);
 * - if the script was loaded earlier in the session and consent is later
 *   withdrawn or rejected, a Consent Mode update set to "denied" stops
 *   further collection immediately (the script element itself cannot be
 *   unloaded; a page reload removes it entirely);
 * - no custom events and no personal data are sent by this component —
 *   only the standard GA4 page-view configuration, with IP anonymization.
 */
export function Analytics() {
  const stored = useSyncExternalStore(subscribeToConsent, readStoredConsent, () => null);
  const consent = parseStoredConsent(stored);

  useEffect(() => {
    if (!shouldLoadAnalytics(consent, measurementId)) {
      if (consent !== "granted") {
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
      }
      return;
    }
    const id = measurementId as string;
    window.dataLayer = window.dataLayer ?? [];
    if (!window.gtag) {
      window.gtag = (...args: unknown[]) => {
        window.dataLayer?.push(args);
      };
    }
    window.gtag("consent", "default", { analytics_storage: "denied" });
    if (!document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = ga4ScriptUrl(id);
      document.head.appendChild(script);
    }
    window.gtag("js", new Date());
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("config", id, { anonymize_ip: true });
  }, [consent]);

  return null;
}
