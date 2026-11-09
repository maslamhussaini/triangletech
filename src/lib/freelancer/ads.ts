/**
 * Freelancer Time & Invoice — AdMob ads + UMP consent (M4).
 *
 * TEST CONFIGURATION ONLY. The app initializes AdMob with Google's
 * OFFICIAL TEST ad unit IDs (below) and nothing else. There is NO
 * AdMob account and NO production AdMob app ID — the Android manifest
 * and iOS Info.plist carry Google's official TEST app id
 * (`ca-app-pub-3940256099942544~3347511713`, Android) /
 * (`ca-app-pub-3940256099942544~1458002511`, iOS) so test ads can load
 * in a test build; both MUST be replaced with the app id of an
 * owner-created AdMob account before any production use. The code
 * FAILS SAFE without a working ad setup: every plugin call is wrapped,
 * and any failure (no SDK, no consent, no network, no app id) leaves
 * ads disabled and the app fully usable — ads simply do not load.
 * Real ad loading is NOT TESTED in M4 (no AdMob account, no device).
 *
 * PLACEMENT GUARD (plan §9 — enforced by the pure functions below,
 * which the UI must call before any ad request):
 * - Banner: list screens ONLY — the time-card list and the client
 *   list. NEVER on the calculation review, the invoice preview, or
 *   during entry. `isBannerAllowed(screen)` is the single gate.
 * - Interstitial: only AFTER a successful export/share, at most 1 per
 *   2 export/share actions. The counter lives in `AdsService` and is
 *   enforced by `noteExportOrShare()`.
 * - Rewarded: opt-in only, from the Free-invoice-cap upsell — one
 *   watched ad grants ONE extra invoice in the current month
 *   (see entitlements.ts). Never auto-played.
 * - Pro users never see ads: every show path checks `isPro`.
 *
 * UMP CONSENT (EEA/UK): the consent state machine below wraps the
 * plugin's UMP APIs (`requestConsentInfo` / `showConsentForm`). States:
 * `unknown → requesting → not-required | required → form-showing →
 * obtained`, plus `unavailable` when the plugin is missing (web) or
 * any consent call fails. Ads are requested ONLY from `obtained` or
 * `not-required`. If the plugin's consent APIs are unavailable in an
 * environment, the machine lands in `unavailable` and ads stay off —
 * that state is recorded, never silently bypassed. UMP itself persists
 * the user's consent choice on-device; this service keeps only the
 * in-memory machine state.
 *
 * TESTABILITY: `AdsService` takes an `AdMobPort` (the plugin surface
 * it needs) plus the platform and a Pro check, so tests drive it with
 * a fake port and assert the placement guard, the interstitial
 * cadence, and the consent machine without any native code.
 */
import { Capacitor } from "@capacitor/core";

/** Google's official TEST ad unit ids (Android / iOS). NEVER a production id. */
export const TEST_AD_UNITS = {
  android: {
    banner: "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    rewarded: "ca-app-pub-3940256099942544/5224354917",
  },
  ios: {
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    rewarded: "ca-app-pub-3940256099942544/1712485313",
  },
} as const;

/** Google's official TEST AdMob app ids (manifest / Info.plist). NOT production ids. */
export const TEST_ADMOB_APP_IDS = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
} as const;

/** Screens the app can show a banner on. Only the two list screens are allowed. */
export type BannerScreen = "time-card-list" | "client-list" | "invoice-preview" | "calculation-review" | "entry" | "settings" | "pro";

export const BANNER_ALLOWED_SCREENS: readonly BannerScreen[] = ["time-card-list", "client-list"] as const;

/** Placement guard: is a banner allowed on this screen? */
export function isBannerAllowed(screen: BannerScreen): boolean {
  return (BANNER_ALLOWED_SCREENS as readonly string[]).includes(screen);
}

/** Interstitial cadence (plan §9): at most 1 shown per 2 export/share actions. */
export const INTERSTITIAL_ACTIONS_PER_AD = 2;

/** Pure cadence decision: after `actionsSinceAd` export/share actions, may an interstitial show? */
export function mayShowInterstitial(actionsSinceAd: number): boolean {
  return actionsSinceAd >= INTERSTITIAL_ACTIONS_PER_AD;
}

export type UmpConsentState = "unknown" | "requesting" | "not-required" | "required" | "form-showing" | "obtained" | "unavailable";

/** Ads may be requested only once consent is settled as obtained or not-required. */
export function consentAllowsAds(state: UmpConsentState): boolean {
  return state === "obtained" || state === "not-required";
}

/** Minimal AdMob plugin surface this service needs (the real port wraps the plugin). */
export interface AdMobPort {
  initialize(options?: { testingDevices?: string[]; initializeForTesting?: boolean }): Promise<void>;
  requestConsentInfo(): Promise<{ status: string; canRequestAds: boolean }>;
  showConsentForm(): Promise<{ status: string; canRequestAds: boolean }>;
  showBanner(options: { adId: string; adSize?: string; position?: string }): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  prepareInterstitial(options: { adId: string }): Promise<unknown>;
  showInterstitial(): Promise<void>;
  prepareRewardVideoAd(options: { adId: string }): Promise<unknown>;
  showRewardVideoAd(): Promise<{ type: string; amount: number }>;
}

