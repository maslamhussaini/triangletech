/**
 * Freelancer Time & Invoice — app settings (M1).
 *
 * Settings live in Capacitor Preferences (native) with a localStorage
 * fallback on the web — the existing pattern from
 * `src/lib/mobile/capacitor.ts` (favorites / recently-used). They do NOT
 * live in the JSON store document: a settings reset must never touch
 * record data (checklist P-6), and record writes must stay single-write
 * atomic without carrying unrelated settings bytes.
 *
 * Report branding reconciliation (M1 detail (a)):
 * the website's report-branding module (`src/lib/tools/report-branding.ts`)
 * stores the user's company name + logo under the localStorage key
 * `triangletech-report-branding`. The freelancer app uses THE SAME key
 * and THE SAME JSON shape (`ReportBranding`), but through the Preferences
 * adapter below — so on native the value is a real Preferences entry
 * (localStorage is not the source of truth in the app), and on the web
 * preview it is the same localStorage key. There is exactly one source
 * of truth per platform; the website's localStorage helpers are NOT used
 * by the app and are left untouched for the website. A fresh install of
 * this app has no branding until the user sets it (M2 UI); nothing is
 * migrated from the website, which is a different origin/app.
 */
import { Capacitor } from "@capacitor/core";
import { BRANDING_STORAGE_KEY, EMPTY_BRANDING, type ReportBranding } from "@/lib/tools/report-branding";

export type AppSettings = {
  /** App-wide fallback currency for new clients (ISO 4217, e.g. "USD"). */
  defaultCurrency: string;
  /** App-wide fallback hourly rate in whole cents; null = no rate configured. */
  defaultRateCents: number | null;
  /** Overtime is OFF by default (checklist R-4). Never inherit the web tool's on-default. */
  overtimeEnabled: boolean;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  defaultPaymentTermsDays: number;
  invoiceNumberPrefix: string;
  companyName: string;
  language: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultCurrency: "USD",
  defaultRateCents: null,
  overtimeEnabled: false,
  overtimeThresholdHours: 40,
  overtimeMultiplier: 1.5,
  defaultPaymentTermsDays: 14,
  invoiceNumberPrefix: "INV",
  companyName: "",
  language: "en",
};

export const SETTINGS_KEY = "triangletech-freelancer-settings";

/** Minimal key/value backing for settings. Preferences on native, localStorage on web. */
export interface SettingsAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * The production adapter: Capacitor Preferences when running inside the
 * native shell, `window.localStorage` on the web (preview / browser QA).
 * Both sides use the same keys, so a setting saved in one place is never
 * shadowed by a stale copy in the other.
 */
