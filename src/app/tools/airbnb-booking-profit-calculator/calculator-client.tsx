"use client";

import { useCallback, useMemo, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  calculateBooking,
  BOOKING_DEFAULTS_NOTE,
  DEFAULT_BOOKING_INPUTS,
  type BookingInputs,
} from "@/lib/tools/airbnb-booking";
import { formatPercent, formatUSD } from "@/lib/tools/rental-property";

type NumericField = keyof BookingInputs;

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
  amount,
  max,
  tone,
}: {
  label: string;
  amount: number;
  max: number;
  tone: "brand" | "muted" | "danger" | "success" | "dark";
}) {
  const width = max > 0 ? Math.min(100, (Math.abs(amount) / max) * 100) : 0;
  return (
    <div className="rental-calc-bar-row">
      <span className="rental-calc-bar-label">{label}</span>
      <span className="rental-calc-bar-track" aria-hidden="true">
        <span className={`rental-calc-bar-fill rental-calc-bar-fill--${tone}`} style={{ width: `${width}%` }} />
      </span>
      <span className="rental-calc-bar-value">{formatUSD(amount, { cents: true })}</span>
    </div>
  );
}

const ZERO_INPUTS: BookingInputs = {
  nightlyRate: 0,
  nightsBooked: 0,
  guestCleaningFee: 0,
  additionalCharges: 0,
  platformFeePercent: 0,
  managementFeePercent: 0,
  cleaningExpense: 0,
  suppliesExpense: 0,
  otherCosts: 0,
};

