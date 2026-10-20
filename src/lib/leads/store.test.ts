import { describe, expect, it, vi } from "vitest";
import type { LeadDeliveryRequest } from "./store";
import {
  composeLeadEmail,
  DEFAULT_LEAD_FROM,
  DEFAULT_LEAD_INBOX,
  getLeadStore,
  MockLeadStore,
  ResendLeadStore,
  resolveLeadConfig,
  UnavailableLeadStore,
} from "./store";

const REQUEST: LeadDeliveryRequest = {
  reference: "TT-ABCDEF12",
  receivedAt: "2026-10-20T12:00:00.000Z",
  lead: {
    fullName: "Jamie Carter",
    businessName: "Carter HVAC LLC",
    email: "jamie@carterhvac.com",
    websiteUrl: "https://carterhvac.com",
    serviceInterest: "growth-seo",
    projectDescription: "We need a new website for our HVAC company in Cary.",
    consent: true,
  },
};

describe("MockLeadStore", () => {
  it("records deliveries and reports success", async () => {
    const store = new MockLeadStore();
    const result = await store.deliver(REQUEST);
    expect(result.ok).toBe(true);
    expect(store.deliveries).toEqual([REQUEST]);
  });

  it("can simulate a provider failure without recording", async () => {
    const store = new MockLeadStore(true);
    const result = await store.deliver(REQUEST);
    expect(result).toEqual({ ok: false, reason: "provider_error" });
    expect(store.deliveries).toEqual([]);
  });
});

describe("resolveLeadConfig", () => {
  it("uses the owner-approved default inbox and sender", () => {
    const resolved = resolveLeadConfig({});
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.config.inbox).toBe(DEFAULT_LEAD_INBOX);
    expect(resolved.config.inbox).toBe("hello@triangletech.co");
    expect(resolved.config.from).toBe(DEFAULT_LEAD_FROM);
    expect(resolved.config.from).toBe("notifications@triangletech.co");
    expect(resolved.config.apiKey).toBeUndefined();
  });

  it("honors environment overrides and trims the API key", () => {
    const resolved = resolveLeadConfig({
      LEAD_INBOX_EMAIL: "leads@example.com",
      LEAD_FROM_EMAIL: "forms@example.com",
      RESEND_API_KEY: "  re_test_key  ",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.config.inbox).toBe("leads@example.com");
    expect(resolved.config.from).toBe("forms@example.com");
    expect(resolved.config.apiKey).toBe("re_test_key");
  });

  it("rejects malformed inbox or sender addresses", () => {
    expect(resolveLeadConfig({ LEAD_INBOX_EMAIL: "not-an-email" }).ok).toBe(false);
    expect(resolveLeadConfig({ LEAD_FROM_EMAIL: "also not an email" }).ok).toBe(false);
  });
});

describe("composeLeadEmail", () => {
  it("includes every lead field, the reference, and the consent record", () => {
    const { subject, text } = composeLeadEmail(REQUEST);
    expect(subject).toContain("Carter HVAC LLC");
    expect(subject).toContain("Growth SEO Website");
    expect(text).toContain("Reference: TT-ABCDEF12");
    expect(text).toContain("jamie@carterhvac.com");
    expect(text).toContain("https://carterhvac.com");
    expect(text).toContain("Inquiry consent: confirmed");
  });

  it("marks a missing website as not provided", () => {
    const { text } = composeLeadEmail({ ...REQUEST, lead: { ...REQUEST.lead, websiteUrl: undefined } });
    expect(text).toContain("Current website: Not provided");
  });

  it("strips line breaks from the subject (header-injection guard)", () => {
    const { subject } = composeLeadEmail({
      ...REQUEST,
      lead: { ...REQUEST.lead, businessName: "Evil\r\nBcc: victim@example.com" },
    });
    // The security property is that the subject stays a single line: with
    // no CR/LF, injected text can never become a separate email header.
    expect(subject).not.toContain("\n");
    expect(subject).not.toContain("\r");
    expect(subject.split(" ").length).toBeGreaterThan(0);
    expect(subject).toContain("Evil Bcc: victim@example.com");
  });
});

describe("ResendLeadStore", () => {
  const config = { apiKey: "re_secret_test_key", inbox: "hello@triangletech.co", from: "notifications@triangletech.co" };

  it("fails as not_configured without an API key and never calls the provider", async () => {
    const fetchFn = vi.fn();
    const store = new ResendLeadStore({ ...config, apiKey: undefined }, fetchFn);
    const result = await store.deliver(REQUEST);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("posts to the Resend API with reply-to, idempotency key and server-only auth", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "email_123" }),
    }) as unknown as Response);
    const store = new ResendLeadStore(config, fetchFn as never);
    const result = await store.deliver(REQUEST);
    expect(result).toEqual({ ok: true, providerId: "email_123" });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_secret_test_key");
    expect(headers["idempotency-key"]).toBe("TT-ABCDEF12");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.from).toBe("notifications@triangletech.co");
    expect(body.to).toEqual(["hello@triangletech.co"]);
    expect(body.reply_to).toBe("jamie@carterhvac.com");
    expect(typeof body.subject).toBe("string");
    expect(typeof body.text).toBe("string");
  });

  it("maps a provider failure to provider_error without leaking details or the key", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: "domain not verified for key re_secret_test_key" }),
    }) as unknown as Response);
    const store = new ResendLeadStore(config, fetchFn as never);
    const result = await store.deliver(REQUEST);
    expect(result).toEqual({ ok: false, reason: "provider_error" });
    expect(JSON.stringify(result)).not.toContain("re_secret_test_key");
  });

  it("maps a network throw to provider_error", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const store = new ResendLeadStore(config, fetchFn as never);
    await expect(store.deliver(REQUEST)).resolves.toEqual({ ok: false, reason: "provider_error" });
  });
});

describe("getLeadStore", () => {
  it("returns an unavailable store when no API key is configured", async () => {
    const store = getLeadStore({});
    expect(store).toBeInstanceOf(UnavailableLeadStore);
    await expect(store.deliver(REQUEST)).resolves.toEqual({ ok: false, reason: "not_configured" });
  });

  it("returns the Resend store when a key is configured", () => {
    expect(getLeadStore({ RESEND_API_KEY: "re_x" })).toBeInstanceOf(ResendLeadStore);
  });

  it("returns a config-invalid store for malformed addresses", async () => {
    const store = getLeadStore({ RESEND_API_KEY: "re_x", LEAD_INBOX_EMAIL: "nope" });
    await expect(store.deliver(REQUEST)).resolves.toEqual({ ok: false, reason: "config_invalid" });
  });

  it("honors mock mode locally but never in a Vercel production environment", () => {
    expect(getLeadStore({ LEAD_DELIVERY_MODE: "mock" })).toBeInstanceOf(MockLeadStore);
    const prod = getLeadStore({ LEAD_DELIVERY_MODE: "mock", VERCEL_ENV: "production" });
    expect(prod).not.toBeInstanceOf(MockLeadStore);
    expect(prod).toBeInstanceOf(UnavailableLeadStore);
  });
});
