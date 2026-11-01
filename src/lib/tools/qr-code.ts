/**
 * Free QR Code Generator — pure payload, validation and contrast logic.
 *
 * Everything in this module is environment-independent (no DOM, no canvas,
 * no QR library) so it can be unit-tested in Node. The browser component
 * supplies the actual QR encoding via the `qrcode` package (MIT) in
 * `qr-generation.ts`; this module owns what gets encoded, how it is
 * escaped and validated, and whether the chosen colours can scan.
 *
 * Privacy rule: payloads are built locally from the values passed in.
 * Nothing here logs, stores or transmits QR content.
 */

export type QrType = "url" | "text" | "wifi" | "email" | "phone" | "vcard";

export const QR_TYPES: { id: QrType; label: string; hint: string }[] = [
  { id: "url", label: "Website URL", hint: "Link to a web page" },
  { id: "text", label: "Plain text", hint: "Any text, note or code" },
  { id: "wifi", label: "Wi-Fi", hint: "Join a network on scan" },
  { id: "email", label: "Email", hint: "Start a pre-filled email" },
  { id: "phone", label: "Phone", hint: "Dial a number on scan" },
  { id: "vcard", label: "Contact card", hint: "Save a contact (vCard)" },
];

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export const ERROR_CORRECTION_LEVELS: {
  level: ErrorCorrectionLevel;
  label: string;
  note: string;
  /** Approx. % of the code that can be damaged and still scan. */
  recoveryPercent: number;
}[] = [
  { level: "L", label: "L — Low", note: "Smallest code, fits the most data", recoveryPercent: 7 },
  { level: "M", label: "M — Medium", note: "Good default balance", recoveryPercent: 15 },
  { level: "Q", label: "Q — Quartile", note: "Tougher, slightly denser code", recoveryPercent: 25 },
  { level: "H", label: "H — High", note: "Most damage-tolerant, densest code", recoveryPercent: 30 },
];

/**
 * Maximum byte-mode capacity of a Version 40 QR code, per error
 * correction level (ISO/IEC 18004 capacity table, byte mode).
 * Used only as an early, honest overflow check — the encoder is the
 * final judge and its errors are surfaced too.
 */
export const QR_CAPACITY_BYTES: Record<ErrorCorrectionLevel, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};

/** QR spec minimum quiet zone: 4 modules on every side. */
export const QUIET_ZONE_MODULES = 4;

export const PNG_SIZES = [512, 1024, 2048] as const;
export type PngSize = (typeof PNG_SIZES)[number];

export type WifiEncryption = "WPA" | "WEP" | "nopass";

export const WIFI_ENCRYPTIONS: { id: WifiEncryption; label: string }[] = [
  { id: "WPA", label: "WPA / WPA2 / WPA3 (most home & business networks)" },
  { id: "WEP", label: "WEP (old networks only)" },
  { id: "nopass", label: "Open network — no password" },
];

export interface UrlInputs { url: string }
export interface TextInputs { text: string }
export interface WifiInputs {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}
export interface EmailInputs { address: string; subject: string; body: string }
export interface PhoneInputs { phone: string }
export interface VCardInputs {
  fullName: string;
  organization: string;
  phone: string;
  email: string;
  website: string;
}

export type QrInputs = UrlInputs | TextInputs | WifiInputs | EmailInputs | PhoneInputs | VCardInputs;

export interface FieldError { field: string; message: string }

export interface PayloadResult {
  /** Exact string encoded into the QR code. Empty when invalid. */
  payload: string;
  errors: FieldError[];
  /** Non-blocking notes, e.g. a scheme that was visibly added. */
  notes: string[];
}

const ok = (payload: string, notes: string[] = []): PayloadResult => ({ payload, errors: [], notes });
const fail = (errors: FieldError[]): PayloadResult => ({ payload: "", errors, notes: [] });

/** Remove NUL and other C0 control characters except tab/newline, which
 *  individual builders handle explicitly. Prevents control-character
 *  smuggling into payloads from pasted input. */
export function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function clean(value: string): string {
  return stripControlChars(value ?? "");
}

/* ------------------------------------------------------------------ URL */

