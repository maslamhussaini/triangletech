/**
 * User company branding for tool reports (PDF header + browser Print).
 *
 * Privacy model, by owner requirement:
 * - The uploaded logo is processed LOCALLY (FileReader -> data URL,
 *   never uploaded to any server).
 * - Branding is saved to device storage (localStorage) ONLY when the
 *   user explicitly enables "Save branding on this device". Otherwise
 *   it lives in memory for the session and is never written.
 * - Saved branding can be cleared at any time.
 * - The company name is rendered as plain text everywhere (React
 *   text nodes, PDF drawText) — never as HTML.
 *
 * PDF limits: pdf-lib embeds PNG/JPEG only, so only those two types
 * are accepted (SVG/WebP are rejected with a visible message, not
 * silently converted). Logos are capped at 2 MB so a data URL cannot
 * bloat localStorage. Proportions are always preserved: the PDF
 * renderer scales by height, the preview uses height + width auto.
 */

export type LogoMime = "image/png" | "image/jpeg";

export type ReportBranding = {
  companyName: string;
  logoDataUrl: string | null;
  logoMime: LogoMime | null;
};

export const BRANDING_STORAGE_KEY = "triangletech-report-branding";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const EMPTY_BRANDING: ReportBranding = {
  companyName: "",
  logoDataUrl: null,
  logoMime: null,
};

export type LogoValidation = { ok: true } | { ok: false; reason: "type" | "size" };

const ALLOWED_MIMES: LogoMime[] = ["image/png", "image/jpeg"];

/**
 * Validate a logo file before it is read. Browsers normally set
 * file.type for PNG/JPEG; when it is empty (some pickers), fall back
 * to the file extension so a valid image is not rejected.
 */
export function validateLogoFile(file: { type: string; name: string; size: number }): LogoValidation {
  if (file.size > MAX_LOGO_BYTES) return { ok: false, reason: "size" };
  const type = (file.type || "").toLowerCase();
  if ((ALLOWED_MIMES as string[]).includes(type)) return { ok: true };
  if (!type) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "png") return { ok: true };
    if (ext === "jpg" || ext === "jpeg") return { ok: true };
  }
  return { ok: false, reason: "type" };
}

function mimeForDataUrl(dataUrl: string): LogoMime | null {
  if (dataUrl.startsWith("data:image/png;base64,")) return "image/png";
  if (dataUrl.startsWith("data:image/jpeg;base64,")) return "image/jpeg";
  return null;
}

/** Decode a validated logo data URL to bytes for the PDF renderer. */
export function dataUrlToCompanyLogo(
  dataUrl: string | null,
  mime: LogoMime | null,
): { bytes: Uint8Array; kind: "png" | "jpg" } | null {
  if (!dataUrl || !mime) return null;
  if (mimeForDataUrl(dataUrl) !== mime) return null;
  const b64 = dataUrl.split(",", 2)[1];
  if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length === 0) return null;
    return { bytes, kind: mime === "image/png" ? "png" : "jpg" };
  } catch {
    return null;
  }
}

function isStoredBranding(value: unknown): value is ReportBranding {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.companyName !== "string") return false;
  if (v.logoDataUrl !== null && typeof v.logoDataUrl !== "string") return false;
  if (v.logoMime !== null && v.logoMime !== "image/png" && v.logoMime !== "image/jpeg") return false;
  if (typeof v.logoDataUrl === "string" && mimeForDataUrl(v.logoDataUrl) !== v.logoMime) return false;
  return true;
}

/** Read saved branding, or null when nothing (valid) was saved. */
export function loadStoredBranding(): ReportBranding | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredBranding(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeBranding(branding: ReportBranding): void {
  try {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
  } catch {
    /* storage full/blocked: branding still applies this session */
  }
}

export function clearStoredBranding(): void {
  try {
    window.localStorage.removeItem(BRANDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
