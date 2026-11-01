import { describe, expect, it } from "vitest";
import {
  assessContrast,
  buildEmailPayload,
  buildPayload,
  buildPhonePayload,
  buildTextPayload,
  buildUrlPayload,
  buildVCardPayload,
  buildWifiPayload,
  checkCapacity,
  contrastRatio,
  escapeVCardValue,
  escapeWifiField,
  isValidHexColor,
  payloadByteLength,
  stripControlChars,
  QR_CAPACITY_BYTES,
  QUIET_ZONE_MODULES,
} from "./qr-code";
import { generateQrPngDataUrl, generateQrSvg, svgToDataUrl } from "./qr-generation";

describe("URL payloads", () => {
  it("encodes a full https URL exactly as entered", () => {
    const r = buildUrlPayload({ url: "https://example.com/pricing?plan=growth" });
    expect(r.errors).toEqual([]);
    expect(r.payload).toBe("https://example.com/pricing?plan=growth");
    expect(r.notes).toEqual([]);
  });
  it("adds https:// only with a visible note, never silently", () => {
    const r = buildUrlPayload({ url: "example.com/menu" });
    expect(r.payload).toBe("https://example.com/menu");
    expect(r.notes.length).toBe(1);
    expect(r.notes[0]).toContain("https:// was added");
  });
  it("rejects empty, spaced, non-http and domain-less input", () => {
    expect(buildUrlPayload({ url: "" }).errors.length).toBe(1);
    expect(buildUrlPayload({ url: "https://exam ple.com" }).errors[0].message).toContain("spaces");
    expect(buildUrlPayload({ url: "javascript:alert(1)" }).errors[0].message).toContain("http");
    expect(buildUrlPayload({ url: "https://localhost" }).errors[0].message).toContain("domain");
  });
});

describe("text payloads", () => {
  it("encodes plain text, Unicode and emojis verbatim", () => {
    expect(buildTextPayload({ text: "Hello QR" }).payload).toBe("Hello QR");
    expect(buildTextPayload({ text: "Café ☕ 🎉 — naïve" }).payload).toBe("Café ☕ 🎉 — naïve");
  });
  it("rejects empty and whitespace-only text", () => {
    expect(buildTextPayload({ text: "" }).errors.length).toBe(1);
    expect(buildTextPayload({ text: "   " }).errors.length).toBe(1);
  });
  it("strips control characters", () => {
    expect(stripControlChars("a\u0000b\u0007c")).toBe("abc");
    expect(buildTextPayload({ text: "a\u0001b" }).payload).toBe("ab");
  });
});

describe("Wi-Fi payloads", () => {
  it("formats a WPA network with password and terminator", () => {
    const r = buildWifiPayload({ ssid: "ShopWiFi", password: "coffee123", encryption: "WPA", hidden: false });
    expect(r.payload).toBe("WIFI:T:WPA;S:ShopWiFi;P:coffee123;;");
  });
  it("escapes special characters in SSID and password", () => {
    expect(escapeWifiField('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
    const r = buildWifiPayload({ ssid: "My;Net:1", password: "p@ss;word,", encryption: "WPA", hidden: false });
    expect(r.payload).toBe("WIFI:T:WPA;S:My\\;Net\\:1;P:p@ss\\;word\\,;;");
  });
  it("handles open networks without a password field", () => {
    const r = buildWifiPayload({ ssid: "Guest", password: "", encryption: "nopass", hidden: false });
    expect(r.payload).toBe("WIFI:T:nopass;S:Guest;;");
    expect(r.payload).not.toContain("P:");
  });
  it("marks hidden networks and requires a password for secured ones", () => {
    expect(buildWifiPayload({ ssid: "Hidden", password: "x1234567", encryption: "WPA", hidden: true }).payload).toContain("H:true;");
    expect(buildWifiPayload({ ssid: "Net", password: "", encryption: "WPA", hidden: false }).errors.length).toBe(1);
    expect(buildWifiPayload({ ssid: "", password: "x", encryption: "WPA", hidden: false }).errors.length).toBe(1);
  });
});

describe("email and phone payloads", () => {
  it("builds mailto with encoded subject and body", () => {
    const r = buildEmailPayload({ address: "hello@example.com", subject: "Quote request", body: "Line 1\nLine 2 & more" });
    expect(r.payload).toBe("mailto:hello@example.com?subject=Quote%20request&body=Line%201%0ALine%202%20%26%20more");
  });
  it("builds a bare mailto and rejects bad addresses", () => {
    expect(buildEmailPayload({ address: "a@b.co", subject: "", body: "" }).payload).toBe("mailto:a@b.co");
    expect(buildEmailPayload({ address: "not-an-email", subject: "", body: "" }).errors.length).toBe(1);
    expect(buildEmailPayload({ address: "", subject: "", body: "" }).errors.length).toBe(1);
  });
  it("builds tel payloads, normalising display formatting", () => {
    expect(buildPhonePayload({ phone: "+1 (919) 555-0142" }).payload).toBe("tel:+19195550142");
    expect(buildPhonePayload({ phone: "919 555 0142" }).payload).toBe("tel:9195550142");
  });
  it("rejects letters and too-short numbers", () => {
    expect(buildPhonePayload({ phone: "1-800-FLOWERS" }).errors.length).toBe(1);
    expect(buildPhonePayload({ phone: "123" }).errors.length).toBe(1);
    expect(buildPhonePayload({ phone: "" }).errors.length).toBe(1);
  });
});

describe("vCard payloads", () => {
  it("builds a standards-shaped vCard 3.0", () => {
    const r = buildVCardPayload({ fullName: "Jordan Lee", organization: "Lee Plumbing LLC", phone: "+1 919 555 0142", email: "jordan@example.com", website: "https://example.com" });
    expect(r.errors).toEqual([]);
    expect(r.payload).toBe([
      "BEGIN:VCARD", "VERSION:3.0", "FN:Jordan Lee", "ORG:Lee Plumbing LLC",
      "TEL;TYPE=CELL:+1 919 555 0142", "EMAIL:jordan@example.com", "URL:https://example.com", "END:VCARD",
    ].join("\n"));
  });
  it("omits empty optional fields and requires a name", () => {
    const r = buildVCardPayload({ fullName: "Sam", organization: "", phone: "", email: "", website: "" });
    expect(r.payload).toBe("BEGIN:VCARD\nVERSION:3.0\nFN:Sam\nEND:VCARD");
    expect(buildVCardPayload({ fullName: "", organization: "", phone: "", email: "", website: "" }).errors.length).toBe(1);
  });
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeVCardValue("Lee, Inc; HQ\\Main\nFloor 2")).toBe("Lee\\, Inc\\; HQ\\\\Main\\nFloor 2");
    const r = buildVCardPayload({ fullName: "Lee, Jordan", organization: "", phone: "", email: "", website: "" });
    expect(r.payload).toContain("FN:Lee\\, Jordan");
  });
  it("rejects a bad optional email or website instead of encoding it", () => {
    expect(buildVCardPayload({ fullName: "Sam", organization: "", phone: "", email: "bad", website: "" }).errors.length).toBe(1);
    expect(buildVCardPayload({ fullName: "Sam", organization: "", phone: "", email: "", website: "ftp://x.co" }).errors.length).toBe(1);
  });
});

