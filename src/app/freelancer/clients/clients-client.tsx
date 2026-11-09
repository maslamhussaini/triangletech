"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFreelancerData } from "../data-context";
import AdBanner from "../ad-banner";
import { formatMoney } from "@/lib/tools/time-card";
import {
  formatRateDollars,
  parseMultiplier,
  parseNonNegativeInt,
  parseRateDollars,
  parseThresholdHours,
  validateClientForm,
} from "@/lib/freelancer/forms";
import { effectiveOvertime } from "@/lib/freelancer/rates";
import { FREE_LIMITS_HYPOTHESIS, clientCapStatus, isFreeCapError } from "@/lib/freelancer/entitlements";
import type { Client } from "@/lib/freelancer/models";
import {
  alertBox,
  card,
  errorText,
  field,
  h1,
  h2,
  h3,
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
 * Clients (M2): list management + per-client detail.
 *
 * - Create / edit / archive clients: name, email, address, currency,
 *   default rate, payment terms, notes.
 * - Per-client overtime: toggle (default OFF), threshold (default 40h),
 *   multiplier (default 1.5×). Absent per-client values fall back to
 *   the app defaults (effectiveOvertime) — the detail shows the
 *   effective values so there is never a silent default.
 * - Per-project rate override: projects live under their client; an
 *   override beats the client default for sessions created afterwards
 *   (rate snapshot rule R-2 — recorded sessions never change).
 * All money inputs are dollars-and-cents text, parsed visibly
 * (forms.ts): an invalid rate is an error, never a silent clamp.
 */
export default function ClientsClient() {
  const { store, doc, load, settings, error, refresh, isPro } = useFreelancerData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  // M4 Free-cap upsell state: set when the store refuses a creation
  // with a FreeCapError (3 clients on Free).
  const [clientCapHit, setClientCapHit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Client form state.
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [fCurrency, setFCurrency] = useState("USD");
  const [fRate, setFRate] = useState("");
  const [fTerms, setFTerms] = useState("14");
  const [fNotes, setFNotes] = useState("");
  const [fOtOn, setFOtOn] = useState(false);
  const [fOtThreshold, setFOtThreshold] = useState("40");
  const [fOtMultiplier, setFOtMultiplier] = useState("1.5");

  // Project form state.
  const [pName, setPName] = useState("");
  const [pRate, setPRate] = useState("");
  const [pErrors, setPErrors] = useState<string[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectRate, setEditProjectRate] = useState("");

  const clients = useMemo(() => {
    const list = [...(doc?.clients ?? [])];
    list.sort((a, b) => (a.archived === b.archived ? a.name.localeCompare(b.name) : a.archived ? 1 : -1));
    return list;
  }, [doc]);
  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const selectedProjects = useMemo(
    () => (doc?.projects ?? []).filter((p) => p.clientId === selected?.id),
    [doc, selected]
  );

  if (error) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Clients</h1>
        <p role="alert" style={alertBox}>{error}</p>
      </main>
    );
  }
  if (!doc || !load || !settings) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Clients</h1>
        <p>Loading your data…</p>
      </main>
    );
  }

  function openCreate() {
    if (!settings) return;
    setSelectedId(null);
    setCreating(true);
    setClientCapHit(false);
    setSaveError(null);
    setFName("");
    setFEmail("");
    setFAddress("");
    setFCurrency(settings?.defaultCurrency ?? "USD");
    setFRate(settings?.defaultRateCents !== null && settings?.defaultRateCents !== undefined ? formatRateDollars(settings.defaultRateCents) : "");
    setFTerms(String(settings?.defaultPaymentTermsDays ?? 14));
    setFNotes("");
    setFOtOn(settings?.overtimeEnabled ?? false);
    setFOtThreshold(String(settings?.overtimeThresholdHours ?? 40));
    setFOtMultiplier(String(settings?.overtimeMultiplier ?? 1.5));
    setFormErrors([]);
    setSaveError(null);
  }

  function openEdit(client: Client) {
    if (!settings) return;
    setCreating(false);
    setSelectedId(client.id);
    setFName(client.name);
    setFEmail(client.email ?? "");
    setFAddress(client.address ?? "");
    setFCurrency(client.currency);
    setFRate(formatRateDollars(client.defaultRateCents));
    setFTerms(String(client.paymentTermsDays));
    setFNotes(client.notes ?? "");
    setFOtOn(client.overtimeEnabled ?? settings.overtimeEnabled);
    setFOtThreshold(String(client.overtimeThresholdHours ?? settings.overtimeThresholdHours));
    setFOtMultiplier(String(client.overtimeMultiplier ?? settings.overtimeMultiplier));
    setFormErrors([]);
    setSaveError(null);
    setPName("");
    setPRate("");
    setPErrors([]);
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    const errors: string[] = [];
    const rate = parseRateDollars(fRate);
    if (!rate.ok) errors.push(rate.error);
    const terms = parseNonNegativeInt(fTerms, "Payment terms");
    if (!terms.ok) errors.push(terms.error);
    let threshold: number | undefined;
    let multiplier: number | undefined;
    if (fOtOn) {
      const t = parseThresholdHours(fOtThreshold);
      if (!t.ok) errors.push(t.error);
      else threshold = t.value;
      const m = parseMultiplier(fOtMultiplier);
      if (!m.ok) errors.push(m.error);
      else multiplier = m.value;
    }
    if (rate.ok && terms.ok) {
      errors.push(
        ...validateClientForm({
          name: fName,
          currency: fCurrency,
          defaultRateCents: rate.cents,
          paymentTermsDays: terms.value,
          overtimeEnabled: fOtOn,
          overtimeThresholdHours: threshold,
          overtimeMultiplier: multiplier,
        })
      );
    }
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSaveError(null);
    setSaving(true);
    try {
      const input = {
        name: fName.trim(),
        ...(fEmail.trim() ? { email: fEmail.trim() } : {}),
        ...(fAddress.trim() ? { address: fAddress.trim() } : {}),
        currency: fCurrency.trim().toUpperCase(),
        defaultRateCents: (rate as { ok: true; cents: number }).cents,
        paymentTermsDays: (terms as { ok: true; value: number }).value,
        ...(fNotes.trim() ? { notes: fNotes.trim() } : {}),
        overtimeEnabled: fOtOn,
        ...(fOtOn && threshold !== undefined ? { overtimeThresholdHours: threshold } : {}),
        ...(fOtOn && multiplier !== undefined ? { overtimeMultiplier: multiplier } : {}),
        archived: selected?.archived ?? false,
      };
      if (creating) {
        const created = await store.createClient(input);
        setCreating(false);
        setSelectedId(created.id);
      } else if (selected) {
        // Turning overtime off leaves any stored per-client threshold /
        // multiplier in place but unused (effectiveOvertime only reads
        // them while overtime is on) — turning it back on restores them.
        await store.updateClient(selected.id, input);
      }
      await refresh();
    } catch (err) {
      // A Free-cap refusal shows the Pro upsell instead of a bare error.
      if (isFreeCapError(err)) {
        setClientCapHit(true);
        setSaveError(err.message);
      } else {
        setSaveError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(client: Client) {
    if (!store) return;
    try {
      await store.updateClient(client.id, { archived: !client.archived });
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!store || !selected) return;
    const errors: string[] = [];
    if (!pName.trim()) errors.push("Enter a project name.");
    let override: number | undefined;
    if (pRate.trim() !== "") {
      const parsed = parseRateDollars(pRate);
      if (!parsed.ok) errors.push(parsed.error);
      else override = parsed.cents;
    }
    if (errors.length > 0) {
      setPErrors(errors);
      return;
    }
    setPErrors([]);
    try {
      await store.createProject({
        clientId: selected.id,
        name: pName.trim(),
        ...(override !== undefined ? { rateOverrideCents: override } : {}),
        archived: false,
      });
      setPName("");
      setPRate("");
      await refresh();
    } catch (err) {
      setPErrors([err instanceof Error ? err.message : String(err)]);
    }
  }

  async function handleSaveProjectRate(projectId: string) {
    if (!store) return;
    if (editProjectRate.trim() === "") {
      // Empty = clear the override (client default applies again).
      await store.updateProject(projectId, { rateOverrideCents: undefined });
      setEditingProjectId(null);
      await refresh();
      return;
    }
    const parsed = parseRateDollars(editProjectRate);
    if (!parsed.ok) {
      setPErrors([parsed.error]);
      return;
    }
    try {
      await store.updateProject(projectId, { rateOverrideCents: parsed.cents });
      setEditingProjectId(null);
      setPErrors([]);
      await refresh();
    } catch (err) {
      setPErrors([err instanceof Error ? err.message : String(err)]);
    }
  }

  async function handleArchiveProject(projectId: string, archived: boolean) {
    if (!store) return;
    await store.updateProject(projectId, { archived: !archived });
    await refresh();
  }

  const effective = selected ? effectiveOvertime(selected, settings) : null;

  return (
    <main style={pageWrap}>
      <h1 style={h1}>Clients</h1>
      <AdBanner screen="client-list" />
      {load.notice && <p role="status" style={noticeBox}>{load.notice}</p>}
      {saveError && <p role="alert" style={alertBox}>{saveError}</p>}
      {clientCapHit && (
        <section style={alertBox} aria-label="Free client limit reached">
          <p style={{ margin: "0 0 8px" }}>
            Free plan allows {FREE_LIMITS_HYPOTHESIS.maxClients} clients. Upgrade to Pro for unlimited clients.
          </p>
          <Link href="/freelancer/pro" style={{ ...primaryButton, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
            See Pro
          </Link>
        </section>
      )}
      {!isPro && doc && (
        <p style={{ ...mutedText, marginTop: 0 }}>
          Free plan: {clientCapStatus(doc).used} of {FREE_LIMITS_HYPOTHESIS.maxClients} clients used.{" "}
          <Link href="/freelancer/pro">Upgrade to Pro for unlimited clients</Link>.
        </p>
      )}

      <section style={card} aria-label="Client list">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ ...h2, margin: 0 }}>All clients</h2>
          <button type="button" style={secondaryButton} onClick={openCreate}>Add client</button>
        </div>
        {clients.length === 0 ? (
          <p style={mutedText}>No clients yet. Add one to start tracking time.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {clients.map((c) => {
              const ot = effectiveOvertime(c, settings);
              return (
                <li key={c.id} style={{ borderTop: "1px solid #F1F5F9", padding: "10px 0" }}>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#1B1B4B" }}>{c.name}</span>
                    {c.archived && <span style={{ ...mutedText, marginLeft: 8 }}>archived</span>}
                    <span style={{ display: "block", fontSize: 14, color: "#64748B", marginTop: 2 }}>
                      {formatMoney(c.defaultRateCents, c.currency)}/hour · {c.currency} · due in {c.paymentTermsDays} days · overtime{" "}
                      {ot.overtimeEnabled ? "on" : "off"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(creating || selected) && (
        <section style={card} aria-label={creating ? "New client" : "Client details"}>
          <h2 style={h2}>{creating ? "New client" : selected?.name}</h2>
          {selected && effective && (
            <p style={mutedText}>
              Effective overtime: {effective.overtimeEnabled ? `on — ${effective.overtimeThresholdHours}h at ${effective.overtimeMultiplier}×` : "off"}
              {selected.overtimeEnabled === undefined ? " (app default — no per-client override set)" : " (per-client setting)"}
            </p>
          )}
          <form onSubmit={handleSaveClient} noValidate>
            <div style={field}>
              <label style={label} htmlFor="cl-name">Name</label>
              <input id="cl-name" style={input} value={fName} onChange={(e) => setFName(e.target.value)} />
            </div>
            <div style={row}>
              <div style={field}>
                <label style={label} htmlFor="cl-currency">Currency</label>
                <input id="cl-currency" style={input} value={fCurrency} onChange={(e) => setFCurrency(e.target.value)} placeholder="USD" />
              </div>
              <div style={field}>
                <label style={label} htmlFor="cl-rate">Default hourly rate ($)</label>
                <input id="cl-rate" style={input} inputMode="decimal" value={fRate} onChange={(e) => setFRate(e.target.value)} placeholder="50.00" />
              </div>
              <div style={field}>
                <label style={label} htmlFor="cl-terms">Payment terms (days)</label>
                <input id="cl-terms" style={input} inputMode="numeric" value={fTerms} onChange={(e) => setFTerms(e.target.value)} />
              </div>
            </div>
            <div style={field}>
              <label style={label} htmlFor="cl-email">Email (optional)</label>
              <input id="cl-email" style={input} type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="cl-address">Address (optional)</label>
              <input id="cl-address" style={input} value={fAddress} onChange={(e) => setFAddress(e.target.value)} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="cl-notes">Notes (optional)</label>
              <input id="cl-notes" style={input} value={fNotes} onChange={(e) => setFNotes(e.target.value)} />
            </div>
            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 15, fontWeight: 600, color: "#1B1B4B" }}>
                <input type="checkbox" checked={fOtOn} onChange={(e) => setFOtOn(e.target.checked)} />
                Overtime for this client
              </label>
              {fOtOn && (
                <div style={row}>
                  <div style={field}>
                    <label style={label} htmlFor="cl-ot-threshold">Overtime after (hours/week)</label>
                    <input id="cl-ot-threshold" style={input} inputMode="decimal" value={fOtThreshold} onChange={(e) => setFOtThreshold(e.target.value)} />
                  </div>
                  <div style={field}>
                    <label style={label} htmlFor="cl-ot-multiplier">Overtime multiplier (×)</label>
                    <input id="cl-ot-multiplier" style={input} inputMode="decimal" value={fOtMultiplier} onChange={(e) => setFOtMultiplier(e.target.value)} />
                  </div>
                </div>
              )}
              {!fOtOn && <p style={mutedText}>Off — all hours are regular time at the client&apos;s rate.</p>}
            </div>
            {formErrors.length > 0 && (
              <div role="alert" style={{ marginBottom: 12 }}>
                {formErrors.map((err) => (
                  <p key={err} style={errorText}>{err}</p>
                ))}
              </div>
            )}
            <div style={row}>
              <button type="submit" style={primaryButton} disabled={saving}>
                {saving ? "Saving…" : creating ? "Add client" : "Save changes"}
              </button>
              {selected && !creating && (
                <button type="button" style={secondaryButton} onClick={() => handleArchive(selected)}>
                  {selected.archived ? "Unarchive client" : "Archive client"}
                </button>
              )}
              <button
                type="button"
                style={secondaryButton}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(null);
                  setFormErrors([]);
                }}
              >
                Cancel
              </button>
            </div>
          </form>

          {selected && !creating && (
            <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 12 }}>
              <h3 style={h3}>Projects</h3>
              {selectedProjects.length === 0 ? (
                <p style={mutedText}>No projects — sessions use the client rate.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
                  {selectedProjects.map((p) => (
                    <li key={p.id} style={{ borderTop: "1px solid #F1F5F9", padding: "10px 0" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#1B1B4B" }}>
                        {p.name}
                        {p.archived && <span style={{ ...mutedText, marginLeft: 8 }}>archived</span>}
                      </p>
                      {editingProjectId === p.id ? (
                        <div style={row}>
                          <div style={field}>
                            <label style={label} htmlFor={`pr-rate-${p.id}`}>Hourly rate override ($) — empty clears it</label>
                            <input
                              id={`pr-rate-${p.id}`}
                              style={input}
                              inputMode="decimal"
                              value={editProjectRate}
                              onChange={(e) => setEditProjectRate(e.target.value)}
                              placeholder="e.g. 75.00"
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
                            <button type="button" style={primaryButton} onClick={() => handleSaveProjectRate(p.id)}>Save rate</button>
                            <button type="button" style={secondaryButton} onClick={() => setEditingProjectId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: "0 0 6px", fontSize: 14, color: "#64748B" }}>
                          {p.rateOverrideCents !== undefined
                            ? `${formatMoney(p.rateOverrideCents, selected.currency)}/hour (override)`
                            : "Client default rate"}
                        </p>
                      )}
                      {editingProjectId !== p.id && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            style={secondaryButton}
                            onClick={() => {
                              setEditingProjectId(p.id);
                              setEditProjectRate(p.rateOverrideCents !== undefined ? formatRateDollars(p.rateOverrideCents) : "");
                              setPErrors([]);
                            }}
                          >
                            Edit rate
                          </button>
                          <button type="button" style={secondaryButton} onClick={() => handleArchiveProject(p.id, p.archived)}>
                            {p.archived ? "Unarchive" : "Archive"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleSaveProject} noValidate>
                <h3 style={h3}>Add a project</h3>
                <div style={row}>
                  <div style={{ ...field, flex: "2 1 200px" }}>
                    <label style={label} htmlFor="pr-name">Project name</label>
                    <input id="pr-name" style={input} value={pName} onChange={(e) => setPName(e.target.value)} />
                  </div>
                  <div style={field}>
                    <label style={label} htmlFor="pr-rate">Rate override ($) — optional</label>
                    <input id="pr-rate" style={input} inputMode="decimal" value={pRate} onChange={(e) => setPRate(e.target.value)} placeholder="Client rate" />
                  </div>
                </div>
                {pErrors.length > 0 && (
                  <div role="alert" style={{ marginBottom: 12 }}>
                    {pErrors.map((err) => (
                      <p key={err} style={errorText}>{err}</p>
                    ))}
                  </div>
                )}
                <button type="submit" style={primaryButton}>Add project</button>
              </form>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
