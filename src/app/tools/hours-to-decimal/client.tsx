"use client";

import { useState } from "react";
import { LOCALE_META } from "@/lib/i18n/locales";
import { tServer } from "@/lib/i18n/dictionaries";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatDuration } from "@/lib/tools/time-card";
import { ReportBrandingFields, useReportBranding } from "@/components/tools/report-branding";
import { dataUrlToCompanyLogo } from "@/lib/tools/report-branding";
import { useLanguage } from "@/lib/i18n/provider";

export default function HoursToDecimalClient() {
  const { t, locale, formatNumber } = useLanguage();
  const { branding } = useReportBranding();
  const [hours, setHours] = useState("8");
  const [minutes, setMinutes] = useState("30");
  const [decimal, setDecimal] = useState("8.50");

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const decimalFromHM = formatNumber(totalMinutes / 60, 2);
  const decimalValue = Number(decimal) || 0;
  const backHours = Math.floor(decimalValue);
  const backMinutes = Math.round((decimalValue - backHours) * 60);

  const tableRows = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  async function downloadPdf() {
    const nonLatin = LOCALE_META[locale].script !== "latin";
    const tr = nonLatin
      ? (key: string, vars?: Record<string, string | number>) => tServer("en", key, vars)
      : (key: string, vars?: Record<string, string | number>) => t(key, vars);
    const fmt = nonLatin ? (n: number, d = 2) => n.toFixed(d) : formatNumber;
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const { buildPremiumPdfBytes, fetchLogoBytes } = await import("@/lib/tools/premium-pdf");
    const bytes = await buildPremiumPdfBytes({
      title: tr("htd.title"),
      meta: nonLatin ? [tServer("en", "tc.pdfNonLatinNote", { script: LOCALE_META[locale].scriptName })] : [],
      sections: [
        {
          heading: tr("htd.hmTitle"),
          emphasis: true,
          lines: [
            tr("htd.resultHM", { duration: formatDuration(totalMinutes), decimal: fmt(totalMinutes / 60, 2) }),
            `${h} + ${m} / 60 = ${fmt(totalMinutes / 60, 2)}`,
          ],
        },
        {
          heading: tr("htd.decimalTitle"),
          emphasis: true,
          lines: [
            tr("htd.resultBack", { decimal: fmt(decimalValue, 2), hours: backHours, minutes: backMinutes }),
            `${fmt(decimalValue, 2)} = ${backHours}h ${backMinutes}m`,
          ],
        },
      ],
      createdWith: tr("common.createdWith"),
      logoBytes: await fetchLogoBytes(),
      pageOfTemplate: tr("common.pageOf"),
      companyName: branding.companyName,
      companyLogo: dataUrlToCompanyLogo(branding.logoDataUrl, branding.logoMime) ?? undefined,
    });
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "hours-to-decimal-result.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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

        <div style={{ marginTop: 24 }}>
          <ReportBrandingFields />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <button type="button" className="button-indigo" onClick={downloadPdf}>{t("common.downloadPdf")}</button>
        </div>
      </section>
    </>
  );
}
