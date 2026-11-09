"use client";

import { useEffect, useState } from "react";
import { useFreelancerData } from "../data-context";
import { FREE_LIMITS_HYPOTHESIS, isProActive } from "@/lib/freelancer/entitlements";
import { proProductById, type ProProduct } from "@/lib/freelancer/products";
import type { ProProductOffer } from "@/lib/freelancer/purchase-adapter";
import {
  alertBox,
  card,
  errorText,
  h1,
  h2,
  h3,
  mutedText,
  pageWrap,
  primaryButton,
  secondaryButton,
} from "../styles";

/**
 * Pro screen (M4): the three Pro products, benefits, restore button,
 * and the purchase flow — all wired through the purchase adapter.
 *
 * TEST CONFIGURATION: prices shown here are the research hypotheses
 * (plan §9) — unvalidated, NOT decided prices — and the adapter is
 * the MOCK by default, so a "purchase" here simulates a purchase:
 * no real money moves, no store is contacted. The screen always says
 * which adapter is active. Real purchases are BLOCKED until the owner
 * creates the products in Play Console / App Store Connect (no store
 * accounts exist yet).
 */
export default function ProClient() {
  const { store, doc, pro, isPro, purchaseAdapter, refresh, refreshPro } = useFreelancerData();
  const [offers, setOffers] = useState<ProProductOffer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!purchaseAdapter) return;
    purchaseAdapter
      .getProducts()
      .then((list) => {
        if (!cancelled) setOffers(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [purchaseAdapter]);

  if (!doc || !store) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Pro</h1>
        <p>Loading your data…</p>
      </main>
    );
  }

  const product = pro ? proProductById(pro.productId) : undefined;

  async function handleBuy(offerProduct: ProProduct) {
    if (!purchaseAdapter || !store) return;
    setBusy(offerProduct.id);
    setMessage(null);
    setError(null);
    try {
      const outcome = await purchaseAdapter.purchase(offerProduct.id);
      if (outcome.result === "success") {
        await store.setEntitlement(outcome.entitlement);
        await refresh();
        setMessage(`Pro is active — ${offerProduct.title}. Thank you!`);
      } else if (outcome.result === "already-owned") {
        await store.setEntitlement(outcome.entitlement);
        await refresh();
        setMessage("You already own this — Pro is active.");
      } else if (outcome.result === "cancelled") {
        setMessage("Purchase cancelled — nothing was charged.");
      } else {
        setError(`Purchase failed: ${outcome.message}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (!purchaseAdapter || !store) return;
    setBusy("restore");
    setMessage(null);
    setError(null);
    try {
      const restored = await purchaseAdapter.restore();
      if (restored.found && restored.entitlement) {
        await store.setEntitlement(restored.entitlement);
        await refresh();
        setMessage("Your previous purchase was restored — Pro is active.");
      } else {
        setMessage("No previous purchases were found for this store account.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleManage() {
    // Re-verify against the store (launch check on demand).
    await refreshPro();
    await refresh();
    setMessage("Entitlement re-checked against the store.");
  }

  return (
    <main style={pageWrap}>
      <h1 style={h1}>Freelancer Pro</h1>
      <p style={mutedText}>
        Unlimited invoices, unlimited clients, unlimited templates, full invoice history — and no ads.
      </p>

      {isPro && pro ? (
        <section style={card} aria-label="Current Pro status">
          <h2 style={h2}>Pro is active</h2>
          <p style={{ margin: "4px 0" }}>
            {product?.title ?? pro.productId}
            {pro.expiry ? ` — active until ${pro.expiry.slice(0, 10)}` : " — lifetime, current major version"}
            {pro.state === "cancelled" ? " (auto-renew off — Pro stays active until the paid period ends)" : ""}
            {pro.state === "grace" ? " (payment retry — Pro stays active during the grace period)" : ""}
          </p>
          <p style={mutedText}>Verified against the store {pro.verifiedAt ? `on ${pro.verifiedAt.slice(0, 10)}` : "at purchase"}.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" style={secondaryButton} onClick={handleManage} disabled={busy !== null}>
              Re-check entitlement
            </button>
          </div>
        </section>
      ) : (
        <section style={card} aria-label="Current plan">
          <h2 style={h2}>Free plan</h2>
          <p style={{ margin: "4px 0" }}>
            {FREE_LIMITS_HYPOTHESIS.maxInvoicesPerMonth} invoices per month · {FREE_LIMITS_HYPOTHESIS.maxClients} clients ·{" "}
            {FREE_LIMITS_HYPOTHESIS.maxTemplates} template · ads on list screens.
          </p>
        </section>
      )}

      {message && (
        <p role="status" style={alertBox}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={errorText}>
          {error}
        </p>
      )}

      <section style={card} aria-label="Pro products">
        <h2 style={h2}>Choose Pro</h2>
        <p style={mutedText}>
          Prices below are test configuration — unvalidated research hypotheses, not final prices. No real money moves in
          this build: purchases are simulated by the {purchaseAdapter?.kind ?? "mock"} adapter
          {purchaseAdapter?.kind === "real" ? " against the store." : " (no store account exists yet)."}
        </p>
        {!offers ? (
          <p style={mutedText}>Loading products…</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {offers.map(({ product, priceString, fromStore }) => (
              <li key={product.id} style={{ ...card, margin: "8px 0" }}>
                <h3 style={h3}>{product.title}</h3>
                <p style={{ margin: "4px 0" }}>{product.blurb}</p>
                <p style={{ margin: "4px 0", fontWeight: 700 }}>
                  {priceString}
                  {fromStore ? "" : " (test price)"}
                </p>
                <button
                  type="button"
                  style={primaryButton}
                  disabled={busy !== null || (isPro && isProActive(pro) && pro?.productId === product.id)}
                  onClick={() => void handleBuy(product)}
                >
                  {busy === product.id ? "Processing…" : isPro && pro?.productId === product.id ? "Current plan" : `Get ${product.title}`}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={secondaryButton} onClick={() => void handleRestore()} disabled={busy !== null}>
            {busy === "restore" ? "Restoring…" : "Restore purchases"}
          </button>
        </div>
        <p style={mutedText}>
          Restore re-checks the store account on this device for a previous Pro purchase (required by Apple, available on
          both stores). Subscriptions are managed in the store app — cancel anytime; Pro stays active until the paid
          period ends.
        </p>
      </section>
    </main>
  );
}
