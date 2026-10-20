import type { NextConfig } from "next";

/**
 * Baseline security headers (P1.3), applied to every route.
 *
 * CSP status: REPORT-ONLY. The Content-Security-Policy-Report-Only header
 * below never blocks anything; it exists so violations can be observed
 * before an enforcing policy is considered under a separate authorization.
 *
 * Temporary allowances and their limitations (documented, deliberate):
 * - script-src 'unsafe-inline': required today because Next.js injects
 *   inline runtime scripts (RSC payload) and pages render JSON-LD via
 *   inline <script> elements. This weakens CSP's XSS containment for
 *   scripts; removing it needs a nonce strategy (middleware), which is
 *   explicitly out of scope for this slice. No 'unsafe-eval' is allowed:
 *   nothing in the application requires it.
 * - style-src 'unsafe-inline': the root layout and Next.js/font inject
 *   inline <style> elements.
 * - img-src data:/blob: supports inline/placeholder imagery only; all
 *   real imagery is same-origin.
 * - connect-src 'self': the browser only calls same-origin endpoints
 *   (e.g. /api/chat). The chat route's server-side call to its AI
 *   provider is not a browser connection and is intentionally NOT
 *   listed here.
 * - Google Analytics hosts (P1.7): listed individually — never as a
 *   wildcard — because the consent-first GA4 loader (loaded ONLY after
 *   an explicit opt-in and only when a measurement ID is configured)
 *   fetches its script from www.googletagmanager.com and sends
 *   measurement beacons to the google-analytics.com endpoints. While
 *   the policy is report-only these entries change nothing in
 *   practice; they exist so a future enforcing policy does not break
 *   consented analytics. No other third-party origins are allowed.
 * - Fonts: next/font self-hosts Inter/Sora, so font-src 'self' suffices;
 *   no Google Fonts origins are needed at runtime.
 *
 * HSTS is managed by Vercel (observed on production) and is intentionally
 * NOT set here, to avoid duplicate/conflicting configuration.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://region1.analytics.google.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
