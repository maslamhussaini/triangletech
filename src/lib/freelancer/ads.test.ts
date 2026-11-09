/**
 * Freelancer Time & Invoice — AdMob + UMP tests (M4).
 *
 * All tests drive `AdsService` through a fake `AdMobPort`: no native
 * code, no network, no AdMob account. They prove the placement guard,
 * the interstitial cadence, the UMP consent machine, and the fail-safe
 * behaviour. Real ad loading is NOT TESTED (no AdMob account, no
 * device).
 */
import { describe, expect, it } from "vitest";
import {
  AdsService,
  consentAllowsAds,
  isBannerAllowed,
  mayShowInterstitial,
  type AdMobPort,
  type UmpConsentState,
} from "./ads";

class FakePort implements AdMobPort {
  consentStatus: string;
  canRequestAds = true;
  throwOnConsent = false;
  throwOnInit = false;
  throwOnBanner = false;
  throwOnInterstitial = false;
  throwOnRewarded = false;
  rewardAmount = 1;
  calls: string[] = [];
  consentFormShown = false;

  constructor(consentStatus = "NOT_REQUIRED") {
    this.consentStatus = consentStatus;
  }

  async initialize(): Promise<void> {
    this.calls.push("initialize");
    if (this.throwOnInit) throw new Error("SDK init failed");
  }

  async requestConsentInfo(): Promise<{ status: string; canRequestAds: boolean }> {
    this.calls.push("requestConsentInfo");
    if (this.throwOnConsent) throw new Error("UMP unavailable");
    return { status: this.consentStatus, canRequestAds: this.canRequestAds };
  }

  async showConsentForm(): Promise<{ status: string; canRequestAds: boolean }> {
    this.calls.push("showConsentForm");
    this.consentFormShown = true;
    return { status: "OBTAINED", canRequestAds: true };
  }

  async showBanner(): Promise<void> {
    this.calls.push("showBanner");
    if (this.throwOnBanner) throw new Error("banner failed");
  }

  async hideBanner(): Promise<void> {
    this.calls.push("hideBanner");
  }

  async removeBanner(): Promise<void> {
    this.calls.push("removeBanner");
  }

  async prepareInterstitial(): Promise<unknown> {
    this.calls.push("prepareInterstitial");
    if (this.throwOnInterstitial) throw new Error("interstitial failed");
    return {};
  }

  async showInterstitial(): Promise<void> {
    this.calls.push("showInterstitial");
  }

  async prepareRewardVideoAd(): Promise<unknown> {
    this.calls.push("prepareRewardVideoAd");
    if (this.throwOnRewarded) throw new Error("rewarded failed");
    return {};
  }

  async showRewardVideoAd(): Promise<{ type: string; amount: number }> {
    this.calls.push("showRewardVideoAd");
    return { type: "extra-invoice", amount: this.rewardAmount };
  }
}

function service(port: FakePort, isPro = false): AdsService {
  return new AdsService(port, { platform: "android", isPro: () => isPro });
}

describe("placement guard (pure)", () => {
  it("banners are allowed only on the time-card list and the client list", () => {
    expect(isBannerAllowed("time-card-list")).toBe(true);
    expect(isBannerAllowed("client-list")).toBe(true);
    expect(isBannerAllowed("invoice-preview")).toBe(false);
    expect(isBannerAllowed("calculation-review")).toBe(false);
    expect(isBannerAllowed("entry")).toBe(false);
    expect(isBannerAllowed("settings")).toBe(false);
    expect(isBannerAllowed("pro")).toBe(false);
  });

  it("interstitials are allowed only from the 2nd export/share action", () => {
    expect(mayShowInterstitial(0)).toBe(false);
    expect(mayShowInterstitial(1)).toBe(false);
    expect(mayShowInterstitial(2)).toBe(true);
    expect(mayShowInterstitial(3)).toBe(true);
  });

  it("ads may be requested only with obtained or not-required consent", () => {
    expect(consentAllowsAds("obtained")).toBe(true);
    expect(consentAllowsAds("not-required")).toBe(true);
    for (const s of ["unknown", "requesting", "required", "form-showing", "unavailable"] as UmpConsentState[]) {
      expect(consentAllowsAds(s)).toBe(false);
    }
  });
});

