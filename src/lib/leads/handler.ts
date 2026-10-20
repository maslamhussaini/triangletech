/**
 * POST /api/leads request handling (P1.8), kept separate from the route
 * file so the full behavior is unit-testable with a mock store.
 *
 * Control order is deliberate:
 *   kill switch → rate limit → content type → body size → JSON shape →
 *   honeypot / time-trap (silent drop) → schema validation → delivery.
 *
 * Silent drops return the same success shape as a real delivery (without
 * delivering anything), so automated submitters cannot learn which
 * control caught them. No request data is ever logged — this module, like
 * the rest of the codebase, contains no logging calls at all.
 *
 * Rate limiting is in-memory and best-effort, exactly as in the chat
 * route: it deters casual abuse on a low-traffic marketing site, resets
 * on redeploy, and is NOT a distributed guarantee across serverless
 * instances. Durable distributed rate limiting needs infrastructure
 * outside this slice's approved scope and remains a production release
 * consideration (see the P1.8 report).
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseLeadSubmission } from "./schema";
import type { LeadStore } from "./store";

export const LEAD_LIMITS = {
  maxBodyBytes: 16_384,
  minElapsedMs: 3_000,
  rateLimitMax: 5,
  rateLimitWindowMs: 15 * 60 * 1000,
} as const;

export interface RateLimiter {
  isRateLimited(key: string, now: number): boolean;
}

export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, number[]>();
  return {
    isRateLimited(key, now) {
      const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
      hits.push(now);
      buckets.set(key, hits);
      return hits.length > max;
    },
  };
}

export interface LeadHandlerDeps {
  store: LeadStore;
  limiter: RateLimiter;
  /** Kill switch: when false, every submission is refused with a fallback message. */
  leadsEnabled: boolean;
  now?: () => number;
}

export function generateLeadReference(): string {
  return `TT-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const MESSAGES = {
  unavailable:
    "Online submissions are unavailable right now. Please email us instead — the address is shown below the form.",
  rateLimited:
    "Too many submissions from this connection. Please wait a few minutes and try again, or email us instead.",
  unsupportedFormat: "That submission format is not supported. Please use the form on this page.",
  tooLarge: "Your submission is too large. Please shorten the project description and try again.",
  unreadable: "We could not read your submission. Please check the form and try again.",
  reviewFields: "Please review the highlighted fields and try again.",
  deliveryFailed:
    "We could not confirm delivery of your inquiry, so nothing was submitted. Please try again, or email us directly — the address is shown below the form.",
} as const;

function fail(status: number, error: string, fields?: Record<string, string>) {
  return NextResponse.json(fields ? { ok: false, error, fields } : { ok: false, error }, { status });
}

/** Success-shaped response for spam drops: indistinguishable from delivery. */
function silentDrop() {
  return NextResponse.json({ ok: true, reference: generateLeadReference() });
}

export async function handleLeadPost(request: Request, deps: LeadHandlerDeps): Promise<NextResponse> {
  const now = deps.now ?? Date.now;

  if (!deps.leadsEnabled) return fail(503, MESSAGES.unavailable);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (deps.limiter.isRateLimited(`leads:${ip}`, now())) return fail(429, MESSAGES.rateLimited);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return fail(415, MESSAGES.unsupportedFormat);

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return fail(400, MESSAGES.unreadable);
  }
  if (Buffer.byteLength(rawText, "utf8") > LEAD_LIMITS.maxBodyBytes) return fail(413, MESSAGES.tooLarge);

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return fail(400, MESSAGES.unreadable);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail(400, MESSAGES.unreadable);

  // Anti-spam controls run on the raw body, before validation: a bot that
  // fills the honeypot or submits instantly is dropped silently whatever
  // else is wrong with its payload.
  const rawRecord = raw as Record<string, unknown>;
  if (typeof rawRecord.faxNumber === "string" && rawRecord.faxNumber.trim() !== "") return silentDrop();
  if (typeof rawRecord.elapsedMs !== "number" || rawRecord.elapsedMs < LEAD_LIMITS.minElapsedMs) {
    return silentDrop();
  }

  const parsed = parseLeadSubmission(raw);
  if (!parsed.ok) return fail(400, MESSAGES.reviewFields, parsed.fieldErrors as Record<string, string>);

  const reference = generateLeadReference();
  const receivedAt = new Date(now()).toISOString();
  let result;
  try {
    result = await deps.store.deliver({ reference, lead: parsed.lead, receivedAt });
  } catch {
    return fail(503, MESSAGES.deliveryFailed);
  }
  if (!result.ok) return fail(503, MESSAGES.deliveryFailed);

  return NextResponse.json({ ok: true, reference });
}