export function buildUrlPayload(inputs: UrlInputs): PayloadResult {
  const raw = clean(inputs.url).trim();
  if (!raw) return fail([{ field: "url", message: "Enter the website address to link to, for example https://example.com." }]);
  if (/\s/.test(raw)) return fail([{ field: "url", message: "That address contains spaces. Website addresses cannot contain spaces — check for a line break or a missing dot." }]);

  const notes: string[] = [];
  let candidate = raw;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    // No scheme typed. We add https:// AND say so in `notes`, and the UI
    // prints the exact final destination — this is never silent.
    candidate = `https://${candidate}`;
    notes.push("No scheme was entered, so https:// was added. The preview shows the exact destination that will be encoded.");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return fail([{ field: "url", message: "That does not look like a valid website address. Check the spelling, for example https://example.com/page." }]);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return fail([{ field: "url", message: "Only http:// and https:// website addresses are supported for website QR codes." }]);
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    return fail([{ field: "url", message: "That address is missing a domain, for example example.com. Enter the full website address." }]);
  }
  // Encode exactly what the user entered (plus the noted scheme) rather
  // than URL-normalising it into a different destination.
  return ok(candidate, notes);
}

/* ----------------------------------------------------------------- Text */

export function buildTextPayload(inputs: TextInputs): PayloadResult {
  const text = clean(inputs.text);
  if (!text.trim()) return fail([{ field: "text", message: "Enter the text to encode." }]);
  return ok(text);
}

/* ----------------------------------------------------------------- Wi-Fi */

/** Escape a value for the WIFI: payload format: \ ; , : " are escaped
 *  with a preceding backslash (Zebra / ZXing convention). */
