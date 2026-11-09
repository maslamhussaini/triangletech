/**
 * Freelancer Time & Invoice — Pro product catalog (M4).
 *
 * LOCAL TEST CONFIGURATION ONLY. The three products below are the
 * research HYPOTHESES from plan §9 (unvalidated, NOT decided prices):
 * monthly $4.99, yearly $39.99, one-time $99.99 (perpetual licence for
 * the current major version only). NO products exist in any store
 * console — there is no Google Play Console account and no Apple
 * Developer Program account — so these identifiers have never been
 * registered with a store and no real purchase can be made against
 * them. The mock purchase adapter (see purchase-adapter.ts) serves
 * these products from this file; the real adapter looks them up in the
 * store by the same identifiers and will find nothing until the owner
 * creates them in Play Console / App Store Connect.
 *
 * Product identifiers are stable across both stores: the same id is
 * used as the Google Play product id and the App Store product id, so
 * the owner creates one product per id in each console.
 */
export type ProProductKind = "monthly" | "yearly" | "lifetime";

export type ProProduct = {
  /** Store product identifier (same id on Play and App Store). */
  id: string;
  kind: ProProductKind;
  /** Display title on the Pro screen. */
  title: string;
  /** One-line description of the billing. */
  blurb: string;
  /** Hypothesis price in whole cents — TEST CONFIGURATION, not a decided price. */
  priceCentsHypothesis: number;
  /** Hypothesis price as displayed (USD). */
  priceLabelHypothesis: string;
};

export const PRO_PRODUCT_MONTHLY: ProProduct = {
  id: "freelancer_pro_monthly",
  kind: "monthly",
  title: "Pro Monthly",
  blurb: "Billed every month. Cancel anytime; Pro stays active until the paid period ends.",
  priceCentsHypothesis: 499,
  priceLabelHypothesis: "$4.99 / month",
};

export const PRO_PRODUCT_YEARLY: ProProduct = {
  id: "freelancer_pro_yearly",
  kind: "yearly",
  title: "Pro Yearly",
  blurb: "Billed once a year — about $3.33 a month. Cancel anytime; Pro stays active until the paid period ends.",
  priceCentsHypothesis: 3999,
  priceLabelHypothesis: "$39.99 / year",
};

export const PRO_PRODUCT_LIFETIME: ProProduct = {
  id: "freelancer_pro_lifetime",
  kind: "lifetime",
  title: "Pro Lifetime",
  blurb: "One payment, Pro for the current major version. A future major version is a separate purchase.",
  priceCentsHypothesis: 9999,
  priceLabelHypothesis: "$99.99 one-time",
};

export const PRO_PRODUCTS: readonly ProProduct[] = [PRO_PRODUCT_MONTHLY, PRO_PRODUCT_YEARLY, PRO_PRODUCT_LIFETIME] as const;

export const PRO_PRODUCT_IDS: readonly string[] = PRO_PRODUCTS.map((p) => p.id);

/** Subscription product ids (Play Billing type "subs" / StoreKit auto-renewable). */
export const PRO_SUBSCRIPTION_IDS: readonly string[] = [PRO_PRODUCT_MONTHLY.id, PRO_PRODUCT_YEARLY.id] as const;

/** One-time product id (Play Billing type "inapp" / StoreKit non-consumable). */
export const PRO_LIFETIME_ID: string = PRO_PRODUCT_LIFETIME.id;

export function proProductById(id: string): ProProduct | undefined {
  return PRO_PRODUCTS.find((p) => p.id === id);
}
