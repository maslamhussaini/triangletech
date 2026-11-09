import { describe, expect, it } from "vitest";
import {
  createMemorySettingsAdapter,
  DEFAULT_APP_SETTINGS,
  FreelancerSettings,
  parseSettings,
} from "./settings";
import { BRANDING_STORAGE_KEY, EMPTY_BRANDING } from "@/lib/tools/report-branding";

describe("settings: defaults and separation (P-6)", () => {
  it("fresh-install defaults have overtime OFF (R-4)", () => {
    expect(DEFAULT_APP_SETTINGS.overtimeEnabled).toBe(false);
    expect(DEFAULT_APP_SETTINGS.overtimeThresholdHours).toBe(40);
    expect(DEFAULT_APP_SETTINGS.overtimeMultiplier).toBe(1.5);
    expect(DEFAULT_APP_SETTINGS.defaultPaymentTermsDays).toBe(14);
    expect(DEFAULT_APP_SETTINGS.invoiceNumberPrefix).toBe("INV");
  });

  it("corrupt or partial stored settings fall back to defaults, never crash", () => {
    expect(parseSettings("{ broken").overtimeEnabled).toBe(false);
    expect(parseSettings(JSON.stringify({ overtimeEnabled: true })).overtimeEnabled).toBe(true);
    expect(parseSettings(JSON.stringify({ overtimeThresholdHours: 999 })).overtimeThresholdHours).toBe(40);
  });

  it("settings round-trip through the adapter and reset restores defaults", async () => {
    const adapter = createMemorySettingsAdapter();
    const settings = new FreelancerSettings(adapter);
    await settings.save({ ...DEFAULT_APP_SETTINGS, defaultCurrency: "EUR", overtimeEnabled: true });
    expect((await settings.load()).defaultCurrency).toBe("EUR");
    expect((await settings.load()).overtimeEnabled).toBe(true);
    await settings.reset();
    expect(await settings.load()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("branding uses the website's key + JSON shape through Preferences (M1 detail (a))", async () => {
    const adapter = createMemorySettingsAdapter();
    const settings = new FreelancerSettings(adapter);
    expect(await settings.loadBranding()).toEqual(EMPTY_BRANDING);
    await settings.saveBranding({ companyName: "Acme Corp", logoDataUrl: null, logoMime: null });
    const snapshot = adapter.snapshot();
    // Same key as src/lib/tools/report-branding.ts BRANDING_STORAGE_KEY.
    expect(Object.keys(snapshot)).toContain(BRANDING_STORAGE_KEY);
    expect(JSON.parse(snapshot[BRANDING_STORAGE_KEY] as string).companyName).toBe("Acme Corp");
    expect((await settings.loadBranding()).companyName).toBe("Acme Corp");
    await settings.clearBranding();
    expect(await settings.loadBranding()).toEqual(EMPTY_BRANDING);
  });

  it("settings and branding are independent keys: clearing branding never touches settings", async () => {
    const adapter = createMemorySettingsAdapter();
    const settings = new FreelancerSettings(adapter);
    await settings.save({ ...DEFAULT_APP_SETTINGS, defaultCurrency: "GBP" });
    await settings.saveBranding({ companyName: "Acme Corp", logoDataUrl: null, logoMime: null });
    await settings.clearBranding();
    expect((await settings.load()).defaultCurrency).toBe("GBP");
  });
});