export default function AirbnbBookingClient() {
  const [inputs, setInputs] = useState<BookingInputs>(DEFAULT_BOOKING_INPUTS);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => calculateBooking(inputs), [inputs]);

  const errorsByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const error of result.validationErrors) {
      if (!map.has(error.field)) map.set(error.field, error.message);
    }
    return map;
  }, [result.validationErrors]);

  // Values are stored exactly as entered — never clamped here. The engine
  // flags out-of-range fields and the UI displays them.
  const update = useCallback(
    (field: NumericField) => (value: string) => {
      const parsed = value === "" ? 0 : Number(value);
      setInputs((prev) => ({ ...prev, [field]: Number.isFinite(parsed) ? parsed : 0 }));
    },
    [],
  );

  const loadExample = useCallback(() => setInputs(DEFAULT_BOOKING_INPUTS), []);
  const resetAll = useCallback(() => setInputs(ZERO_INPUTS), []);

  const copySummary = useCallback(async () => {
    const lines = [
      "Airbnb Booking Contribution — from the figures entered",
      `Nightly rate: ${formatUSD(inputs.nightlyRate, { cents: true })} × ${inputs.nightsBooked} nights = accommodation revenue ${formatUSD(result.accommodationRevenue, { cents: true })}`,
      `Guest cleaning fee: ${formatUSD(inputs.guestCleaningFee, { cents: true })} · Additional charges: ${formatUSD(inputs.additionalCharges, { cents: true })}`,
      `Gross booking revenue: ${formatUSD(result.grossBookingRevenue, { cents: true })}`,
      `Platform fee (${inputs.platformFeePercent}% of gross): ${formatUSD(result.platformFeeAmount, { cents: true })} · Management fee (${inputs.managementFeePercent}% of gross): ${formatUSD(result.managementFeeAmount, { cents: true })}`,
      `Cleaning expense: ${formatUSD(inputs.cleaningExpense, { cents: true })} · Supplies: ${formatUSD(inputs.suppliesExpense, { cents: true })} · Other: ${formatUSD(inputs.otherCosts, { cents: true })}`,
      `Total variable costs: ${formatUSD(result.totalVariableCosts, { cents: true })}`,
      `Net booking contribution: ${formatUSD(result.netContribution, { cents: true })} · Margin: ${formatPercent(result.contributionMarginPercent)} · Per night: ${result.contributionPerNight === null ? "—" : formatUSD(result.contributionPerNight, { cents: true })}`,
      ...(result.validationErrors.length > 0
        ? [`Validation: ${result.validationErrors.length} input(s) out of range — figures use the nearest valid values and are provisional.`]
        : []),
      "Contribution is not total profit: fixed property costs, debt service and income taxes are excluded. Pass-through taxes are excluded from revenue.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }, [inputs, result]);

  const costLines = result.costBreakdown.filter((line) => line.amount > 0);
  const flowMax = Math.max(result.grossBookingRevenue, result.totalVariableCosts, 1);

  return (
    <>
      <ScrollReveal />
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL · VACATION RENTALS</span>
          <h1>Airbnb Booking Profit Calculator</h1>
          <p>
            What does one booking actually contribute? Enter the nightly rate, fees and the costs this
            booking causes, and see the net booking contribution — before fixed property costs, which this
            calculator deliberately leaves out and labels.
          </p>
        </div>
      </section>

      <section className="section rental-calc airbnb-calc" data-reveal>
        <div className="container">
          <p className="rental-calc-privacy">
            <strong>Private by design.</strong> Every calculation runs in your browser. Your figures are
            never sent to a server, saved or matched against listing data. {BOOKING_DEFAULTS_NOTE}
          </p>

          <div className="finder-grid">
            <div>
              <div className="finder-panel">
                <h2 className="rental-calc-panel-title">The booking</h2>
                <p className="helper-premium rental-calc-panel-note">
                  Use the figures from the booking and your payout summary. Do not include pass-through
                  taxes (occupancy or lodging taxes collected for a tax authority) anywhere below — they
                  are not your revenue.
                </p>

                <div className="form-grid">
                  <NumField id="ab-nightly-rate" label="Nightly rate" prefix="$" step="5"
                    value={inputs.nightlyRate} onChange={update("nightlyRate")} error={errorsByField.get("nightlyRate")}
                    helper="The nightly price for this booking, before fees and taxes." />
                  <NumField id="ab-nights" label="Nights booked" suffix="nights" step="1"
                    value={inputs.nightsBooked} onChange={update("nightsBooked")} error={errorsByField.get("nightsBooked")}
                    helper="Whole nights in this one booking." />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="ab-cleaning-fee" label="Guest cleaning fee" prefix="$" step="5"
                    value={inputs.guestCleaningFee} onChange={update("guestCleaningFee")} error={errorsByField.get("guestCleaningFee")}
                    helper="What the guest paid you for cleaning. Counted as revenue; what cleaning actually cost you goes below." />
                  <NumField id="ab-additional" label="Additional booking charges" prefix="$" step="5"
                    value={inputs.additionalCharges} onChange={update("additionalCharges")} error={errorsByField.get("additionalCharges")}
                    helper="Pet fees, extra-guest fees, late checkout — guest charges for this booking, excluding pass-through taxes." />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="ab-platform-fee" label="Platform fee" suffix="%" step="0.5"
                    value={inputs.platformFeePercent} onChange={update("platformFeePercent")} error={errorsByField.get("platformFeePercent")}
                    helper="Your host service fee for this booking, as a % — from your payout summary, not a headline rate." />
                  <NumField id="ab-management-fee" label="Management fee" suffix="%" step="0.5"
                    value={inputs.managementFeePercent} onChange={update("managementFeePercent")} error={errorsByField.get("managementFeePercent")}
                    helper="Your manager's or co-host's cut. 0% if you self-manage." />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="ab-cleaning-expense" label="Actual cleaning expense" prefix="$" step="5"
                    value={inputs.cleaningExpense} onChange={update("cleaningExpense")} error={errorsByField.get("cleaningExpense")}
                    helper="What the turnover clean for this booking actually cost you." />
                  <NumField id="ab-supplies" label="Supplies expense" prefix="$" step="1"
                    value={inputs.suppliesExpense} onChange={update("suppliesExpense")} error={errorsByField.get("suppliesExpense")}
                    helper="Consumables used by this stay: toiletries, coffee, linens wear, welcome items." />
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <NumField id="ab-other" label="Other booking-specific costs" prefix="$" step="1"
                    value={inputs.otherCosts} onChange={update("otherCosts")} error={errorsByField.get("otherCosts")}
                    helper="Any other cost that exists only because of this booking — key handover, per-stay insurance, guest-caused minor fixes." />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <button type="button" onClick={loadExample} className="button-indigo-secondary" style={{ flex: 1, minWidth: 140 }}>
                    Load worked example
                  </button>
                  <button type="button" onClick={resetAll} className="button-indigo-secondary" style={{ flex: 1, minWidth: 100 }}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="finder-panel" style={{ marginTop: 24 }}>
                <h2 className="rental-calc-panel-title">Read this before trusting the number</h2>
                <ul className="airbnb-calc-exclusions">
                  <li>
                    <strong>Fee base used here:</strong> platform and management fees are calculated as
                    percentages of <strong>gross booking revenue</strong> — accommodation revenue plus the
                    guest cleaning fee plus additional charges. Real fee structures vary: split guest/host
                    fees, host-only fees and the exact base differ by listing, market and your settings.
                    There is no single official percentage — always use the percentages from your own
                    payout breakdown for a booking like this one.
                  </li>
                  <li>
                    <strong>Contribution is not profit.</strong> This booking figure excludes everything
                    that exists whether or not this guest books: mortgage or rent, property tax,
                    insurance, baseline utilities, and your income taxes. A booking can contribute
                    positively while the property as a whole does not — the{" "}
                    <a href="/tools/rental-property-investment-calculator">Rental Property Investment
                    Calculator</a>{" "}covers the full-property picture.
                  </li>
                  <li>
                    <strong>Taxes are excluded on purpose.</strong> Occupancy and lodging taxes you collect
                    for a tax authority pass through you; they are never revenue and are not in any figure
                    on this page.
                  </li>
                </ul>
              </div>
            </div>

            <div className="rental-calc-results">
              <p className="rental-calc-sr-only" aria-live="polite">
                Net booking contribution {formatUSD(result.netContribution, { cents: true })}. Contribution
                margin {formatPercent(result.contributionMarginPercent)}.
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
                  NET BOOKING CONTRIBUTION
                </span>
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
                  {formatUSD(result.netContribution, { cents: true })}
                </div>
                <p style={{ fontSize: 13, color: "#A7ADD9", marginTop: 10, lineHeight: 1.65 }}>
                  What this booking leaves after the platform fee, management fee and the costs this
                  booking itself caused
                  {result.contributionPerNight !== null
                    ? ` — ${formatUSD(result.contributionPerNight, { cents: true })} per night`
                    : ""}
                  . Fixed property costs, debt service and income taxes are not in this figure, so
                  it is a contribution, not the booking&apos;s total profit.
                </p>
              </div>

              <div className="rental-calc-metrics">
                <div className="metric-card">
                  <span className="metric-label">Accommodation revenue</span>
                  <span className="metric-value">{formatUSD(result.accommodationRevenue, { cents: true })}</span>
                  <span className="metric-delta">
                    {formatUSD(inputs.nightlyRate, { cents: true })} × {inputs.nightsBooked} nights
                  </span>
                </div>
                <div className="metric-card is-brand">
                  <span className="metric-label">Gross booking revenue</span>
                  <span className="metric-value">{formatUSD(result.grossBookingRevenue, { cents: true })}</span>
                  <span className="metric-delta">Accommodation + cleaning fee + additional charges</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Platform fee</span>
                  <span className="metric-value">{formatUSD(result.platformFeeAmount, { cents: true })}</span>
                  <span className="metric-delta">{inputs.platformFeePercent}% of gross booking revenue</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Management fee</span>
                  <span className="metric-value">{formatUSD(result.managementFeeAmount, { cents: true })}</span>
                  <span className="metric-delta">{inputs.managementFeePercent}% of gross booking revenue</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Total variable costs</span>
                  <span className="metric-value">{formatUSD(result.totalVariableCosts, { cents: true })}</span>
                  <span className="metric-delta">Both fees + cleaning + supplies + other booking costs</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Contribution margin</span>
                  <span className="metric-value">{formatPercent(result.contributionMarginPercent)}</span>
                  <span className="metric-delta">
                    Contribution ÷ gross revenue ·{" "}
                    {result.contributionPerNight === null
                      ? "per night —"
                      : `${formatUSD(result.contributionPerNight, { cents: true })} per night`}
                  </span>
                </div>
              </div>

              <div className="finder-panel">
                <h3 className="rental-calc-block-title">Where this booking&apos;s money goes</h3>
                <figure className="rental-calc-chart">
                  <figcaption className="helper-premium">
                    Gross booking revenue against everything this booking costs, with the contribution
                    left over. All amounts are for this single booking.
                  </figcaption>
                  <div className="rental-calc-bars">
                    <BarRow label="Gross booking revenue" amount={result.grossBookingRevenue} max={flowMax} tone="brand" />
                    {costLines.map((line) => (
                      <BarRow key={line.label} label={line.label} amount={line.amount} max={flowMax} tone="muted" />
                    ))}
                    <BarRow
                      label="Net contribution"
                      amount={result.netContribution}
                      max={flowMax}
                      tone={result.netContribution < 0 ? "danger" : "success"}
                    />
                  </div>
                </figure>
                <p className="helper-premium" style={{ marginTop: 12 }}>
                  The guest cleaning fee is revenue you collect; the actual cleaning expense is a cost you
                  pay. When the fee is higher than the real cost, the difference adds to contribution —
                  when a long clean or a small fee flips that, this booking shows it.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={copySummary} className="button-indigo-secondary" style={{ flex: 1, minWidth: 140 }}>
                  {copied ? "Copied" : "Copy summary"}
                </button>
              </div>

              <p className="helper-premium">
                A preliminary per-booking calculation from the figures you entered. It is not your payout
                statement and not financial advice — your platform payout breakdown is the record of what
                you were actually charged and paid.
              </p>
            </div>
          </div>

          {/* Future advertising region: intentionally empty and hidden, placed
              after the form and results — never between controls or results.
              AdSense is NOT active; do not render an ad unit here without a
              separate approval. */}
          <div className="airbnb-calc-ad-region" data-ad-region="airbnb-booking-below-tool" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
