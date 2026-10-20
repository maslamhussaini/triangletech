/**
 * Shared validation contract for consultation inquiries (P1.8).
 *
 * One zod schema is the single source of truth for the lead form's fields:
 * the client component uses it for immediate feedback and the /api/leads
 * route re-validates everything server-side — frontend validation is never
 * trusted on its own. The object is strict: unknown fields are rejected, so
 * a submission can only ever carry the whitelisted fields below.
 *
 * Two fields are anti-spam controls, not lead data:
 * - `faxNumber` is a honeypot. It is rendered off-screen and never asked of
 *   a human; a filled value means a bot (handled in the route handler).
 * - `elapsedMs` is a time-trap: how long the form was open before submit,
 *   measured on the client. Genuine completion of this form takes longer
 *   than the handler's minimum; instant submissions are dropped there.
 */
import { z } from "zod";

export const SERVICE_INTEREST_IDS = [
  "starter-website",
  "growth-seo",
  "ai-visibility",
  "website-redesign",
  "other",
] as const;

export type ServiceInterestId = (typeof SERVICE_INTEREST_IDS)[number];

export const SERVICE_OPTIONS: ReadonlyArray<{ id: ServiceInterestId; label: string }> = [
  { id: "starter-website", label: "Starter Website" },
  { id: "growth-seo", label: "Growth SEO Website" },
  { id: "ai-visibility", label: "AI Visibility Website" },
  { id: "website-redesign", label: "Redesign of my existing website" },
  { id: "other", label: "Something else / not sure yet" },
];

export function serviceInterestLabel(id: ServiceInterestId): string {
  return SERVICE_OPTIONS.find(option => option.id === id)?.label ?? id;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const leadSubmissionSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(80),
  businessName: z.string().trim().min(2).max(120),
  email: z.string().trim().min(3).max(254).refine(value => EMAIL_PATTERN.test(value)),
  websiteUrl: z
    .string()
    .trim()
    .max(200)
    .refine(value => value === "" || isHttpUrl(value))
    .optional(),
  serviceInterest: z.enum(SERVICE_INTEREST_IDS),
  projectDescription: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
  faxNumber: z.string().max(200).optional(),
  elapsedMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

/** The lead itself — the anti-spam control fields are not part of it. */
export type Lead = Omit<LeadSubmission, "faxNumber" | "elapsedMs">;

export type LeadField = keyof LeadSubmission;

const FIELD_MESSAGES: Record<string, string> = {
  fullName: "Please enter your full name (2–80 characters).",
  businessName: "Please enter your business name (2–120 characters).",
  email: "Please enter a valid email address.",
  websiteUrl: "Please enter a full website address, starting with https:// — or leave it blank.",
  serviceInterest: "Please choose the service you are interested in.",
  projectDescription: "Please describe your project (10–2,000 characters).",
  consent: "Please confirm that we may use these details to respond to your inquiry.",
};

/**
 * Normalizes raw input before validation: trims string fields and treats a
 * blank optional website as absent, so direct API callers and the form get
 * identical treatment. Non-object input is returned untouched and fails
 * validation in the caller.
 */
function normalizeLeadInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  const raw = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...raw };
  for (const key of ["fullName", "businessName", "email", "websiteUrl", "projectDescription"] as const) {
    if (typeof normalized[key] === "string") normalized[key] = (normalized[key] as string).trim();
  }
  if (normalized.websiteUrl === "") delete normalized.websiteUrl;
  return normalized;
}

export type LeadParseResult =
  | { ok: true; lead: Lead; faxNumber?: string; elapsedMs?: number }
  | { ok: false; fieldErrors: Partial<Record<LeadField, string>> };

export function parseLeadSubmission(input: unknown): LeadParseResult {
  const result = leadSubmissionSchema.safeParse(normalizeLeadInput(input));
  if (!result.success) {
    const fieldErrors: Partial<Record<LeadField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && fieldErrors[field as LeadField] === undefined) {
        fieldErrors[field as LeadField] =
          FIELD_MESSAGES[field] ?? "Please review this field and try again.";
      }
    }
    // An unknown top-level field (strict object) has an empty issue path;
    // report it against the whole submission rather than dropping it.
    if (Object.keys(fieldErrors).length === 0) {
      fieldErrors.fullName = "This submission contains fields we do not accept. Please use the form as shown.";
    }
    return { ok: false, fieldErrors };
  }
  const { faxNumber, elapsedMs, ...lead } = result.data;
  return { ok: true, lead, faxNumber, elapsedMs };
}

/**
 * The lead form's fields in visual order. When a submission is rejected
 * with field errors, focus moves to the first invalid field (P1.10
 * defect D1) — this ordering decides which field that is. The honeypot
 * is not a LeadField and can never be a focus target.
 */
export const LEAD_FIELD_ORDER: readonly LeadField[] = [
  "fullName",
  "businessName",
  "email",
  "websiteUrl",
  "serviceInterest",
  "projectDescription",
  "consent",
];

/** First field, in visual order, that carries an error — or null. */
export function firstInvalidField(
  fieldErrors: Partial<Record<LeadField, string>>,
): LeadField | null {
  for (const field of LEAD_FIELD_ORDER) {
    if (fieldErrors[field]) return field;
  }
  return null;
}
