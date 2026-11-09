"use client";

import { useMemo, useState } from "react";
import { LOCALE_META } from "@/lib/i18n/locales";
import { tServer } from "@/lib/i18n/dictionaries";
import { ScrollReveal } from "@/components/scroll-reveal";
import { calculateTimesheet, formatDecimalHours, formatDuration, formatMoney as formatMoneyAscii, parseTimeToMinutes } from "@/lib/tools/time-card";
import { shareOrDownloadBlob } from "@/lib/mobile/capacitor";
import { ReportBrandingFields, useReportBranding } from "@/components/tools/report-branding";
import { dataUrlToCompanyLogo } from "@/lib/tools/report-branding";
import { useLanguage } from "@/lib/i18n/provider";

export default function WorkHoursClient() {
  const { t, locale, formatDate, formatMoney } = useLanguage();
  const { branding } = useReportBranding();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [endsNextDay, setEndsNextDay] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [rate, setRate] = useState("");

  const result = useMemo(
    () =>
      calculateTimesheet({
        weekStart: date,
        period: "weekly",
        sessions: [{ id: "single", date, start, end, endsNextDay, breakMinutes: Number(breakMinutes) || 0 }],
        hourlyRate: rate === "" ? null : Number(rate),
        currency: "USD",
        overtimeThresholdHours: 40,
        overtimeMultiplier: 1.5,
      }),
    [date, start, end, endsNextDay, breakMinutes, rate]
  );

  const session = result.sessions[0];
  // Translate validation errors by code; fall back to the engine message.
  const translatedErrors = result.errors.map(e => {
    if (!e.code) return e.message;
    const s = result.sessions[0]?.session ?? { date, start, end, breakMinutes: Number(breakMinutes) || 0 };
    const startMin = parseTimeToMinutes(s.start) ?? 0;
    const endMin = parseTimeToMinutes(s.end) ?? 0;
    const gross = endMin - startMin + (endsNextDay ? 1440 : 0);
    return t(`tc.err.${e.code}`, { date: s.date, start: s.start, end: s.end, break: s.breakMinutes, gross });
  });

  async function downloadPdf() {
    if (!session || result.errors.length > 0) return;
    const nonLatin = LOCALE_META[locale].script !== "latin";
    const tr = nonLatin
      ? (key: string, vars?: Record<string, string | number>) => tServer("en", key, vars)
      : (key: string, vars?: Record<string, string | number>) => t(key, vars);
    const { buildPremiumPdfBytes, fetchLogoBytes, fetchPremiumFontBytes } = await import("@/lib/tools/premium-pdf");
    const bytes = await buildPremiumPdfBytes({
      title: tr("wh.title"),
      meta: [
        ...(nonLatin ? [tServer("en", "tc.pdfNonLatinNote", { script: LOCALE_META[locale].scriptName })] : []),
        `${tr("wh.date")}: ${date}`,
      ],
      sections: [
        {
          heading: tr("wh.title"),
          lines: [
            `${tr("wh.start")}: ${start}`,
            `${tr("wh.end")}: ${end}`,
            `${tr("tc.reportNextDay")}: ${endsNextDay ? tr("tc.reportYes") : tr("tc.reportNo")}`,
            `${tr("wh.breakMinutes")}: ${breakMinutes}`,
            ...(rate !== "" ? [`${tr("wh.rate")}: ${formatMoneyAscii(Math.round(Number(rate) * 100), "USD")}`] : []),
          ],
        },
        {
          heading: tr("wh.paidTime"),
          emphasis: true,
          lines: [
            `${tr("wh.shiftLength")}: ${formatDuration(session.grossMinutes)}`,
            `${tr("wh.paidTime")}: ${formatDuration(session.paidMinutes)} (${formatDecimalHours(session.paidMinutes)})`,
            ...(session.segments.length > 1 ? [`${tr("wh.overnightSplit")}: ${session.segments.map(sg => `${sg.date}: ${formatDuration(sg.paidMinutes)} (${sg.breakMinutes}m)`).join("; ")}`] : []),
            ...(rate !== "" ? [`${tr("wh.payShift")}: ${formatMoneyAscii(result.payCents, "USD")}`] : []),
          ],
        },
      ],
      createdWith: tr("common.createdWith"),
      logoBytes: await fetchLogoBytes(),
      fontBytes: await fetchPremiumFontBytes(),
      pageOfTemplate: tr("common.pageOf"),
      companyName: branding.companyName,
      companyLogo: dataUrlToCompanyLogo(branding.logoDataUrl, branding.logoMime) ?? undefined,
    });
    await shareOrDownloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "work-hours-result.pdf");
  }

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>{t("wh.title")}</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>{t("wh.subtitle")}</p>

        {translatedErrors.length > 0 && (
          <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>{translatedErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
          <div className="field">
            <label className="label-premium" htmlFor="wh-date">{t("wh.date")}</label>
            <input id="wh-date" className="input-premium" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-start">{t("wh.start")}</label>
            <input id="wh-start" className="input-premium" type="time" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-end">{t("wh.end")}</label>
            <input id="wh-end" className="input-premium" type="time" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={endsNextDay} onChange={e => setEndsNextDay(e.target.checked)} />
            {t("wh.endsNextDay")}
          </label>
          <div className="field">
            <label className="label-premium" htmlFor="wh-break">{t("wh.breakMinutes")}</label>
            <input id="wh-break" className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
          </div>
          <div className="field">
            <label className="label-premium" htmlFor="wh-rate">{t("wh.rate")}</label>
            <input id="wh-rate" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
        </div>

        {session && result.errors.length === 0 && (
          <div style={{ marginTop: 24, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <p><strong>{t("wh.shiftLength")}:</strong> {formatDuration(session.grossMinutes)}.</p>
            <p><strong>{t("wh.paidTime")}:</strong> {formatDuration(session.paidMinutes)} ({formatDecimalHours(session.paidMinutes)}).</p>
            {session.segments.length > 1 && (
              <p style={{ color: "#475569" }}>
                {t("wh.overnightSplit")}: {session.segments.map(s => `${formatDate(s.date)}: ${formatDuration(s.paidMinutes)} (${s.breakMinutes}m)`).join("; ")}.
              </p>
            )}
            {rate !== "" && <p><strong>{t("wh.payShift")}:</strong> {formatMoney(result.payCents, "USD")}.</p>}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <ReportBrandingFields />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <button type="button" className="button-indigo" disabled={!session || result.errors.length > 0} onClick={downloadPdf}>{t("common.downloadPdf")}</button>
          <button type="button" className="button-indigo-secondary" onClick={() => { setStart("09:00"); setEnd("17:30"); setEndsNextDay(false); setBreakMinutes("30"); }}>{t("wh.exampleDay")}</button>
          <button type="button" className="button-indigo-secondary" onClick={() => { setStart("22:00"); setEnd("06:00"); setEndsNextDay(true); setBreakMinutes("30"); }}>{t("wh.exampleNight")}</button>
        </div>
        <p style={{ color: "#475569", marginTop: 16 }}>{t("wh.note")}</p>
      </section>
    </>
  );
}