describe("AdsService consent + init", () => {
  it("consent NOT_REQUIRED initialises the SDK and allows banners on list screens", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port);
    expect(await ads.initialize()).toBe("not-required");
    expect(ads.isInitialized).toBe(true);
    expect(await ads.showBanner("time-card-list")).toBe(true);
    expect(port.calls).toContain("showBanner");
  });

  it("consent REQUIRED shows the form and initialises once obtained", async () => {
    const port = new FakePort("REQUIRED");
    const ads = service(port);
    expect(await ads.initialize()).toBe("obtained");
    expect(port.consentFormShown).toBe(true);
    expect(ads.isInitialized).toBe(true);
  });

  it("a UMP failure lands in unavailable and no ad is ever requested", async () => {
    const port = new FakePort("NOT_REQUIRED");
    port.throwOnConsent = true;
    const ads = service(port);
    expect(await ads.initialize()).toBe("unavailable");
    expect(ads.isInitialized).toBe(false);
    expect(await ads.showBanner("time-card-list")).toBe(false);
    expect(port.calls).not.toContain("showBanner");
    expect(port.calls).not.toContain("initialize");
  });

  it("an SDK init failure lands in unavailable", async () => {
    const port = new FakePort("NOT_REQUIRED");
    port.throwOnInit = true;
    const ads = service(port);
    expect(await ads.initialize()).toBe("unavailable");
    expect(ads.isInitialized).toBe(false);
  });

  it("with no port (web preview) the service is inert: unavailable, no ads, no throw", async () => {
    const ads = new AdsService(null, { platform: "web" });
    expect(await ads.initialize()).toBe("unavailable");
    expect(await ads.showBanner("time-card-list")).toBe(false);
    expect(await ads.noteExportOrShare()).toBe(false);
    expect(await ads.showRewardedForExtraInvoice()).toBe(false);
  });

  it("initialize is idempotent", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port);
    await ads.initialize();
    await ads.initialize();
    expect(port.calls.filter((c) => c === "requestConsentInfo")).toHaveLength(1);
  });
});

describe("AdsService banner guard", () => {
  it("never shows a banner on invoice preview, calculation review, or entry screens", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port);
    await ads.initialize();
    for (const screen of ["invoice-preview", "calculation-review", "entry", "settings", "pro"] as const) {
      expect(await ads.showBanner(screen)).toBe(false);
    }
    expect(port.calls.filter((c) => c === "showBanner")).toHaveLength(0);
  });

  it("a banner failure resolves false instead of throwing", async () => {
    const port = new FakePort("NOT_REQUIRED");
    port.throwOnBanner = true;
    const ads = service(port);
    await ads.initialize();
    expect(await ads.showBanner("client-list")).toBe(false);
    expect(ads.isBannerVisible).toBe(false);
  });

  it("Pro users never see a banner", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port, true);
    await ads.initialize();
    expect(await ads.showBanner("time-card-list")).toBe(false);
    expect(port.calls).not.toContain("showBanner");
  });
});

describe("AdsService interstitial cadence", () => {
  it("shows at most 1 interstitial per 2 export/share actions", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port);
    await ads.initialize();
    expect(await ads.noteExportOrShare()).toBe(false); // action 1
    expect(await ads.noteExportOrShare()).toBe(true); // action 2 → shown
    expect(port.calls.filter((c) => c === "showInterstitial")).toHaveLength(1);
    expect(await ads.noteExportOrShare()).toBe(false); // action 1 of next pair
    expect(await ads.noteExportOrShare()).toBe(true); // action 2 → shown again
    expect(port.calls.filter((c) => c === "showInterstitial")).toHaveLength(2);
  });

  it("an interstitial failure does not consume the cadence (the next action retries)", async () => {
    const port = new FakePort("NOT_REQUIRED");
    port.throwOnInterstitial = true;
    const ads = service(port);
    await ads.initialize();
    await ads.noteExportOrShare();
    expect(await ads.noteExportOrShare()).toBe(false);
    expect(ads.actionsSinceLastInterstitial).toBe(2);
  });

  it("Pro users never get an interstitial", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port, true);
    await ads.initialize();
    await ads.noteExportOrShare();
    expect(await ads.noteExportOrShare()).toBe(false);
    expect(port.calls).not.toContain("showInterstitial");
  });
});

describe("AdsService rewarded ad", () => {
  it("returns true only when the reward is earned", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port);
    await ads.initialize();
    expect(await ads.showRewardedForExtraInvoice()).toBe(true);
    port.rewardAmount = 0;
    expect(await ads.showRewardedForExtraInvoice()).toBe(false);
  });

  it("a rewarded failure resolves false instead of throwing", async () => {
    const port = new FakePort("NOT_REQUIRED");
    port.throwOnRewarded = true;
    const ads = service(port);
    await ads.initialize();
    expect(await ads.showRewardedForExtraInvoice()).toBe(false);
  });

  it("Pro users never get a rewarded ad", async () => {
    const port = new FakePort("NOT_REQUIRED");
    const ads = service(port, true);
    await ads.initialize();
    expect(await ads.showRewardedForExtraInvoice()).toBe(false);
    expect(port.calls).not.toContain("showRewardVideoAd");
  });
});
