/**
 * POST /api/leads — consultation inquiry submissions (P1.8).
 *
 * Thin wrapper: all behavior lives in src/lib/leads/handler.ts and is
 * unit-tested there with a mock store. Only POST is exported, so other
 * methods are rejected by the framework.
 *
 * Kill switch: setting LEADS_DISABLED=true in the server environment
 * refuses every submission with an email-fallback message (503). The flag
 * is read per request; on Vercel a changed value takes effect as function
 * instances recycle — it is an operational brake, not an instant edge
 * switch.
 */
import { createRateLimiter, handleLeadPost, LEAD_LIMITS } from "@/lib/leads/handler";
import { getLeadStore } from "@/lib/leads/store";

export const runtime = "nodejs";

const limiter = createRateLimiter(LEAD_LIMITS.rateLimitMax, LEAD_LIMITS.rateLimitWindowMs);

export async function POST(request: Request) {
  return handleLeadPost(request, {
    store: getLeadStore(),
    limiter,
    leadsEnabled: process.env.LEADS_DISABLED !== "true",
  });
}
