"use client";

import { useState, useMemo, useCallback } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from "next/link";
import { calculateProfit, calculatePrice, type ProfitModeInputs, type PriceModeInputs, type Currency, type ProfitModeResult, type PriceModeResult, DEFAULT_PROFIT_INPUTS, DEFAULT_PRICE_INPUTS } from "@/lib/tools/cost-profit";

type Mode = "profit" | "price";

const CURRENCIES: Currency[] = ["USD", "AED", "PKR", "GBP", "EUR"];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  AED: "د.إ",
  PKR: "₨",
  GBP: "£",
  EUR: "€",
};

function formatCurrency(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  const fixed = Math.abs(value).toFixed(2);
  const formatted = Number(fixed).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function NumberInput({ label, value, onChange, currency, required, helper }: { label: string; value: number; onChange: (v: string) => void; currency: Currency; required?: boolean; helper?: string }) {
  return (
    <div className="field">
      <label className="label-premium">
        {label} {required && <span className="required-mark">*</span>}
      </label>
      {helper && <p className="helper-premium">{helper}</p>}
      <div className="input-affix">
        <span className="affix-prefix">{CURRENCY_SYMBOLS[currency]}</span>
        <input
          type="number"
          className="input-premium"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          inputMode="decimal"
        />
      </div>
    </div>
  );
}

function ProfitPulse({ netMargin }: { netMargin: number }) {
  const { position, label } = useMemo(() => {
    if (netMargin < 0) return { position: 0, label: "Loss" };
    if (netMargin === 0) return { position: 25, label: "Break-even" };
    if (netMargin <= 10) return { position: 45, label: "Near break-even" };
    if (netMargin <= 25) return { position: 65, label: "Positive" };
    return { position: 85, label: "Strong" };
  }, [netMargin]);

  return (
    <div className="metric-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="metric-label">Profit Pulse</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div style={{ position: "relative", height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${100 - position}%`,
            height: "100%",
            background: netMargin < 0 ? "var(--danger)" : "var(--brand)",
            borderRadius: 99,
            transition: "width 0.4s ease, background 0.3s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -4,
            left: `calc(${100 - position}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            border: `2px solid ${netMargin < 0 ? "var(--danger)" : "var(--brand)"}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            transition: "left 0.4s ease, border-color 0.3s ease",
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
        Visual guide based on the margin calculated from your inputs. Suitable margins vary by industry and business model.
      </p>
    </div>
  );
}

export default function CalculatorClient() {
  const [mode, setMode] = useState<Mode>("profit");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [copied, setCopied] = useState(false);

  const [profitInputs, setProfitInputs] = useState<ProfitModeInputs>(DEFAULT_PROFIT_INPUTS);
  const [priceInputs, setPriceInputs] = useState<PriceModeInputs>(DEFAULT_PRICE_INPUTS);

  const [quantity, setQuantity] = useState<number>(1);
  const [whatIfPrice, setWhatIfPrice] = useState<string>("");

  const profitResult = useMemo<ProfitModeResult>(() => calculateProfit(profitInputs), [profitInputs]);
  const priceResult = useMemo<PriceModeResult>(() => calculatePrice(priceInputs), [priceInputs]);

  const updateProfit = useCallback((field: keyof Omit<ProfitModeInputs, "mode" | "currency">, value: string) => {
    const num = value === "" ? 0 : Math.max(0, Number(value));
    setProfitInputs(prev => ({ ...prev, [field]: Number.isFinite(num) ? num : 0 }));
  }, []);

  const updatePrice = useCallback((field: keyof Omit<PriceModeInputs, "mode" | "currency">, value: string) => {
    const num = value === "" ? 0 : Math.max(0, Number(value));
    setPriceInputs(prev => ({ ...prev, [field]: Number.isFinite(num) ? num : 0 }));
  }, []);

  const loadExample = useCallback(() => {
    setProfitInputs(DEFAULT_PROFIT_INPUTS);
    setPriceInputs(DEFAULT_PRICE_INPUTS);
    setQuantity(1);
    setWhatIfPrice("");
  }, []);

  const resetAll = useCallback(() => {
    setProfitInputs({
      ...DEFAULT_PROFIT_INPUTS,
      sellingPrice: 0,
      productCost: 0,
      freight: 0,
      duty: 0,
      packaging: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      advertising: 0,
      affiliateCommission: 0,
      otherExpense: 0,
    });
    setPriceInputs({
      ...DEFAULT_PRICE_INPUTS,
      productCost: 0,
      freight: 0,
      duty: 0,
      packaging: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      advertising: 0,
      affiliateCommission: 0,
      otherExpense: 0,
      desiredNetMargin: 0,
    });
    setQuantity(1);
    setWhatIfPrice("");
  }, []);

  const copySummary = useCallback(async () => {
    let text = "";
    if (mode === "profit") {
      text = `Product Cost & Profit Summary
Selling Price: ${formatCurrency(profitInputs.sellingPrice, currency)}
Landed Cost: ${formatCurrency(profitResult.landedCost, currency)}
Selling Expenses: ${formatCurrency(profitResult.sellingExpenses, currency)}
Net Profit: ${formatCurrency(profitResult.netProfit, currency)}
Net Margin: ${profitResult.netMargin.toFixed(2)}%
ROI: ${profitResult.roi.toFixed(2)}%`;
    } else {
      text = `Product Cost & Profit Summary
Required Selling Price: ${formatCurrency(priceResult.requiredSellingPrice, currency)}
Total Cost: ${formatCurrency(priceResult.totalCost, currency)}
Desired Net Margin: ${priceResult.desiredNetMargin.toFixed(2)}%
Expected Net Profit: ${formatCurrency(priceResult.expectedNetProfit, currency)}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op
    }
  }, [mode, profitInputs, profitResult, priceResult, currency]);

  const netMargin = mode === "profit" ? profitResult.netMargin : priceResult.desiredNetMargin;

  const whatIfNumeric = useMemo(() => {
    const parsed = Number(whatIfPrice);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }, [whatIfPrice]);

  const whatIfResult = useMemo<ProfitModeResult | null>(() => {
    if (mode !== "profit" || whatIfNumeric === null) return null;
    return calculateProfit({ ...profitInputs, sellingPrice: whatIfNumeric });
  }, [mode, whatIfNumeric, profitInputs]);

  const projectedNetProfit = useMemo(() => {
    if (mode === "profit") {
      return profitResult.netProfit * quantity;
    }
    return priceResult.expectedNetProfit * quantity;
  }, [mode, profitResult, priceResult, quantity]);

  const costBreakdownItems = useMemo(() => {
    if (mode !== "profit") return [];
    return [
      { label: "Product Cost", value: profitInputs.productCost },
      { label: "Freight", value: profitInputs.freight },
      { label: "Duty", value: profitInputs.duty },
      { label: "Packaging", value: profitInputs.packaging },
      { label: "Marketplace Fee", value: profitInputs.marketplaceFee },
      { label: "Payment Fee", value: profitInputs.paymentFee },
      { label: "Advertising", value: profitInputs.advertising },
      { label: "Affiliate Commission", value: profitInputs.affiliateCommission },
      { label: "Other Expense", value: profitInputs.otherExpense },
    ];
  }, [mode, profitInputs]);

  const totalBreakdown = costBreakdownItems.reduce((sum, item) => sum + item.value, 0);
  const maxBreakdown = Math.max(totalBreakdown, 1);

  return (
    <>
      <ScrollReveal />
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL</span>
          <h1>Product Cost &amp; Profit Calculator</h1>
          <p>Calculate gross profit, net profit, margin and ROI for any product. Distinguish true product cost from selling expenses so you know exactly where your money goes.</p>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="container">
          <div className="finder-grid">
            <div>
              <div className="finder-panel" style={{ marginBottom: 24 }}>
                <div className="finder-progress"><span style={{ width: "50%" }} /></div>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setMode("profit")}
                    className={classNames("showcase-tab", mode === "profit" && "is-active")}
                    style={{ flex: 1 }}
                  >
                    Calculate Profit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("price")}
                    className={classNames("showcase-tab", mode === "price" && "is-active")}
                    style={{ flex: 1 }}
                  >
                    Find Selling Price
                  </button>
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="label-premium">Currency</label>
                    <select
                      className="select-premium"
                      value={currency}
                      onChange={e => setCurrency(e.target.value as Currency)}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {mode === "profit" ? (
                  <>
                    <div className="form-grid">
                      <NumberInput label="Selling Price" value={profitInputs.sellingPrice} onChange={v => updateProfit("sellingPrice", v)} currency={currency} required helper="The price you charge the customer." />
                      <NumberInput label="Product Cost" value={profitInputs.productCost} onChange={v => updateProfit("productCost", v)} currency={currency} required helper="Manufacturing or purchase price." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Freight / Shipping In" value={profitInputs.freight} onChange={v => updateProfit("freight", v)} currency={currency} helper="Cost to bring stock to you." />
                      <NumberInput label="Customs / Duty" value={profitInputs.duty} onChange={v => updateProfit("duty", v)} currency={currency} helper="Import taxes and duties." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Packaging" value={profitInputs.packaging} onChange={v => updateProfit("packaging", v)} currency={currency} helper="Labels, boxes, protective materials." />
                      <NumberInput label="Marketplace Fee" value={profitInputs.marketplaceFee} onChange={v => updateProfit("marketplaceFee", v)} currency={currency} helper="Commission or listing fee per sale." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Payment Gateway Fee" value={profitInputs.paymentFee} onChange={v => updateProfit("paymentFee", v)} currency={currency} helper="Processing fee per transaction." />
                      <NumberInput label="Advertising Cost" value={profitInputs.advertising} onChange={v => updateProfit("advertising", v)} currency={currency} helper="Average ad spend per sale." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Affiliate Commission" value={profitInputs.affiliateCommission} onChange={v => updateProfit("affiliateCommission", v)} currency={currency} helper="Commission paid per sale." />
                      <NumberInput label="Other Expense" value={profitInputs.otherExpense} onChange={v => updateProfit("otherExpense", v)} currency={currency} helper="Any other per-unit cost." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      <NumberInput label="Product Cost" value={priceInputs.productCost} onChange={v => updatePrice("productCost", v)} currency={currency} required helper="Manufacturing or purchase price." />
                      <NumberInput label="Freight / Shipping In" value={priceInputs.freight} onChange={v => updatePrice("freight", v)} currency={currency} helper="Cost to bring stock to you." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Customs / Duty" value={priceInputs.duty} onChange={v => updatePrice("duty", v)} currency={currency} helper="Import taxes and duties." />
                      <NumberInput label="Packaging" value={priceInputs.packaging} onChange={v => updatePrice("packaging", v)} currency={currency} helper="Labels, boxes, protective materials." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Marketplace Fee" value={priceInputs.marketplaceFee} onChange={v => updatePrice("marketplaceFee", v)} currency={currency} helper="Fixed fee per sale." />
                      <NumberInput label="Payment Gateway Fee" value={priceInputs.paymentFee} onChange={v => updatePrice("paymentFee", v)} currency={currency} helper="Fixed processing fee per sale." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Advertising Cost" value={priceInputs.advertising} onChange={v => updatePrice("advertising", v)} currency={currency} helper="Average ad spend per sale." />
                      <NumberInput label="Affiliate Commission" value={priceInputs.affiliateCommission} onChange={v => updatePrice("affiliateCommission", v)} currency={currency} helper="Fixed commission per sale." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumberInput label="Other Expense" value={priceInputs.otherExpense} onChange={v => updatePrice("otherExpense", v)} currency={currency} helper="Any other fixed per-unit cost." />
                      <div className="field">
                        <label className="label-premium">Desired Net Margin % <span className="required-mark">*</span></label>
                        <div className="input-affix">
                          <span className="affix-prefix" style={{ fontSize: 14, fontWeight: 600 }}>%</span>
                          <input
                            type="number"
                            className="input-premium"
                            placeholder="0"
                            min="0"
                            max="99"
                            step="0.1"
                            value={priceInputs.desiredNetMargin || ""}
                            onChange={e => updatePrice("desiredNetMargin", e.target.value)}
                            inputMode="decimal"
                          />
                        </div>
                        <p className="helper-premium">Target net profit as a percentage of selling price. Must be below 100%.</p>
                      </div>
                    </div>
                    {priceResult.validationError && (
                      <div className="error-premium" style={{ marginTop: 12 }}>{priceResult.validationError}</div>
                    )}
                  </>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <button type="button" onClick={loadExample} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>Load Example</button>
                  <button type="button" onClick={resetAll} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>Reset</button>
                </div>
              </div>

              {mode === "profit" && (
                <div className="finder-panel" style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 16 }}>What-if Selling Price</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label className="label-premium">Hypothetical Selling Price</label>
                      <div className="input-affix">
                        <span className="affix-prefix">{CURRENCY_SYMBOLS[currency]}</span>
                        <input
                          type="number"
                          className="input-premium"
                          placeholder={String(profitInputs.sellingPrice || 0)}
                          min="0"
                          step="0.01"
                          value={whatIfPrice}
                          onChange={e => setWhatIfPrice(e.target.value)}
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                  </div>
                  {whatIfResult && (
                    <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>New Net Profit</span><div style={{ fontSize: 18, fontWeight: 700, color: whatIfResult.netProfit < 0 ? "var(--danger)" : "var(--brand-strong)" }}>{formatCurrency(whatIfResult.netProfit, currency)}</div></div>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>New Net Margin</span><div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand-strong)" }}>{whatIfResult.netMargin.toFixed(2)}%</div></div>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>New Gross Profit</span><div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand-strong)" }}>{formatCurrency(whatIfResult.grossProfit, currency)}</div></div>
                    </div>
                  )}
                </div>
              )}

              <div className="finder-panel" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Quantity Projection</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {[1, 10, 50, 100, 500].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className={classNames("showcase-tab", quantity === q && "is-active")}
                      style={{ padding: "9px 14px", fontSize: 12 }}
                    >
                      {q}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="input-premium"
                    style={{ width: 100, padding: "9px 12px", fontSize: 13 }}
                    placeholder="Custom"
                    min="1"
                    value={quantity === 1 || quantity === 10 || quantity === 50 || quantity === 100 || quantity === 500 ? "" : quantity}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === "") { setQuantity(1); return; }
                      const n = Math.max(1, Number(v));
                      setQuantity(Number.isFinite(n) ? n : 1);
                    }}
                    inputMode="numeric"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                  <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Revenue</span><div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-strong)" }}>{formatCurrency((mode === "profit" ? profitInputs.sellingPrice : priceResult.requiredSellingPrice) * quantity, currency)}</div></div>
                  <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Landed Cost</span><div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-strong)" }}>{formatCurrency((mode === "profit" ? profitResult.landedCost : priceResult.totalCost - (priceResult.expectedNetProfit > 0 ? priceResult.expectedNetProfit : 0)) * quantity, currency)}</div></div>
                  <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Projected Net Profit</span><div style={{ fontSize: 16, fontWeight: 700, color: projectedNetProfit < 0 ? "var(--danger)" : "var(--brand-strong)" }}>{formatCurrency(projectedNetProfit, currency)}</div></div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>Linear projection based on current per-unit assumptions. This is not a sales forecast.</p>
              </div>
            </div>

            <div>
              <div className="glass-panel on-dark" style={{ padding: 28, marginBottom: 24 }}>
                <span className="eyebrow" style={{ color: "#A79BFF", marginBottom: 8 }}>YOUR PRODUCT PROFITABILITY</span>
                <div style={{ fontSize: 14, color: "#C9CCF5", marginBottom: 4 }}>Net Profit per Unit</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", fontFamily: "var(--font-sora)", letterSpacing: "-.02em", lineHeight: 1.1 }}>
                  {formatCurrency(mode === "profit" ? profitResult.netProfit : priceResult.expectedNetProfit, currency)}
                </div>
                <p style={{ fontSize: 13, color: "#A7ADD9", marginTop: 10 }}>
                  You keep {formatCurrency(mode === "profit" ? profitResult.netProfit : priceResult.expectedNetProfit, currency)} from every {formatCurrency(mode === "profit" ? profitInputs.sellingPrice : priceResult.requiredSellingPrice, currency)} sale based on the costs entered.
                </p>
              </div>

              <div className="glass-panel on-dark" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16, color: "#fff" }}>Result Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}><span style={{ color: "#C9CCF5", fontSize: 13 }}>Selling Price</span><span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(mode === "profit" ? profitInputs.sellingPrice : priceResult.requiredSellingPrice, currency)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}><span style={{ color: "#C9CCF5", fontSize: 13 }}>Landed Cost</span><span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(mode === "profit" ? profitResult.landedCost : priceResult.totalCost - (mode === "price" ? priceResult.expectedNetProfit : profitResult.sellingExpenses), currency)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}><span style={{ color: "#C9CCF5", fontSize: 13 }}>Selling Expenses</span><span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(mode === "profit" ? profitResult.sellingExpenses : 0, currency)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}><span style={{ color: "#C9CCF5", fontSize: 13, fontWeight: 600 }}>Total Cost &amp; Expenses</span><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{formatCurrency(mode === "profit" ? profitResult.totalCostAndExpenses : priceResult.totalCost, currency)}</span></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="metric-card"><span className="metric-label">Gross Profit</span><span className="metric-value" style={{ color: "var(--brand-strong)" }}>{formatCurrency(mode === "profit" ? profitResult.grossProfit : priceResult.expectedGrossProfit, currency)}</span></div>
                <div className="metric-card"><span className="metric-label">Gross Margin</span><span className="metric-value">{(mode === "profit" ? profitResult.grossMargin : priceResult.expectedGrossProfit > 0 && priceResult.requiredSellingPrice > 0 ? (priceResult.expectedGrossProfit / priceResult.requiredSellingPrice) * 100 : 0).toFixed(2)}%</span></div>
                <div className="metric-card is-brand"><span className="metric-label">Net Profit</span><span className="metric-value" style={{ color: (mode === "profit" ? profitResult.netProfit : priceResult.expectedNetProfit) < 0 ? "var(--danger)" : "var(--brand-strong)" }}>{formatCurrency(mode === "profit" ? profitResult.netProfit : priceResult.expectedNetProfit, currency)}</span></div>
                <div className="metric-card"><span className="metric-label">Net Margin</span><span className="metric-value">{netMargin.toFixed(2)}%</span></div>
                <div className="metric-card" style={{ gridColumn: "span 2" }}><span className="metric-label">ROI</span><span className="metric-value" style={{ color: "var(--brand-strong)" }}>{(mode === "profit" ? profitResult.roi : priceResult.expectedROI).toFixed(2)}%</span></div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={copySummary} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>
                  {copied ? "Copied" : "Copy Summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {mode === "profit" && (
        <section className="section trust-section" data-reveal>
          <div className="container">
            <div className="section-heading"><div><span className="eyebrow">COST BREAKDOWN</span><h2>Where your money goes.</h2><p className="section-lead">Landed cost is what you spend to get the product. Selling expenses are what you spend to sell it. Both matter.</p></div></div>
            <div className="glass-panel on-dark" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {costBreakdownItems.map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--brand)", flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#C9CCF5" }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", minWidth: 80, textAlign: "right" }}>{formatCurrency(item.value, currency)}</div>
                    <div style={{ width: 120, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${(item.value / maxBreakdown) * 100}%`, height: "100%", background: "var(--brand)", borderRadius: 99, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(124,92,255,0.22)", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                <div><span style={{ fontSize: 11, color: "#A7ADD9" }}>Landed Cost</span><div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 4 }}>{formatCurrency(profitResult.landedCost, currency)}</div></div>
                <div><span style={{ fontSize: 11, color: "#A7ADD9" }}>Selling Expenses</span><div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 4 }}>{formatCurrency(profitResult.sellingExpenses, currency)}</div></div>
                <div><span style={{ fontSize: 11, color: "#A7ADD9" }}>Total Cost &amp; Expenses</span><div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 4 }}>{formatCurrency(profitResult.totalCostAndExpenses, currency)}</div></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
              <ProfitPulse netMargin={profitResult.netMargin} />
              <div className="metric-card" style={{ padding: "18px 20px" }}>
                <span className="metric-label">Quick Insight</span>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
                  {profitResult.netProfit < 0
                    ? `At this price you lose ${formatCurrency(Math.abs(profitResult.netProfit), currency)} per unit. Reduce costs or increase the selling price.`
                    : profitResult.netMargin >= 30
                      ? `Strong margin. Consider reinvesting ${formatCurrency(profitResult.netProfit * 0.2, currency)} per unit back into growth.`
                      : `Moderate margin. Small improvements to landed cost or selling expenses can have a meaningful impact.`}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section" data-reveal>
        <div className="container">
          <div className="finder-grid">
            <div>
              <span className="eyebrow">HOW TO USE THIS CALCULATOR</span>
              <h2 style={{ fontSize: 28, marginBottom: 16 }}>Understanding product profitability.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div><h3 style={{ fontSize: 17, marginBottom: 8 }}>What is product cost?</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>Product cost is the amount you pay to acquire or manufacture a single unit. It is the starting point for every profitability calculation.</p></div>
                <div><h3 style={{ fontSize: 17, marginBottom: 8 }}>What is landed cost?</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>Landed cost is the product cost plus freight, duties and packaging. It is the true cost of getting the product into your hands.</p></div>
                <div><h3 style={{ fontSize: 17, marginBottom: 8 }}>Gross profit vs net profit</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>Gross profit is selling price minus landed cost. Net profit subtracts all selling expenses too — marketplace fees, payment fees, advertising and more.</p></div>
                <div><h3 style={{ fontSize: 17, marginBottom: 8 }}>How to calculate profit margin</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>Net margin is net profit divided by selling price, multiplied by 100. A 22% net margin means you keep $0.22 from every $1.00 of revenue.</p></div>
                <div><h3 style={{ fontSize: 17, marginBottom: 8 }}>How to calculate ROI on a product</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>ROI is net profit divided by landed cost, multiplied by 100. It tells you how efficiently your product investment is working.</p></div>
              </div>
            </div>
            <div>
              <span className="eyebrow">COMMON QUESTIONS</span>
              <h2 style={{ fontSize: 28, marginBottom: 16 }}>Frequently asked questions.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>What is the difference between gross profit and net profit? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Gross profit is revenue minus landed cost. Net profit subtracts all selling expenses too. Net profit is the amount you actually keep.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>What is landed cost? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Landed cost is product cost plus freight, customs/duty and packaging. It represents the true cost of getting the product ready to sell.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>How do I calculate profit margin? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Net margin = (Net Profit / Selling Price) × 100. Use the calculator above to see this automatically for any scenario.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>How do I calculate ROI? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>ROI = (Net Profit / Landed Cost) × 100. It measures how much profit you generate relative to the cost of the product itself.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>Does this calculator include marketplace fees? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Yes. Marketplace fees, payment gateway fees, advertising, affiliate commissions and other expenses are all included as selling expenses.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>Can I use AED, PKR, GBP or EUR? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Yes. Select your currency from the dropdown. Currency selection is display-only and does not convert values.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>Does changing currency convert the values? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>No. Currency is display-only. The numbers you enter are treated as amounts in the selected currency with no conversion.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>How do I calculate the selling price for a target margin? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Switch to Find Selling Price mode, enter your costs and desired net margin. The calculator will show the required selling price.</p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section finder-section" data-reveal>
        <div className="container">
          <div className="tools-next">
            <div className="tools-next-inner">
              <div>
                <h2 id="tools-next-heading" className="tools-next-title">Managing profitability across hundreds of products?</h2>
                <p style={{ marginTop: 8, maxWidth: "62ch", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>OrderMate tracks products, purchases, sales, inventory and profitability in one business system.</p>
              </div>
              <div className="tools-next-actions">
                <Link className="button-indigo-secondary" href="/products/ordermate">Explore OrderMate</Link>
                <Link className="button-indigo-secondary" href="/contact">Talk to us</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div aria-hidden="true" style={{ height: 80 }} />
    </>
  );
}
