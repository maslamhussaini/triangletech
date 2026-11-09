"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDefaultFileAdapter, FreelancerStore, type StoreLoadResult } from "@/lib/freelancer/store";
import { FreelancerSettings, type AppSettings } from "@/lib/freelancer/settings";
import type { StoreDocument } from "@/lib/freelancer/models";
import type { ReportBranding } from "@/lib/tools/report-branding";
import { isProActive, type ProEntitlement } from "@/lib/freelancer/entitlements";
import { createPurchaseAdapter, type PurchaseAdapter } from "@/lib/freelancer/purchase-adapter";
import { AdsService, createAdsService, createRealAdMobPort, type AdMobPort } from "@/lib/freelancer/ads";
import { isNativeApp } from "@/lib/mobile/capacitor";

/**
 * Freelancer data provider (M2; M4 adds Pro / purchases / ads).
 *
 * Opens the single store document once (Capacitor Filesystem on native,
 * localStorage on web preview) and the Preferences-backed settings, then
 * shares them with every app screen. Mutations go through the store /
 * settings objects directly and call `refresh()` afterwards, which
 * re-reads the store's in-memory document (already updated by the
 * mutation's atomic write) — no reopen, no second source of truth.
 * The store instance is kept in a ref so a re-render never re-opens it.
 *
 * PRO (M4): the provider owns one `PurchaseAdapter` (mock by default —
 * see purchase-adapter.ts) and one `AdsService`. On launch, after the
 * store opens, the entitlement is re-verified through the adapter and
 * the cached `proEntitlement` in the document is updated when it
 * differs. A verification failure NEVER blocks launch and NEVER clears
 * the cached entitlement — the app keeps working as Free or Pro based
 * on the last-known state. AdMob is initialised best-effort the same
 * way: any failure leaves ads disabled, never an error screen.
 */
export type FreelancerData = {
  store: FreelancerStore | null;
  doc: StoreDocument | null;
  load: StoreLoadResult | null;
  settings: AppSettings | null;
  branding: ReportBranding | null;
  error: string | null;
  refresh: () => Promise<void>;
  confirmEmpty: () => Promise<void>;
  saveSettings: (next: AppSettings) => Promise<void>;
  saveBranding: (next: ReportBranding) => Promise<void>;
  /** Last-known Pro entitlement (null = Free). */
  pro: ProEntitlement | null;
  isPro: boolean;
  /** Purchase adapter (mock by default; see purchase-adapter.ts). */
  purchaseAdapter: PurchaseAdapter | null;
  /** AdMob + UMP service (inert on web — no port, no ads, no errors). */
  ads: AdsService | null;
  /** Re-verify the entitlement against the store and persist any change. Never throws. */
  refreshPro: () => Promise<void>;
  /** Grant one rewarded-ad extra invoice for the current month. Returns the month's grant count. */
  grantRewardedInvoice: () => Promise<number>;
};

const FreelancerDataContext = createContext<FreelancerData | null>(null);

export function useFreelancerData(): FreelancerData {
  const ctx = useContext(FreelancerDataContext);
  if (!ctx) throw new Error("useFreelancerData must be used inside FreelancerDataProvider");
  return ctx;
}

export function FreelancerDataProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<FreelancerStore | null>(null);
  const settingsRef = useRef<FreelancerSettings | null>(null);
  const adapterRef = useRef<PurchaseAdapter | null>(null);
  const proRef = useRef<ProEntitlement | null>(null);
  const [store, setStore] = useState<FreelancerStore | null>(null);
  const [doc, setDoc] = useState<StoreDocument | null>(null);
  const [load, setLoad] = useState<StoreLoadResult | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [branding, setBranding] = useState<ReportBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pro, setPro] = useState<ProEntitlement | null>(null);
  const [purchaseAdapter, setPurchaseAdapter] = useState<PurchaseAdapter | null>(null);
  const [ads, setAds] = useState<AdsService | null>(null);

  const refreshPro = useCallback(async () => {
    const store = storeRef.current;
    const adapter = adapterRef.current;
    if (!store || !adapter) return;
    try {
      const current = store.document.proEntitlement;
      const next = await adapter.refreshEntitlement(current);
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        await store.setEntitlement(next);
        proRef.current = next;
        setPro(next);
        setDoc(store.document);
      }
    } catch {
      // Verification failure: keep the cached entitlement. The store
      // may be unreachable (no network, no store account) — that must
      // never silently demote a Pro user or block launch.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { store, load: result } = await FreelancerStore.open(createDefaultFileAdapter());
        const settingsApi = new FreelancerSettings();
        const appSettings = await settingsApi.load();
        const reportBranding = await settingsApi.loadBranding();
        if (cancelled) return;
        storeRef.current = store;
        settingsRef.current = settingsApi;
        const adapter = createPurchaseAdapter();
        adapterRef.current = adapter;
        setPurchaseAdapter(adapter);
        const cachedPro = store.document.proEntitlement;
        proRef.current = cachedPro;
        setPro(cachedPro);
        setStore(store);
        setDoc(store.document);
        setLoad(result);
        setSettings(appSettings);
        setBranding(reportBranding);
        // Ads (best-effort, never blocks launch): the real plugin port
        // exists only inside the native shell; on web the service is
        // inert (no port → consent "unavailable" → no ads, no errors).
        let port: AdMobPort | null = null;
        if (isNativeApp()) {
          try {
            port = await createRealAdMobPort();
          } catch {
            port = null;
          }
        }
        if (cancelled) return;
        const adsService = createAdsService(port, { isPro: () => isProActive(proRef.current) });
        setAds(adsService);
        await adsService.initialize().catch(() => undefined);
        // Launch-time entitlement re-verification (best-effort).
        await refreshPro().catch(() => undefined);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPro]);

  const isPro = useMemo(() => isProActive(pro), [pro]);

  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    setDoc(store.document);
    setPro(store.document.proEntitlement);
    proRef.current = store.document.proEntitlement;
    setLoad({ status: store.status, notice: store.notice, migrationReport: store.lastMigrationReport, events: store.corruptionLog });
    if (settingsRef.current) {
      setSettings(await settingsRef.current.load());
      setBranding(await settingsRef.current.loadBranding());
    }
  }, []);

  const confirmEmpty = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    try {
      const result = await store.initializeEmptyAfterConfirmation();
      setDoc(store.document);
      setLoad(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    if (!settingsRef.current) return;
    await settingsRef.current.save(next);
    setSettings({ ...next });
  }, []);

  const saveBranding = useCallback(async (next: ReportBranding) => {
    if (!settingsRef.current) return;
    await settingsRef.current.saveBranding(next);
    setBranding({ ...next });
  }, []);

  const grantRewardedInvoice = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return 0;
    const count = await store.grantRewardedInvoice();
    setDoc(store.document);
    return count;
  }, []);

  return (
    <FreelancerDataContext.Provider
      value={{ store, doc, load, settings, branding, error, refresh, confirmEmpty, saveSettings, saveBranding, pro, isPro, purchaseAdapter, ads, refreshPro, grantRewardedInvoice }}
    >
      {children}
    </FreelancerDataContext.Provider>
  );
}
