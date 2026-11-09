"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  ERROR_CORRECTION_LEVELS,
  PNG_SIZES,
  QR_TYPES,
  WIFI_ENCRYPTIONS,
  assessContrast,
  buildPayload,
  checkCapacity,
  type EmailInputs,
  type ErrorCorrectionLevel,
  type PhoneInputs,
  type PngSize,
  type QrType,
  type TextInputs,
  type UrlInputs,
  type VCardInputs,
  type WifiInputs,
} from "@/lib/tools/qr-code";
import { generateQr, svgToDataUrl } from "@/lib/tools/qr-generation";

const DEFAULT_URL: UrlInputs = { url: "https://triangletech.co/" };
const DEFAULT_TEXT: TextInputs = { text: "" };
const DEFAULT_WIFI: WifiInputs = { ssid: "", password: "", encryption: "WPA", hidden: false };
const DEFAULT_EMAIL: EmailInputs = { address: "", subject: "", body: "" };
const DEFAULT_PHONE: PhoneInputs = { phone: "" };
const DEFAULT_VCARD: VCardInputs = { fullName: "", organization: "", phone: "", email: "", website: "" };

function Field({
  id, label, error, helper, children,
}: {
  id: string; label: string; error?: string; helper?: string; children: React.ReactNode;
}) {
  return (
    <div className="field qr-gen-field">
      <label className="label-premium" htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="error-premium" id={`${id}-error`} role="alert">{error}</p>
      ) : helper ? (
        <p className="helper-premium" id={`${id}-help`}>{helper}</p>
      ) : null}
    </div>
  );
}

