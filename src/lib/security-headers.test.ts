import { describe, expect, it } from "vitest";

// The security policy lives in next.config.ts (exported as `securityHeaders`
// and wired through its async headers()). These tests pin that configuration
// so a future edit cannot silently weaken or enforce it.
import nextConfig, { securityHeaders } from "../../next.config";

type Header = { key: string; value: string };

function headerMap(headers: Header[]): Map<string, string> {
  return new Map(headers.map(h => [h.key.toLowerCase(), h.value]));
}

async function appliedHeaders(): Promise<{ source: string; headers: Header[] }[]> {
  if (typeof nextConfig.headers !== "function") {
    throw new Error("next.config.ts must define async headers()");
  }
  return (await nextConfig.headers()) as { source: string; headers: Header[] }[];
}

describe("security headers configuration", () => {
  it("applies the headers to all routes through a single catch-all rule", async () => {
    const rules = await appliedHeaders();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    expect(rules[0].headers).toEqual(securityHeaders);
  });

  it("sets the four baseline headers with their exact values", async () => {
    const rules = await appliedHeaders();
    const headers = headerMap(rules[0].headers);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(headers.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });

  it("ships CSP as report-only and does not enforce it", async () => {
    const rules = await appliedHeaders();
    const headers = headerMap(rules[0].headers);
    expect(headers.has("content-security-policy-report-only")).toBe(true);
    expect(headers.has("content-security-policy")).toBe(false);
  });

  it("does not duplicate the platform-managed HSTS header", async () => {
    const rules = await appliedHeaders();
    const headers = headerMap(rules[0].headers);
    expect(headers.has("strict-transport-security")).toBe(false);
  });

  it("includes the critical defensive CSP directives", async () => {
    const rules = await appliedHeaders();
    const csp = headerMap(rules[0].headers).get("content-security-policy-report-only") ?? "";
    for (const directive of [
      "default-src 'self'",
      "script-src ",
      "style-src ",
      "img-src ",
      "font-src ",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
  });

  it("contains no wildcard origins and no 'unsafe-eval'", async () => {
    const rules = await appliedHeaders();
    const csp = headerMap(rules[0].headers).get("content-security-policy-report-only") ?? "";
    expect(csp).not.toContain("*");
    expect(csp).not.toContain("'unsafe-eval'");
    // A scheme-wide source (a bare "https:" token) would silently widen
    // the policy; only individually named hosts may appear.
    expect(csp).not.toMatch(/(?:^|\s)https:(?=\s|;|$)/);
  });

  it("allows only the individually named Google Analytics hosts externally", async () => {
    const rules = await appliedHeaders();
    const csp = headerMap(rules[0].headers).get("content-security-policy-report-only") ?? "";
    const externalHosts = [...csp.matchAll(/https:\/\/[a-z0-9.-]+/g)].map(m => m[0]);
    expect(new Set(externalHosts)).toEqual(
      new Set([
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://region1.analytics.google.com",
      ]),
    );
  });
});
