import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { generateQrPngDataUrl } from "./qr-generation";
import { buildVCardPayload, buildWifiPayload } from "./qr-code";

/**
 * Independent decode verification: generate a PNG with the app's own
 * generation path, then decode it with jsQR (a decoder that shares no
 * code with the `qrcode` encoder) and compare the exact payload.
 * This proves the image is a readable QR code carrying the intended
 * content — not merely that an image file exists.
 */
async function decodePngDataUrl(dataUrl: string): Promise<string | null> {
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  const png = PNG.sync.read(buf);
  const pixels = new Uint8ClampedArray(png.data);
  const result = jsQR(pixels, png.width, png.height);
  return result ? result.data : null;
}

const OPTS = { errorCorrectionLevel: "M" as const, foreground: "#000000", background: "#FFFFFF" };

describe("independent QR decode (jsQR)", () => {
  it("decodes a website QR back to the exact URL", async () => {
    const payload = "https://example.com/pricing?plan=growth";
    const { dataUrl, error } = await generateQrPngDataUrl(payload, { ...OPTS, width: 1024 });
    expect(error).toBeNull();
    expect(await decodePngDataUrl(dataUrl!)).toBe(payload);
  });

  it("decodes a Wi-Fi QR back to the exact escaped payload", async () => {
    const payload = buildWifiPayload({ ssid: "Shop;WiFi", password: "coffee,123", encryption: "WPA", hidden: true }).payload;
    const { dataUrl } = await generateQrPngDataUrl(payload, { ...OPTS, width: 1024 });
    expect(await decodePngDataUrl(dataUrl!)).toBe(payload);
  });

  it("decodes a vCard QR back to the exact payload", async () => {
    const payload = buildVCardPayload({ fullName: "Jordan Lee", organization: "Lee Plumbing LLC", phone: "+19195550142", email: "jordan@example.com", website: "" }).payload;
    const { dataUrl } = await generateQrPngDataUrl(payload, { ...OPTS, width: 1024 });
    expect(await decodePngDataUrl(dataUrl!)).toBe(payload);
  });

  it("decodes Unicode text at high error correction", async () => {
    const payload = "Café menu — https://example.com/menu 🎉";
    const { dataUrl } = await generateQrPngDataUrl(payload, { errorCorrectionLevel: "H", foreground: "#000000", background: "#FFFFFF", width: 1024 });
    expect(await decodePngDataUrl(dataUrl!)).toBe(payload);
  });

  it("decodes a coloured QR when contrast is sufficient", async () => {
    const payload = "https://example.com";
    const { dataUrl } = await generateQrPngDataUrl(payload, { errorCorrectionLevel: "M", foreground: "#1E1B7A", background: "#FFFFFF", width: 1024 });
    expect(await decodePngDataUrl(dataUrl!)).toBe(payload);
  });
});
