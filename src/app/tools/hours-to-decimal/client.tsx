"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatDuration } from "@/lib/tools/time-card";
import { useLanguage } from "@/lib/i18n/provider";

export default function HoursToDecimalClient() {
  const { t, formatNumber } = useLanguage();
  const [hours, setHours] = useState("8");
  const [minutes, setMinutes] = useState("30");
  const [decimal, setDecimal] = useState("8.50");

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const decimalFromHM = formatNumber(totalMinutes / 60, 2);
  const decimalValue = Number(decimal) || 0;
  const backHours = Math.floor(decimalValue);
  const backMinutes = Math.round((decimalValue - backHours) * 60);

  const tableRows = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>{t("htd.title")}</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>{t("htd.subtitle")}</p>

        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <section style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20 }}>{t("htd.hmTitle")}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div className="field">
                <label className="label-premium" htmlFor="htd-hours">{t("htd.hours")}</label>
                <input id="htd-hours" className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="htd-minutes">{t("htd.minutes")}</label>
                <input id="htd-minutes" className="input-premium" type="number" inputMode="numeric" min="0" max="59" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} />
              </div>
            </div>
            <p><strong>{t("htd.resultHM", { duration: formatDuration(totalMinutes), decimal: decimalFromHM })}</strong></p>
            <p style={{ color: "#475569" }}>{t("htd.exampleHM")}</p>
          </section>

          <section style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 20 }}>{t("htd.decimalTitle")}</h2>
            <div className="field">
              <label className="label-premium" htmlFor="htd-decimal">{t("htd.decimalHours")}</label>
              <input id="htd-decimal" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={decimal} onChange={e => setDecimal(e.target.value)} />
            </div>
            <p><strong>{t("htd.resultBack", { decimal: formatNumber(decimalValue, 2), hours: backHours, minutes: backMinutes })}</strong></p>
            <p style={{ color: "#475569" }}>{t("htd.exampleBack")}</p>
          </section>
        </div>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20 }}>{t("htd.tableTitle")}</h2>
          <p style={{ color: "#475569" }}>{t("htd.tableNote")}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead><tr><th style={{ textAlign: "start", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("htd.minutesCol")}</th><th style={{ textAlign: "start", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("htd.decimalCol")}</th><th style={{ textAlign: "start", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("htd.minutesCol")}</th><th style={{ textAlign: "start", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("htd.decimalCol")}</th></tr></thead>
              <tbody>
                {tableRows.slice(0, 7).map((m, i) => {
                  const m2 = tableRows[i + 7] ?? 60;
                  return (
                    <tr key={m}>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{m} {t("htd.minutes").toLowerCase()}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatNumber(m / 60, 2)}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{m2} {t("htd.minutes").toLowerCase()}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatNumber(m2 / 60, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}
