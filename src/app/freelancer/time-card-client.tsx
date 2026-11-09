"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFreelancerData } from "./data-context";
import AdBanner from "./ad-banner";
import { formatDuration, formatMoney } from "@/lib/tools/time-card";
import {
  elapsedMinutes,
  formatElapsed,
  pauseTimer,
  resumeTimer,
  startTimer,
  timerToSession,
} from "@/lib/freelancer/timer";
import { formatDayTotal, groupEntriesByWeek, shortDayLabel } from "@/lib/freelancer/sessions";
import { parseDirectHours, parseNonNegativeInt, validateSessionForm } from "@/lib/freelancer/forms";
import { effectiveOvertime } from "@/lib/freelancer/rates";
import {
  alertBox,
  card,
  dangerButton,
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
} from "./styles";

/**
 * Time Card (M2): manual session entry, stopwatch, session list.
 *
 * - Manual entry: start/end times + break + ends-next-day, or direct
 *   hours. Validation is visible (forms.ts) — nothing is silently
 *   clamped or fixed. Pay and totals come from the M1 aggregation
 *   (sessions.ts / rates.ts over the lifted engine); this file never
 *   computes pay itself.
 * - Stopwatch: start/pause/stop with wall-clock elapsed derived from
 *   persisted timestamps. The running timer lives in the store document
 *   (schema v3), so it survives an app kill/restart. Stop asks for a
 *   break, then converts to a direct-hours session in one atomic store
 *   write (store.convertTimerToSession).
 * - Sessions are grouped by week, then day, newest first. Invoiced
 *   sessions cannot be edited or deleted (the model refuses; the UI
 *   hides the buttons and says so).
 */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TimeCardClient() {
  const { store, doc, load, settings, error, refresh, confirmEmpty } = useFreelancerData();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  // Session form state (strings while editing — parsed on submit).
  const [formDate, setFormDate] = useState(todayLocal());
  const [formMode, setFormMode] = useState<"times" | "direct">("times");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("17:30");
  const [formNextDay, setFormNextDay] = useState(false);
  const [formBreak, setFormBreak] = useState("30");
  const [formHours, setFormHours] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Stopwatch stop prompt.
  const [stopBreak, setStopBreak] = useState("0");
  const [stopPrompt, setStopPrompt] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeClients = useMemo(() => (doc?.clients ?? []).filter((c) => !c.archived), [doc]);
  const selectedClient = activeClients.find((c) => c.id === selectedClientId) ?? activeClients[0];
  const clientProjects = useMemo(
    () => (doc?.projects ?? []).filter((p) => p.clientId === selectedClient?.id && !p.archived),
    [doc, selectedClient]
  );
  const runningTimer = doc?.runningTimer ?? null;

  // Tick once a second while a timer runs so the elapsed display moves.
  useEffect(() => {
    if (!runningTimer) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [runningTimer]);

  const weeks = useMemo(() => {
    if (!doc || !selectedClient || !settings) return [];
    const entries = doc.entries.filter((e) => e.clientId === selectedClient.id);
    if (entries.length === 0) return [];
    const dates = entries.map((e) => e.date).sort();
    const from = dates[0] as string;
    const to = [todayLocal(), dates[dates.length - 1] as string].sort().at(-1) as string;
    try {
      return groupEntriesByWeek(doc, selectedClient, from, to, settings);
    } catch {
      return [];
    }
  }, [doc, selectedClient, settings]);

  if (error) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Freelancer Time &amp; Invoice</h1>
        <p role="alert" style={alertBox}>{error}</p>
      </main>
    );
  }

  if (!doc || !load || !settings) {
    return (
      <main style={pageWrap}>
        <h1 style={h1}>Freelancer Time &amp; Invoice</h1>
        <p>Loading your data…</p>
      </main>
    );
  }

  const clientName = (id: string) => doc.clients.find((c) => c.id === id)?.name ?? "Unknown client";
  const invoiceNumber = (id: string | null) => (id ? doc.invoices.find((i) => i.id === id)?.number ?? "unknown invoice" : "");
  const projectName = (id?: string) => (id ? doc.projects.find((p) => p.id === id)?.name : undefined);
  const overtime = selectedClient ? effectiveOvertime(selectedClient, settings) : null;

  async function handleConfirmEmpty() {
    setConfirmingEmpty(true);
    try {
      await confirmEmpty();
    } finally {
      setConfirmingEmpty(false);
    }
  }

  function resetForm() {
    setFormDate(todayLocal());
    setFormMode("times");
    setFormStart("09:00");
    setFormEnd("17:30");
    setFormNextDay(false);
    setFormBreak("30");
    setFormHours("");
    setFormNotes("");
    setEditingId(null);
    setFormErrors([]);
    setSaveError(null);
  }

  function startEdit(entryId: string) {
    const entry = doc?.entries.find((e) => e.id === entryId);
    if (!entry) return;
    setSelectedClientId(entry.clientId);
    setSelectedProjectId(entry.projectId);
    setFormDate(entry.date);
    setFormMode(entry.mode);
    setFormStart(entry.startTime || "09:00");
    setFormEnd(entry.endTime || "17:30");
    setFormNextDay(entry.endsNextDay);
    setFormBreak(String(entry.breakMinutes));
    setFormHours(entry.directHours !== undefined ? String(entry.directHours) : "");
    setFormNotes(entry.notes ?? "");
    setEditingId(entry.id);
    setFormErrors([]);
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmitSession(e: React.FormEvent) {
    e.preventDefault();
    if (!store || !selectedClient || !settings) return;
    const errors: string[] = [];
    const breakParsed = parseNonNegativeInt(formBreak, "Break");
    if (!breakParsed.ok) errors.push(breakParsed.error);
    let directHours: number | undefined;
    if (formMode === "direct") {
      const hoursParsed = parseDirectHours(formHours);
      if (!hoursParsed.ok) errors.push(hoursParsed.error);
      else directHours = hoursParsed.hours;
    }
    if (breakParsed.ok) {
      errors.push(
        ...validateSessionForm({
          clientId: selectedClient.id,
          projectId: selectedProjectId,
          date: formDate,
          mode: formMode,
          startTime: formStart,
          endTime: formEnd,
          endsNextDay: formNextDay,
          breakMinutes: breakParsed.value,
          directHours,
          notes: formNotes || undefined,
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
        clientId: selectedClient.id,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        date: formDate,
        startTime: formMode === "times" ? formStart : "",
        endTime: formMode === "times" ? formEnd : "",
        endsNextDay: formMode === "times" ? formNextDay : false,
        breakMinutes: (breakParsed as { ok: true; value: number }).value,
        mode: formMode,
        ...(formMode === "direct" && directHours !== undefined ? { directHours } : {}),
        ...(formNotes ? { notes: formNotes } : {}),
        origin: "manual" as const,
      };
      if (editingId) await store.updateEntry(editingId, input, settings);
      else await store.createEntry(input, settings);
      await refresh();
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!store) return;
    try {
      await store.deleteEntry(entryId);
      setConfirmDeleteId(null);
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleTimerStart() {
    if (!store || !selectedClient) return;
    try {
      await store.setRunningTimer(
        startTimer({
          clientId: selectedClient.id,
          ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
          date: todayLocal(),
          now: new Date(),
        })
      );
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleTimerPause() {
    if (!store || !runningTimer) return;
    await store.setRunningTimer(pauseTimer(runningTimer, new Date()));
    setNow(new Date());
    await refresh();
  }

  async function handleTimerResume() {
    if (!store || !runningTimer) return;
    await store.setRunningTimer(resumeTimer(runningTimer, new Date()));
    setNow(new Date());
    await refresh();
  }

  async function handleTimerStop() {
    if (!store || !runningTimer || !settings) return;
    setStopError(null);
    const breakParsed = parseNonNegativeInt(stopBreak, "Break");
    if (!breakParsed.ok) {
      setStopError(breakParsed.error);
      return;
    }
    const session = timerToSession(runningTimer, new Date(), breakParsed.value);
    if (session.directHours <= 0) {
      setStopError(
        `The timer ran ${session.grossMinutes} minute(s) and the break is ${session.breakMinutes} minute(s) — no paid time remains. Take a shorter break or let the timer run longer.`
      );
      return;
    }
    try {
      await store.convertTimerToSession(
        runningTimer,
        { directHours: session.directHours, breakMinutes: session.breakMinutes, notes: session.notes },
        settings
      );
      setStopPrompt(false);
      setStopBreak("0");
      await refresh();
    } catch (err) {
      setStopError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main style={pageWrap}>
      <h1 style={h1}>Time Card</h1>
      <AdBanner screen="time-card-list" />
      {load.notice && (
        <p role="status" style={noticeBox}>{load.notice}</p>
      )}
      {load.status === "needs-confirmation" && (
        <section style={alertBox}>
          <h2 style={h2}>Saved data could not be recovered</h2>
          <p style={mutedText}>
            The saved data and its backup are both damaged. The damaged files were kept — nothing was deleted. Confirm
            only if you want to start with an empty store.
          </p>
          <button type="button" style={primaryButton} onClick={handleConfirmEmpty} disabled={confirmingEmpty}>
            {confirmingEmpty ? "Starting empty…" : "Start with an empty store"}
          </button>
        </section>
      )}

      {activeClients.length === 0 ? (
        <section style={card}>
          <h2 style={h2}>No clients yet</h2>
          <p style={mutedText}>Add a client first — every session belongs to a client, with that client&apos;s rate and currency.</p>
          <Link href="/freelancer/clients" style={{ ...primaryButton, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
            Add your first client
          </Link>
        </section>
      ) : (
        <>
          <section style={card}>
            <label style={label} htmlFor="tc-client">Client</label>
            <select
              id="tc-client"
              style={input}
              value={selectedClient?.id ?? ""}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedProjectId(undefined);
              }}
            >
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedClient && overtime && (
              <p style={{ ...mutedText, marginTop: 8, marginBottom: 0 }}>
                {formatMoney(selectedClient.defaultRateCents, selectedClient.currency)}/hour · {selectedClient.currency} ·
                overtime {overtime.overtimeEnabled ? `on (${overtime.overtimeThresholdHours}h, ${overtime.overtimeMultiplier}×)` : "off"} ·
                due in {selectedClient.paymentTermsDays} days
              </p>
            )}
            <label style={{ ...label, marginTop: 12 }} htmlFor="tc-project">Project (optional)</label>
            <select
              id="tc-project"
              style={input}
              value={selectedProjectId ?? ""}
              onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            >
              <option value="">No project — client rate applies</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.rateOverrideCents !== undefined ? ` (${formatMoney(p.rateOverrideCents, selectedClient?.currency ?? "USD")}/hour)` : ""}
                </option>
              ))}
            </select>
          </section>

          <section style={card} aria-label="Stopwatch">
            <h2 style={h2}>Stopwatch</h2>
            {runningTimer ? (
              <>
                <p style={{ fontSize: 34, fontWeight: 700, color: "#1B1B4B", margin: "4px 0", fontVariantNumeric: "tabular-nums" }}>
                  {formatElapsed(runningTimer, now)}
                </p>
                <p style={mutedText}>
                  {runningTimer.status === "running" ? "Running" : "Paused"} · {clientName(runningTimer.clientId)}
                  {projectName(runningTimer.projectId) ? ` · ${projectName(runningTimer.projectId)}` : ""} · started{" "}
                  {shortDayLabel(runningTimer.date)}
                </p>
                <div style={row}>
                  {runningTimer.status === "running" ? (
                    <button type="button" style={secondaryButton} onClick={handleTimerPause}>Pause</button>
                  ) : (
                    <button type="button" style={secondaryButton} onClick={handleTimerResume}>Resume</button>
                  )}
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => {
                      setStopBreak("0");
                      setStopError(null);
                      setStopPrompt(true);
                    }}
                  >
                    Stop &amp; save
                  </button>
                </div>
                {stopPrompt && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
                    <p style={mutedText}>
                      Elapsed: {elapsedMinutes(runningTimer, now)} minute(s). How much of that was break?
                    </p>
                    <label style={label} htmlFor="stop-break">Break (minutes)</label>
                    <input
                      id="stop-break"
                      style={input}
                      inputMode="numeric"
                      value={stopBreak}
                      onChange={(e) => setStopBreak(e.target.value)}
                    />
                    {stopError && (
                      <p role="alert" style={errorText}>{stopError}</p>
                    )}
                    <div style={{ ...row, marginTop: 12 }}>
                      <button type="button" style={primaryButton} onClick={handleTimerStop}>Save session</button>
                      <button type="button" style={secondaryButton} onClick={() => setStopPrompt(false)}>Keep running</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={mutedText}>Start the timer for the client above. It keeps running if the app is closed — the elapsed time is rebuilt from the saved start time.</p>
                <button type="button" style={primaryButton} onClick={handleTimerStart}>Start timer</button>
              </>
            )}
          </section>

          <section style={card} aria-label="Session entry">
            <h2 style={h2}>{editingId ? "Edit session" : "Add a session"}</h2>
            <form onSubmit={handleSubmitSession} noValidate>
              <div style={row}>
                <div style={field}>
                  <label style={label} htmlFor="se-date">Date</label>
                  <input id="se-date" style={input} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div style={field}>
                  <label style={label} htmlFor="se-mode">Entry type</label>
                  <select
                    id="se-mode"
                    style={input}
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as "times" | "direct")}
                  >
                    <option value="times">Start &amp; end times</option>
                    <option value="direct">Hours only</option>
                  </select>
                </div>
              </div>
              {formMode === "times" ? (
                <div style={row}>
                  <div style={field}>
                    <label style={label} htmlFor="se-start">Start</label>
                    <input id="se-start" style={input} type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                  </div>
                  <div style={field}>
                    <label style={label} htmlFor="se-end">End</label>
                    <input id="se-end" style={input} type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                  </div>
                  <div style={{ ...field, flex: "1 1 160px" }}>
                    <span style={label}>Overnight</span>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 15 }}>
                      <input type="checkbox" checked={formNextDay} onChange={(e) => setFormNextDay(e.target.checked)} />
                      Ends next day
                    </label>
                  </div>
                </div>
              ) : (
                <div style={field}>
                  <label style={label} htmlFor="se-hours">Hours worked</label>
                  <input
                    id="se-hours"
                    style={input}
                    inputMode="decimal"
                    placeholder="e.g. 7.5"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                  />
                  <p style={{ ...mutedText, marginTop: 4, marginBottom: 0 }}>Decimal hours — 7.5 means 7 hours 30 minutes.</p>
                </div>
              )}
              <div style={row}>
                <div style={field}>
                  <label style={label} htmlFor="se-break">Break (minutes)</label>
                  <input id="se-break" style={input} inputMode="numeric" value={formBreak} onChange={(e) => setFormBreak(e.target.value)} />
                </div>
                <div style={{ ...field, flex: "2 1 200px" }}>
                  <label style={label} htmlFor="se-notes">Notes (optional)</label>
                  <input id="se-notes" style={input} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                </div>
              </div>
              {formErrors.length > 0 && (
                <div role="alert" style={{ marginBottom: 12 }}>
                  {formErrors.map((err) => (
                    <p key={err} style={errorText}>{err}</p>
                  ))}
                </div>
              )}
              {saveError && (
                <p role="alert" style={errorText}>{saveError}</p>
              )}
              <div style={row}>
                <button type="submit" style={primaryButton} disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add session"}
                </button>
                {editingId && (
                  <button type="button" style={secondaryButton} onClick={resetForm}>Cancel edit</button>
                )}
              </div>
            </form>
          </section>

          <section aria-label="Sessions">
            <h2 style={h2}>Sessions</h2>
            {weeks.length === 0 ? (
              <p style={mutedText}>No sessions for {selectedClient?.name} yet.</p>
            ) : (
              weeks.map((week) => (
                <div key={week.weekStart} style={card}>
                  <h3 style={h3}>
                    Week of {shortDayLabel(week.weekStart)} — {formatDuration(week.totalMinutes)}
                    {week.payCents !== null ? ` · ${formatMoney(week.payCents, selectedClient?.currency ?? "USD")}` : " · no rate set"}
                  </h3>
                  {week.overtimeMinutes > 0 && (
                    <p style={mutedText}>{formatDuration(week.regularMinutes)} regular · {formatDuration(week.overtimeMinutes)} overtime</p>
                  )}
                  {week.warnings.length > 0 && (
                    <p style={{ ...mutedText, color: "#92400E" }}>{week.warnings.map((w) => w.message).join(" ")}</p>
                  )}
                  {week.days.map((day) => (
                    <div key={day.date} style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8, marginTop: 8 }}>
                      <p style={{ fontWeight: 700, color: "#1B1B4B", margin: "0 0 4px", fontSize: 15 }}>
                        {shortDayLabel(day.date)} — {formatDayTotal(day, selectedClient?.currency ?? "USD")}
                      </p>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {day.entries.map(({ entry, paidMinutes, overtimeMinutes, payCents }) => (
                          <li
                            key={`${entry.id}-${day.date}`}
                            style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #F1F5F9" }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 15, color: "#1B1B4B" }}>
                                {entry.mode === "direct"
                                  ? `${entry.directHours ?? 0}h (hours only)`
                                  : `${entry.startTime}–${entry.endTime}${entry.endsNextDay ? " (+1 day)" : ""}`}
                                {entry.breakMinutes > 0 ? ` · ${entry.breakMinutes}m break` : ""}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B" }}>
                                {formatDuration(paidMinutes)} paid
                                {overtimeMinutes > 0 ? ` · ${formatDuration(overtimeMinutes)} overtime` : ""}
                                {payCents !== null ? ` · ${formatMoney(payCents, selectedClient?.currency ?? "USD")}` : " · no rate set"}
                                {projectName(entry.projectId) ? ` · ${projectName(entry.projectId)}` : ""}
                                {entry.origin === "timer" ? " · timer" : ""}
                                {entry.invoiceId ? ` · invoiced on ${invoiceNumber(entry.invoiceId)} — locked, cannot edit or delete` : ""}
                                {entry.notes ? ` · ${entry.notes}` : ""}
                              </p>
                            </div>
                            {!entry.invoiceId && (
                              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                <button type="button" style={secondaryButton} onClick={() => startEdit(entry.id)}>Edit</button>
                                {confirmDeleteId === entry.id ? (
                                  <button type="button" style={dangerButton} onClick={() => handleDelete(entry.id)}>Confirm delete</button>
                                ) : (
                                  <button type="button" style={dangerButton} onClick={() => setConfirmDeleteId(entry.id)}>Delete</button>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          <section style={card} aria-label="Invoices">
            <h2 style={h2}>Invoices</h2>
            {doc.invoices.length === 0 ? (
              <p style={mutedText}>No invoices yet. Create one from tracked hours on the Invoices tab.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
                {doc.invoices.map((invoice) => (
                  <li key={invoice.id} style={{ padding: "6px 0", borderTop: "1px solid #F1F5F9", fontSize: 15 }}>
                    {invoice.number} · {clientName(invoice.clientId)} · {formatMoney(invoice.totalCents, invoice.currency)} · {invoice.status}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/freelancer/invoices" style={{ ...primaryButton, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
              Open invoices
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