function TextInput({
  id, value, onChange, error, placeholder, type = "text", autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void; error?: string;
  placeholder?: string; type?: string; autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      className="input-premium"
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function QrGeneratorClient() {
  const [qrType, setQrType] = useState<QrType>("url");
  const [url, setUrl] = useState<UrlInputs>(DEFAULT_URL);
  const [text, setText] = useState<TextInputs>(DEFAULT_TEXT);
  const [wifi, setWifi] = useState<WifiInputs>(DEFAULT_WIFI);
  const [email, setEmail] = useState<EmailInputs>(DEFAULT_EMAIL);
  const [phone, setPhone] = useState<PhoneInputs>(DEFAULT_PHONE);
  const [vcard, setVcard] = useState<VCardInputs>(DEFAULT_VCARD);

  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");
  const [ecLevel, setEcLevel] = useState<ErrorCorrectionLevel>("M");
  const [pngSize, setPngSize] = useState<PngSize>(1024);

  // Generated output is stored together with the exact key of the inputs
  // that produced it. The preview only ever shows output whose key matches
  // the current inputs, so a stale code can never linger after an edit.
  const [generated, setGenerated] = useState<{
    key: string; svg: string | null; pngDataUrl: string | null; error: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const generationSeq = useRef(0);

  const inputs = useMemo(() => {
    switch (qrType) {
      case "url": return url;
      case "text": return text;
      case "wifi": return wifi;
      case "email": return email;
      case "phone": return phone;
      case "vcard": return vcard;
    }
  }, [qrType, url, text, wifi, email, phone, vcard]);

  const built = useMemo(() => buildPayload(qrType, inputs), [qrType, inputs]);
  const contrast = useMemo(() => assessContrast(foreground, background), [foreground, background]);
  const capacity = useMemo(
    () => (built.payload ? checkCapacity(built.payload, ecLevel) : null),
    [built.payload, ecLevel],
  );

  const errorsByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of built.errors) if (!map.has(e.field)) map.set(e.field, e.message);
    return map;
  }, [built.errors]);

  const canGenerate = built.errors.length === 0 && built.payload.length > 0 && !contrast.blocked;

  const genKey = canGenerate
    ? `${built.payload}|${ecLevel}|${foreground}|${background}|${pngSize}`
    : "";

  useEffect(() => {
    if (!canGenerate) return;
    const seq = ++generationSeq.current;
    let cancelled = false;
    generateQr(built.payload, { errorCorrectionLevel: ecLevel, foreground, background, width: pngSize })
      .then((result) => {
        if (cancelled || seq !== generationSeq.current) return;
        setGenerated({ key: genKey, svg: result.svg, pngDataUrl: result.pngDataUrl, error: result.error });
      })
      .catch(() => {
        if (cancelled || seq !== generationSeq.current) return;
        setGenerated({ key: genKey, svg: null, pngDataUrl: null, error: "The QR code could not be generated for this content." });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, built.payload, ecLevel, foreground, background, pngSize]);

  const resetAll = useCallback(() => {
    setUrl(DEFAULT_URL);
    setText(DEFAULT_TEXT);
    setWifi(DEFAULT_WIFI);
    setEmail(DEFAULT_EMAIL);
    setPhone(DEFAULT_PHONE);
    setVcard(DEFAULT_VCARD);
    setForeground("#000000");
    setBackground("#FFFFFF");
    setEcLevel("M");
    setPngSize(1024);
    setCopied(false);
  }, []);

  const copyPayload = useCallback(async () => {
    if (!built.payload) return;
    try {
      await navigator.clipboard.writeText(built.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — payload is visible to copy manually */ }
  }, [built.payload]);

  const current = generated && generated.key === genKey ? generated : null;
  const svg = current?.svg ?? null;
  const pngDataUrl = current?.pngDataUrl ?? null;
  const genError = current?.error ?? null;
  const previewSrc = pngDataUrl ?? (svg ? svgToDataUrl(svg) : null);
  const showQr = Boolean(canGenerate && previewSrc && !genError);

  return (
    <>
      <ScrollReveal />
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL · QR CODES</span>
          <h1>Free QR Code Generator</h1>
          <p>
            Create a real, scannable QR code for a website, Wi-Fi network, email, phone number,
            contact card or plain text — right in your browser. Download it as a print-ready PNG
            or a scalable SVG. No signup, no watermark, and nothing you enter is uploaded.
          </p>
        </div>
      </section>

      <section className="section qr-gen" data-reveal>
        <div className="container">
          <p className="qr-gen-privacy">
            <strong>Private by design.</strong> Your QR code is generated on your device. Wi-Fi
            passwords, contact details and addresses are never sent to a server, logged or stored.
            These are <strong>static</strong> QR codes: the content is encoded in the pattern itself,
            so changing the content later means generating and printing a new code.
          </p>

          <div className="qr-gen-layout">
            <div className="finder-panel qr-gen-panel">
              <h2 className="qr-gen-panel-title">1. Choose what the code does</h2>
              <div className="qr-gen-types" role="group" aria-label="QR code type">
                {QR_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`qr-gen-type${qrType === t.id ? " is-active" : ""}`}
                    aria-pressed={qrType === t.id}
                    onClick={() => setQrType(t.id)}
                  >
                    <span className="qr-gen-type-label">{t.label}</span>
                    <span className="qr-gen-type-hint">{t.hint}</span>
                  </button>
                ))}
              </div>

              <h2 className="qr-gen-panel-title" style={{ marginTop: 26 }}>2. Enter the details</h2>

              {qrType === "url" && (
                <Field id="qr-url" label="Website address" error={errorsByField.get("url")}
                  helper="The exact page scanners will open. The preview below shows the final destination before you download.">
                  <TextInput id="qr-url" value={url.url} error={errorsByField.get("url")}
                    onChange={(v) => setUrl({ url: v })} placeholder="https://yourbusiness.com" type="url" autoComplete="url" />
                </Field>
              )}

              {qrType === "text" && (
                <Field id="qr-text" label="Text to encode" error={errorsByField.get("text")}
                  helper="Any text: a note, a code, a menu description. Shorter text makes a simpler, faster-scanning code.">
                  <textarea id="qr-text" className="input-premium qr-gen-textarea" rows={4} value={text.text}
                    aria-invalid={errorsByField.get("text") ? true : undefined}
                    aria-describedby={errorsByField.get("text") ? "qr-text-error" : undefined}
                    placeholder="Type or paste your text"
                    onChange={(e) => setText({ text: e.target.value })} />
                </Field>
              )}

              {qrType === "wifi" && (
                <div className="qr-gen-fields">
                  <Field id="qr-wifi-ssid" label="Network name (SSID)" error={errorsByField.get("ssid")}
                    helper="Exactly as it appears in Wi-Fi settings, including capital letters.">
                    <TextInput id="qr-wifi-ssid" value={wifi.ssid} error={errorsByField.get("ssid")}
                      onChange={(v) => setWifi({ ...wifi, ssid: v })} placeholder="e.g. SmithFamilyWiFi" autoComplete="off" />
                  </Field>
                  <Field id="qr-wifi-security" label="Security type"
                    helper="Most current home and business networks use WPA/WPA2/WPA3. Phone support for Wi-Fi QR codes is broad but not universal — some older phones may not offer to join on scan.">
                    <select id="qr-wifi-security" className="select-premium" value={wifi.encryption}
                      onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as WifiInputs["encryption"] })}>
                      {WIFI_ENCRYPTIONS.map((enc) => (
                        <option key={enc.id} value={enc.id}>{enc.label}</option>
                      ))}
                    </select>
                  </Field>
                  {wifi.encryption !== "nopass" && (
                    <Field id="qr-wifi-password" label="Network password" error={errorsByField.get("password")}
                      helper="Encoded into the code so guests can join without typing it. Anyone who can scan the printed code can see the network it joins — print it only where that is acceptable.">
                      <TextInput id="qr-wifi-password" value={wifi.password} error={errorsByField.get("password")}
                        onChange={(v) => setWifi({ ...wifi, password: v })} type="text" autoComplete="off" />
                    </Field>
                  )}
                  <label className="qr-gen-check">
                    <input type="checkbox" checked={wifi.hidden}
                      onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
                    <span>
                      <span className="qr-gen-check-title">Hidden network</span>
                      <span className="qr-gen-check-note">Turn on only if the network does not broadcast its name.</span>
                    </span>
                  </label>
                </div>
              )}

              {qrType === "email" && (
                <div className="qr-gen-fields">
                  <Field id="qr-email-address" label="Email address" error={errorsByField.get("address")}
                    helper="Scanning opens the visitor's email app addressed to this inbox.">
                    <TextInput id="qr-email-address" value={email.address} error={errorsByField.get("address")}
                      onChange={(v) => setEmail({ ...email, address: v })} placeholder="hello@yourbusiness.com" type="email" autoComplete="email" />
                  </Field>
                  <Field id="qr-email-subject" label="Subject (optional)">
                    <TextInput id="qr-email-subject" value={email.subject}
                      onChange={(v) => setEmail({ ...email, subject: v })} placeholder="e.g. Quote request" />
                  </Field>
                  <Field id="qr-email-body" label="Message starter (optional)">
                    <textarea id="qr-email-body" className="input-premium qr-gen-textarea" rows={3} value={email.body}
                      placeholder="Pre-filled text the sender can edit before sending"
                      onChange={(e) => setEmail({ ...email, body: e.target.value })} />
                  </Field>
                </div>
              )}

              {qrType === "phone" && (
                <Field id="qr-phone" label="Phone number" error={errorsByField.get("phone")}
                  helper="Include the country code (for example +1 for the US) so the number dials correctly from anywhere.">
                  <TextInput id="qr-phone" value={phone.phone} error={errorsByField.get("phone")}
                    onChange={(v) => setPhone({ phone: v })} placeholder="+1 919 555 0142" type="tel" autoComplete="tel" />
                </Field>
              )}

              {qrType === "vcard" && (
                <div className="qr-gen-fields">
                  <Field id="qr-vcard-name" label="Full name" error={errorsByField.get("fullName")}>
                    <TextInput id="qr-vcard-name" value={vcard.fullName} error={errorsByField.get("fullName")}
                      onChange={(v) => setVcard({ ...vcard, fullName: v })} placeholder="Jordan Lee" autoComplete="name" />
                  </Field>
                  <Field id="qr-vcard-org" label="Organization (optional)">
                    <TextInput id="qr-vcard-org" value={vcard.organization}
                      onChange={(v) => setVcard({ ...vcard, organization: v })} placeholder="Lee Plumbing LLC" autoComplete="organization" />
                  </Field>
                  <Field id="qr-vcard-phone" label="Phone (optional)">
                    <TextInput id="qr-vcard-phone" value={vcard.phone}
                      onChange={(v) => setVcard({ ...vcard, phone: v })} placeholder="+1 919 555 0142" type="tel" autoComplete="tel" />
                  </Field>
                  <Field id="qr-vcard-email" label="Email (optional)" error={errorsByField.get("email")}>
                    <TextInput id="qr-vcard-email" value={vcard.email} error={errorsByField.get("email")}
                      onChange={(v) => setVcard({ ...vcard, email: v })} placeholder="jordan@example.com" type="email" autoComplete="email" />
                  </Field>
                  <Field id="qr-vcard-website" label="Website (optional)" error={errorsByField.get("website")}>
                    <TextInput id="qr-vcard-website" value={vcard.website} error={errorsByField.get("website")}
                      onChange={(v) => setVcard({ ...vcard, website: v })} placeholder="https://example.com" type="url" autoComplete="url" />
                  </Field>
                </div>
              )}

              {built.notes.map((note) => (
                <p key={note} className="qr-gen-note" role="status">{note}</p>
              ))}

              <h2 className="qr-gen-panel-title" style={{ marginTop: 26 }}>3. Style and reliability</h2>
              <div className="qr-gen-fields">
                <div className="qr-gen-color-row">
                  <Field id="qr-fg" label="Code color">
                    <span className="qr-gen-color">
                      <input id="qr-fg" type="color" value={foreground} aria-label="QR code color"
                        onChange={(e) => setForeground(e.target.value.toUpperCase())} />
                      <span>{foreground}</span>
                    </span>
                  </Field>
                  <Field id="qr-bg" label="Background color">
                    <span className="qr-gen-color">
                      <input id="qr-bg" type="color" value={background} aria-label="QR background color"
                        onChange={(e) => setBackground(e.target.value.toUpperCase())} />
                      <span>{background}</span>
                    </span>
                  </Field>
                </div>
                {contrast.message && (
                  <p className={contrast.blocked ? "qr-gen-error" : "qr-gen-note"} role="alert">{contrast.message}</p>
                )}
                <Field id="qr-ec" label="Error correction"
                  helper="Higher levels survive more damage, smudging or fading, but pack the same content into a denser code. M suits most print use.">
                  <select id="qr-ec" className="select-premium" value={ecLevel}
                    onChange={(e) => setEcLevel(e.target.value as ErrorCorrectionLevel)}>
                    {ERROR_CORRECTION_LEVELS.map((l) => (
                      <option key={l.level} value={l.level}>{l.label} — {l.note}</option>
                    ))}
                  </select>
                </Field>
                <Field id="qr-png-size" label="PNG size"
                  helper="Bigger files print sharper at larger sizes. 1024px suits flyers and table cards; 2048px suits posters and signs.">
                  <select id="qr-png-size" className="select-premium" value={pngSize}
                    onChange={(e) => setPngSize(Number(e.target.value) as PngSize)}>
                    {PNG_SIZES.map((s) => (
                      <option key={s} value={s}>{s} × {s} px</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ marginTop: 22 }}>
                <button type="button" className="button-indigo-secondary" onClick={resetAll}>
                  Reset all settings
                </button>
              </div>
            </div>

            <div className="qr-gen-preview-col">
              <div className="finder-panel qr-gen-preview-panel">
                <h2 className="qr-gen-panel-title">Live preview</h2>
                <div className="qr-gen-preview" data-testid="qr-preview">
                  {showQr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc ?? undefined} alt={`QR code encoding: ${built.payload.slice(0, 80)}`} width={320} height={320} />
                  ) : (
                    <div className="qr-gen-empty">
                      <p><strong>No QR code yet.</strong></p>
                      <p>
                        {contrast.blocked && built.errors.length === 0
                          ? "Fix the color contrast above and your code will appear here."
                          : "Fill in the details on the left and fix any messages shown — your code appears here the moment the input is valid."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="qr-gen-payload">
                  <span className="qr-gen-payload-label">Exact content encoded</span>
                  {built.payload ? (
                    <code className="qr-gen-payload-code">{built.payload}</code>
                  ) : (
                    <p className="helper-premium">Nothing encoded yet — check the form messages.</p>
                  )}
                  {capacity && (
                    <p className="helper-premium">
                      {capacity.bytes} of {capacity.maxBytes} bytes at error correction {ecLevel}.
                      {capacity.fits ? "" : " Too long for this level — shorten the content or lower the level."}
                    </p>
                  )}
                </div>

                {genError && <p className="qr-gen-error" role="alert">{genError}</p>}

                <div className="qr-gen-downloads">
                  <a
                    className={`button-indigo${showQr ? "" : " is-disabled"}`}
                    href={showQr && pngDataUrl ? pngDataUrl : undefined}
                    download={showQr ? `qr-code-${pngSize}px.png` : undefined}
                    aria-disabled={showQr ? undefined : true}
                    onClick={showQr ? undefined : (e) => e.preventDefault()}
                  >
                    Download PNG ({pngSize}px)
                  </a>
                  <a
                    className={`button-indigo-secondary${showQr && svg ? "" : " is-disabled"}`}
                    href={showQr && svg ? svgToDataUrl(svg) : undefined}
                    download={showQr ? "qr-code.svg" : undefined}
                    aria-disabled={showQr && svg ? undefined : true}
                    onClick={showQr && svg ? undefined : (e) => e.preventDefault()}
                  >
                    Download SVG
                  </a>
                  <button type="button" className="button-indigo-secondary" onClick={copyPayload} disabled={!built.payload}>
                    {copied ? "Copied!" : "Copy encoded content"}
                  </button>
                </div>
                <p className="helper-premium qr-gen-download-note">
                  Test-scan the downloaded code with your own phone before printing in quantity.
                  A code is only as current as the content inside it — if the website, password or
                  number changes, generate a fresh code.
                </p>
              </div>

              {/* Reserved for a future, separately approved ad unit. Renders nothing today, and sits away from the generate, preview and download controls. */}
              <div className="qr-gen-ad-region" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
