"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  calculate,
  type CalculationInput,
  type CalculationResult,
  type ProductTaxRecord,
  type PriceBasis,
  type RegistrationStatus,
  type BuyerType,
  type BusinessType,
  ALL_PRODUCTS,
  getProductById,
  DEFAULT_CALCULATION_INPUT,
} from "@/lib/tools/pakistan-sales-tax";

function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function formatCurrency(value: number): string {
  const fixed = Math.abs(value).toFixed(2);
  const formatted = Number(fixed).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-PKR ${formatted}` : `PKR ${formatted}`;
}

export default function CalculatorClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [priceBasis, setPriceBasis] = useState<PriceBasis>("TAX_EXCLUSIVE");
  const [sellerRegistered, setSellerRegistered] = useState<RegistrationStatus>("REGISTERED");
  const [buyerType, setBuyerType] = useState<BuyerType>("REGISTERED_BUSINESS");
  const [businessType, setBusinessType] = useState<BusinessType>("RETAILER");
  const [furtherTaxApplicable, setFurtherTaxApplicable] = useState(false);
  const [customRate, setCustomRate] = useState("");
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [eligibleInputTax, setEligibleInputTax] = useState("");
  const [showEstimator, setShowEstimator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const selectedProduct = useMemo<ProductTaxRecord | undefined>(() => {
    if (!selectedProductId) return undefined;
    return getProductById(selectedProductId);
  }, [selectedProductId]);

  const searchResults = useMemo<ProductTaxRecord[]>(() => {
    if (!searchQuery.trim()) return [];
    return ALL_PRODUCTS.filter((product) => {
      const lower = searchQuery.toLowerCase();
      return (
        product.canonicalName.toLowerCase().includes(lower) ||
        product.searchAliases.some((alias) => alias.toLowerCase().includes(lower)) ||
        product.candidatePctCodes.some((code) => code.toLowerCase().includes(lower))
      );
    });
  }, [searchQuery]);

  const calculationInput: CalculationInput = useMemo<CalculationInput>(() => {
    const baseInput = {
      ...DEFAULT_CALCULATION_INPUT,
      product: selectedProduct || {
        id: "custom",
        canonicalName: "Custom Product",
        searchAliases: [],
        candidatePctCodes: [],
        pctDescription: "Custom calculation",
        chapter: "",
        originType: "LOCAL",
        packagingType: "OTHER",
        taxTreatment: "CUSTOM_RATE" as const,
        furtherTaxApplicable: true,
        furtherTaxRate: 0.04,
        thirdScheduleApplies: false,
        priceBasis: priceBasis,
        relevantSection: "Custom",
        legalSource: "User-provided",
        sourceUrl: "",
        confidence: "UNVERIFIED_DO_NOT_IMPLEMENT" as const,
      },
      amount: Number(amount) || 0,
      priceBasis,
      sellerRegistered,
      buyerType,
      businessType,
      furtherTaxApplicable,
      eligibleInputTax: Number(eligibleInputTax) || 0,
    };

    if (useCustomRate && customRate.trim() !== "") {
      const rate = Number(customRate) / 100;
      if (rate > 0 && rate <= 1) {
        return { ...baseInput, customRate: rate };
      }
    }

    return baseInput;
  }, [selectedProduct, amount, priceBasis, sellerRegistered, buyerType, businessType, furtherTaxApplicable, customRate, useCustomRate, eligibleInputTax]);

  const result = useMemo<CalculationResult>(() => calculate(calculationInput), [calculationInput]);

  const loadExample = useCallback(() => {
    setSelectedProductId("monitor");
    setAmount("100000");
    setRetailPrice("");
    setPriceBasis("TAX_EXCLUSIVE");
    setSellerRegistered("REGISTERED");
    setBuyerType("REGISTERED_BUSINESS");
    setBusinessType("RETAILER");
    setFurtherTaxApplicable(false);
    setCustomRate("");
    setUseCustomRate(false);
    setEligibleInputTax("");
    setShowEstimator(false);
  }, []);

  const resetAll = useCallback(() => {
    setSelectedProductId("");
    setSearchQuery("");
    setAmount("");
    setRetailPrice("");
    setPriceBasis("TAX_EXCLUSIVE");
    setSellerRegistered("REGISTERED");
    setBuyerType("REGISTERED_BUSINESS");
    setBusinessType("RETAILER");
    setFurtherTaxApplicable(false);
    setCustomRate("");
    setUseCustomRate(false);
    setEligibleInputTax("");
    setShowEstimator(false);
    setShowSearch(false);
  }, []);

  const copySummary = useCallback(async () => {
    if (!selectedProduct) return;
    let text = `Pakistan Sales Tax Summary
Product: ${selectedProduct.canonicalName}
HS/PCT: ${selectedProduct.candidatePctCodes[0] || "N/A"}
Treatment: ${selectedProduct.taxTreatment.replace(/_/g, " ")}
Amount: ${formatCurrency(result.taxExclusiveAmount)}
Sales Tax: ${formatCurrency(result.salesTax)}
${result.furtherTax > 0 ? `Further Tax: ${formatCurrency(result.furtherTax)}` : ""}
Invoice Total: ${formatCurrency(result.invoiceTotal)}
Effective Tax Rate: ${result.effectiveTaxRate.toFixed(2)}%`;
    if (result.requiresVerification && result.verificationMessage) {
      text += `

VERIFICATION REQUIRED: ${result.verificationMessage}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op
    }
  }, [selectedProduct, result]);

  const isThirdSchedule = selectedProduct?.taxTreatment === "THIRD_SCHEDULE";
  const isDeferred = selectedProduct?.taxTreatment === "REQUIRES_VERIFICATION";
  const showFurtherTaxOption = selectedProduct?.furtherTaxApplicable !== false && (buyerType === "UNREGISTERED_BUSINESS" || buyerType === "CONSUMER");

  return (
    <>
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL</span>
          <h1>Pakistan Sales Tax Calculator with HS/PCT Code</h1>
          <p>Calculate sales tax for products using HS/PCT codes. Supports standard rate, Third Schedule retail-price treatment, further tax, and input/output tax estimator. Conservative classification — unknown treatments are never forced to 18%.</p>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="container">
          <div className="finder-grid">
            <div>
              <div className="finder-panel" style={{ marginBottom: 24 }}>
                <div style={{ background: "rgba(124,92,255,0.08)", border: "1px solid rgba(124,92,255,0.18)", borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--brand-strong)" }}>TriangleTech is not affiliated with FBR.</strong> This calculator is an informational estimate based on configured rules and user inputs. Tax treatment may change through legislation or notifications.
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="label-premium">Product / HS-PCT Search</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="input-premium"
                        placeholder="Search products or HS/PCT codes..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearch(true);
                        }}
                        onFocus={() => setShowSearch(true)}
                      />
                      {showSearch && searchQuery.trim() && searchResults.length > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          background: "var(--surface)",
                          border: "1px solid var(--border-brand)",
                          borderRadius: 10,
                          boxShadow: "0 20px 40px rgba(27,27,75,0.18)",
                          zIndex: 50,
                          maxHeight: 280,
                          overflowY: "auto",
                        }}>
                          {searchResults.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setSearchQuery(product.canonicalName);
                                setShowSearch(false);
                              }}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                                padding: "12px 14px",
                                background: "none",
                                border: "none",
                                borderBottom: "1px solid var(--border)",
                                cursor: "pointer",
                                textAlign: "left",
                                fontSize: 13,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{product.canonicalName}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>HS/PCT: {product.candidatePctCodes[0] || "N/A"}</div>
                              </div>
                              <span className={`tool-badge${product.taxTreatment === "THIRD_SCHEDULE" ? " tool-badge-first" : ""}`} style={{ fontSize: 10, padding: "3px 8px" }}>
                                {product.taxTreatment.replace(/_/g, " ")}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedProduct && (
                  <div style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.15)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{selectedProduct.canonicalName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>HS/PCT: {selectedProduct.candidatePctCodes.join(", ")}</div>
                      </div>
                      <span className={`tool-badge${selectedProduct.taxTreatment === "THIRD_SCHEDULE" ? " tool-badge-first" : ""}`} style={{ fontSize: 11, padding: "4px 10px" }}>
                        {selectedProduct.taxTreatment.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{selectedProduct.pctDescription}</div>
                    {selectedProduct.notes && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>{selectedProduct.notes}</div>
                    )}
                  </div>
                )}

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="label-premium">
                      {isThirdSchedule ? "Printed / Applicable Retail Price" : "Amount"} <span className="required-mark">*</span>
                    </label>
                    <div className="input-affix">
                      <span className="affix-prefix">PKR</span>
                      <input
                        type="number"
                        className="input-premium"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={isThirdSchedule ? retailPrice : amount}
                        onChange={(e) => {
                          if (isThirdSchedule) {
                            setRetailPrice(e.target.value);
                          } else {
                            setAmount(e.target.value);
                          }
                        }}
                        inputMode="decimal"
                      />
                    </div>
                    {isThirdSchedule && (
                      <p className="helper-premium">Enter the retail price printed on the packaging, inclusive of all duties/taxes except sales tax.</p>
                    )}
                  </div>
                  <div className="field">
                    <label className="label-premium">Price Basis</label>
                    <select
                      className="select-premium"
                      value={priceBasis}
                      onChange={(e) => setPriceBasis(e.target.value as PriceBasis)}
                      disabled={isThirdSchedule}
                    >
                      <option value="TAX_EXCLUSIVE">Tax Exclusive</option>
                      <option value="TAX_INCLUSIVE">Tax Inclusive</option>
                      {isThirdSchedule && <option value="RETAIL_PRICE">Retail Price</option>}
                    </select>
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="label-premium">Seller Status</label>
                    <select
                      className="select-premium"
                      value={sellerRegistered}
                      onChange={(e) => setSellerRegistered(e.target.value as RegistrationStatus)}
                    >
                      <option value="REGISTERED">Registered</option>
                      <option value="UNREGISTERED">Unregistered</option>
                      <option value="LIABLE_BUT_NOT_REGISTERED">Liable but not registered</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label-premium">Buyer Type</label>
                    <select
                      className="select-premium"
                      value={buyerType}
                      onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                    >
                      <option value="REGISTERED_BUSINESS">Registered Business</option>
                      <option value="UNREGISTERED_BUSINESS">Unregistered Business</option>
                      <option value="CONSUMER">Consumer</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="label-premium">Business Type</label>
                    <select
                      className="select-premium"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    >
                      <option value="MANUFACTURER">Manufacturer</option>
                      <option value="IMPORTER">Importer</option>
                      <option value="DISTRIBUTOR">Distributor / Wholesaler</option>
                      <option value="RETAILER">Retailer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label-premium">Calculation Mode</label>
                    <select
                      className="select-premium"
                      value={useCustomRate ? "custom" : "standard"}
                      onChange={(e) => setUseCustomRate(e.target.value === "custom")}
                      disabled={isDeferred}
                    >
                      <option value="standard">Standard / Third Schedule</option>
                      <option value="custom">Custom Rate — User Provided</option>
                    </select>
                  </div>
                </div>

                {useCustomRate && (
                  <div className="form-grid" style={{ marginBottom: 16 }}>
                    <div className="field">
                      <label className="label-premium">Custom Rate (%)</label>
                      <div className="input-affix">
                        <span className="affix-prefix" style={{ fontSize: 14, fontWeight: 600 }}>%</span>
                        <input
                          type="number"
                          className="input-premium"
                          placeholder="18"
                          min="0"
                          max="100"
                          step="0.1"
                          value={customRate}
                          onChange={(e) => setCustomRate(e.target.value)}
                          inputMode="decimal"
                        />
                      </div>
                      <p className="helper-premium">Enter the rate you believe applies. This does not imply FBR verification.</p>
                    </div>
                  </div>
                )}

                {showFurtherTaxOption && (
                  <div style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.15)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10, display: "block" }}>
                      Further Tax — Section 3(1A)
                    </label>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                      Supplies to non-registered persons may be subject to 4% further tax. Specific notifications/exclusions may affect applicability.
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setFurtherTaxApplicable(true)}
                        className={classNames("showcase-tab", furtherTaxApplicable && "is-active")}
                        style={{ flex: 1 }}
                      >
                        Apply 4%
                      </button>
                      <button
                        type="button"
                        onClick={() => setFurtherTaxApplicable(false)}
                        className={classNames("showcase-tab", !furtherTaxApplicable && "is-active")}
                        style={{ flex: 1 }}
                      >
                        Do Not Apply / Not Sure
                      </button>
                    </div>
                  </div>
                )}

                {selectedProduct && !isDeferred && (
                  <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                    <button type="button" onClick={loadExample} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>Load Example</button>
                    <button type="button" onClick={resetAll} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>Reset</button>
                  </div>
                )}
              </div>

              <div className="finder-panel" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Input / Output Tax Estimator</h3>
                  <button
                    type="button"
                    onClick={() => setShowEstimator(!showEstimator)}
                    className="button-indigo-secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    {showEstimator ? "Hide" : "Show"}
                  </button>
                </div>
                {showEstimator && (
                  <>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                      Enter eligible input tax manually. This does not automatically determine eligibility.
                    </p>
                    <div className="form-grid" style={{ marginBottom: 16 }}>
                      <div className="field">
                        <label className="label-premium">Eligible Input Tax</label>
                        <div className="input-affix">
                          <span className="affix-prefix">PKR</span>
                          <input
                            type="number"
                            className="input-premium"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={eligibleInputTax}
                            onChange={(e) => setEligibleInputTax(e.target.value)}
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      <div style={{ background: "rgba(124,92,255,0.06)", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Output Tax</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-strong)" }}>{formatCurrency(result.outputTax)}</div>
                      </div>
                      <div style={{ background: "rgba(124,92,255,0.06)", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Eligible Input Tax</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-strong)" }}>{formatCurrency(result.inputTax)}</div>
                      </div>
                      <div style={{ background: "rgba(124,92,255,0.06)", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Estimated Tax Difference</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: result.estimatedTaxDifference > 0 ? "var(--danger)" : "var(--brand-strong)" }}>{formatCurrency(result.estimatedTaxDifference)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="glass-panel on-dark" style={{ padding: 28, marginBottom: 24 }}>
                <span className="eyebrow" style={{ color: "#A79BFF", marginBottom: 8 }}>INVOICE TOTAL</span>
                <div style={{ fontSize: 14, color: "#C9CCF5", marginBottom: 4 }}>Total amount payable</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", fontFamily: "var(--font-sora)", letterSpacing: "-.02em", lineHeight: 1.1 }}>
                  {formatCurrency(result.invoiceTotal)}
                </div>
                {selectedProduct && (
                  <p style={{ fontSize: 13, color: "#A7ADD9", marginTop: 10 }}>
                    Based on {selectedProduct.taxTreatment.replace(/_/g, " ")} treatment
                  </p>
                )}
              </div>

              <div className="glass-panel on-dark" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16, color: "#fff" }}>Result Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}>
                    <span style={{ color: "#C9CCF5", fontSize: 13 }}>Tax-Exclusive Value</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(result.taxExclusiveAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}>
                    <span style={{ color: "#C9CCF5", fontSize: 13 }}>Sales Tax</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(result.salesTax)}</span>
                  </div>
                  {result.furtherTax > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}>
                      <span style={{ color: "#C9CCF5", fontSize: 13 }}>Further Tax (4%)</span>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{formatCurrency(result.furtherTax)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(124,92,255,0.18)" }}>
                    <span style={{ color: "#C9CCF5", fontSize: 13, fontWeight: 600 }}>Invoice Total</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{formatCurrency(result.invoiceTotal)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="metric-card">
                  <span className="metric-label">Effective Tax Rate</span>
                  <span className="metric-value">{result.effectiveTaxRate.toFixed(2)}%</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Treatment</span>
                  <span className="metric-value" style={{ fontSize: 13 }}>
                    {selectedProduct ? selectedProduct.taxTreatment.replace(/_/g, " ") : "—"}
                  </span>
                </div>
              </div>

              {selectedProduct && (
                <div className="metric-card" style={{ padding: "18px 20px", marginBottom: 24 }}>
                  <span className="metric-label">Why This Rate?</span>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6 }}>
                    <p><strong>Treatment:</strong> {selectedProduct.taxTreatment.replace(/_/g, " ")}</p>
                    <p><strong>Basis:</strong> {isThirdSchedule ? "Retail price" : "Transaction value"}</p>
                    <p><strong>Legal reference:</strong> {selectedProduct.relevantSection}</p>
                    <p><strong>Source:</strong> {selectedProduct.legalSource}</p>
                    {selectedProduct.scheduleSerial && <p><strong>Schedule:</strong> {selectedProduct.scheduleSerial}</p>}
                  </div>
                </div>
              )}

              {isDeferred && (
                <div className="metric-card" style={{ padding: "18px 20px", marginBottom: 24, border: "1px solid rgba(234,179,8,0.3)" }}>
                  <span className="metric-label" style={{ color: "#fbbf24" }}>Verification Required</span>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6 }}>
                    {result.verificationMessage || `Tax treatment for "${selectedProduct?.canonicalName}" requires verification.`}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                    You may use Custom Rate mode if you know the applicable rate.
                  </p>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 10, padding: 14, marginBottom: 24 }}>
                  {result.warnings.map((warning, idx) => (
                    <p key={idx} style={{ fontSize: 12, color: "#fbbf24", marginBottom: idx < result.warnings.length - 1 ? 8 : 0 }}>{warning}</p>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={copySummary} className="button-indigo-secondary" style={{ flex: 1, minWidth: 120 }}>
                  {copied ? "Copied" : "Copy Summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="container">
          <div className="finder-grid">
            <div>
              <span className="eyebrow">ABOUT THIS CALCULATOR</span>
              <h2 style={{ fontSize: 28, marginBottom: 16 }}>Understanding Pakistan sales tax.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>What is sales tax?</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Sales tax is a multi-stage tax on goods charged at 18% for most taxable supplies. It is collected by registered sellers and remitted to FBR.</p>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>What is Third Schedule?</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Third Schedule goods are taxed at 18% of the printed retail price, not the transaction value. The manufacturer/importer must print the retail price and sales tax on packaging.</p>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>What is further tax?</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Further tax at 4% may apply to supplies to non-registered persons under Section 3(1A). Specific notifications may exclude certain supplies.</p>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>Why do some products require verification?</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Some products have ambiguous HS/PCT classifications, conditional rates, or special treatments that depend on facts not easily automated. We mark these as REQUIRES_VERIFICATION rather than guess.</p>
                </div>
              </div>
            </div>
            <div>
              <span className="eyebrow">COMMON QUESTIONS</span>
              <h2 style={{ fontSize: 28, marginBottom: 16 }}>Frequently asked questions.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>What is the standard sales tax rate? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>The standard sales tax rate in Pakistan is 18% for most taxable supplies made by registered persons.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>What is Third Schedule? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Third Schedule goods are taxed at 18% of the printed retail price. The retail price includes all duties and taxes except sales tax. Sales tax is calculated on this retail price.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>What is further tax? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Further tax at 4% may apply to supplies to non-registered persons under Section 3(1A) of the Sales Tax Act, 1990. It is in addition to the standard rate.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>Can I use this calculator for all products? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>This calculator currently supports a verified subset of products. Some products require verification due to ambiguous classifications or special treatments. Use Custom Rate mode if you know the applicable rate.</p>
                </details>
                <details style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>Is this an official FBR tool? <span style={{ color: "var(--brand)" }}>+</span></summary>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>No. TriangleTech is not affiliated with FBR. This calculator is an informational estimate. Consult a tax professional for definitive advice.</p>
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
                <h2 id="tools-next-heading" className="tools-next-title">Managing business operations across products, sales and tax?</h2>
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
