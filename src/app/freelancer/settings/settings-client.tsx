"use client";

import { useEffect, useRef, useState } from "react";
import { useFreelancerData } from "../data-context";
import { DEFAULT_APP_SETTINGS, FreelancerSettings, type AppSettings } from "@/lib/freelancer/settings";
import type { ReportBranding } from "@/lib/tools/report-branding";
import {
  formatRateDollars,
  parseMultiplier,
  parseNonNegativeInt,
  parseRateDollars,
  parseThresholdHours,
} from "@/lib/freelancer/forms";
import {
  alertBox,
  card,
  dangerButton,
  errorText,
  field,
  h1,
  h2,
  input,
  label,
  mutedText,
  noticeBox,
  pageWrap,
  primaryButton,
  row,
  secondaryButton,
} from "../styles";

/**
 * Settings (M2): app defaults + report branding.
 *
 * - App defaults: currency, default hourly rate, overtime defaults
 *   (off / 40h / 1.5×), payment terms, invoice number prefix. New
 *   clients start from these values; existing clients are unaffected.
 * - Company name + logo for PDF branding: one company-name field
 *   writes BOTH the settings name (used in timesheet CSVs) and the
 *   report-branding name (used in invoice PDF headers), so the two can
 *   never disagree. Logo: PNG/JPEG up to 2 MB, processed locally on
 *   the device (premium-output standard); name-only or logo-only input
 *   is shown cleanly, neither is required.
 * - Reset restores defaults. Record data (clients, sessions, invoices)
 *   is never touched by a settings reset (M1 P-6).
 * English only in M2 — no language selector yet.
 */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function SettingsClient() {
  const { settings, branding, error, refresh, saveSettings, saveBranding } = useFreelancerData();
  const initialized = useRef(false);
  const [fCurrency, setFCurrency] = useState("USD");
  const [fRate, setFRate] = useState("");
  const [fOtOn, setFOtOn] = useState(false);
  const [fOtThreshold, setFOtThreshold] = useState("40");
  const [fOtMultiplier, setFOtMultiplier] = useState("1.5");
  const [fTerms, setFTerms] = useState("14");
  const [fPrefix, setFPrefix] = useState("INV");
  const [fCompany, setFCompany] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoMime, setLogoMime] = useState<"image/png" | "image/jpeg" | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function applyForm(s: AppSettings, b: ReportBranding | null) {
    setFCurrency(s.defaultCurrency);
    setFRate(s.defaultRateCents !== null ? formatRateDollars(s.defaultRateCents) : "");
    setFOtOn(s.overtimeEnabled);
    setFOtThreshold(String(s.overtimeThresholdHours));
    setFOtMultiplier(String(s.overtimeMultiplier));
    setFTerms(String(s.defaultPaymentTermsDays));
    setFPrefix(s.invoiceNumberPrefix);
    setFCompany(s.companyName || b?.companyName || "");
    setLogoDataUrl(b?.logoDataUrl ?? null);
    setLogoMime(b?.logoMime ?? null);
  }

  useEffect(() => {
    if (initialized.current || !settings) return;
    initialized.current = true;
    applyForm(settings, branding);
  }, [settings, branding]);

  if (error) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Settings</h1>
        <p role="alert" style={alertBox}>{error}</p>
      </main>
    );
  }
  if (!settings) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Settings</h1>
        <p>Loading your settings…</p>
      </main>
    );
  }

  function handleLogoFile(file: File | undefined) {
    setSaveError(null);
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setFormErrors([`"${file.name}" is not a PNG or JPEG image. Only PNG and JPEG logos are accepted.`]);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setFormErrors([`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — logos must be 2 MB or smaller.`]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
      setLogoMime(file.type as "image/png" | "image/jpeg");
      setFormErrors([]);
    };
    reader.onerror = () => setFormErrors(["The logo could not be read. Try a different file."]);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const errors: string[] = [];
    let defaultRateCents: number | null = null;
    if (fRate.trim() !== "") {
      const parsed = parseRateDollars(fRate);
      if (!parsed.ok) errors.push(parsed.error);
      else defaultRateCents = parsed.cents;
    }
    const terms = parseNonNegativeInt(fTerms, "Payment terms");
    if (!terms.ok) errors.push(terms.error);
    let threshold = 40;
    let multiplier = 1.5;
    if (fOtOn) {
      const t = parseThresholdHours(fOtThreshold);
      if (!t.ok) errors.push(t.error);
      else threshold = t.value;
      const m = parseMultiplier(fOtMultiplier);
      if (!m.ok) errors.push(m.error);
      else multiplier = m.value;
    }
    if (!fCurrency.trim()) errors.push("Enter a default currency code, e.g. USD.");
    if (!fPrefix.trim()) errors.push("Enter an invoice number prefix, e.g. INV.");
    if (errors.length > 0) {
      setFormErrors(errors);
      setSaved(false);
      return;
    }
    setFormErrors([]);
    setSaveError(null);
    setSaving(true);
    try {
      const next: AppSettings = {
        ...settings,
        defaultCurrency: fCurrency.trim().toUpperCase(),
        defaultRateCents,
        overtimeEnabled: fOtOn,
        overtimeThresholdHours: threshold,
        overtimeMultiplier: multiplier,
        defaultPaymentTermsDays: (terms as { ok: true; value: number }).value,
        invoiceNumberPrefix: fPrefix.trim().toUpperCase(),
        companyName: fCompany.trim(),
      };
      await saveSettings(next);
      await saveBranding({ companyName: fCompany.trim(), logoDataUrl, logoMime });
      setSaved(true);
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaveError(null);
    try {
      // M1 reset semantics: removes the settings key only. Record data
      // is untouched, and report branding is a separate key — it stays.
      await new FreelancerSettings().reset();
      applyForm({ ...DEFAULT_APP_SETTINGS }, branding);
      setConfirmReset(false);
      setSaved(false);
      setFormErrors([]);
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main style={pageWrap}>
      <h1 style={h1}>Settings</h1>
      <p style={mutedText}>
        Defaults for new clients. Changing a default never changes an existing client, session, or invoice.
      </p>
      {saveError && <p role="alert" style={alertBox}>{saveError}</p>}
      {saved && <p role="status" style={noticeBox}>Settings saved.</p>}
      <form onSubmit={handleSave} noValidate>
        <section style={card} aria-label="App defaults">
          <h2 style={h2}>App defaults</h2>
          <div style={row}>
            <div style={field}>
              <label style={label} htmlFor="st-currency">Default currency</label>
              <input id="st-currency" style={input} value={fCurrency} onChange={(e) => setFCurrency(e.target.value)} placeholder="USD" />
            </div>
            <div style={field}>
              <label style={label} htmlFor="st-rate">Default hourly rate ($) — optional</label>
              <input id="st-rate" style={input} inputMode="decimal" value={fRate} onChange={(e) => setFRate(e.target.value)} placeholder="No rate set" />
            </div>
            <div style={field}>
              <label style={label} htmlFor="st-terms">Default payment terms (days)</label>
              <input id="st-terms" style={input} inputMode="numeric" value={fTerms} onChange={(e) => setFTerms(e.target.value)} />
            </div>
          </div>
          <div style={field}>
            <label style={label} htmlFor="st-prefix">Invoice number prefix</label>
            <input id="st-prefix" style={input} value={fPrefix} onChange={(e) => setFPrefix(e.target.value)} />
            <p style={{ ...mutedText, marginTop: 4, marginBottom: 0 }}>Invoices are numbered {fPrefix || "INV"}-YYYYMMDD-NNN.</p>
          </div>
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 15, fontWeight: 600, color: "#1B1B4B" }}>
              <input type="checkbox" checked={fOtOn} onChange={(e) => setFOtOn(e.target.checked)} />
              Overtime on by default for new clients
            </label>
            {fOtOn ? (
              <div style={row}>
                <div style={field}>
                  <label style={label} htmlFor="st-ot-threshold">Overtime after (hours/week)</label>
                  <input id="st-ot-threshold" style={input} inputMode="decimal" value={fOtThreshold} onChange={(e) => setFOtThreshold(e.target.value)} />
                </div>
                <div style={field}>
                  <label style={label} htmlFor="st-ot-multiplier">Overtime multiplier (×)</label>
                  <input id="st-ot-multiplier" style={input} inputMode="decimal" value={fOtMultiplier} onChange={(e) => setFOtMultiplier(e.target.value)} />
                </div>
              </div>
            ) : (
              <p style={mutedText}>Off — a new client&apos;s hours are all regular time unless you turn overtime on for that client.</p>
            )}
          </div>
        </section>

        <section style={card} aria-label="Company branding">
          <h2 style={h2}>Company branding (PDF reports)</h2>
          <p style={mutedText}>
            Your company name and logo head your invoice PDFs. The logo stays on this device and is never uploaded anywhere.
          </p>
          <div style={field}>
            <label style={label} htmlFor="st-company">Company name</label>
            <input id="st-company" style={input} value={fCompany} onChange={(e) => setFCompany(e.target.value)} placeholder="Your business name" />
          </div>
          <div style={field}>
            <label style={label} htmlFor="st-logo">Company logo (PNG or JPEG, up to 2 MB)</label>
            <input
              id="st-logo"
              style={input}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
          </div>
          {logoDataUrl && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUrl} alt="Company logo preview" style={{ maxWidth: 200, maxHeight: 80, objectFit: "contain" }} />
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => {
                    setLogoDataUrl(null);
                    setLogoMime(null);
                  }}
                >
                  Remove logo
                </button>
              </div>
            </div>
          )}
        </section>

        {formErrors.length > 0 && (
          <div role="alert" style={{ marginBottom: 12 }}>
            {formErrors.map((err) => (
              <p key={err} style={errorText}>{err}</p>
            ))}
          </div>
        )}
        <div style={row}>
          <button type="submit" style={primaryButton} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          {confirmReset ? (
            <>
              <button type="button" style={dangerButton} onClick={handleReset}>Confirm reset to defaults</button>
              <button type="button" style={secondaryButton} onClick={() => setConfirmReset(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" style={secondaryButton} onClick={() => setConfirmReset(true)}>Reset to defaults</button>
          )}
        </div>
        <p style={{ ...mutedText, marginTop: 12 }}>
          Reset restores the defaults ({DEFAULT_APP_SETTINGS.defaultCurrency}, overtime off, {DEFAULT_APP_SETTINGS.overtimeThresholdHours}h /{" "}
          {DEFAULT_APP_SETTINGS.overtimeMultiplier}×, {DEFAULT_APP_SETTINGS.defaultPaymentTermsDays} days). Your clients, sessions, and invoices are
          never touched by a reset.
        </p>
      </form>
    </main>
  );
}
