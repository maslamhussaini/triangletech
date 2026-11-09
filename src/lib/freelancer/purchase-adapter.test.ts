/**
 * Freelancer Time & Invoice — purchase adapter tests (M4).
 *
 * *** THESE TESTS RUN AGAINST THE MOCK ADAPTER ONLY. *** A green
 * suite here proves the APP's purchase logic (state machine, restore
 * flow, error paths, adapter selection) — it is NOT store
 * verification. No test here touches Play Billing, StoreKit, or any
 * real money. Real store verification is BLOCKED (no accounts, no
 * registered products, no device).
 */
import { describe, expect, it } from "vitest";
import {
  createPurchaseAdapter,
  deriveEntitlement,
  mapNativeTransaction,
  MockPurchaseAdapter,
  resolvePurchaseAdapterKind,
  type StoreTransaction,
} from "./purchase-adapter";
import { PRO_PRODUCT_LIFETIME, PRO_PRODUCT_MONTHLY, PRO_PRODUCT_YEARLY } from "./products";

const NOW = new Date("2026-11-07T12:00:00.000Z");
const nowFn = () => new Date(NOW);

function tx(overrides: Partial<StoreTransaction> & { productId: string }): StoreTransaction {
  return { productType: "subs", purchaseDate: "2026-11-01T00:00:00.000Z", ...overrides };
}

describe("deriveEntitlement", () => {
  it("no transactions → null", () => {
    expect(deriveEntitlement([], "play", NOW)).toBeNull();
  });

  it("unknown product ids are ignored", () => {
    expect(deriveEntitlement([tx({ productId: "someone_elses_product" })], "play", NOW)).toBeNull();
  });

  it("an active subscription derives active with its expiry", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: true, expiry: "2026-12-07T00:00:00.000Z" })],
      "play",
      NOW
    );
    expect(ent).toMatchObject({ productId: PRO_PRODUCT_MONTHLY.id, platform: "play", state: "active", expiry: "2026-12-07T00:00:00.000Z" });
  });

  it("a lifetime purchase derives active with no expiry — and beats an expired subscription", () => {
    const ent = deriveEntitlement(
      [
        tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: false, expiry: "2026-11-01T00:00:00.000Z", subscriptionState: "expired" }),
        tx({ productId: PRO_PRODUCT_LIFETIME.id, productType: "inapp", purchaseDate: "2026-10-01T00:00:00.000Z" }),
      ],
      "appstore",
      NOW
    );
    expect(ent).toMatchObject({ productId: PRO_PRODUCT_LIFETIME.id, platform: "appstore", state: "active" });
    expect(ent?.expiry).toBeUndefined();
  });

  it("an expired subscription derives expired", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_YEARLY.id, isActive: false, expiry: "2026-11-01T00:00:00.000Z", subscriptionState: "expired" })],
      "play",
      NOW
    );
    expect(ent?.state).toBe("expired");
  });

  it("a revoked transaction derives refunded", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, revocationDate: "2026-11-05T00:00:00.000Z", subscriptionState: "revoked" })],
      "appstore",
      NOW
    );
    expect(ent?.state).toBe("refunded");
  });

  it("a revoked lifetime purchase derives refunded (not active, not null)", () => {
    const ent = deriveEntitlement(
      [
        tx({
          productId: PRO_PRODUCT_LIFETIME.id,
          productType: "inapp",
          purchaseDate: "2026-10-01T00:00:00.000Z",
          revocationDate: "2026-11-05T00:00:00.000Z",
        }),
      ],
      "appstore",
      NOW
    );
    expect(ent).toMatchObject({ productId: PRO_PRODUCT_LIFETIME.id, platform: "appstore", state: "refunded" });
  });

  it("a grace-period subscription derives grace (Pro stays active)", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: true, subscriptionState: "inGracePeriod", expiry: "2026-12-07T00:00:00.000Z" })],
      "play",
      NOW
    );
    expect(ent?.state).toBe("grace");
  });

  it("a subscription in billing retry derives grace (Pro stays active)", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: true, subscriptionState: "inBillingRetryPeriod", expiry: "2026-12-07T00:00:00.000Z" })],
      "play",
      NOW
    );
    expect(ent?.state).toBe("grace");
  });

  it("a cancelled-but-paid-up subscription stays active until expiry", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: true, willCancel: true, expiry: "2026-12-07T00:00:00.000Z" })],
      "play",
      NOW
    );
    expect(ent?.state).toBe("active");
  });

  it("an active subscription whose expiry passed without an isActive flag is expired", () => {
    const ent = deriveEntitlement(
      [tx({ productId: PRO_PRODUCT_MONTHLY.id, expiry: "2026-11-01T00:00:00.000Z" })],
      "play",
      NOW
    );
    expect(ent?.state).toBe("expired");
  });
});

describe("mapNativeTransaction", () => {
  it("maps a StoreKit 2 transaction to the neutral shape", () => {
    const mapped = mapNativeTransaction({
      productIdentifier: PRO_PRODUCT_MONTHLY.id,
      productType: "subs",
      purchaseDate: "2026-11-07T10:00:00Z",
      expirationDate: "2026-12-07T10:00:00Z",
      isActive: true,
      willCancel: false,
      subscriptionState: "subscribed",
    });
    expect(mapped).toEqual({
      productId: PRO_PRODUCT_MONTHLY.id,
      productType: "subs",
      purchaseDate: "2026-11-07T10:00:00Z",
      expiry: "2026-12-07T10:00:00Z",
      isActive: true,
      willCancel: false,
      subscriptionState: "subscribed",
    });
  });

  it("maps an Android purchase (purchaseState is not part of the neutral shape)", () => {
    const mapped = mapNativeTransaction({
      productIdentifier: PRO_PRODUCT_LIFETIME.id,
      productType: "inapp",
      purchaseDate: "2026-11-07T10:00:00Z",
    });
    expect(mapped.productType).toBe("inapp");
    expect(mapped.expiry).toBeUndefined();
  });
});

