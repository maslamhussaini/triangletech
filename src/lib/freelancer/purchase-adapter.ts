/**
 * Freelancer Time & Invoice — purchase adapter (M4).
 *
 * ADAPTER DESIGN: all purchase logic in the app talks to the
 * `PurchaseAdapter` interface below — never to a store SDK directly.
 * Two implementations exist:
 * - `MockPurchaseAdapter` — driven by local test configuration (the
 *   product catalog in products.ts). Simulates success / failure /
 *   cancellation / already-owned. DEFAULT in this environment.
 * - `RealPurchaseAdapter` — wraps `@capgo/native-purchases` 8.9.6
 *   (StoreKit 2 on iOS, Google Play Billing 8.x on Android).
 *
 * SELECTION is by explicit config, never by guessing: `resolvePurchaseAdapterKind()`
 * returns "real" only when the build-time flag
 * `NEXT_PUBLIC_FREELANCER_PURCHASE_ADAPTER` is exactly "real" AND the
 * app is running inside the native shell; every other case (including
 * an unset flag and the web preview) uses the mock. The Pro screen
 * always shows which adapter is active.
 *
 * *** MOCKED TESTS ARE NOT STORE VERIFICATION. *** Every test in
 * purchase-adapter.test.ts runs against the mock. A green mock suite
 * proves the APP's purchase logic (state machine, cap interaction,
 * restore flow, error paths) — it proves NOTHING about Play Billing,
 * StoreKit, product registration, or real money movement. Real store
 * verification is BLOCKED: no Play Console account, no Apple Developer
 * Program account, no products registered in any console, no sandbox
 * testers. It stays BLOCKED until the owner creates the accounts and
 * the three products (see products.ts).
 *
 * BILLING-PLUGIN DECISION (M4, with evidence):
 * - The plan named `@capacitor-community/in-app-purchases`. That
 *   package DOES NOT EXIST on npm: `npm view` and a direct registry
 *   fetch both return 404 ("Not found"), and Capgo's docs state the
 *   plugin "is now transferred to RevenueCat official repository".
 *   It is therefore UNSUITABLE as named — it cannot be installed.
 * - RevenueCat (`@revenuecat/purchases-capacitor` 14.1.0, installable)
 *   is the documented fallback, but it needs a RevenueCat account and
 *   API key, which do not exist and cannot be created here (owner
 *   action, paid-service signup). BLOCKED as the real adapter.
 * - `@capgo/native-purchases` 8.9.6 IS installable from npm, declares
 *   peer `@capacitor/core >= 8.0.0` (compatible with the repo's 8.6.0),
 *   and is the direct no-backend successor documented by Capgo ("If
 *   you prefer a simpler native API without RevenueCat,
 *   @capgo/native-purchases implements in-app purchases and
 *   subscriptions directly with StoreKit and Google Play Billing").
 *   It is the real adapter. Its native code is NOT exercised here
 *   (no device/emulator, no store accounts) — the real adapter is
 *   wired, type-checked and unit-tested only through its mapping
 *   functions; the native path is NOT TESTED.
 */
import { Capacitor } from "@capacitor/core";
import { PRO_PRODUCTS, PRO_SUBSCRIPTION_IDS, PRO_LIFETIME_ID, proProductById, type ProProduct } from "./products";
import { isProActive, type EntitlementPlatform, type ProEntitlement } from "./entitlements";

/** Adapter-neutral purchase record. Both adapters produce these; the
 *  entitlement derivation below consumes only this shape. */
export type StoreTransaction = {
  productId: string;
  productType: "inapp" | "subs";
  purchaseDate: string;
  /** Subscription expiry (ISO), when the store reports one. */
  expiry?: string;
  /** iOS: true while the subscription is active. Android: derived from purchaseState. */
  isActive?: boolean;
  /** True when the user cancelled auto-renew but the period is still paid up. */
  willCancel?: boolean;
  subscriptionState?: "subscribed" | "expired" | "revoked" | "inGracePeriod" | "inBillingRetryPeriod" | "unknown";
  /** Set when Apple revoked the transaction (refund / developer issue). */
  revocationDate?: string;
};

/**
 * Derive the entitlement from a set of store transactions (pure).
 * Priority: an active lifetime purchase wins; else the active
 * subscription with the latest expiry; else the most recent
 * expired/refunded state. A cancelled-but-paid-up subscription stays
 * "active" with its expiry (plan §9: Pro stays active until the paid
 * period ends) — the "cancelled" stored state is produced only by the
 * mock script / a future server signal, and `isProActive` treats it
 * as active until its expiry passes.
 */