export async function createRealAdMobPort(): Promise<AdMobPort> {
  const { AdMob } = await import("@capacitor-community/admob");
  const { BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
  return {
    initialize: (options) => AdMob.initialize(options),
    requestConsentInfo: async () => {
      const info = await AdMob.requestConsentInfo();
      return { status: String(info.status), canRequestAds: info.canRequestAds };
    },
    showConsentForm: async () => {
      const info = await AdMob.showConsentForm();
      return { status: String(info.status), canRequestAds: info.canRequestAds };
    },
    showBanner: (options) =>
      AdMob.showBanner({
        adId: options.adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
      }),
    hideBanner: () => AdMob.hideBanner(),
    removeBanner: () => AdMob.removeBanner(),
    prepareInterstitial: (options) => AdMob.prepareInterstitial({ adId: options.adId }),
    showInterstitial: () => AdMob.showInterstitial(),
    prepareRewardVideoAd: (options) => AdMob.prepareRewardVideoAd({ adId: options.adId }),
    showRewardVideoAd: () => AdMob.showRewardVideoAd(),
  };
}

export type AdsServiceOptions = {
  platform?: "android" | "ios" | "web";
  /** Native shell? On web the service is inert (no ads, no errors). */
  native?: boolean;
  /** Current Pro state — Pro users never see ads. */
  isPro?: () => boolean;
};

/**
 * AdMob + UMP service. All public methods fail safe: they resolve
 * without throwing when ads are unavailable, so a caller never needs
 * its own try/catch to keep the app working.
 */
export class AdsService {
  private readonly port: AdMobPort | null;
  private readonly adUnits: { banner: string; interstitial: string; rewarded: string };
  private readonly isPro: () => boolean;
  private consent: UmpConsentState = "unknown";
  private initialized = false;
  private bannerVisible = false;
  private exportActionsSinceAd = 0;

  constructor(port: AdMobPort | null, opts: AdsServiceOptions = {}) {
    this.port = port;
    const platform = opts.platform ?? (Capacitor.getPlatform() as "android" | "ios" | "web");
    this.adUnits = platform === "ios" ? TEST_AD_UNITS.ios : TEST_AD_UNITS.android;
    this.isPro = opts.isPro ?? (() => false);
  }

  get consentState(): UmpConsentState {
    return this.consent;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  /** Actions since the last interstitial (test-visible cadence state). */
  get actionsSinceLastInterstitial(): number {
    return this.exportActionsSinceAd;
  }

  /**
   * Initialise the Mobile Ads SDK + UMP consent. Safe to call on web
   * (no-op) and safe to call twice. Any failure lands in
   * `unavailable` and ads stay off.
   */
  async initialize(): Promise<UmpConsentState> {
    if (this.initialized || this.consent === "unavailable") return this.consent;
    if (!this.port) {
      this.consent = "unavailable";
      return this.consent;
    }
    try {
      this.consent = "requesting";
      const info = await this.port.requestConsentInfo();
      if (info.status === "REQUIRED") {
        this.consent = "required";
        const afterForm = await this.port.showConsentForm();
        this.consent = afterForm.status === "OBTAINED" || afterForm.canRequestAds ? "obtained" : "form-showing";
      } else if (info.status === "OBTAINED") {
        this.consent = "obtained";
      } else if (info.status === "NOT_REQUIRED") {
        this.consent = "not-required";
      } else {
        this.consent = "unknown";
      }
      if (!consentAllowsAds(this.consent)) return this.consent;
      await this.port.initialize({ initializeForTesting: true });
      this.initialized = true;
    } catch {
      // Fail safe: consent/SDK failure means NO ads, never a crash and
      // never an ad request without settled consent.
      this.consent = "unavailable";
      this.initialized = false;
    }
    return this.consent;
  }

  private canShowAds(): boolean {
    return this.port !== null && this.initialized && consentAllowsAds(this.consent) && !this.isPro();
  }

  /**
   * Show the banner on a list screen. No-op (returns false) on any
   * other screen, for Pro users, or when ads are unavailable.
   */
  async showBanner(screen: BannerScreen): Promise<boolean> {
    if (!isBannerAllowed(screen)) return false;
    if (!this.canShowAds() || !this.port) return false;
    try {
      await this.port.showBanner({ adId: this.adUnits.banner });
      this.bannerVisible = true;
      return true;
    } catch {
      this.bannerVisible = false;
      return false;
    }
  }

  /** Hide/remove the banner (screen unmount / Pro upgrade). */
  async hideBanner(): Promise<void> {
    this.bannerVisible = false;
    if (!this.port) return;
    try {
      await this.port.hideBanner();
    } catch {
      /* best-effort */
    }
  }

  /**
   * Record a successful export/share. Shows an interstitial at most
   * once per `INTERSTITIAL_ACTIONS_PER_AD` actions. Returns true when
   * an interstitial was shown.
   */
  async noteExportOrShare(): Promise<boolean> {
    this.exportActionsSinceAd += 1;
    if (!mayShowInterstitial(this.exportActionsSinceAd)) return false;
    if (!this.canShowAds() || !this.port) return false;
    try {
      await this.port.prepareInterstitial({ adId: this.adUnits.interstitial });
      await this.port.showInterstitial();
      this.exportActionsSinceAd = 0;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Opt-in rewarded ad for one extra invoice beyond the Free cap.
   * Returns true only when the user earned the reward. The caller
   * grants the extra invoice (store.grantRewardedInvoice) on true.
   */
  async showRewardedForExtraInvoice(): Promise<boolean> {
    if (!this.canShowAds() || !this.port) return false;
    try {
      await this.port.prepareRewardVideoAd({ adId: this.adUnits.rewarded });
      const reward = await this.port.showRewardVideoAd();
      return reward.amount > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Create the app's ads service. On the web preview there is no port
 * (ads inert); on native the real plugin port is created lazily by the
 * caller via `createRealAdMobPort()` — the provider passes it in.
 */
export function createAdsService(port: AdMobPort | null, opts: AdsServiceOptions = {}): AdsService {
  return new AdsService(port, opts);
}