describe("resolvePurchaseAdapterKind", () => {
  it("defaults to mock when no flag is set", () => {
    expect(resolvePurchaseAdapterKind({})).toBe("mock");
  });

  it("stays mock on the web even when the flag says real (no native shell here)", () => {
    expect(resolvePurchaseAdapterKind({ NEXT_PUBLIC_FREELANCER_PURCHASE_ADAPTER: "real" })).toBe("mock");
  });

  it("createPurchaseAdapter builds the mock by default", () => {
    expect(createPurchaseAdapter("mock").kind).toBe("mock");
    expect(createPurchaseAdapter().kind).toBe("mock");
  });
});

describe("MockPurchaseAdapter", () => {
  it("lists the three test-configuration products with hypothesis prices, marked not-from-store", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    const products = await adapter.getProducts();
    expect(products.map((p) => p.product.id)).toEqual([PRO_PRODUCT_MONTHLY.id, PRO_PRODUCT_YEARLY.id, PRO_PRODUCT_LIFETIME.id]);
    expect(products.every((p) => p.fromStore === false)).toBe(true);
    expect(products[0]?.priceCents).toBe(499);
    expect(products[1]?.priceCents).toBe(3999);
    expect(products[2]?.priceCents).toBe(9999);
  });

  it("a successful monthly purchase activates Pro with a one-month expiry", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    const outcome = await adapter.purchase(PRO_PRODUCT_MONTHLY.id);
    expect(outcome.result).toBe("success");
    if (outcome.result !== "success") throw new Error("expected success");
    expect(outcome.entitlement.state).toBe("active");
    expect(outcome.entitlement.expiry).toBe("2026-12-07T12:00:00.000Z");
  });

  it("a successful yearly purchase activates Pro with a one-year expiry; lifetime has no expiry", async () => {
    const yearly = new MockPurchaseAdapter({ now: nowFn });
    const y = await yearly.purchase(PRO_PRODUCT_YEARLY.id);
    if (y.result !== "success") throw new Error("expected success");
    expect(y.entitlement.expiry).toBe("2027-11-07T12:00:00.000Z");

    const lifetime = new MockPurchaseAdapter({ now: nowFn });
    const l = await lifetime.purchase(PRO_PRODUCT_LIFETIME.id);
    if (l.result !== "success") throw new Error("expected success");
    expect(l.entitlement.expiry).toBeUndefined();
  });

  it("a scripted cancellation returns cancelled and activates nothing", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    adapter.scriptNextPurchase("cancelled");
    expect((await adapter.purchase(PRO_PRODUCT_MONTHLY.id)).result).toBe("cancelled");
    expect((await adapter.restore()).found).toBe(false);
    // The script is consumed once: the next purchase succeeds.
    expect((await adapter.purchase(PRO_PRODUCT_MONTHLY.id)).result).toBe("success");
  });

  it("a scripted failure returns failed with a message and activates nothing", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    adapter.scriptNextPurchase("failure");
    const outcome = await adapter.purchase(PRO_PRODUCT_MONTHLY.id);
    expect(outcome.result).toBe("failed");
    if (outcome.result === "failed") expect(outcome.message).toMatch(/Mock purchase failed/);
    expect((await adapter.restore()).found).toBe(false);
  });

  it("buying the product already owned returns already-owned", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    await adapter.purchase(PRO_PRODUCT_MONTHLY.id);
    const again = await adapter.purchase(PRO_PRODUCT_MONTHLY.id);
    expect(again.result).toBe("already-owned");
  });

  it("an unknown product id fails", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    expect((await adapter.purchase("no_such_product")).result).toBe("failed");
  });

  it("restore finds a previous mock purchase, and finds nothing on a fresh adapter", async () => {
    const fresh = new MockPurchaseAdapter({ now: nowFn });
    expect((await fresh.restore()).found).toBe(false);
    const buyer = new MockPurchaseAdapter({ now: nowFn });
    await buyer.purchase(PRO_PRODUCT_LIFETIME.id);
    const restored = await buyer.restore();
    expect(restored.found).toBe(true);
    expect(restored.entitlement?.productId).toBe(PRO_PRODUCT_LIFETIME.id);
  });

  it("restore derives the entitlement from scripted transactions (e.g. an expired subscription)", async () => {
    const adapter = new MockPurchaseAdapter({
      now: nowFn,
      script: {
        restoreTransactions: [tx({ productId: PRO_PRODUCT_MONTHLY.id, isActive: false, expiry: "2026-11-01T00:00:00.000Z", subscriptionState: "expired" })],
      },
    });
    const restored = await adapter.restore();
    expect(restored.found).toBe(true);
    expect(restored.entitlement?.state).toBe("expired");
  });

  it("refreshEntitlement returns what the mock store remembers (null when nothing sold)", async () => {
    const adapter = new MockPurchaseAdapter({ now: nowFn });
    expect(await adapter.refreshEntitlement(null)).toBeNull();
    await adapter.purchase(PRO_PRODUCT_MONTHLY.id);
    const refreshed = await adapter.refreshEntitlement(null);
    expect(refreshed?.state).toBe("active");
  });

  it("isBillingSupported is true for the mock", async () => {
    expect(await new MockPurchaseAdapter().isBillingSupported()).toBe(true);
  });
});