export function escapeWifiField(value: string): string {
  return clean(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/:/g, "\\:").replace(/"/g, '\\"');
}

export function buildWifiPayload(inputs: WifiInputs): PayloadResult {
  const errors: FieldError[] = [];
  const ssid = clean(inputs.ssid);
  if (!ssid.trim()) errors.push({ field: "ssid", message: "Enter the network name (SSID) exactly as it appears in Wi-Fi settings." });
  if (inputs.encryption !== "nopass" && !inputs.password) {
    errors.push({ field: "password", message: "Enter the network password, or choose “Open network — no password” if this network has none." });
  }
  if (errors.length) return fail(errors);

  const parts = [`WIFI:T:${inputs.encryption};`, `S:${escapeWifiField(ssid)};`];
  if (inputs.encryption !== "nopass") parts.push(`P:${escapeWifiField(inputs.password)};`);
  if (inputs.hidden) parts.push("H:true;");
  parts.push(";");
  return ok(parts.join(""));
}

/* ---------------------------------------------------------------- Email */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function buildEmailPayload(inputs: EmailInputs): PayloadResult {
  const address = clean(inputs.address).trim();
  if (!address) return fail([{ field: "address", message: "Enter the email address the message should go to." }]);
  if (!isValidEmail(address)) return fail([{ field: "address", message: "That does not look like a complete email address, for example name@example.com." }]);
  const params: string[] = [];
  const subject = clean(inputs.subject).trim();
  const body = clean(inputs.body).trim();
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return ok(`mailto:${address}${params.length ? `?${params.join("&")}` : ""}`);
}

/* ---------------------------------------------------------------- Phone */

export function buildPhonePayload(inputs: PhoneInputs): PayloadResult {
  const raw = clean(inputs.phone).trim();
  if (!raw) return fail([{ field: "phone", message: "Enter the phone number to dial." }]);
  // Keep a leading + and digits; drop the spaces/brackets/dashes people
  // type for readability. Letters are an error, not silently dropped.
  if (/[a-zA-Z]/.test(raw)) return fail([{ field: "phone", message: "Phone numbers cannot contain letters. Enter digits, spaces, and an optional leading + for the country code." }]);
  const normalized = (raw.startsWith("+") ? "+" : "") + raw.replace(/\D/g, "");
  if (normalized.replace(/\D/g, "").length < 5) return fail([{ field: "phone", message: "That number looks too short. Include the area code — and a country code (for example +1) if scanners may be outside your country." }]);
  return ok(`tel:${normalized}`);
}

/* --------------------------------------------------------------- vCard */

/** Escape a value for vCard 3.0: backslash, comma, semicolon and
 *  newlines are escaped; other control characters are stripped. */
export function escapeVCardValue(value: string): string {
  return clean(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildVCardPayload(inputs: VCardInputs): PayloadResult {
  const errors: FieldError[] = [];
  const fullName = clean(inputs.fullName).trim();
  if (!fullName) errors.push({ field: "fullName", message: "Enter the contact's full name — a vCard requires a name." });
  const email = clean(inputs.email).trim();
  if (email && !isValidEmail(email)) errors.push({ field: "email", message: "That email address does not look complete, for example name@example.com — or clear the field." });
  const website = clean(inputs.website).trim();
  if (website) {
    const siteCheck = buildUrlPayload({ url: website });
    if (siteCheck.errors.length) errors.push({ field: "website", message: "That website does not look valid, for example https://example.com — or clear the field." });
  }
  if (errors.length) return fail(errors);

  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardValue(fullName)}`];
  const org = clean(inputs.organization).trim();
  if (org) lines.push(`ORG:${escapeVCardValue(org)}`);
  const phone = clean(inputs.phone).trim();
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVCardValue(email)}`);
  if (website) lines.push(`URL:${escapeVCardValue(buildUrlPayload({ url: website }).payload)}`);
  lines.push("END:VCARD");
  return ok(lines.join("\n"));
}

/* -------------------------------------------------------------- Unified */

export function buildPayload(type: QrType, inputs: QrInputs): PayloadResult {
  switch (type) {
    case "url": return buildUrlPayload(inputs as UrlInputs);
    case "text": return buildTextPayload(inputs as TextInputs);
    case "wifi": return buildWifiPayload(inputs as WifiInputs);
    case "email": return buildEmailPayload(inputs as EmailInputs);
    case "phone": return buildPhonePayload(inputs as PhoneInputs);
    case "vcard": return buildVCardPayload(inputs as VCardInputs);
  }
}

/* ------------------------------------------------------------- Capacity */

export function payloadByteLength(payload: string): number {
  return new TextEncoder().encode(payload).length;
}

export interface CapacityCheck { bytes: number; maxBytes: number; fits: boolean; overflowBy: number }

export function checkCapacity(payload: string, level: ErrorCorrectionLevel): CapacityCheck {
  const bytes = payloadByteLength(payload);
  const maxBytes = QR_CAPACITY_BYTES[level];
  return { bytes, maxBytes, fits: bytes <= maxBytes, overflowBy: Math.max(0, bytes - maxBytes) };
}

/* -------------------------------------------------------------- Colours */

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two #RRGGBB colours, 1–21. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastAssessment {
  ratio: number | null;
  /** True when generation should be blocked: unreadable or inverted. */
  blocked: boolean;
  /** User-facing message when there is anything to say, else null. */
  message: string | null;
}

/**
 * Scanning safeguard. Most phone scanners expect dark modules on a light
 * background and need real contrast between them:
 *  - foreground lighter than background (inverted code) → blocked
 *  - contrast ratio below 3:1 → blocked (too faint to scan reliably)
 *  - 3:1 to 4.5:1 → allowed with a visible caution
 */
export function assessContrast(foreground: string, background: string): ContrastAssessment {
  if (!isValidHexColor(foreground) || !isValidHexColor(background)) {
    return { ratio: null, blocked: true, message: "Choose both colours using the colour pickers — each must be a full six-digit colour." };
  }
  const fgLum = relativeLuminance(foreground)!;
  const bgLum = relativeLuminance(background)!;
  const ratio = contrastRatio(foreground, background)!;
  if (fgLum > bgLum) {
    return { ratio, blocked: true, message: "The code colour is lighter than the background. Most scanners cannot read light-on-dark (inverted) QR codes — swap the colours so the code is darker than the background." };
  }
  if (ratio < 3) {
    return { ratio, blocked: true, message: `Contrast is only ${ratio.toFixed(1)}:1, too low for reliable scanning. Darken the code colour or lighten the background until the contrast is at least 3:1.` };
  }
  if (ratio < 4.5) {
    return { ratio, blocked: false, message: `Contrast is ${ratio.toFixed(1)}:1 — usable, but scanning in poor light may be slower. Darker code colours on white scan fastest.` };
  }
  return { ratio, blocked: false, message: null };
}