export function createSettingsAdapter(): SettingsAdapter {
  return {
    async get(key: string): Promise<string | null> {
      if (isNativeApp()) {
        try {
          const { Preferences } = await import("@capacitor/preferences");
          const { value } = await Preferences.get({ key });
          return value;
        } catch {
          return null;
        }
      }
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key: string, value: string): Promise<void> {
      if (isNativeApp()) {
        try {
          const { Preferences } = await import("@capacitor/preferences");
          await Preferences.set({ key, value });
          return;
        } catch {
          /* fall through to localStorage */
        }
      }
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage unavailable: settings simply do not persist */
      }
    },
    async remove(key: string): Promise<void> {
      if (isNativeApp()) {
        try {
          const { Preferences } = await import("@capacitor/preferences");
          await Preferences.remove({ key });
          return;
        } catch {
          /* fall through to localStorage */
        }
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/** In-memory adapter for tests (and for environments without storage). */
export function createMemorySettingsAdapter(initial: Record<string, string> = {}): SettingsAdapter & {
  snapshot(): Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    async get(key: string): Promise<string | null> {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async set(key: string, value: string): Promise<void> {
      map.set(key, value);
    },
    async remove(key: string): Promise<void> {
      map.delete(key);
    },
    snapshot(): Record<string, string> {
      return Object.fromEntries(map);
    },
  };
}

export function parseSettings(raw: string | null): AppSettings {
  if (!raw) return { ...DEFAULT_APP_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      defaultCurrency: typeof parsed.defaultCurrency === "string" && parsed.defaultCurrency ? parsed.defaultCurrency : DEFAULT_APP_SETTINGS.defaultCurrency,
      defaultRateCents:
        typeof parsed.defaultRateCents === "number" && Number.isInteger(parsed.defaultRateCents) && parsed.defaultRateCents >= 0
          ? parsed.defaultRateCents
          : DEFAULT_APP_SETTINGS.defaultRateCents,
      overtimeEnabled: parsed.overtimeEnabled === true,
      overtimeThresholdHours:
        typeof parsed.overtimeThresholdHours === "number" && parsed.overtimeThresholdHours > 0 && parsed.overtimeThresholdHours <= 168
          ? parsed.overtimeThresholdHours
          : DEFAULT_APP_SETTINGS.overtimeThresholdHours,
      overtimeMultiplier:
        typeof parsed.overtimeMultiplier === "number" && parsed.overtimeMultiplier >= 1 && parsed.overtimeMultiplier <= 5
          ? parsed.overtimeMultiplier
          : DEFAULT_APP_SETTINGS.overtimeMultiplier,
      defaultPaymentTermsDays:
        typeof parsed.defaultPaymentTermsDays === "number" && Number.isInteger(parsed.defaultPaymentTermsDays) && parsed.defaultPaymentTermsDays >= 0
          ? parsed.defaultPaymentTermsDays
          : DEFAULT_APP_SETTINGS.defaultPaymentTermsDays,
      invoiceNumberPrefix:
        typeof parsed.invoiceNumberPrefix === "string" && parsed.invoiceNumberPrefix ? parsed.invoiceNumberPrefix : DEFAULT_APP_SETTINGS.invoiceNumberPrefix,
      companyName: typeof parsed.companyName === "string" ? parsed.companyName : DEFAULT_APP_SETTINGS.companyName,
      language: typeof parsed.language === "string" && parsed.language ? parsed.language : DEFAULT_APP_SETTINGS.language,
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function parseBranding(raw: string | null): ReportBranding {
  if (!raw) return { ...EMPTY_BRANDING };
  try {
    const parsed = JSON.parse(raw) as Partial<ReportBranding>;
    return {
      companyName: typeof parsed.companyName === "string" ? parsed.companyName : "",
      logoDataUrl: typeof parsed.logoDataUrl === "string" ? parsed.logoDataUrl : null,
      logoMime: parsed.logoMime === "image/png" || parsed.logoMime === "image/jpeg" ? parsed.logoMime : null,
    };
  } catch {
    return { ...EMPTY_BRANDING };
  }
}

/** Settings + branding access for the freelancer app. One adapter, two keys. */
export class FreelancerSettings {
  constructor(private readonly adapter: SettingsAdapter = createSettingsAdapter()) {}

  async load(): Promise<AppSettings> {
    return parseSettings(await this.adapter.get(SETTINGS_KEY));
  }

  async save(settings: AppSettings): Promise<void> {
    await this.adapter.set(SETTINGS_KEY, JSON.stringify(settings));
  }

  /** Reset settings to defaults. Record data is never touched (P-6). */
  async reset(): Promise<void> {
    await this.adapter.remove(SETTINGS_KEY);
  }

  /** Report branding (user company name/logo for PDF headers). */
  async loadBranding(): Promise<ReportBranding> {
    return parseBranding(await this.adapter.get(BRANDING_STORAGE_KEY));
  }

  async saveBranding(branding: ReportBranding): Promise<void> {
    await this.adapter.set(BRANDING_STORAGE_KEY, JSON.stringify(branding));
  }

  async clearBranding(): Promise<void> {
    await this.adapter.remove(BRANDING_STORAGE_KEY);
  }
}
