"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatDuration } from "@/lib/tools/time-card";

export default function HoursToDecimalClient() {
  const [hours, setHours] = useState("8");
  const [minutes, setMinutes] = useState("30");
  const [decimal, setDecimal] = useState("8.50");

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const decimalFromHM = (totalMinutes / 60).toFixed(2);
  const decimalValue = Number(decimal) || 0;
  const backHours = Math.floor(decimalValue);
  const backMinutes = Math.round((decimalValue - backHours) * 60);

  const tableRows = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>Hours to Decimal Converter</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>
          Convert hours and minutes to decimal hours and back. Decimal hours divide minutes by 60: 30 minutes is 0.50 hours, not 0.30.
          Timesheets and payroll systems commonly use decimal hours, so this conversion keeps your totals consistent.
        </p>

        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <section style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20 }}>Hours and minutes → decimal hours</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div className="field">
                <label className="label-premium" htmlFor="htd-hours">Hours</label>
                <input id="htd-hours" className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="htd-minutes">Minutes</label>
                <input id="htd-minutes" className="input-premium" type="number" inputMode="numeric" min="0" max="59" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} />
              </div>
            </div>
            <p><strong>{formatDuration(totalMinutes)} = {decimalFromHM} decimal hours</strong></p>
            <p style={{ color: "#475569" }}>Example: 8 hours 30 minutes = 8 + 30 ÷ 60 = 8.50 hours.</p>
          </section>

          <section style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20 }}>Decimal hours → hours and minutes</h2>
            <div className="field">
              <label className="label-premium" htmlFor="htd-decimal">Decimal hours</label>
              <input id="htd-decimal" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={decimal} onChange={e => setDecimal(e.target.value)} />
            </div>
            <p><strong>{decimalValue.toFixed(2)} decimal hours = {backHours}h {backMinutes}m</strong></p>
            <p style={{ color: "#475569" }}>Example: 8.50 hours = 8 hours + 0.50 × 60 = 8 hours 30 minutes.</p>
          </section>
        </div>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20 }}>Conversion table</h2>
          <p style={{ color: "#475569" }}>Minutes in an hour, as decimal hours. Common payroll values are 15 minutes = 0.25, 30 minutes = 0.50, and 45 minutes = 0.75.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead><tr><th style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Minutes</th><th style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Decimal hours</th><th style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Minutes</th><th style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Decimal hours</th></tr></thead>
              <tbody>
                {tableRows.slice(0, 7).map((m, i) => {
                  const m2 = tableRows[i + 7] ?? 60;
                  return (
                    <tr key={m}>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{m} minutes</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{(m / 60).toFixed(2)}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{m2 === 60 ? "60 minutes (1 hour)" : `${m2} minutes`}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{(m2 / 60).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ color: "#475569" }}>Try it in context: use the <a href="/tools/time-card-calculator">Work Hours &amp; Time Card Calculator</a> for full weekly timesheets, or the <a href="/tools/work-hours-calculator">Work Hours Calculator</a> for a single shift.</p>
        </section>
      </section>
    </>
  );
}
