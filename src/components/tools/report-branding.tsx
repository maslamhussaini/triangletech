"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import {
  clearStoredBranding,
  loadStoredBranding,
  storeBranding,
  validateLogoFile,
  type ReportBranding,
} from "@/lib/tools/report-branding";

type ReportBrandingValue = {
  branding: ReportBranding;
  saveOnDevice: boolean;
  setCompanyName: (name: string) => void;
  setLogo: (dataUrl: string, mime: "image/png" | "image/jpeg") => void;
  removeLogo: () => void;
  setSaveOnDevice: (on: boolean) => void;
  clearAll: () => void;
};

const ReportBrandingContext = createContext<ReportBrandingValue | null>(null);

export function useReportBranding(): ReportBrandingValue {
  const value = useContext(ReportBrandingContext);
  if (!value) throw new Error("useReportBranding must be used inside ReportBrandingProvider");
  return value;
}

/**
 * Holds the user's company branding for all six tools. State starts
 * from saved device storage when present; otherwise it is session
 * only. Storage is written only while saveOnDevice is on, and only
 * with the branding itself — never anything else.
 */
export function ReportBrandingProvider({ children }: { children: ReactNode }) {
  // Initial state deliberately matches the server render (no branding).
  // Stored branding is applied in a post-mount effect: reading localStorage
  // in the state initializer would make the first client render differ from
  // the SSR HTML and trigger a React hydration error on every page that
  // has saved branding.
  const [branding, setBranding] = useState<ReportBranding>({ companyName: "", logoDataUrl: null, logoMime: null });
  const [saveOnDevice, setSaveOnDeviceState] = useState<boolean>(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Intentional post-mount
     hydration load: initial state must match the server render (no
     branding); stored branding is applied after mount so the first
     client render never differs from SSR. */
  useEffect(() => {
    const stored = loadStoredBranding();
    if (stored) {
      setBranding(stored);
      setSaveOnDeviceState(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (saveOnDevice) storeBranding(branding);
  }, [branding, saveOnDevice]);

  const setCompanyName = useCallback((name: string) => {
    setBranding(prev => ({ ...prev, companyName: name }));
  }, []);

  const setLogo = useCallback((dataUrl: string, mime: "image/png" | "image/jpeg") => {
    setBranding(prev => ({ ...prev, logoDataUrl: dataUrl, logoMime: mime }));
  }, []);

  const removeLogo = useCallback(() => {
    setBranding(prev => ({ ...prev, logoDataUrl: null, logoMime: null }));
  }, []);

  const setSaveOnDevice = useCallback((on: boolean) => {
    setSaveOnDeviceState(on);
    // Turning on persists via the effect above; turning off clears
    // immediately so nothing lingers after the user opts out.
    if (!on) clearStoredBranding();
  }, []);

  const clearAll = useCallback(() => {
    clearStoredBranding();
    setSaveOnDeviceState(false);
    setBranding({ companyName: "", logoDataUrl: null, logoMime: null });
  }, []);

  const value = useMemo<ReportBrandingValue>(
    () => ({ branding, saveOnDevice, setCompanyName, setLogo, removeLogo, setSaveOnDevice, clearAll }),
    [branding, saveOnDevice, setCompanyName, setLogo, removeLogo, setSaveOnDevice, clearAll],
  );
  return <ReportBrandingContext.Provider value={value}>{children}</ReportBrandingContext.Provider>;
}

/**
 * Reusable "Report branding" fields, mounted in each tool's export
 * area: company name, logo upload, remove logo, and a live header
 * preview. The company name is rendered as plain text only.
 */
export function ReportBrandingFields() {
  const { t } = useLanguage();
  const { branding, saveOnDevice, setCompanyName, setLogo, removeLogo, setSaveOnDevice, clearAll } = useReportBranding();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const valid = validateLogoFile(file);
    if (!valid.ok) {
      setError(t(valid.reason === "size" ? "rb.tooLarge" : "rb.invalidType"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      const mime = file.type.toLowerCase() === "image/png" ? "image/png" : "image/jpeg";
      if (!url || !url.startsWith("data:image/")) {
        setError(t("rb.unreadable"));
        return;
      }
      // Confirm the image actually decodes before accepting it, so a
      // corrupt file never reaches a report.
      const probe = new Image();
      probe.onload = () => {
        setError(null);
        setLogo(url, mime as "image/png" | "image/jpeg");
      };
      probe.onerror = () => setError(t("rb.unreadable"));
      probe.src = url;
    };
    reader.onerror = () => setError(t("rb.unreadable"));
    reader.readAsDataURL(file);
  };

  const hasBrand = branding.companyName.trim().length > 0 || branding.logoDataUrl !== null;

  return (
    <section aria-label={t("rb.title")} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#312E81" }}>{t("rb.title")}</h3>
      <div className="field">
        <label className="label-premium" htmlFor="rb-company-name">{t("rb.companyName")}</label>
        <input
          id="rb-company-name"
          className="input-premium"
          type="text"
          value={branding.companyName}
          maxLength={100}
          placeholder={t("rb.companyNamePlaceholder")}
          onChange={e => setCompanyName(e.target.value)}
          style={{ minHeight: 44 }}
        />
      </div>
      <div className="field">
        <label className="label-premium" htmlFor="rb-logo">{t("rb.logoLabel")}</label>
        <input
          id="rb-logo"
          ref={fileRef}
          className="input-premium"
          type="file"
          accept="image/png,image/jpeg"
          onChange={e => {
            onFile(e.target.files?.[0]);
            // Allow re-selecting the same file after a rejection.
            e.target.value = "";
          }}
          style={{ minHeight: 44 }}
        />
        {branding.logoDataUrl && (
          <button type="button" className="button-indigo-secondary" onClick={removeLogo} style={{ minHeight: 40, marginTop: 8 }}>
            {t("rb.removeLogo")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" style={{ margin: 0, color: "#B42318", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {hasBrand && (
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#312E81" }}>{t("rb.preview")}</p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 56,
              padding: "8px 16px",
              borderRadius: 8,
              background: "linear-gradient(90deg, #4F46E5, #7C5CFF)",
              color: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            {branding.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoDataUrl} alt="" style={{ height: 40, width: "auto", maxWidth: 160, objectFit: "contain" }} />
            )}
            {branding.companyName.trim() && (
              <span style={{ fontWeight: 700, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {branding.companyName.trim()}
              </span>
            )}
          </div>
        </div>
      )}
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={saveOnDevice}
          onChange={e => setSaveOnDevice(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span>
          {t("rb.saveOnDevice")}
          {!saveOnDevice && <span style={{ display: "block", fontWeight: 400, color: "#475569" }}>{t("rb.sessionNote")}</span>}
        </span>
      </label>
      {(hasBrand || saveOnDevice) && (
        <div>
          <button type="button" className="button-indigo-secondary" onClick={clearAll} style={{ minHeight: 40 }}>
            {t("rb.clearSaved")}
          </button>
        </div>
      )}
      <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>{t("rb.latinPdfNote")}</p>
    </section>
  );
}

/**
 * Print-only company header for browser Print: a fixed strip that
 * repeats on every printed page (Chromium/Firefox print behaviour).
 * It renders nothing on screen and nothing at all when no branding
 * is set. The @page top margin keeps page content clear of the
 * strip on every page.
 */
export function ReportBrandingPrintHeader() {
  const { branding } = useReportBranding();
  const name = branding.companyName.trim();
  if (!name && !branding.logoDataUrl) return null;
  return (
    <>
      <style>{`@media print { @page { margin-top: 64px; } .rb-print-header { display: flex !important; } }`}</style>
      <div
        className="rb-print-header"
        aria-hidden="true"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          background: "linear-gradient(90deg, #4F46E5, #7C5CFF)",
          color: "#FFFFFF",
          zIndex: 9999,
        }}
      >
        {branding.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoDataUrl} alt="" style={{ height: 32, width: "auto", maxWidth: 140, objectFit: "contain" }} />
        )}
        {name && <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>}
      </div>
    </>
  );
}