export function deriveEntitlement(
  transactions: StoreTransaction[],
  platform: EntitlementPlatform,
  now: Date = new Date()
): ProEntitlement | null {
  const known = transactions.filter((t) => proProductById(t.productId));
  if (known.length === 0) return null;
  const verifiedAt = now.toISOString();

  const lifetime = known.find((t) => t.productId === PRO_LIFETIME_ID && !t.revocationDate);
  if (lifetime) {
    return { productId: lifetime.productId, platform, state: "active", verifiedAt };
  }
  const refundedLifetime = known.find((t) => t.productId === PRO_LIFETIME_ID && t.revocationDate);
  const subs = known.filter((t) => t.productType === "subs");
  // Active subscription: store says active, or expiry is still ahead.
  const activeSub = subs
    .filter((t) => {
      if (t.revocationDate || t.subscriptionState === "revoked") return false;
      if (t.subscriptionState === "expired") return false;
      if (t.isActive === true) return true;
      if (t.expiry) return new Date(t.expiry).getTime() > now.getTime();
      return false;
    })
    .sort((a, b) => {
      const ea = a.expiry ? new Date(a.expiry).getTime() : 0;
      const eb = b.expiry ? new Date(b.expiry).getTime() : 0;
      return eb - ea;
    })[0];
  if (activeSub) {
    return {
      productId: activeSub.productId,
      platform,
      state: activeSub.subscriptionState === "inGracePeriod" || activeSub.subscriptionState === "inBillingRetryPeriod" ? "grace" : "active",
      ...(activeSub.expiry ? { expiry: activeSub.expiry } : {}),
      verifiedAt,
    };
  }
  const revokedSub = subs.find((t) => t.revocationDate || t.subscriptionState === "revoked");
  if (revokedSub) {
    return { productId: revokedSub.productId, platform, state: "refunded", verifiedAt };
  }
  const expiredSub = subs
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0];
  if (expiredSub) {
    return {
      productId: expiredSub.productId,
      platform,
      state: "expired",
      ...(expiredSub.expiry ? { expiry: expiredSub.expiry } : {}),
      verifiedAt,
    };
  }
  if (refundedLifetime) {
    return { productId: refundedLifetime.productId, platform, state: "refunded", verifiedAt };
  }
  return null;
}

/** A store price for one product (from the store, or the hypothesis price from the mock). */
export type ProProductOffer = {
  product: ProProduct;
  /** Localised price string from the store, or the hypothesis label from the mock. */
  priceString: string;
  /** Numeric price in local currency from the store, or the hypothesis cents from the mock. */
  priceCents: number;
  /** True when the price came from the store; false when it is the test-configuration hypothesis. */
  fromStore: boolean;
};

export type PurchaseOutcome =
  | { result: "success"; entitlement: ProEntitlement }
  | { result: "already-owned"; entitlement: ProEntitlement }
  | { result: "cancelled" }
  | { result: "failed"; message: string };

export type RestoreOutcome = {
  /** True when the store reported at least one Pro transaction. */
  found: boolean;
  entitlement: ProEntitlement | null;
};

export interface PurchaseAdapter {
  readonly kind: "mock" | "real";
  /** True when the platform's billing service is reachable. */
  isBillingSupported(): Promise<boolean>;
  /** Products with prices (store prices for the real adapter, hypothesis prices for the mock). */
  getProducts(): Promise<ProProductOffer[]>;
  purchase(productId: string): Promise<PurchaseOutcome>;
  /** Re-query the store for previous purchases (the restore button). */
  restore(): Promise<RestoreOutcome>;
  /**
   * Re-derive the entitlement from the store. The caller persists the
   * result over the cached entitlement in the store document. Throws
   * when the store cannot be reached — the caller must then KEEP the
   * cached entitlement, never clear it on a transient failure.
   */
  refreshEntitlement(current: ProEntitlement | null): Promise<ProEntitlement | null>;
}

export type PurchaseAdapterKind = "mock" | "real";

/**
 * Explicit adapter selection. "real" only when the build flag says so
 * AND the code runs inside the native shell; otherwise "mock".
 * Default is "mock" — no flag, no store, no real money.
 */
export function resolvePurchaseAdapterKind(env: Record<string, string | undefined> = process.env): PurchaseAdapterKind {
  let native = false;
  try {
    native = Capacitor.isNativePlatform();
  } catch {
    native = false;
  }
  if (env.NEXT_PUBLIC_FREELANCER_PURCHASE_ADAPTER === "real" && native) return "real";
  return "mock";
}

export function platformOfCurrentDevice(): EntitlementPlatform {
  try {
    return Capacitor.getPlatform() === "ios" ? "appstore" : "play";
  } catch {
    return "play";
  }
}

