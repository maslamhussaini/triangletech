"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  addDays,
  buildSampleCsv,
  buildTimesheetCsv,
  calculateTimesheet,
  dateOrdinal,
  formatDecimalHours,
  formatDuration,
  formatMoney,
  formatTime,
  guessColumnMapping,
  isValidDateString,
  parseCsvText,
  parseImportedRows,
  parseTimeToMinutes,
  validateSavedTimesheet,
  type ColumnMapping,
  type DateFormat,
  type ImportedRow,
  type PeriodKind,
  type SessionInput,
} from "@/lib/tools/time-card";
import { buildPdfBlob, downloadBlob } from "@/lib/tools/simple-pdf";

const STORAGE_KEY = "triangletech-time-card-v1";
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "PKR"] as const;

function mondayOf(date: Date): string {
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function prettyDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function newId(counter: React.MutableRefObject<number>): string {
  counter.current += 1;
  return `session-${Date.now()}-${counter.current}`;
}

type InvoiceLine = { id: string; description: string; qty: number; rate: number };

export default function TimeCardCalculatorClient() {
  const idCounter = useRef(0);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [period, setPeriod] = useState<PeriodKind>("weekly");
  const [sessions, setSessions] = useState<SessionInput[]>([]);
  const [employee, setEmployee] = useState("");
  const [business, setBusiness] = useState("");
  const [project, setProject] = useState("");
  const [hour12, setHour12] = useState(true);
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [threshold, setThreshold] = useState("40");
  const [multiplier, setMultiplier] = useState("1.5");
  const [remember, setRemember] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [copyTargets, setCopyTargets] = useState<Record<string, string[]>>({});
  const [duplicateDate, setDuplicateDate] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Import wizard state
  const [importStep, setImportStep] = useState<"idle" | "map" | "preview">("idle");
  const [importFileName, setImportFileName] = useState("");
  const [importRawRows, setImportRawRows] = useState<unknown[][]>([]);
  const [importMapping, setImportMapping] = useState<ColumnMapping>({});
  const [importDateFormat, setImportDateFormat] = useState<DateFormat>("YYYY-MM-DD");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importEmployee, setImportEmployee] = useState("");
  const [importError, setImportError] = useState("");

  // Invoice state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [seller, setSeller] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [taxPercent, setTaxPercent] = useState("0");

  const periodDays = period === "biweekly" ? 14 : 7;
  const periodDates = useMemo(() => {
    if (!isValidDateString(weekStart)) return [];
    return Array.from({ length: periodDays }, (_, i) => addDays(weekStart, i));
  }, [weekStart, periodDays]);

  const result = useMemo(
    () =>
      calculateTimesheet({
        weekStart: isValidDateString(weekStart) ? weekStart : "1970-01-01",
        period,
        sessions,
        hourlyRate: hourlyRate === "" ? null : Number(hourlyRate),
        currency,
        overtimeThresholdHours: Number(threshold),
        overtimeMultiplier: Number(multiplier),
      }),
    [weekStart, period, sessions, hourlyRate, currency, threshold, multiplier]
  );

  const rateError = hourlyRate !== "" && (Number.isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0);
  const thresholdError = threshold === "" || Number.isNaN(Number(threshold)) || Number(threshold) <= 0 || Number(threshold) > 168;
  const multiplierError = multiplier === "" || Number.isNaN(Number(multiplier)) || Number(multiplier) < 1 || Number(multiplier) > 5;

  // Restore saved data once, on first load.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = validateSavedTimesheet(JSON.parse(raw));
        if (parsed) {
          setWeekStart(parsed.weekStart);
          setPeriod(parsed.period);
          setSessions(parsed.sessions);
          setEmployee(parsed.employee ?? "");
          setBusiness(parsed.business ?? "");
          setProject(parsed.project ?? "");
          setHourlyRate(parsed.hourlyRate === null || parsed.hourlyRate === undefined ? "" : String(parsed.hourlyRate));
          setCurrency(parsed.currency ?? "USD");
          setThreshold(String(parsed.overtimeThresholdHours));
          setMultiplier(String(parsed.overtimeMultiplier));
          setRemember(true);
          setStorageNotice("Restored your saved timesheet from this device.");
        } else {
          setStorageNotice("Saved timesheet data on this device was corrupted or from an incompatible version, so it was not restored. Nothing was deleted.");
        }
      }
    } catch {
      setStorageNotice("Saved timesheet data on this device could not be read, so it was not restored.");
    }
    setLoaded(true);
  }, []);

  // Save only when the user explicitly chose "Remember on this device".
  useEffect(() => {
    if (!loaded || !remember) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          weekStart,
          period,
          sessions,
          employee,
          business,
          project,
          hourlyRate: hourlyRate === "" ? null : Number(hourlyRate),
          currency,
          overtimeThresholdHours: Number(threshold),
          overtimeMultiplier: Number(multiplier),
        })
      );
    } catch {
      setStorageNotice("Could not save on this device (storage may be full or blocked). Your timesheet still works in this tab.");
    }
  }, [loaded, remember, weekStart, period, sessions, employee, business, project, hourlyRate, currency, threshold, multiplier]);

  function updateSession(id: string, patch: Partial<SessionInput>) {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSession(date: string) {
    setSessions(prev => [...prev, { id: newId(idCounter), date, start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 0 }]);
  }

  function loadExample() {
    if (!isValidDateString(weekStart)) return;
    const mk = (dayOffset: number, start: string, end: string, endsNextDay: boolean, breakMinutes: number): SessionInput => ({
      id: newId(idCounter),
      date: addDays(weekStart, dayOffset),
      start,
      end,
      endsNextDay,
      breakMinutes,
    });
    setSessions([
      mk(0, "09:00", "17:30", false, 30),
      mk(1, "22:00", "06:00", true, 30),
      mk(2, "09:00", "17:30", false, 30),
      mk(2, "18:00", "20:00", false, 0),
      mk(3, "09:00", "17:30", false, 30),
      mk(4, "09:00", "17:30", false, 30),
    ]);
    setEmployee("Alex Rivera");
    setProject("Website support");
    setHourlyRate("20");
    setThreshold("40");
    setMultiplier("1.5");
  }

  function doReset() {
    setSessions([]);
    setEmployee("");
    setBusiness("");
    setProject("");
    setHourlyRate("");
    setThreshold("40");
    setMultiplier("1.5");
    setConfirmReset(false);
  }

  function copyDay(sourceDate: string) {
    const targets = copyTargets[sourceDate] ?? [];
    if (targets.length === 0) return;
    const source = sessions.filter(s => s.date === sourceDate);
    setSessions(prev => {
      const kept = prev.filter(s => !targets.includes(s.date));
      const copies = targets.flatMap(target =>
        source.map(s => ({ ...s, id: newId(idCounter), date: target }))
      );
      return [...kept, ...copies];
    });
    setCopyTargets(prev => ({ ...prev, [sourceDate]: [] }));
  }

  function duplicateWeek() {
    if (!isValidDateString(duplicateDate) || !isValidDateString(weekStart)) return;
    const delta = dateOrdinal(duplicateDate) - dateOrdinal(weekStart);
    setSessions(prev => prev.map(s => ({ ...s, id: newId(idCounter), date: addDays(s.date, delta) })));
    setWeekStart(duplicateDate);
    setDuplicateDate("");
  }

  function deleteSaved() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage may be blocked; the in-memory state is still cleared below */
    }
    setRemember(false);
    setSessions([]);
    setStorageNotice("Saved timesheet data on this device has been deleted.");
  }

  async function handleImportFile(file: File) {
    setImportError("");
    if (file.size > 5 * 1024 * 1024) {
      setImportError("File is larger than 5 MB. Split it and try again.");
      return;
    }
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const rows = parseCsvText(text);
        if (rows.length < 2) {
          setImportError("CSV file needs a header row and at least one data row.");
          return;
        }
        setImportRawRows(rows);
        setImportMapping(guessColumnMapping(rows[0].map(String)));
        setImportFileName(file.name);
        setImportStep("map");
      } else if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setImportError("Spreadsheet has no sheets.");
          return;
        }
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
        if (rows.length < 2) {
          setImportError("Spreadsheet needs a header row and at least one data row.");
          return;
        }
        setImportRawRows(rows);
        setImportMapping(guessColumnMapping(rows[0].map(v => String(v ?? ""))));
        setImportFileName(file.name);
        setImportStep("map");
      } else {
        setImportError("Only .csv and .xlsx files are supported.");
      }
    } catch {
      setImportError("Could not read that file. Check it is a valid CSV or XLSX file and try again.");
    }
  }

  const importParsed = useMemo(() => {
    if (importStep === "idle" || importRawRows.length === 0) return null;
    return parseImportedRows(importRawRows, { dateFormat: importDateFormat, mapping: importMapping, hasHeader: true });
  }, [importStep, importRawRows, importDateFormat, importMapping]);

  const importValidRows: ImportedRow[] = useMemo(() => {
    if (!importParsed) return [];
    return importParsed.rows.filter(r => r.session !== null);
  }, [importParsed]);

  function confirmImport() {
    if (!importParsed) return;
    let toImport = importParsed.sessions;
    if (importParsed.employees.length > 1) {
      if (!importEmployee) return;
      toImport = importParsed.sessions.filter(s => !s.employee || s.employee === importEmployee);
    }
    if (importMode === "replace") {
      setSessions(toImport.map(s => ({ ...s, id: newId(idCounter) })));
    } else {
      setSessions(prev => [...prev, ...toImport.map(s => ({ ...s, id: newId(idCounter) }))]);
    }
    setImportStep("idle");
    setImportRawRows([]);
    setImportEmployee("");
    setStorageNotice(`Imported ${toImport.length} valid session(s) from ${importFileName}. ${importParsed.rows.filter(r => r.session === null).length} row(s) had errors and were not imported.`);
  }

  function downloadCsv() {
    const csv = buildTimesheetCsv(result, { employee, business, project, currency });
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "timesheet.csv");
  }

  function downloadPdf() {
    const lines: string[] = [
      `Period: ${result.periodStart} to ${result.periodEnd} (${period})`,
      ...(employee ? [`Employee: ${employee}`] : []),
      ...(business ? [`Business: ${business}`] : []),
      ...(project ? [`Project: ${project}`] : []),
      "",
      "Daily totals:",
      ...result.days.map(d => `${d.date}: ${formatDuration(d.paidMinutes)} (${formatDecimalHours(d.paidMinutes)} hours)`),
      "",
      "Sessions:",
      ...result.sessions.map(s => `${s.session.date} ${s.session.start}-${s.session.end}${s.session.endsNextDay ? " (ends next day)" : ""}, break ${s.session.breakMinutes}m, paid ${formatDuration(s.paidMinutes)}`),
      "",
      `Total: ${formatDuration(result.totalMinutes)} (${formatDecimalHours(result.totalMinutes)} hours)`,
      `Regular: ${formatDuration(result.regularMinutes)}`,
      `Overtime: ${formatDuration(result.overtimeMinutes)}`,
      `Estimated gross pay: ${formatMoney(result.payCents, currency)}`,
      "",
      "Estimated gross pay only. No tax, payroll, or labor-law compliance is claimed.",
      "Overtime uses the configurable threshold and multiplier above, evaluated separately for each workweek.",
    ];
    downloadBlob(buildPdfBlob("Work Hours & Time Card", lines), "timesheet.pdf");
  }

  function openInvoice() {
    const rate = hourlyRate === "" ? 0 : Number(hourlyRate);
    const lines: InvoiceLine[] = [];
    if (result.regularMinutes > 0) {
      lines.push({ id: "regular", description: `Regular hours (${result.periodStart} to ${result.periodEnd})`, qty: Number(formatDecimalHours(result.regularMinutes)), rate });
    }
    if (result.overtimeMinutes > 0) {
      lines.push({ id: "overtime", description: `Overtime hours (${result.periodStart} to ${result.periodEnd})`, qty: Number(formatDecimalHours(result.overtimeMinutes)), rate: rate * Number(multiplier) });
    }
    if (lines.length === 0) {
      lines.push({ id: "hours", description: "Hours worked", qty: 0, rate });
    }
    setInvoiceLines(lines);
    setInvoiceNumber(`INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`);
    setClientName(project || clientName);
    setInvoiceOpen(true);
  }

  const invoiceSubtotal = invoiceLines.reduce((s, l) => s + l.qty * l.rate, 0);
  const invoiceTax = invoiceSubtotal * (Number(taxPercent) || 0) / 100;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  function downloadInvoicePdf() {
    const lines: string[] = [
      `Invoice: ${invoiceNumber}`,
      `Date: ${invoiceDate}`,
      ...(seller ? [`From: ${seller}`] : []),
      ...(clientName ? [`Bill to: ${clientName}`] : []),
      "",
      "Line items:",
      ...invoiceLines.map(l => `${l.description} — ${l.qty} x ${formatMoney(Math.round(l.rate * 100), currency)} = ${formatMoney(Math.round(l.qty * l.rate * 100), currency)}`),
      "",
      `Subtotal: ${formatMoney(Math.round(invoiceSubtotal * 100), currency)}`,
      `Tax (${taxPercent}%): ${formatMoney(Math.round(invoiceTax * 100), currency)}`,
      `Total due: ${formatMoney(Math.round(invoiceTotal * 100), currency)}`,
      "",
      "Freelancer billing invoice created from a time card. This is not a payroll document.",
      "Powered by TriangleTech",
    ];
    downloadBlob(buildPdfBlob(`Invoice ${invoiceNumber}`, lines), `${invoiceNumber || "invoice"}.pdf`);
  }

  const outOfPeriodSessions = sessions.filter(s => !periodDates.includes(s.date));
  const requiredFields = ["date", "start", "end"] as const;

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>Work Hours &amp; Time Card Calculator</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>
          Enter a timesheet, check the hours, and estimate gross pay. Overtime is a configurable estimate only:
          it is not tax, payroll, or labor-law advice, and no state-specific rules are applied.
        </p>

        {storageNotice && (
          <p role="status" style={{ background: "#EEF0FF", border: "1px solid #C7D2FE", padding: "12px 16px", borderRadius: 8 }}>{storageNotice}</p>
        )}

        {result.errors.length > 0 && (
          <div role="alert" aria-labelledby="tc-errors-heading" style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <h2 id="tc-errors-heading" style={{ fontSize: 16, margin: "0 0 8px" }}>Please fix {result.errors.length} problem{result.errors.length === 1 ? "" : "s"} before using these totals</h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.errors.map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
          </div>
        )}

        <section aria-labelledby="tc-period-heading" style={{ marginBottom: 24 }}>
          <h2 id="tc-period-heading" style={{ fontSize: 20 }}>Period</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-week-start">Week-start date</label>
              <input id="tc-week-start" className="input-premium" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-period">Period</label>
              <select id="tc-period" className="input-premium" value={period} onChange={e => setPeriod(e.target.value as PeriodKind)}>
                <option value="weekly">Weekly (7 days)</option>
                <option value="biweekly">Biweekly (14 days, overtime per week)</option>
              </select>
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-hour-format">Time display</label>
              <select id="tc-hour-format" className="input-premium" value={hour12 ? "12" : "24"} onChange={e => setHour12(e.target.value === "12")}>
                <option value="12">12-hour (e.g. 9:00 AM)</option>
                <option value="24">24-hour (e.g. 09:00)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-employee">Employee / freelancer name (optional)</label>
              <input id="tc-employee" className="input-premium" type="text" value={employee} onChange={e => setEmployee(e.target.value)} placeholder="e.g. Alex Rivera" autoComplete="off" />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-business">Business name (optional)</label>
              <input id="tc-business" className="input-premium" type="text" value={business} onChange={e => setBusiness(e.target.value)} placeholder="e.g. Rivera Design" autoComplete="off" />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-project">Project (optional)</label>
              <input id="tc-project" className="input-premium" type="text" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Website support" autoComplete="off" />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            <button type="button" className="button-indigo" onClick={loadExample}>Load example data</button>
            {confirmReset ? (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <span>Delete all entries?</span>
                <button type="button" className="button-indigo" onClick={doReset}>Yes, reset</button>
                <button type="button" className="button-indigo-secondary" onClick={() => setConfirmReset(false)}>Keep entries</button>
              </span>
            ) : (
              <button type="button" className="button-indigo-secondary" onClick={() => (sessions.length > 0 ? setConfirmReset(true) : doReset())}>Reset</button>
            )}
          </div>
        </section>

        <details style={{ marginBottom: 24, border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Advanced: pay and overtime settings</summary>
          <p style={{ color: "#475569" }}>Overtime is evaluated separately for each workweek, even in a biweekly period. There is no single 80-hour biweekly threshold.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-rate">Hourly rate (optional)</label>
              <input id="tc-rate" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} aria-invalid={rateError || undefined} aria-describedby={rateError ? "tc-rate-error" : undefined} />
              {rateError && <p id="tc-rate-error" style={{ color: "#B91C1C" }}>Hourly rate cannot be negative.</p>}
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-currency">Currency</label>
              <select id="tc-currency" className="input-premium" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-threshold">Weekly overtime threshold (hours)</label>
              <input id="tc-threshold" className="input-premium" type="number" inputMode="decimal" min="1" max="168" step="0.5" value={threshold} onChange={e => setThreshold(e.target.value)} aria-invalid={thresholdError || undefined} />
              {thresholdError && <p style={{ color: "#B91C1C" }}>Threshold must be more than 0 and no more than 168 hours.</p>}
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-multiplier">Overtime multiplier</label>
              <input id="tc-multiplier" className="input-premium" type="number" inputMode="decimal" min="1" max="5" step="0.25" value={multiplier} onChange={e => setMultiplier(e.target.value)} aria-invalid={multiplierError || undefined} />
              {multiplierError && <p style={{ color: "#B91C1C" }}>Multiplier must be at least 1 and no more than 5.</p>}
            </div>
          </div>
        </details>

        <section aria-labelledby="tc-days-heading">
          <h2 id="tc-days-heading" style={{ fontSize: 20 }}>Timesheet — {period === "weekly" ? "one week" : "two weeks"}</h2>
          {sessions.length === 0 && (
            <p style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "16px", borderRadius: 8 }}>
              No sessions yet. Add a session to a day below, load the example, or import a CSV/XLSX file.
            </p>
          )}
          <div style={{ display: "grid", gap: 16 }}>
            {periodDates.map(date => {
              const daySessions = sessions.filter(s => s.date === date).sort((a, b) => (parseTimeToMinutes(a.start) ?? 0) - (parseTimeToMinutes(b.start) ?? 0));
              const dayTotal = result.days.find(d => d.date === date)?.paidMinutes ?? 0;
              const targets = copyTargets[date] ?? [];
              return (
                <article key={date} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <h3 style={{ fontSize: 17, margin: 0 }}>{prettyDate(date)} <span style={{ color: "#64748B", fontWeight: 400 }}>({date})</span></h3>
                    <strong>Day total: {formatDuration(dayTotal)} ({formatDecimalHours(dayTotal)} h)</strong>
                  </div>
                  {daySessions.length === 0 && <p style={{ color: "#64748B" }}>No sessions this day.</p>}
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    {daySessions.map(s => (
                      <div key={s.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", background: "#F8FAFC", padding: 12, borderRadius: 8 }}>
                        <div className="field">
                          <label className="label-premium" htmlFor={`start-${s.id}`}>Start</label>
                          <input id={`start-${s.id}`} className="input-premium" type="time" value={s.start} onChange={e => updateSession(s.id, { start: e.target.value })} />
                        </div>
                        <div className="field">
                          <label className="label-premium" htmlFor={`end-${s.id}`}>End</label>
                          <input id={`end-${s.id}`} className="input-premium" type="time" value={s.end} onChange={e => updateSession(s.id, { end: e.target.value })} />
                        </div>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
                          <input type="checkbox" checked={s.endsNextDay} onChange={e => updateSession(s.id, { endsNextDay: e.target.checked })} />
                          Ends next day
                        </label>
                        <div className="field">
                          <label className="label-premium" htmlFor={`break-${s.id}`}>Unpaid break (minutes)</label>
                          <input id={`break-${s.id}`} className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={s.breakMinutes} onChange={e => updateSession(s.id, { breakMinutes: e.target.value === "" ? 0 : Number(e.target.value) })} />
                        </div>
                        <span style={{ color: "#475569" }}>
                          {hour12 && parseTimeToMinutes(s.start) !== null && parseTimeToMinutes(s.end) !== null
                            ? `${formatTime(parseTimeToMinutes(s.start)!, true)} – ${formatTime(parseTimeToMinutes(s.end)!, true)}${s.endsNextDay ? " next day" : ""}`
                            : ""}
                        </span>
                        <button type="button" className="button-indigo-secondary" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>Remove session</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <button type="button" className="button-indigo-secondary" onClick={() => addSession(date)}>Add session</button>
                    {daySessions.length > 0 && (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span>Copy this day to:</span>
                        {periodDates.filter(d => d !== date).map(d => (
                          <label key={d} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={targets.includes(d)}
                              onChange={e => setCopyTargets(prev => ({ ...prev, [date]: e.target.checked ? [...targets, d] : targets.filter(t => t !== d) }))}
                            />
                            {d}
                          </label>
                        ))}
                        <button type="button" className="button-indigo-secondary" disabled={targets.length === 0} onClick={() => copyDay(date)}>Copy schedule (replaces those days)</button>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {outOfPeriodSessions.length > 0 && (
            <div style={{ marginTop: 16, background: "#FFFBEB", border: "1px solid #FDE68A", padding: 12, borderRadius: 8 }}>
              <strong>Sessions outside this period</strong>
              <p>These sessions are kept but excluded from the totals above. Move the week-start date or delete them to include them.</p>
              <ul>
                {outOfPeriodSessions.map(s => (
                  <li key={s.id}>{s.date} {s.start}–{s.end} <button type="button" className="button-indigo-secondary" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>Remove</button></li>
                ))}
              </ul>
            </div>
          )}
          {result.outOfPeriodDetails.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>Minutes outside the period</h3>
              <ul>{result.outOfPeriodDetails.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
        </section>

        <section aria-labelledby="tc-summary-heading" style={{ marginTop: 32 }}>
          <h2 id="tc-summary-heading" style={{ fontSize: 20 }}>Summary</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr><th style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Week</th><th style={{ textAlign: "right", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Total</th><th style={{ textAlign: "right", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Regular</th><th style={{ textAlign: "right", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Overtime</th><th style={{ textAlign: "right", borderBottom: "2px solid #E2E8F0", padding: 8 }}>Estimated gross pay</th></tr>
              </thead>
              <tbody>
                {result.weeks.map(w => (
                  <tr key={w.index}>
                    <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>Week {w.index + 1} ({w.startDate} to {w.endDate})</td>
                    <td style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.totalMinutes)} ({formatDecimalHours(w.totalMinutes)} h)</td>
                    <td style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.regularMinutes)}</td>
                    <td style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.overtimeMinutes)}</td>
                    <td style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatMoney(w.payCents, currency)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: 8, fontWeight: 700 }}>Period total</td>
                  <td style={{ textAlign: "right", padding: 8, fontWeight: 700 }}>{formatDuration(result.totalMinutes)} ({formatDecimalHours(result.totalMinutes)} h)</td>
                  <td style={{ textAlign: "right", padding: 8, fontWeight: 700 }}>{formatDuration(result.regularMinutes)}</td>
                  <td style={{ textAlign: "right", padding: 8, fontWeight: 700 }}>{formatDuration(result.overtimeMinutes)}</td>
                  <td style={{ textAlign: "right", padding: 8, fontWeight: 700 }}>{formatMoney(result.payCents, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: "#475569" }}>
            Formula: paid minutes = shift minutes minus unpaid break minutes, split at midnight. Regular hours are the first {threshold} hours
            in each workweek; the rest are overtime at {multiplier}×. Pay is rounded to the nearest cent after adding regular and overtime pay.
            This is estimated gross pay before any tax or deductions — it is not take-home pay.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" className="button-indigo" onClick={() => window.print()}>Print</button>
            <button type="button" className="button-indigo" onClick={downloadPdf}>Download PDF</button>
            <button type="button" className="button-indigo" onClick={downloadCsv}>Download CSV</button>
            <button type="button" className="button-indigo-secondary" onClick={openInvoice} disabled={result.totalMinutes === 0}>Create invoice from these hours</button>
          </div>
        </section>

        <section aria-labelledby="tc-import-heading" style={{ marginTop: 32, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
          <h2 id="tc-import-heading" style={{ fontSize: 20 }}>Import a timesheet (CSV / XLSX)</h2>
          <p style={{ color: "#475569" }}>Upload → map columns → validate and preview → confirm. Files are parsed in your browser; nothing is uploaded to a server, and spreadsheet formulas are never executed — only stored values are read.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <label className="button-indigo-secondary" style={{ cursor: "pointer" }}>
              Choose CSV or XLSX file
              <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = ""; }} />
            </label>
            <button type="button" className="button-indigo-secondary" onClick={() => downloadBlob(new Blob([buildSampleCsv()], { type: "text/csv;charset=utf-8" }), "time-card-sample.csv")}>Download sample template</button>
            <span>Limit: 5 MB, 2,000 rows. One employee per calculator.</span>
          </div>
          {importError && <p role="alert" style={{ color: "#B91C1C" }}>{importError}</p>}
          {importStep === "map" && importRawRows.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>Step 2 — Map columns ({importFileName})</h3>
              <p>Detected headers: {importRawRows[0].map(v => String(v ?? "")).join(" · ")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {requiredFields.map(field => (
                  <div className="field" key={field}>
                    <label className="label-premium" htmlFor={`map-${field}`}>{field === "date" ? "Date" : field === "start" ? "Start time" : "End time"}</label>
                    <select id={`map-${field}`} className="input-premium" value={importMapping[field] ?? -1} onChange={e => setImportMapping(prev => ({ ...prev, [field]: Number(e.target.value) }))}>
                      <option value={-1}>— not mapped —</option>
                      {importRawRows[0].map((h, i) => <option key={i} value={i}>{String(h ?? "") || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
                {(["break", "nextDay", "employee", "project"] as const).map(field => (
                  <div className="field" key={field}>
                    <label className="label-premium" htmlFor={`map-${field}`}>{field === "break" ? "Unpaid break (minutes)" : field === "nextDay" ? "Ends next day" : field === "employee" ? "Employee" : "Project"}</label>
                    <select id={`map-${field}`} className="input-premium" value={importMapping[field] ?? -1} onChange={e => setImportMapping(prev => ({ ...prev, [field]: Number(e.target.value) }))}>
                      <option value={-1}>— not mapped —</option>
                      {importRawRows[0].map((h, i) => <option key={i} value={i}>{String(h ?? "") || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
                <div className="field">
                  <label className="label-premium" htmlFor="import-date-format">Date format (for ambiguous dates)</label>
                  <select id="import-date-format" className="input-premium" value={importDateFormat} onChange={e => setImportDateFormat(e.target.value as DateFormat)}>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-02)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (11/02/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (02/11/2026)</option>
                  </select>
                </div>
              </div>
              <button type="button" className="button-indigo" style={{ marginTop: 12 }} disabled={importMapping.date === undefined || importMapping.start === undefined || importMapping.end === undefined} onClick={() => setImportStep("preview")}>Preview and validate</button>
              {importParsed && importParsed.rows.length > 0 && (
                <p style={{ color: "#475569" }}>Preview: {importParsed.rows[0].session ? `${importParsed.rows[0].session.date} ${importParsed.rows[0].session.start}–${importParsed.rows[0].session.end}` : "first row has errors — see preview step"} (interpreted with the format above).</p>
              )}
            </div>
          )}
          {importStep === "preview" && importParsed && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>Step 3 — Validate and preview</h3>
              <p>{importValidRows.length} valid row(s). {importParsed.rows.filter(r => r.session === null).length} row(s) have errors and will not be imported. {importParsed.warnings.length > 0 ? `${importParsed.warnings.length} warning(s).` : ""}</p>
              {importParsed.employees.length > 1 && (
                <div className="field">
                  <label className="label-premium" htmlFor="import-employee">This file contains more than one employee — choose one to import</label>
                  <select id="import-employee" className="input-premium" value={importEmployee} onChange={e => setImportEmployee(e.target.value)}>
                    <option value="">— choose an employee —</option>
                    {importParsed.employees.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 8 }}>Row</th><th style={{ textAlign: "left", padding: 8 }}>Date</th><th style={{ textAlign: "left", padding: 8 }}>Start–End</th><th style={{ textAlign: "left", padding: 8 }}>Break</th><th style={{ textAlign: "left", padding: 8 }}>Status</th></tr></thead>
                  <tbody>
                    {importParsed.rows.slice(0, 100).map(r => (
                      <tr key={r.rowNumber}>
                        <td style={{ padding: 8 }}>{r.rowNumber}</td>
                        <td style={{ padding: 8 }}>{r.session?.date ?? "—"}</td>
                        <td style={{ padding: 8 }}>{r.session ? `${r.session.start}–${r.session.end}${r.session.endsNextDay ? " (next day)" : ""}` : "—"}</td>
                        <td style={{ padding: 8 }}>{r.session?.breakMinutes ?? "—"}</td>
                        <td style={{ padding: 8 }}>{r.errors.length > 0 ? `Error: ${r.errors.join("; ")}` : r.warnings.length > 0 ? `Warning: ${r.warnings.join("; ")}` : "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="radio" name="import-mode" checked={importMode === "append"} onChange={() => setImportMode("append")} /> Append to current timesheet</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="radio" name="import-mode" checked={importMode === "replace"} onChange={() => setImportMode("replace")} /> Replace current timesheet</label>
                <button type="button" className="button-indigo" disabled={importValidRows.length === 0 || (importParsed.employees.length > 1 && !importEmployee)} onClick={confirmImport}>Step 4 — Confirm import</button>
                <button type="button" className="button-indigo-secondary" onClick={() => setImportStep("map")}>Back to mapping</button>
              </div>
              <p style={{ color: "#475569" }}>Rows outside the current period are imported as sessions and shown as out-of-period until you move the week-start date. Out-of-period minutes are excluded from totals and explained in the summary.</p>
            </div>
          )}
        </section>

        {invoiceOpen && (
          <section aria-labelledby="tc-invoice-heading" style={{ marginTop: 32, border: "1px solid #C7D2FE", borderRadius: 12, padding: 16, background: "#EEF0FF" }}>
            <h2 id="tc-invoice-heading" style={{ fontSize: 20 }}>Freelancer invoice from these hours</h2>
            <p style={{ color: "#475569" }}>Edit anything before downloading. This is an editable freelancer billing document, not a payroll invoice. No tax rate is pre-filled beyond 0% — add one only if it applies to your work.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div className="field">
                <label className="label-premium" htmlFor="inv-seller">Seller / freelancer</label>
                <input id="inv-seller" className="input-premium" type="text" value={seller} onChange={e => setSeller(e.target.value)} placeholder="Your name or business" autoComplete="off" />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-client">Client</label>
                <input id="inv-client" className="input-premium" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" autoComplete="off" />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-number">Invoice number</label>
                <input id="inv-number" className="input-premium" type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-date">Invoice date</label>
                <input id="inv-date" className="input-premium" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-tax">Tax (%) — 0 unless it applies</label>
                <input id="inv-tax" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {invoiceLines.map((line, idx) => (
                <div key={line.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", background: "#FFFFFF", padding: 12, borderRadius: 8 }}>
                  <div className="field" style={{ flex: "2 1 240px" }}>
                    <label className="label-premium" htmlFor={`inv-desc-${line.id}`}>Description</label>
                    <input id={`inv-desc-${line.id}`} className="input-premium" type="text" value={line.description} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l)))} />
                  </div>
                  <div className="field">
                    <label className="label-premium" htmlFor={`inv-qty-${line.id}`}>Quantity (hours)</label>
                    <input id={`inv-qty-${line.id}`} className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={line.qty} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, qty: Number(e.target.value) } : l)))} />
                  </div>
                  <div className="field">
                    <label className="label-premium" htmlFor={`inv-rate-${line.id}`}>Rate ({currency}/hour)</label>
                    <input id={`inv-rate-${line.id}`} className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={line.rate} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, rate: Number(e.target.value) } : l)))} />
                  </div>
                  <strong>{formatMoney(Math.round(line.qty * line.rate * 100), currency)}</strong>
                  <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceLines(prev => prev.filter((_, i) => i !== idx))}>Remove line</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, alignItems: "center" }}>
              <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceLines(prev => [...prev, { id: `line-${Date.now()}`, description: "Additional work", qty: 0, rate: hourlyRate === "" ? 0 : Number(hourlyRate) }])}>Add line</button>
              <strong>Total due: {formatMoney(Math.round(invoiceTotal * 100), currency)}</strong>
              <button type="button" className="button-indigo" onClick={downloadInvoicePdf}>Download invoice PDF</button>
              <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceOpen(false)}>Close invoice</button>
            </div>
            <p style={{ color: "#475569" }}>Your timesheet details are kept in this tab only — they are not put into a link or URL.</p>
          </section>
        )}

        <section aria-labelledby="tc-save-heading" style={{ marginTop: 32, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
          <h2 id="tc-save-heading" style={{ fontSize: 20 }}>Save on this device</h2>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Remember on this device (saves this timesheet in this browser only)
          </label>
          <p style={{ color: "#475569" }}>Saved data stays in your browser. It is not uploaded, and it is not shared with analytics. Timesheet processing here is local to your device.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-duplicate-date">Duplicate this week into a new period starting</label>
              <input id="tc-duplicate-date" className="input-premium" type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} />
            </div>
            <button type="button" className="button-indigo-secondary" disabled={!isValidDateString(duplicateDate) || sessions.length === 0} onClick={duplicateWeek}>Duplicate week (dates shift, times stay the same)</button>
            <button type="button" className="button-indigo-secondary" onClick={deleteSaved}>Delete saved data</button>
          </div>
        </section>

        <section aria-labelledby="tc-how-heading" style={{ marginTop: 32 }}>
          <h2 id="tc-how-heading" style={{ fontSize: 20 }}>How the hours work</h2>
          <ul style={{ lineHeight: 1.7, color: "#334155" }}>
            <li><strong>Formula:</strong> paid time = end minus start, minus unpaid break minutes. Exact minutes are used — no punch rounding.</li>
            <li><strong>Decimal hours:</strong> divide minutes by 60. Example: 8 hours 30 minutes = 8.50 decimal hours; 45 minutes = 0.75 hours.</li>
            <li><strong>Breaks:</strong> unpaid break minutes are subtracted from the shift. A break that is not shorter than the shift is an error, not a zero-hour day.</li>
            <li><strong>Overnight shifts:</strong> check “Ends next day” explicitly. Minutes are split at midnight, so each date only counts its own minutes.</li>
            <li><strong>Weekly vs biweekly:</strong> a biweekly period is two separate workweeks. Overtime is worked out per week (for example, 46 hours in week 1 and 30 in week 2 gives 6 overtime hours, even though the two-week total is below 80).</li>
            <li><strong>Overtime assumption:</strong> the threshold and multiplier above are your settings. They are an estimate, not a statement of what any employer, state, or contract requires.</li>
            <li><strong>Gross vs take-home pay:</strong> the pay figure is estimated gross pay before tax, deductions, or benefits. Take-home pay will be lower.</li>
            <li><strong>Import and privacy:</strong> CSV and XLSX files are parsed in your browser. Uploads are not sent to a server and are not saved unless you check “Remember on this device” — and even then, only the timesheet itself is saved, not the source file.</li>
            <li><strong>Worked examples:</strong> 09:00–17:30 with a 30-minute break = 8 hours. 22:00–06:00 next day with a 30-minute break = 7 hours 30 minutes. 46 hours at $20/hour with a 40-hour threshold and 1.5× overtime = 40 regular + 6 overtime = $980 gross.</li>
          </ul>
        </section>
      </section>
    </>
  );
}