describe("capacity", () => {
  it("counts UTF-8 bytes, not characters", () => {
    expect(payloadByteLength("abc")).toBe(3);
    expect(payloadByteLength("🎉")).toBe(4);
  });
  it("fits small payloads and flags overflow per level", () => {
    expect(checkCapacity("https://example.com", "H").fits).toBe(true);
    const big = "x".repeat(QR_CAPACITY_BYTES.H + 1);
    const check = checkCapacity(big, "H");
    expect(check.fits).toBe(false);
    expect(check.overflowBy).toBe(1);
    expect(checkCapacity(big, "L").fits).toBe(true);
  });
});

describe("colours and contrast", () => {
  it("validates hex colours", () => {
    expect(isValidHexColor("#4F46E5")).toBe(true);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
  });
  it("computes the WCAG ratio for black on white as 21", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
  it("allows the black-on-white default with no message", () => {
    const a = assessContrast("#000000", "#FFFFFF");
    expect(a.blocked).toBe(false);
    expect(a.message).toBeNull();
  });
  it("blocks inverted and low-contrast combinations", () => {
    expect(assessContrast("#FFFFFF", "#000000").blocked).toBe(true);
    expect(assessContrast("#EEEEEE", "#FFFFFF").blocked).toBe(true);
    expect(assessContrast("#777777", "#888888").blocked).toBe(true);
  });
  it("warns but allows mid contrast", () => {
    const a = assessContrast("#808080", "#FFFFFF");
    expect(a.blocked).toBe(false);
    expect(a.message).toContain("usable");
  });
});

describe("QR generation output", () => {
  it("uses a 4-module quiet zone by default", () => {
    expect(QUIET_ZONE_MODULES).toBe(4);
  });
  it("generates a real SVG with a viewBox and modules", async () => {
    const { svg, error } = await generateQrSvg("https://example.com", { errorCorrectionLevel: "M", foreground: "#000000", background: "#FFFFFF" });
    expect(error).toBeNull();
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
    expect(svg!.length).toBeGreaterThan(500);
  });
  it("generates a PNG data URL at the requested size", async () => {
    const { dataUrl, error } = await generateQrPngDataUrl("https://example.com", { errorCorrectionLevel: "M", foreground: "#000000", background: "#FFFFFF", width: 512 });
    expect(error).toBeNull();
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    const buf = Buffer.from(dataUrl!.split(",")[1], "base64");
    // PNG signature + IHDR width/height = 512
    expect(buf.subarray(0, 4).toString("hex")).toBe("89504e47");
    expect(buf.readUInt32BE(16)).toBe(512);
    expect(buf.readUInt32BE(20)).toBe(512);
  });
  it("honours foreground/background colours and EC level in the SVG", async () => {
    const coloured = await generateQrSvg("HELLO", { errorCorrectionLevel: "H", foreground: "#123456", background: "#FEDCBA" });
    expect(coloured.svg!.toLowerCase()).toContain("#123456");
    const low = await generateQrSvg("HELLO", { errorCorrectionLevel: "L", foreground: "#000000", background: "#FFFFFF" });
    expect(low.svg).not.toBe(coloured.svg);
  });
  it("reports capacity overflow instead of producing an image", async () => {
    const big = "x".repeat(QR_CAPACITY_BYTES.H + 100);
    const { svg, error } = await generateQrSvg(big, { errorCorrectionLevel: "H", foreground: "#000000", background: "#FFFFFF" });
    expect(svg).toBeNull();
    expect(error).toContain("too long");
  });
  it("svgToDataUrl encodes without markup injection", () => {
    const url = svgToDataUrl('<svg viewBox="0 0 1 1"></svg>');
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(url).not.toContain("<svg");
  });
});

describe("unified builder", () => {
  it("routes each type to its builder", () => {
    expect(buildPayload("wifi", { ssid: "N", password: "p1234567", encryption: "WPA", hidden: false }).payload).toContain("WIFI:");
    expect(buildPayload("phone", { phone: "+1 919 555 0142" }).payload).toBe("tel:+19195550142");
    expect(buildPayload("text", { text: "" }).errors.length).toBe(1);
  });
});