/** Expiry the mock assigns to a simulated subscription purchase. */
export function mockSubscriptionExpiry(productId: string, from: Date): string {
  const d = new Date(from);
  if (proProductById(productId)?.kind === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export type MockPurchaseScript = {
  /** Outcome of the NEXT purchase call (default "success"). Consumed once, then resets to "success". */
  purchaseOutcome?: "success" | "failure" | "cancelled";
  /** Transactions restore() reports (default: whatever the mock has "sold"). */
  restoreTransactions?: StoreTransaction[];
};

/**
 * Mock adapter (default). Holds its "sold" purchases in memory, as the
 * store would hold them on a device. Purchase outcomes are scripted
 * per call so tests can exercise success / failure / cancellation /
 * already-owned without touching any store.
 */
export class MockPurchaseAdapter implements PurchaseAdapter {
  readonly kind = "mock" as const;
  private readonly platform: EntitlementPlatform;
  private readonly now: () => Date;
  private sold: ProEntitlement | null;
  private script: MockPurchaseScript;

  constructor(
    opts: {
      platform?: EntitlementPlatform;
      now?: () => Date;
      initialEntitlement?: ProEntitlement | null;
      script?: MockPurchaseScript;
    } = {}
  ) {
    this.platform = opts.platform ?? "play";
    this.now = opts.now ?? (() => new Date());
    this.sold = opts.initialEntitlement ?? null;
    this.script = { ...(opts.script ?? {}) };
  }

  /** Test hook: script the next purchase outcome. */
  scriptNextPurchase(outcome: "success" | "failure" | "cancelled"): void {
    this.script.purchaseOutcome = outcome;
  }

  async isBillingSupported(): Promise<boolean> {
    return true;
  }

  async getProducts(): Promise<ProProductOffer[]> {
    return PRO_PRODUCTS.map((product) => ({
      product,
      priceString: product.priceLabelHypothesis,
      priceCents: product.priceCentsHypothesis,
      fromStore: false,
    }));
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    const product = proProductById(productId);
    if (!product) return { result: "failed", message: `Unknown product ${productId}` };
    if (this.sold && isProActive(this.sold, this.now()) && this.sold.productId === productId) {
      return { result: "already-owned", entitlement: this.sold };
    }
    const outcome = this.script.purchaseOutcome ?? "success";
    this.script.purchaseOutcome = undefined; // consumed once
    if (outcome === "cancelled") return { result: "cancelled" };
    if (outcome === "failure") return { result: "failed", message: "Mock purchase failed (scripted test failure)" };
    const now = this.now();
    const entitlement: ProEntitlement = {
      productId,
      platform: this.platform,
      state: "active",
      ...(product.kind === "lifetime"
        ? {}
        : { expiry: mockSubscriptionExpiry(productId, now) }),
      verifiedAt: now.toISOString(),
    };
    this.sold = entitlement;
    return { result: "success", entitlement };
  }

  async restore(): Promise<RestoreOutcome> {
    if (this.script.restoreTransactions !== undefined) {
      const entitlement = deriveEntitlement(this.script.restoreTransactions, this.platform, this.now());
      if (entitlement) this.sold = entitlement;
      return { found: entitlement !== null, entitlement };
    }
    return { found: this.sold !== null, entitlement: this.sold };
  }

  async refreshEntitlement(current: ProEntitlement | null): Promise<ProEntitlement | null> {
    // The mock has no external store to re-check: it returns what its
    // in-memory "store" remembers, and defers to the persisted cache
    // when it remembers nothing — it must NEVER clear the cache on the
    // basis of no information. This is NOT store verification — see
    // the header comment.
    return this.sold ?? current;
  }
}

// --- Real adapter (@capgo/native-purchases) --------------------------------

/** Map one plugin transaction to the adapter-neutral shape. */
export function mapNativeTransaction(tx: {
  productIdentifier: string;
  productType?: string;
  purchaseDate: string;
  expirationDate?: string;
  isActive?: boolean;
  willCancel?: boolean | null;
  subscriptionState?: string;
  revocationDate?: string;
}): StoreTransaction {
  return {
    productId: tx.productIdentifier,
    productType: tx.productType === "subs" ? "subs" : "inapp",
    purchaseDate: tx.purchaseDate,
    ...(tx.expirationDate ? { expiry: tx.expirationDate } : {}),
    ...(tx.isActive !== undefined ? { isActive: tx.isActive } : {}),
    ...(tx.willCancel !== undefined && tx.willCancel !== null ? { willCancel: tx.willCancel } : {}),
    ...(tx.subscriptionState &&
    ["subscribed", "expired", "revoked", "inGracePeriod", "inBillingRetryPeriod", "unknown"].includes(tx.subscriptionState)
      ? { subscriptionState: tx.subscriptionState as StoreTransaction["subscriptionState"] }
      : {}),
    ...(tx.revocationDate ? { revocationDate: tx.revocationDate } : {}),
  };
}

function isUserCancelledError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(message) || /userCancelled/i.test(message);
}

/**
 * Real adapter. Every method lazy-imports `@capgo/native-purchases`
 * so the web bundle never evaluates native plugin code. NOT TESTED
 * against a real store in M4 (no accounts, no products, no device) —
 * the mapping functions above are unit-tested; the native calls are
 * not.
 */
export class RealPurchaseAdapter implements PurchaseAdapter {
  readonly kind = "real" as const;
  private readonly platform: EntitlementPlatform;
  private readonly now: () => Date;

  constructor(opts: { platform?: EntitlementPlatform; now?: () => Date } = {}) {
    this.platform = opts.platform ?? platformOfCurrentDevice();
    this.now = opts.now ?? (() => new Date());
  }

  private async plugin() {
    const mod = await import("@capgo/native-purchases");
    return mod.NativePurchases;
  }

  async isBillingSupported(): Promise<boolean> {
    try {
      const { isBillingSupported } = await (await this.plugin()).isBillingSupported();
      return isBillingSupported;
    } catch {
      return false;
    }
  }

  async getProducts(): Promise<ProProductOffer[]> {
    const plugin = await this.plugin();
    const { PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const [subs, inapp] = await Promise.all([
      plugin.getProducts({ productIdentifiers: [...PRO_SUBSCRIPTION_IDS], productType: PURCHASE_TYPE.SUBS }),
      plugin.getProducts({ productIdentifiers: [PRO_LIFETIME_ID], productType: PURCHASE_TYPE.INAPP }),
    ]);
    const byId = new Map<string, { priceString: string; priceCents: number }>();
    for (const p of [...subs.products, ...inapp.products]) {
      byId.set(p.identifier, { priceString: p.priceString, priceCents: Math.round(p.price * 100) });
    }
    return PRO_PRODUCTS.map((product) => {
      const storePrice = byId.get(product.id);
      return {
        product,
        priceString: storePrice?.priceString ?? product.priceLabelHypothesis,
        priceCents: storePrice?.priceCents ?? product.priceCentsHypothesis,
        fromStore: storePrice !== undefined,
      };
    });
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    const product = proProductById(productId);
    if (!product) return { result: "failed", message: `Unknown product ${productId}` };
    try {
      const plugin = await this.plugin();
      const { PURCHASE_TYPE } = await import("@capgo/native-purchases");
      // Offer details first: Android subscriptions need the base-plan id
      // and offer token from getProducts; iOS ignores them.
      const { products } = await plugin.getProducts({
        productIdentifiers: [productId],
        productType: product.kind === "lifetime" ? PURCHASE_TYPE.INAPP : PURCHASE_TYPE.SUBS,
      });
      const offer = products.find((p) => p.identifier === productId) ?? products[0];
      const tx = await plugin.purchaseProduct({
        productIdentifier: productId,
        productType: product.kind === "lifetime" ? PURCHASE_TYPE.INAPP : PURCHASE_TYPE.SUBS,
        ...(offer?.planIdentifier ? { planIdentifier: offer.planIdentifier } : {}),
        ...(offer?.offerToken ? { offerToken: offer.offerToken } : {}),
      });
      const entitlement = deriveEntitlement([mapNativeTransaction(tx)], this.platform, this.now());
      if (!entitlement) return { result: "failed", message: "The store returned a purchase the app does not recognise." };
      return { result: "success", entitlement };
    } catch (err) {
      if (isUserCancelledError(err)) return { result: "cancelled" };
      return { result: "failed", message: err instanceof Error ? err.message : String(err) };
    }
  }

  async restore(): Promise<RestoreOutcome> {
    const plugin = await this.plugin();
    await plugin.restorePurchases();
    const { purchases } = await plugin.getPurchases({ onlyCurrentEntitlements: true });
    const entitlement = deriveEntitlement(purchases.map(mapNativeTransaction), this.platform, this.now());
    return { found: entitlement !== null, entitlement };
  }

  async refreshEntitlement(): Promise<ProEntitlement | null> {
    const plugin = await this.plugin();
    const { purchases } = await plugin.getPurchases();
    // The store is the authority: no transactions means no entitlement.
    // Callers persist this null over the cache only after this call
    // SUCCEEDS — a throw above leaves the cache untouched.
    return deriveEntitlement(purchases.map(mapNativeTransaction), this.platform, this.now());
  }
}

export function createPurchaseAdapter(
  kind: PurchaseAdapterKind = resolvePurchaseAdapterKind(),
  opts: { platform?: EntitlementPlatform; now?: () => Date } = {}
): PurchaseAdapter {
  return kind === "real" ? new RealPurchaseAdapter(opts) : new MockPurchaseAdapter(opts);
}
