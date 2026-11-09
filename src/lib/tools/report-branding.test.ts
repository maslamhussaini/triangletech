import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredBranding,
  dataUrlToCompanyLogo,
  loadStoredBranding,
  storeBranding,
  validateLogoFile,
  MAX_LOGO_BYTES,
} from "./report-branding";

const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
}

describe("report branding validation", () => {
  it("accepts PNG and JPEG, rejects SVG/WebP and oversize files", () => {
    expect(validateLogoFile({ type: "image/png", name: "logo.png", size: 1024 }).ok).toBe(true);
    expect(validateLogoFile({ type: "image/jpeg", name: "logo.jpg", size: 1024 }).ok).toBe(true);
    expect(validateLogoFile({ type: "image/svg+xml", name: "logo.svg", size: 1024 })).toEqual({ ok: false, reason: "type" });
    expect(validateLogoFile({ type: "image/webp", name: "logo.webp", size: 1024 })).toEqual({ ok: false, reason: "type" });
    expect(validateLogoFile({ type: "image/png", name: "logo.png", size: MAX_LOGO_BYTES + 1 })).toEqual({ ok: false, reason: "size" });
    expect(validateLogoFile({ type: "image/png", name: "logo.png", size: MAX_LOGO_BYTES }).ok).toBe(true);
  });

  it("falls back to the extension when the picker leaves type empty", () => {
    expect(validateLogoFile({ type: "", name: "logo.PNG", size: 10 }).ok).toBe(true);
    expect(validateLogoFile({ type: "", name: "logo.jpeg", size: 10 }).ok).toBe(true);
    expect(validateLogoFile({ type: "", name: "logo.gif", size: 10 })).toEqual({ ok: false, reason: "type" });
  });

  it("decodes a matching data URL and rejects mismatches", () => {
    const logo = dataUrlToCompanyLogo(TINY_PNG_DATA_URL, "image/png");
    expect(logo).not.toBeNull();
    expect(logo?.kind).toBe("png");
    expect(logo?.bytes.length).toBeGreaterThan(0);
    expect(dataUrlToCompanyLogo(TINY_PNG_DATA_URL, "image/jpeg")).toBeNull();
    expect(dataUrlToCompanyLogo("data:image/png;base64,!!!not-base64!!!", "image/png")).toBeNull();
    expect(dataUrlToCompanyLogo(null, null)).toBeNull();
  });
});

describe("report branding device storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips saved branding and clears it", () => {
    expect(loadStoredBranding()).toBeNull();
    storeBranding({ companyName: "Rivera Landscaping LLC", logoDataUrl: TINY_PNG_DATA_URL, logoMime: "image/png" });
    expect(loadStoredBranding()).toEqual({
      companyName: "Rivera Landscaping LLC",
      logoDataUrl: TINY_PNG_DATA_URL,
      logoMime: "image/png",
    });
    clearStoredBranding();
    expect(loadStoredBranding()).toBeNull();
  });

  it("rejects malformed stored values instead of trusting them", () => {
    const storage = (globalThis as unknown as { window: { localStorage: ReturnType<typeof memoryStorage> } }).window.localStorage;
    storage.setItem("triangletech-report-branding", JSON.stringify({ companyName: 42, logoDataUrl: null, logoMime: null }));
    expect(loadStoredBranding()).toBeNull();
    storage.setItem("triangletech-report-branding", JSON.stringify({ companyName: "X", logoDataUrl: "data:image/png;base64,AAA", logoMime: "image/jpeg" }));
    expect(loadStoredBranding()).toBeNull();
    storage.setItem("triangletech-report-branding", "not json at all");
    expect(loadStoredBranding()).toBeNull();
  });
});
