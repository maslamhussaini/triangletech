/**
 * Lead delivery (P1.8) — email-only mode behind a replaceable adapter.
 *
 * A validated inquiry is delivered as ONE email to the TriangleTech lead
 * inbox via the transactional provider (Resend). There is no database in
 * this mode: the inbox is the system of record, and the `LeadStore`
 * interface is the boundary a future audited store can implement without
 * touching the route or the form.
 *
 * Server-only configuration (never NEXT_PUBLIC_*, never committed):
 * - RESEND_API_KEY    — required for live delivery. Without it, delivery
 *                       fails safely as "not_configured"; nothing ever
 *                       reports a success that did not happen.
 * - LEAD_INBOX_EMAIL  — recipient override (default below; owner-approved).
 * - LEAD_FROM_EMAIL   — sender override (default below; owner-approved).
 *                       The sending domain must be verified with the
 *                       provider by the account owner — this code does not
 *                       and cannot verify domain status; an unverified
 *                       domain simply fails at the provider and surfaces
 *                       here as "provider_error".
 * - LEAD_DELIVERY_MODE — "mock" selects the in-memory mock adapter for
 *                       LOCAL verification only. It is ignored whenever
 *                       VERCEL_ENV is "production".
 */
import type { Lead } from "./schema";
import { serviceInterestLabel } from "./schema";

export const DEFAULT_LEAD_INBOX = "hello@triangletech.co";
export const DEFAULT_LEAD_FROM = "notifications@triangletech.co";
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const PROVIDER_TIMEOUT_MS = 10_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LeadDeliveryRequest {
  /** Non-reversible reference shown to the submitter and quoted in the email. */
  reference: string;
  lead: Lead;
  /** ISO timestamp of when the server accepted the submission. */
  receivedAt: string;
}

export type LeadDeliveryFailureReason = "not_configured" | "config_invalid" | "provider_error";

export type LeadDeliveryResult =
  | { ok: true; providerId?: string }
  | { ok: false; reason: LeadDeliveryFailureReason };

export interface LeadStore {
  deliver(request: LeadDeliveryRequest): Promise<LeadDeliveryResult>;
}

/** In-memory adapter for tests and local verification. Never sends email. */
export class MockLeadStore implements LeadStore {
  readonly deliveries: LeadDeliveryRequest[] = [];

  constructor(private readonly fail: boolean = false) {}

  async deliver(request: LeadDeliveryRequest): Promise<LeadDeliveryResult> {
    if (this.fail) return { ok: false, reason: "provider_error" };
    this.deliveries.push(request);
    return { ok: true, providerId: "mock" };
  }
}

/** Adapter used when delivery cannot succeed; reports the reason honestly. */
export class UnavailableLeadStore implements LeadStore {
  constructor(private readonly reason: LeadDeliveryFailureReason) {}

  async deliver(): Promise<LeadDeliveryResult> {
    return { ok: false, reason: this.reason };
  }
}

export interface LeadConfig {
  apiKey?: string;
  inbox: string;
  from: string;
}

type Env = Record<string, string | undefined>;

export function resolveLeadConfig(env: Env): { ok: true; config: LeadConfig } | { ok: false } {
  const inbox = env.LEAD_INBOX_EMAIL?.trim() || DEFAULT_LEAD_INBOX;
  const from = env.LEAD_FROM_EMAIL?.trim() || DEFAULT_LEAD_FROM;
  if (!EMAIL_PATTERN.test(inbox) || !EMAIL_PATTERN.test(from)) return { ok: false };
  const apiKey = env.RESEND_API_KEY?.trim() || undefined;
  return { ok: true, config: { apiKey, inbox, from } };
}

/** Single-line fields must never carry CR/LF into an email subject line. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function composeLeadEmail(request: LeadDeliveryRequest): { subject: string; text: string } {
  const { lead, reference, receivedAt } = request;
  const service = serviceInterestLabel(lead.serviceInterest);
  const subject = `New consultation inquiry — ${singleLine(lead.businessName)} (${service})`;
  const text = [
    `Reference: ${reference}`,
    `Received: ${receivedAt}`,
    "",
    `Name: ${lead.fullName}`,
    `Business: ${lead.businessName}`,
    `Email: ${lead.email}`,
    `Current website: ${lead.websiteUrl ?? "Not provided"}`,
    `Service interest: ${service}`,
    "",
    "Project description:",
    lead.projectDescription,
    "",
    `Inquiry consent: confirmed by the submitter at ${receivedAt} (privacy policy as published on triangletech.co at the time of submission).`,
    "Reply to this email to respond — the reply goes to the submitter's address.",
  ].join("\n");
  return { subject, text };
}

type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Resend delivery over plain HTTPS fetch — no SDK dependency. The
 * submission reference doubles as the provider idempotency key, so a
 * retry of the same submission cannot create a duplicate email. This
 * adapter itself does not retry: an ambiguous failure is reported to the
 * caller instead of risking a duplicate send.
 */
export class ResendLeadStore implements LeadStore {
  constructor(
    private readonly config: LeadConfig,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async deliver(request: LeadDeliveryRequest): Promise<LeadDeliveryResult> {
    if (!this.config.apiKey) return { ok: false, reason: "not_configured" };
    const { subject, text } = composeLeadEmail(request);
    try {
      const response = await this.fetchFn(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": request.reference,
        },
        body: JSON.stringify({
          from: this.config.from,
          to: [this.config.inbox],
          reply_to: request.lead.email,
          subject,
          text,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
      if (!response.ok) return { ok: false, reason: "provider_error" };
      const data = (await response.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, providerId: typeof data?.id === "string" ? data.id : undefined };
    } catch {
      // Network errors, timeouts and provider payloads are deliberately
      // collapsed into one reason: nothing provider-specific (and never
      // the API key) is surfaced to callers or responses.
      return { ok: false, reason: "provider_error" };
    }
  }
}

/**
 * Selects the delivery adapter from the environment. Mock mode exists for
 * local verification (P1.8 §9) and is structurally unavailable in a Vercel
 * production deployment.
 */
export function getLeadStore(env: Env = process.env): LeadStore {
  if (env.LEAD_DELIVERY_MODE === "mock" && env.VERCEL_ENV !== "production") {
    return new MockLeadStore();
  }
  const resolved = resolveLeadConfig(env);
  if (!resolved.ok) return new UnavailableLeadStore("config_invalid");
  if (!resolved.config.apiKey) return new UnavailableLeadStore("not_configured");
  return new ResendLeadStore(resolved.config);
}
