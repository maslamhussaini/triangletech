import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/**
 * End-to-end route test: POST /api/leads through the real route module,
 * proving the wiring (route → store selection → handler) rather than the
 * handler in isolation. The mock store is used so no provider is called.
 *
 * The route is imported once: env is read per request, so per-test
 * `vi.stubEnv` still controls store selection and the kill switch. The
 * module-scoped rate limiter allows 5 submissions per IP; each test uses
 * its own IP so tests never interfere with each other.
 */
const VALID = {
  fullName: "Jamie Carter",
  businessName: "Carter HVAC LLC",
  email: "jamie@carterhvac.com",
  serviceInterest: "growth-seo",
  projectDescription: "We need a new website for our HVAC company in Cary.",
  consent: true,
  elapsedMs: 12_000,
};

function makeRequest(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads (route)", () => {
  beforeEach(() => {
    vi.stubEnv("LEAD_DELIVERY_MODE", "mock");
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("LEADS_DISABLED", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("delivers a valid submission in mock mode and returns a reference", async () => {
    const res = await POST(makeRequest(VALID, "203.0.113.10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.reference).toBe("string");
    expect(body.reference.length).toBeGreaterThan(0);
  });

  it("returns 400 with field errors for an invalid submission", async () => {
    const res = await POST(makeRequest({ ...VALID, email: "not-an-email" }, "203.0.113.11"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.fields.email).toBeDefined();
  });

  it("fails safely with 503 when no provider is configured", async () => {
    vi.stubEnv("LEAD_DELIVERY_MODE", "");
    const res = await POST(makeRequest(VALID, "203.0.113.12"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // Never a false success, and never a provider detail in the response.
    expect(JSON.stringify(body)).not.toMatch(/resend|api[_-]?key/i);
  });

  it("refuses every submission with 503 while the kill switch is on", async () => {
    vi.stubEnv("LEADS_DISABLED", "true");
    const res = await POST(makeRequest(VALID, "203.0.113.13"));
    expect(res.status).toBe(503);
  });
});
