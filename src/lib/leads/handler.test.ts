import { describe, expect, it } from "vitest";
import { createRateLimiter, handleLeadPost, LEAD_LIMITS, type LeadHandlerDeps } from "./handler";
import { MockLeadStore, type LeadStore } from "./store";

const VALID = {
  fullName: "Jamie Carter",
  businessName: "Carter HVAC LLC",
  email: "jamie@carterhvac.com",
  serviceInterest: "growth-seo",
  projectDescription: "We need a new website for our HVAC company in Cary.",
  consent: true,
  elapsedMs: 12_000,
};

const FIXED_NOW = 1_760_000_000_000;

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeDeps(store: LeadStore, overrides: Partial<LeadHandlerDeps> = {}): LeadHandlerDeps {
  return {
    store,
    limiter: createRateLimiter(LEAD_LIMITS.rateLimitMax, LEAD_LIMITS.rateLimitWindowMs),
    leadsEnabled: true,
    now: () => FIXED_NOW,
    ...overrides,
  };
}

describe("handleLeadPost — delivery path", () => {
  it("delivers a valid submission and returns a reference", async () => {
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest(VALID), makeDeps(store));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; reference: string };
    expect(body.ok).toBe(true);
    expect(body.reference).toMatch(/^TT-[0-9A-F]{8}$/);
    expect(store.deliveries).toHaveLength(1);
    expect(store.deliveries[0].reference).toBe(body.reference);
    expect(store.deliveries[0].lead.email).toBe("jamie@carterhvac.com");
    expect(store.deliveries[0].receivedAt).toBe(new Date(FIXED_NOW).toISOString());
  });

  it("gives duplicate submissions distinct references (email-only mode has no server dedupe)", async () => {
    const store = new MockLeadStore();
    const deps = makeDeps(store, { limiter: createRateLimiter(100, LEAD_LIMITS.rateLimitWindowMs) });
    const first = (await (await handleLeadPost(makeRequest(VALID), deps)).json()) as { reference: string };
    const second = (await (await handleLeadPost(makeRequest(VALID), deps)).json()) as { reference: string };
    expect(first.reference).not.toBe(second.reference);
    expect(store.deliveries).toHaveLength(2);
  });

  it("returns 503 — never a false success — when delivery fails", async () => {
    const store = new MockLeadStore(true);
    const response = await handleLeadPost(makeRequest(VALID), makeDeps(store));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("could not confirm delivery");
  });

  it("returns 503 when the store throws", async () => {
    const throwingStore: LeadStore = {
      async deliver() {
        throw new Error("boom");
      },
    };
    const response = await handleLeadPost(makeRequest(VALID), makeDeps(throwingStore));
    expect(response.status).toBe(503);
    expect(((await response.json()) as { ok: boolean }).ok).toBe(false);
  });
});

describe("handleLeadPost — validation and request shape", () => {
  it("returns 400 with field errors for an invalid payload", async () => {
    const store = new MockLeadStore();
    const response = await handleLeadPost(
      makeRequest({ ...VALID, email: "not-an-email", consent: false }),
      makeDeps(store),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { ok: boolean; fields: Record<string, string> };
    expect(body.ok).toBe(false);
    expect(body.fields.email).toBeTruthy();
    expect(body.fields.consent).toBeTruthy();
    expect(store.deliveries).toHaveLength(0);
  });

  it("rejects an unknown service selection with 400", async () => {
    const response = await handleLeadPost(makeRequest({ ...VALID, serviceInterest: "platinum" }), makeDeps(new MockLeadStore()));
    expect(response.status).toBe(400);
  });

  it("rejects an unknown extra field with 400 (strict whitelist)", async () => {
    const response = await handleLeadPost(makeRequest({ ...VALID, role: "admin" }), makeDeps(new MockLeadStore()));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await handleLeadPost(makeRequest("{not json"), makeDeps(new MockLeadStore()));
    expect(response.status).toBe(400);
  });

  it("rejects a non-object JSON body with 400", async () => {
    const response = await handleLeadPost(makeRequest("[1,2,3]"), makeDeps(new MockLeadStore()));
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON content type with 415", async () => {
    const response = await handleLeadPost(
      makeRequest(VALID, { "content-type": "text/plain" }),
      makeDeps(new MockLeadStore()),
    );
    expect(response.status).toBe(415);
  });

  it("rejects an oversized body with 413 before parsing", async () => {
    const big = { ...VALID, projectDescription: "x".repeat(LEAD_LIMITS.maxBodyBytes) };
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest(big), makeDeps(store));
    expect(response.status).toBe(413);
    expect(store.deliveries).toHaveLength(0);
  });
});

describe("handleLeadPost — anti-spam controls", () => {
  it("silently drops a filled honeypot: success shape, no delivery", async () => {
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest({ ...VALID, faxNumber: "+1 555 0100" }), makeDeps(store));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; reference: string };
    expect(body.ok).toBe(true);
    expect(body.reference).toMatch(/^TT-[0-9A-F]{8}$/);
    expect(store.deliveries).toHaveLength(0);
  });

  it("silently drops an instant submission (time-trap)", async () => {
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest({ ...VALID, elapsedMs: 400 }), makeDeps(store));
    expect(response.status).toBe(200);
    expect(store.deliveries).toHaveLength(0);
  });

  it("silently drops a submission with no elapsed time at all", async () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.elapsedMs;
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest(rest), makeDeps(store));
    expect(response.status).toBe(200);
    expect(store.deliveries).toHaveLength(0);
  });

  it("rate-limits after the configured number of submissions per IP", async () => {
    const store = new MockLeadStore();
    const deps = makeDeps(store); // limit: LEAD_LIMITS.rateLimitMax (5) per window
    for (let i = 0; i < LEAD_LIMITS.rateLimitMax; i++) {
      const ok = await handleLeadPost(makeRequest(VALID), deps);
      expect(ok.status).toBe(200);
    }
    const limited = await handleLeadPost(makeRequest(VALID), deps);
    expect(limited.status).toBe(429);
    expect(store.deliveries).toHaveLength(LEAD_LIMITS.rateLimitMax);
  });

  it("rate-limits per IP, not globally", async () => {
    const deps = makeDeps(new MockLeadStore(), { limiter: createRateLimiter(1, LEAD_LIMITS.rateLimitWindowMs) });
    expect((await handleLeadPost(makeRequest(VALID), deps)).status).toBe(200);
    expect((await handleLeadPost(makeRequest(VALID), deps)).status).toBe(429);
    const otherIp = await handleLeadPost(makeRequest(VALID, { "x-forwarded-for": "198.51.100.7" }), deps);
    expect(otherIp.status).toBe(200);
  });
});

describe("handleLeadPost — kill switch and disclosure safety", () => {
  it("refuses every submission with 503 while the kill switch is on", async () => {
    const store = new MockLeadStore();
    const response = await handleLeadPost(makeRequest(VALID), makeDeps(store, { leadsEnabled: false }));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("unavailable");
    expect(store.deliveries).toHaveLength(0);
  });

  it("never includes provider details or credentials in any response", async () => {
    const failing = new MockLeadStore(true);
    const responses = [
      await handleLeadPost(makeRequest(VALID), makeDeps(failing)),
      await handleLeadPost(makeRequest({ ...VALID, email: "bad" }), makeDeps(new MockLeadStore())),
      await handleLeadPost(makeRequest(VALID), makeDeps(new MockLeadStore(), { leadsEnabled: false })),
    ];
    for (const response of responses) {
      const text = await response.text();
      expect(text).not.toMatch(/resend|RESEND_API_KEY|Bearer|api[_-]?key/i);
    }
  });
});
