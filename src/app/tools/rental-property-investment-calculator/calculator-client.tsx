"use client";

import { useCallback, useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  assessRental,
  buildScenarios,
  calculateRental,
  formatPercent,
  formatUSD,
  DEFAULT_RENTAL_INPUTS,
  DEFAULTS_NOTE,
  type RentalInputs,
} from "@/lib/tools/rental-property";

type NumericField = keyof RentalInputs;

function NumField({
  id,
  label,
  value,
  onChange,
  helper,
  error,
  prefix,
  suffix,
  step = "1",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  helper?: string;
  /** Visible validation message. Out-of-range input is flagged, never silently clamped. */
  error?: string;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  return (
    <div className="field">
      <label className="label-premium" htmlFor={id}>
        {label}
      </label>
      <div className="input-affix">
        {prefix && <span className="affix-prefix">{prefix}</span>}
        <input
          id={id}
          type="number"
          className="input-premium"
          inputMode="decimal"
          step={step}
          value={value === 0 ? "" : value}
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helper ? helpId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="affix-suffix">{suffix}</span>}
      </div>
      {error ? (
        <p className="error-premium" id={errorId} role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="helper-premium" id={helpId}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal bar row: the bar itself is decorative; the value is real text. */
function BarRow({
  label,
  annual,
  max,
  tone,
}: {
  label: string;
  annual: number;
  max: number;
  tone: "brand" | "muted" | "danger" | "success" | "dark";
}) {
  const width = max > 0 ? Math.min(100, (Math.abs(annual) / max) * 100) : 0;
  return (
    <div className="rental-calc-bar-row">
      <span className="rental-calc-bar-label">{label}</span>
      <span className="rental-calc-bar-track" aria-hidden="true">
        <span className={`rental-calc-bar-fill rental-calc-bar-fill--${tone}`} style={{ width: `${width}%` }} />
      </span>
      <span className="rental-calc-bar-value">{formatUSD(annual)}</span>
    </div>
  );
}

const CHECKLIST = [
  {
    id: "str-legality",
    title: "Short-term rental legality",
    note: "City and county STR rules checked for this address — zoning, primary-residence rules, minimum-stay rules and any registration requirement.",
  },
  {
    id: "hoa",
    title: "HOA / condo / lease restrictions",
    note: "HOA or condo association documents (and any lease, if you do not own outright) allow short-term renting. Many associations ban stays under 30 days.",
  },
  {
    id: "permits",
    title: "Permits and lodging taxes",
    note: "STR permit or business license requirements identified, plus how occupancy / lodging taxes are collected and remitted in this jurisdiction.",
  },
  {
    id: "insurance",
    title: "Insurance that actually covers STR use",
    note: "A standard homeowner policy usually excludes short-term rental activity. STR or landlord cover quoted for this property.",
  },
  {
    id: "financing",
    title: "Financing review",
    note: "Loan type allows short-term rental use, and the rate, term and down payment in this calculator match a real lender quote — not a listing estimate.",
  },
  {
    id: "tax",
    title: "Tax treatment reviewed",
    note: "Income tax, depreciation and local tax treatment discussed with a tax professional for this property and state. This calculator is before income tax.",
  },
  {
    id: "safety",
    title: "Safety and compliance basics",
    note: "Smoke and CO detectors, fire extinguisher, occupancy limits, parking and any local safety inspection requirements covered.",
  },
  {
    id: "numbers",
    title: "Rate and occupancy verified independently",
    note: "Nightly rate and occupancy checked against comparable nearby listings yourself — not taken from a seller's or agent's projection.",
  },
] as const;

const ZERO_INPUTS: RentalInputs = {
  purchasePrice: 0,
  downPaymentPercent: 0,
  interestRatePercent: 0,
  loanTermYears: 30,
  nightlyRate: 0,
  occupancyPercent: 0,
  monthlyExpenses: 0,
  platformFeePercent: 0,
  managementFeePercent: 0,
  propertyTaxAnnual: 0,
  insuranceAnnual: 0,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  repairsMonthly: 0,
  otherExpensesMonthly: 0,
  closingCosts: 0,
  furnishingCosts: 0,
  cleaningFeePerStay: 0,
  cleaningCostPerStay: 0,
  averageStayNights: 0,
  availableNightsPerYear: 365,
};

export default function RentalCalculatorClient() {
  const [inputs, setInputs] = useState<RentalInputs>(DEFAULT_RENTAL_INPUTS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => calculateRental(inputs), [inputs]);
  const scenarios = useMemo(() => buildScenarios(inputs), [inputs]);
  const assessment = useMemo(() => assessRental(inputs, result), [inputs, result]);

  // Values are stored exactly as entered — never clamped here. The engine
  // reports out-of-range fields in result.validationErrors and the UI shows
  // them next to the field and in a banner above the results.
  const update = useCallback(
    (field: NumericField) => (value: string) => {
      const parsed = value === "" ? 0 : Number(value);
      setInputs((prev) => ({
        ...prev,
        [field]: Number.isFinite(parsed) ? parsed : 0,
      }));
    },
    [],
  );

  const errorsByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const error of result.validationErrors) {
      if (!map.has(error.field)) map.set(error.field, error.message);
    }
    return map;
  }, [result.validationErrors]);

  const loadExample = useCallback(() => setInputs(DEFAULT_RENTAL_INPUTS), []);
  const resetAll = useCallback(() => setInputs(ZERO_INPUTS), []);

  const checkedCount = CHECKLIST.filter((item) => checked[item.id]).length;

  const copySummary = useCallback(async () => {
    const lines = [
      "Rental Property Analysis — preliminary, based only on the figures entered",
      `Purchase price: ${formatUSD(inputs.purchasePrice)} · Down payment: ${formatUSD(result.downPaymentAmount)} (${inputs.downPaymentPercent}%) · Loan: ${formatUSD(result.loanAmount)}`,
      `Mortgage payment: ${formatUSD(result.monthlyMortgagePayment, { cents: true })}/mo at ${inputs.interestRatePercent}% over ${inputs.loanTermYears} years`,
      `Nightly rate: ${formatUSD(inputs.nightlyRate)} · Occupancy: ${inputs.occupancyPercent}% of ${inputs.availableNightsPerYear} available nights (${result.occupiedNightsPerYear.toFixed(1)} nights booked)`,
      `Gross income: ${formatUSD(result.grossIncomeAnnual)}/yr · Operating expenses: ${formatUSD(result.totalOperatingExpensesAnnual)}/yr`,
      `NOI (before mortgage): ${formatUSD(result.noiAnnual)}/yr · Cash flow after mortgage: ${formatUSD(result.cashFlowAnnual)}/yr (${formatUSD(result.cashFlowMonthly)}/mo)`,
      `Total cash invested: ${formatUSD(result.totalCashInvested)} · Cash-on-cash: ${formatPercent(result.cashOnCashPercent)} · Cap rate: ${formatPercent(result.capRatePercent)}`,
      `Break-even occupancy: ${formatPercent(result.breakEvenOccupancyPercent)}`,
      `Assessment: ${assessment.headline}`,
      "Scenarios (monthly cash flow): " +
        scenarios.map((s) => `${s.label} ${formatUSD(s.result.cashFlowMonthly)}`).join(" · "),
      ...(result.validationErrors.length > 0
        ? [
            `Validation: ${result.validationErrors.length} input(s) out of range (${result.validationErrors.map((e) => e.field).join(", ")}) — figures above use the nearest valid values and are provisional.`,
          ]
        : []),
      "Preliminary analysis only — not financial advice or a recommendation to buy.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }, [inputs, result, assessment, scenarios]);

  const expenseLines = result.operatingExpenseBreakdown.filter((line) => line.annual > 0);
  const flowMax = Math.max(
    result.grossIncomeAnnual,
    result.totalOperatingExpensesAnnual + result.annualDebtService,
    1,
  );
  const scenarioMax = Math.max(...scenarios.map((s) => Math.abs(s.result.cashFlowMonthly)), 1);

  const bandClass =
    assessment.band === "positive"
      ? "rental-calc-chip--positive"
      : assessment.band === "negative"
        ? "rental-calc-chip--negative"
        : "rental-calc-chip--neutral";

  return (
    <>
      <ScrollReveal />
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL · REAL ESTATE</span>
          <h1>Should I Buy This Rental Property?</h1>
          <p>
            Run the numbers on a short-term rental before you buy: mortgage payment, revenue, operating
            expenses, NOI, monthly cash flow, break-even occupancy and cash-on-cash return — from figures
            you enter, with nothing uploaded or looked up.
          </p>
        </div>
      </section>

      <section className="section rental-calc" data-reveal>
        <div className="container">
          <p className="rental-calc-privacy">
            <strong>Private by design.</strong> Every calculation runs in your browser. Your figures are
            never sent to a server, saved to a database or matched against property data.{" "}
            {DEFAULTS_NOTE}
          </p>

          <div className="finder-grid">
            <div className="rental-calc-form-column">
              <div className="finder-panel">
                <h2 className="rental-calc-panel-title">Quick analysis</h2>
                <p className="helper-premium rental-calc-panel-note">
                  The essentials. Open Advanced below to itemise taxes, insurance and cleaning — those
                  figures are included in the results whether the section is open or closed.
                </p>

                <div className="form-grid">
                  <NumField id="rc-purchase-price" label="Purchase price" prefix="$" step="1000"
                    value={inputs.purchasePrice} onChange={update("purchasePrice")} error={errorsByField.get("purchasePrice")}
                    helper="The price you would pay for the property." />
                  <NumField id="rc-down-payment" label="Down payment" suffix="%" step="0.5"
                    value={inputs.downPaymentPercent} onChange={update("downPaymentPercent")} error={errorsByField.get("downPaymentPercent")}
                    helper={`= ${formatUSD(result.downPaymentAmount)} down · ${formatUSD(result.loanAmount)} loan.`} />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="rc-interest-rate" label="Mortgage interest rate" suffix="%" step="0.05"
                    value={inputs.interestRatePercent} onChange={update("interestRatePercent")} error={errorsByField.get("interestRatePercent")}
                    helper="Nominal annual rate from a real lender quote." />
                  <div className="field">
                    <label className="label-premium" htmlFor="rc-loan-term">
                      Loan term
                    </label>
                    <select
                      id="rc-loan-term"
                      className="select-premium"
                      value={inputs.loanTermYears}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, loanTermYears: Number(e.target.value) }))
                      }
                    >
                      {[30, 25, 20, 15, 10, 5].map((years) => (
                        <option key={years} value={years}>
                          {years} years
                        </option>
                      ))}
                    </select>
                    <p className="helper-premium">
                      Payment: {formatUSD(result.monthlyMortgagePayment, { cents: true })}/mo (principal
                      &amp; interest only).
                    </p>
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="rc-nightly-rate" label="Nightly rate" prefix="$" step="5"
                    value={inputs.nightlyRate} onChange={update("nightlyRate")} error={errorsByField.get("nightlyRate")}
                    helper="Average nightly price you realistically expect to charge." />
                  <NumField id="rc-occupancy" label="Occupancy rate" suffix="%" step="1"
                    value={inputs.occupancyPercent} onChange={update("occupancyPercent")} error={errorsByField.get("occupancyPercent")}
                    helper={`${result.occupiedNightsPerYear.toFixed(1)} of ${inputs.availableNightsPerYear} available nights booked per year.`} />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="rc-monthly-expenses" label="Monthly expenses" prefix="$" step="10"
                    value={inputs.monthlyExpenses} onChange={update("monthlyExpenses")} error={errorsByField.get("monthlyExpenses")}
                    helper="Catch-all operating costs you have not itemised in Advanced. Do not include the mortgage here." />
                  <NumField id="rc-platform-fee" label="Platform fee" suffix="%" step="0.5"
                    value={inputs.platformFeePercent} onChange={update("platformFeePercent")} error={errorsByField.get("platformFeePercent")}
                    helper="Booking platform host fee, as a % of rental revenue." />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="rc-management-fee" label="Management fee" suffix="%" step="0.5"
                    value={inputs.managementFeePercent} onChange={update("managementFeePercent")} error={errorsByField.get("managementFeePercent")}
                    helper="Property manager's cut of rental revenue. 0% if you self-manage." />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <button type="button" onClick={loadExample} className="button-indigo-secondary" style={{ flex: 1, minWidth: 140 }}>
                    Load illustrative example
                  </button>
                  <button type="button" onClick={resetAll} className="button-indigo-secondary" style={{ flex: 1, minWidth: 100 }}>
                    Reset
                  </button>
                </div>

                <div className="rental-calc-advanced">
                  <button
                    type="button"
                    className="rental-calc-advanced-toggle"
                    aria-expanded={advancedOpen}
                    aria-controls="rc-advanced-region"
                    onClick={() => setAdvancedOpen((open) => !open)}
                  >
                    <span>
                      Advanced — taxes, insurance, cleaning &amp; cash in
                      <span className="rental-calc-advanced-note">
                        Itemise the costs the quick estimate rolls together.
                      </span>
                    </span>
                    <span className="rental-calc-advanced-chevron" aria-hidden="true">
                      {advancedOpen ? "−" : "+"}
                    </span>
                  </button>

                  <div id="rc-advanced-region" hidden={!advancedOpen}>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-property-tax" label="Property tax (yearly)" prefix="$" step="100"
                        value={inputs.propertyTaxAnnual} onChange={update("propertyTaxAnnual")} error={errorsByField.get("propertyTaxAnnual")}
                        helper="Annual property tax bill for this property." />
                      <NumField id="rc-insurance" label="Insurance (yearly)" prefix="$" step="50"
                        value={inputs.insuranceAnnual} onChange={update("insuranceAnnual")} error={errorsByField.get("insuranceAnnual")}
                        helper="Annual premium for cover that allows short-term rentals." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-hoa" label="HOA dues (monthly)" prefix="$" step="10"
                        value={inputs.hoaMonthly} onChange={update("hoaMonthly")} error={errorsByField.get("hoaMonthly")} />
                      <NumField id="rc-utilities" label="Utilities (monthly)" prefix="$" step="10"
                        value={inputs.utilitiesMonthly} onChange={update("utilitiesMonthly")} error={errorsByField.get("utilitiesMonthly")}
                        helper="Electric, water, gas, internet, trash — what you pay, not guests." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-repairs" label="Repairs & maintenance (monthly)" prefix="$" step="10"
                        value={inputs.repairsMonthly} onChange={update("repairsMonthly")} error={errorsByField.get("repairsMonthly")}
                        helper="A monthly reserve for wear, breakages and call-outs." />
                      <NumField id="rc-other-expenses" label="Other expenses (monthly)" prefix="$" step="10"
                        value={inputs.otherExpensesMonthly} onChange={update("otherExpensesMonthly")} error={errorsByField.get("otherExpensesMonthly")}
                        helper="Supplies, software, lawn care, accounting — anything else recurring." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-closing-costs" label="Closing costs (one-time)" prefix="$" step="250"
                        value={inputs.closingCosts} onChange={update("closingCosts")} error={errorsByField.get("closingCosts")}
                        helper="Lender, title and transfer costs at purchase. Commonly 1–3% of the price." />
                      <NumField id="rc-furnishing" label="Furnishing & setup (one-time)" prefix="$" step="250"
                        value={inputs.furnishingCosts} onChange={update("furnishingCosts")} error={errorsByField.get("furnishingCosts")}
                        helper="Furniture, appliances, linens, photos and launch setup." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-cleaning-fee" label="Cleaning fee charged (per stay)" prefix="$" step="5"
                        value={inputs.cleaningFeePerStay} onChange={update("cleaningFeePerStay")} error={errorsByField.get("cleaningFeePerStay")}
                        helper="What guests pay you per stay. Counted as income." />
                      <NumField id="rc-cleaning-cost" label="Cleaning cost (per stay)" prefix="$" step="5"
                        value={inputs.cleaningCostPerStay} onChange={update("cleaningCostPerStay")} error={errorsByField.get("cleaningCostPerStay")}
                        helper="What you pay the cleaner per turnover. Counted as an expense." />
                    </div>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <NumField id="rc-average-stay" label="Average stay length" suffix="nights" step="0.5"
                        value={inputs.averageStayNights} onChange={update("averageStayNights")} error={errorsByField.get("averageStayNights")}
                        helper={`${result.staysPerYear.toFixed(1)} stays per year at your occupancy.`} />
                      <NumField id="rc-available-nights" label="Available rental nights / year" suffix="nights" step="1"
                        value={inputs.availableNightsPerYear} onChange={update("availableNightsPerYear")} error={errorsByField.get("availableNightsPerYear")}
                        helper="Nights the property can legally and practically be rented (max 365). Owner stays and blocked dates reduce this." />
                    </div>
                    <p className="helper-premium" style={{ marginTop: 14 }}>
                      If your Quick monthly-expenses figure already included tax, insurance or utilities,
                      lower it when you itemise here — otherwise those costs are counted twice. Every line
                      is shown separately in the results so you can check.
                    </p>
                  </div>
                </div>
              </div>

              <div className="finder-panel" style={{ marginTop: 24 }}>
                <h2 className="rental-calc-panel-title">Due diligence checklist</h2>
                <p className="helper-premium rental-calc-panel-note">
                  A calculator cannot check any of this for you. Work through it before relying on the
                  numbers — {checkedCount} of {CHECKLIST.length} checked. Your ticks stay in this page;
                  nothing is saved or sent anywhere.
                </p>
                <ul className="rental-calc-checklist">
                  {CHECKLIST.map((item) => (
                    <li key={item.id}>
                      <label className="rental-calc-check">
                        <input
                          type="checkbox"
                          checked={Boolean(checked[item.id])}
                          onChange={(e) =>
                            setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                          }
                        />
                        <span>
                          <span className="rental-calc-check-title">{item.title}</span>
                          <span className="rental-calc-check-note">{item.note}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rental-calc-results">
              <p className="rental-calc-sr-only" aria-live="polite">
                Monthly cash flow {formatUSD(result.cashFlowMonthly)}. Monthly NOI{" "}
                {formatUSD(result.noiMonthly)}. Cash-on-cash return {formatPercent(result.cashOnCashPercent)}.
              </p>

              {result.validationErrors.length > 0 && (
                <div className="rental-calc-validation" role="alert">
                  <strong>
                    {result.validationErrors.length === 1
                      ? "One input needs fixing"
                      : `${result.validationErrors.length} inputs need fixing`}
                    {" "}— results below are provisional.
                  </strong>
                  <p>
                    Nothing was changed silently: each value below was calculated at the nearest valid
                    limit, and the field itself is flagged. Fix the flagged inputs to rely on these
                    results.
                  </p>
                  <ul>
                    {result.validationErrors.map((error) => (
                      <li key={`${error.field}-${error.message}`}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="glass-panel on-dark" style={{ padding: 28 }}>
                <span className="eyebrow" style={{ color: "#A79BFF", marginBottom: 8 }}>
                  PRELIMINARY ASSESSMENT
                </span>
                <span className={`rental-calc-chip ${bandClass}`}>{assessment.headline}</span>
                <div style={{ fontSize: 14, color: "#C9CCF5", marginTop: 18 }}>Monthly cash flow after mortgage</div>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: "var(--font-sora)",
                    letterSpacing: "-.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {formatUSD(result.cashFlowMonthly)}
                </div>
                <p style={{ fontSize: 13, color: "#A7ADD9", marginTop: 10, lineHeight: 1.65 }}>
                  {assessment.explanation}
                </p>
              </div>

              {result.warnings.length > 0 && (
                <div className="rental-calc-warnings" role="note">
                  <strong>Check these figures:</strong>
                  <ul>
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rental-calc-metrics">
                <div className="metric-card">
                  <span className="metric-label">NOI (monthly)</span>
                  <span className="metric-value">{formatUSD(result.noiMonthly)}</span>
                  <span className="metric-delta">Before the mortgage — financing never changes NOI</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Cash flow (yearly)</span>
                  <span
                    className="metric-value"
                    style={{ color: result.cashFlowAnnual < 0 ? "var(--danger)" : "var(--brand-strong)" }}
                  >
                    {formatUSD(result.cashFlowAnnual)}
                  </span>
                  <span className="metric-delta">NOI minus {formatUSD(result.annualDebtService)} debt service</span>
                </div>
                <div className="metric-card is-brand">
                  <span className="metric-label">Cash-on-cash return</span>
                  <span className="metric-value">{formatPercent(result.cashOnCashPercent)}</span>
                  <span className="metric-delta">Yearly cash flow ÷ cash invested</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Cap rate</span>
                  <span className="metric-value">{formatPercent(result.capRatePercent)}</span>
                  <span className="metric-delta">NOI ÷ purchase price, ignoring financing</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Break-even occupancy</span>
                  <span className="metric-value">{formatPercent(result.breakEvenOccupancyPercent)}</span>
                  <span className="metric-delta">
                    Occupancy where cash flow reaches $0
                    {result.breakEvenOccupancyNoiPercent !== null
                      ? ` · ${formatPercent(result.breakEvenOccupancyNoiPercent)} covers operating costs alone`
                      : ""}
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Total cash invested</span>
                  <span className="metric-value">{formatUSD(result.totalCashInvested)}</span>
                  <span className="metric-delta">
                    {formatUSD(result.downPaymentAmount)} down + {formatUSD(inputs.closingCosts)} closing +{" "}
                    {formatUSD(inputs.furnishingCosts)} furnishing
                  </span>
                </div>
              </div>

              <div className="finder-panel">
                <h3 className="rental-calc-block-title">Where the money goes each year</h3>
                <figure className="rental-calc-chart">
                  <figcaption className="helper-premium">
                    Gross income against operating expenses and the mortgage. NOI is what remains after
                    operating expenses; cash flow is what remains after the mortgage too.
                  </figcaption>
                  <div className="rental-calc-bars">
                    <BarRow label="Gross income" annual={result.grossIncomeAnnual} max={flowMax} tone="brand" />
                    <BarRow label="Operating expenses" annual={result.totalOperatingExpensesAnnual} max={flowMax} tone="muted" />
                    <BarRow label="NOI" annual={result.noiAnnual} max={flowMax} tone={result.noiAnnual < 0 ? "danger" : "dark"} />
                    <BarRow label="Mortgage (debt service)" annual={result.annualDebtService} max={flowMax} tone="muted" />
                    <BarRow
                      label="Cash flow"
                      annual={result.cashFlowAnnual}
                      max={flowMax}
                      tone={result.cashFlowAnnual < 0 ? "danger" : "success"}
                    />
                  </div>
                </figure>

                {expenseLines.length > 0 && (
                  <>
                    <h4 className="rental-calc-sub-title">Operating expenses, itemised</h4>
                    <div className="rental-calc-bars">
                      {expenseLines.map((line) => (
                        <BarRow
                          key={line.label}
                          label={line.label}
                          annual={line.annual}
                          max={Math.max(result.totalOperatingExpensesAnnual, 1)}
                          tone="muted"
                        />
                      ))}
                    </div>
                  </>
                )}
                <p className="helper-premium" style={{ marginTop: 12 }}>
                  Platform and management fees are calculated on rental revenue (nightly rate × booked
                  nights), not on cleaning fees. Cleaning fees you charge are income; cleaning you pay for
                  is an expense — they are shown separately, never netted off silently.
                </p>
              </div>

              <div className="finder-panel">
                <h3 className="rental-calc-block-title">What if the year is better — or worse?</h3>
                <p className="helper-premium">
                  Sensitivity, not a forecast. Only the nightly rate and occupancy move; every expense,
                  fee and the mortgage stay exactly as you entered them.
                </p>
                <div className="rental-calc-scenarios">
                  {scenarios.map((scenario) => {
                    const monthly = scenario.result.cashFlowMonthly;
                    const width = Math.min(50, (Math.abs(monthly) / scenarioMax) * 50);
                    return (
                      <div key={scenario.id} className="rental-calc-scenario">
                        <div className="rental-calc-scenario-head">
                          <span className="rental-calc-scenario-label">{scenario.label}</span>
                          <span
                            className="rental-calc-scenario-value"
                            style={{ color: monthly < 0 ? "var(--danger)" : "var(--brand-strong)" }}
                          >
                            {formatUSD(monthly)}/mo
                          </span>
                        </div>
                        <div className="rental-calc-diverge" aria-hidden="true">
                          <span className="rental-calc-diverge-center" />
                          {monthly >= 0 ? (
                            <span
                              className="rental-calc-diverge-bar rental-calc-diverge-bar--positive"
                              style={{ left: "50%", width: `${width}%` }}
                            />
                          ) : (
                            <span
                              className="rental-calc-diverge-bar rental-calc-diverge-bar--negative"
                              style={{ right: "50%", width: `${width}%` }}
                            />
                          )}
                        </div>
                        <p className="rental-calc-scenario-meta">
                          {formatUSD(scenario.nightlyRate)}/night · {scenario.occupancyPercent.toFixed(0)}%
                          occupancy · NOI {formatUSD(scenario.result.noiMonthly)}/mo · cash-on-cash{" "}
                          {formatPercent(scenario.result.cashOnCashPercent)}
                        </p>
                        <p className="helper-premium">{scenario.assumption}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={copySummary} className="button-indigo-secondary" style={{ flex: 1, minWidth: 140 }}>
                  {copied ? "Copied" : "Copy summary"}
                </button>
              </div>

              <p className="helper-premium">
                This is a preliminary analysis of the figures you entered — before income tax, depreciation,
                major capital repairs and any cost you have not entered. It is not financial advice and not
                a recommendation to buy or pass on any property.
              </p>
            </div>
          </div>

          {/* Future advertising region: intentionally empty and hidden, placed
              after the form and results — never between controls or results.
              AdSense is NOT active; do not render an ad unit here without a
              separate approval. */}
          <div className="rental-calc-ad-region" data-ad-region="rental-calculator-below-tool" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
