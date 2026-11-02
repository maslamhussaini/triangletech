"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  addDays,
  buildSampleCsv,
  buildTimesheetCsv,
  calculateTimesheet,
  dateOrdinal,
  decimalHoursToMinutes,
  formatDecimalHours,
  formatDuration,
  formatMoney as formatMoneyAscii,
  formatTime,
  guessColumnMapping,
  isValidDateString,
  parseCsvText,
  parseImportedRows,
  parseTimeToMinutes,
  validateSavedTimesheet,
  type ColumnMapping,
  type DateFormat,
  type EntryMode,
  type ImportedRow,
  type PeriodKind,
  type SessionInput,
} from "@/lib/tools/time-card";
import { downloadBlob } from "@/lib/tools/simple-pdf";
import { buildTimesheetReport } from "@/lib/tools/timesheet-report";
import { ReportBrandingFields, useReportBranding } from "@/components/tools/report-branding";
import { dataUrlToCompanyLogo } from "@/lib/tools/report-branding";
import { useLanguage } from "@/lib/i18n/provider";
import { LOCALE_META, defaultCurrencyForLocale, formatLocaleNumber, parseLocalizedNumber } from "@/lib/i18n/locales";
import { tServer } from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "triangletech-time-card-v1";
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "PKR"] as const;

function mondayOf(date: Date): string {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function newId(counter: React.MutableRefObject<number>): string {
  counter.current += 1;
  return `session-${Date.now()}-${counter.current}`;
}

type InvoiceLine = { id: string; description: string; qty: number; rate: number };

/**
 * A session row as edited on screen. Hours-only rows carry their
 * in-progress text in paidHoursText (transient, never saved: only
 * canonical integer paidMinutes is persisted, so a locale switch can
 * never reinterpret saved hours). The engine input is derived from
 * drafts in the result memo below.
 */
type TimeCardSession = SessionInput & { paidHoursText?: string };

export default function TimeCardCalculatorClient() {
  const { locale, t, formatDate, formatMoney } = useLanguage();
  const { branding } = useReportBranding();
  const idCounter = useRef(0);
  const currencyUserSet = useRef(false);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [period, setPeriod] = useState<PeriodKind>("weekly");
  const [sessions, setSessions] = useState<TimeCardSession[]>([]);
  const [pendingSwitch, setPendingSwitch] = useState<{ id: string; to: EntryMode } | null>(null);
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

  const [importStep, setImportStep] = useState<"idle" | "map" | "preview">("idle");
  const [importFileName, setImportFileName] = useState("");
  const [importRawRows, setImportRawRows] = useState<unknown[][]>([]);
  const [importMapping, setImportMapping] = useState<ColumnMapping>({});
  const [importDateFormat, setImportDateFormat] = useState<DateFormat>("YYYY-MM-DD");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importEmployee, setImportEmployee] = useState("");
  const [importError, setImportError] = useState("");
  const [importChoices, setImportChoices] = useState<Record<number, "hours" | "times">>({});

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

  // Derive engine sessions from drafts. Hours-only rows: non-empty
  // text is parsed with the current locale (malformed text becomes
  // NaN so the engine reports it); empty text means "no entry yet"
  // and the row is left out, never counted as zero. Saved/imported
  // rows carry canonical paidMinutes and no text.
  const engineSessions: SessionInput[] = useMemo(
    () =>
      sessions.flatMap(s => {
        if (s.mode !== "hours") return [s];
        const { paidHoursText, ...base } = s;
        if (paidHoursText !== undefined && paidHoursText.trim() !== "") {
          const parsed = parseLocalizedNumber(paidHoursText, locale);
          return [{ ...base, start: "", end: "", endsNextDay: false, breakMinutes: 0, paidMinutes: parsed === null ? NaN : decimalHoursToMinutes(parsed) }];
        }
        if (s.paidMinutes === undefined) return [];
        return [{ ...base, start: "", end: "", endsNextDay: false, breakMinutes: 0 }];
      }),
    [sessions, locale]
  );

  const result = useMemo(
    () =>
      calculateTimesheet({
        weekStart: isValidDateString(weekStart) ? weekStart : "1970-01-01",
        period,
        sessions: engineSessions,
        hourlyRate: hourlyRate === "" ? null : Number(hourlyRate),
        currency,
        overtimeThresholdHours: Number(threshold),
        overtimeMultiplier: Number(multiplier),
      }),
    [weekStart, period, engineSessions, hourlyRate, currency, threshold, multiplier]
  );

  const rateError = hourlyRate !== "" && (Number.isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0);
  const thresholdError = threshold === "" || Number.isNaN(Number(threshold)) || Number(threshold) <= 0 || Number(threshold) > 168;
  const multiplierError = multiplier === "" || Number.isNaN(Number(multiplier)) || Number(multiplier) < 1 || Number(multiplier) > 5;

  // Translate a calculation error by its code, using the session it refers to.
  function translateError(e: { code?: string; message: string; sessionId?: string }): string {
    if (!e.code) return e.message;
    const s = sessions.find(x => x.id === e.sessionId);
    const startMin = s ? parseTimeToMinutes(s.start) ?? 0 : 0;
    const endMin = s ? parseTimeToMinutes(s.end) ?? 0 : 0;
    const gross = s ? endMin - startMin + (s.endsNextDay ? 1440 : 0) : 0;
    return t(`tc.err.${e.code}`, {
      date: s?.date ?? "",
      start: s?.start ?? "",
      end: s?.end ?? "",
      break: s?.breakMinutes ?? 0,
      gross,
      value: s?.paidHoursText ?? "",
    });
  }

  /** Minutes for an hours-only draft (null = no value yet, NaN = malformed text). */
  function draftHoursMinutes(s: TimeCardSession): number | null {
    if (s.mode !== "hours") return null;
    if (s.paidHoursText !== undefined && s.paidHoursText.trim() !== "") {
      const parsed = parseLocalizedNumber(s.paidHoursText, locale);
      return parsed === null ? NaN : decimalHoursToMinutes(parsed);
    }
    return s.paidMinutes ?? null;
  }

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
          currencyUserSet.current = true;
          setThreshold(String(parsed.overtimeThresholdHours));
          setMultiplier(String(parsed.overtimeMultiplier));
          setRemember(true);
          setStorageNotice(t("tc.savedRestored"));
        } else {
          setStorageNotice(t("tc.savedCorrupt"));
        }
      }
    } catch {
      setStorageNotice(t("tc.savedUnreadable"));
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Country/language currency default for a FRESH, EMPTY form only.
  // Never runs once data exists or the user has chosen a currency, so a
  // language switch never silently changes currency, units, or results.
  useEffect(() => {
    if (!loaded || sessions.length > 0 || hourlyRate !== "" || currencyUserSet.current) return;
    try {
      setCurrency(defaultCurrencyForLocale(locale, navigator.language));
    } catch {
      /* keep USD */
    }
  }, [loaded, locale, sessions.length, hourlyRate]);

  useEffect(() => {
    if (!loaded || !remember) return;
    try {
      // Persist canonical values only: transient edit text is never
      // saved (a locale switch must never reinterpret saved hours),
      // and out-of-range transient minutes are dropped so a bad row
      // can never make the whole saved timesheet unrestorable.
      const savedSessions = sessions.map(s => {
        const { paidHoursText, ...base } = s;
        void paidHoursText;
        if (base.mode === "hours" && (base.paidMinutes === undefined || !Number.isInteger(base.paidMinutes) || base.paidMinutes <= 0 || base.paidMinutes > 1440)) {
          const { paidMinutes, ...rest } = base;
          void paidMinutes;
          return rest;
        }
        return base;
      });
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          weekStart,
          period,
          sessions: savedSessions,
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
      setStorageNotice(t("tc.savedFull"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, remember, weekStart, period, sessions, employee, business, project, hourlyRate, currency, threshold, multiplier]);

  function updateSession(id: string, patch: Partial<TimeCardSession>) {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSession(date: string) {
    setSessions(prev => [...prev, { id: newId(idCounter), date, start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 0 }]);
  }

  function addHoursEntry(date: string) {
    setSessions(prev => [...prev, { id: newId(idCounter), date, mode: "hours", start: "", end: "", endsNextDay: false, breakMinutes: 0, paidHoursText: "" }]);
  }

  /** True when switching this row's mode would discard user-entered data. */
  function rowHasModeData(s: TimeCardSession): boolean {
    if (s.mode === "hours") {
      return (s.paidHoursText !== undefined && s.paidHoursText.trim() !== "") || s.paidMinutes !== undefined;
    }
    return s.start !== "09:00" || s.end !== "17:00" || s.endsNextDay || s.breakMinutes !== 0;
  }

  /** Convert a row to the other mode. Never guesses times from hours
   *  or hours from times: the converted row starts empty/default. */
  function convertSessionMode(s: TimeCardSession, to: EntryMode): TimeCardSession {
    if (to === "hours") {
      return { ...s, mode: "hours", start: "", end: "", endsNextDay: false, breakMinutes: 0, paidMinutes: undefined, paidHoursText: "" };
    }
    return { ...s, mode: "times", start: "09:00", end: "17:00", endsNextDay: false, breakMinutes: 0, paidMinutes: undefined, paidHoursText: undefined };
  }

  function requestModeSwitch(s: TimeCardSession, to: EntryMode) {
    if (to === (s.mode ?? "times")) return;
    if (rowHasModeData(s)) {
      setPendingSwitch({ id: s.id, to });
    } else {
      setSessions(prev => prev.map(x => (x.id === s.id ? convertSessionMode(x, to) : x)));
    }
  }

  function confirmModeSwitch() {
    if (!pendingSwitch) return;
    const { id, to } = pendingSwitch;
    setSessions(prev => prev.map(x => (x.id === id ? convertSessionMode(x, to) : x)));
    setPendingSwitch(null);
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
    setStorageNotice(t("tc.savedDeleted"));
  }

  async function handleImportFile(file: File) {
    setImportError("");
    setImportChoices({});
    if (file.size > 5 * 1024 * 1024) {
      setImportError(t("tc.import.fileTooLarge"));
      return;
    }
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const rows = parseCsvText(text);
        if (rows.length < 2) {
          setImportError(t("tc.import.csvNeedsRows"));
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
          setImportError(t("tc.import.noSheets"));
          return;
        }
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
        if (rows.length < 2) {
          setImportError(t("tc.import.sheetNeedsRows"));
          return;
        }
        setImportRawRows(rows);
        setImportMapping(guessColumnMapping(rows[0].map(v => String(v ?? ""))));
        setImportFileName(file.name);
        setImportStep("map");
      } else {
        setImportError(t("tc.import.unsupported"));
      }
    } catch {
      setImportError(t("tc.import.unreadable"));
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

  // Conflict rows with no usable choice yet. A "times" choice for a
  // conflict whose times candidate is invalid also counts as
  // unresolved, so confirm can never import an invalid candidate.
  const importUnresolvedConflicts = useMemo(() => {
    if (!importParsed) return [];
    return importParsed.conflicts.filter(c => {
      const choice = importChoices[c.rowNumber];
      return choice === undefined || (choice === "times" && !c.timesSession);
    });
  }, [importParsed, importChoices]);

  // Choices reference row numbers under one mapping; a mapping change
  // invalidates them, so they reset rather than silently applying to
  // different columns.
  useEffect(() => {
    setImportChoices({});
  }, [importMapping]);

  function confirmImport() {
    if (!importParsed) return;
    // Decided rows plus conflict rows resolved by the user's choice.
    // A conflict row is never counted twice: exactly one candidate
    // is imported, and confirm is disabled while any conflict is
    // unresolved (see the preview panel).
    const resolved = importParsed.conflicts.flatMap(c => {
      const choice = importChoices[c.rowNumber];
      if (choice === "hours") return [c.hoursSession];
      if (choice === "times" && c.timesSession) return [c.timesSession];
      return [];
    });
    let toImport = [...importParsed.sessions, ...resolved];
    if (importParsed.employees.length > 1) {
      if (!importEmployee) return;
      toImport = toImport.filter(s => !s.employee || s.employee === importEmployee);
    }
    if (importMode === "replace") {
      setSessions(toImport.map(s => ({ ...s, id: newId(idCounter) })));
    } else {
      setSessions(prev => [...prev, ...toImport.map(s => ({ ...s, id: newId(idCounter) }))]);
    }
    setImportStep("idle");
    setImportRawRows([]);
    setImportEmployee("");
    setImportChoices({});
    setStorageNotice(t("tc.importedNotice", {
      count: toImport.length,
      file: importFileName,
      errors: importParsed.rows.filter(r => r.session === null && !r.conflict).length,
    }));
  }

  function downloadCsv() {
    const csv = buildTimesheetCsv(result, { employee, business, project, currency });
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "timesheet.csv");
  }

  // PDF report: the built-in PDF font is Latin-only (Helvetica). For
  // Arabic, Urdu, Hindi, Chinese, and Japanese, the report is rendered
  // in English with an explicit disclosure line — never broken glyphs
  // — while browser Print renders the fully translated page correctly.
  // The report has one chronological session table (no duplicated
  // day/session listings), daily totals, per-workweek totals for
  // biweekly reports, and a pay summary whose parts add up exactly.
  async function downloadPdf() {
    const nonLatin = LOCALE_META[locale].script !== "latin";
    const tr = nonLatin
      ? (key: string, vars?: Record<string, string | number>) => tServer("en", key, vars)
      : (key: string, vars?: Record<string, string | number>) => t(key, vars);
    // Provider money follows the UI locale (Arabic-Indic digits in ar);
    // the English fallback report needs ASCII figures.
    const fmtMoney = nonLatin ? formatMoneyAscii : formatMoney;
    // Dates stay in the report language for Latin scripts; the English
    // fallback for non-Latin scripts keeps ISO dates (no shaped text).
    const fmtDate = nonLatin ? (d: string) => d : formatDate;
    const fmtClock = (hhmm: string) => {
      const minutes = parseTimeToMinutes(hhmm);
      if (minutes === null) return hhmm;
      if (nonLatin) {
        // ASCII only: the provider formatter follows the UI locale and
        // would inject bidi marks / non-Latin digits into the PDF.
        if (!hour12) return hhmm;
        const h24 = Math.floor(minutes / 60);
        const m = minutes % 60;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
      }
      return formatTime(minutes, hour12);
    };
    const rate = hourlyRate === "" || Number.isNaN(Number(hourlyRate)) ? null : Number(hourlyRate);
    const report = buildTimesheetReport(result, { hourlyRate: rate });
    const meta = [
      ...(nonLatin ? [tServer("en", "tc.pdfNonLatinNote", { script: LOCALE_META[locale].scriptName })] : []),
      `${tr("tc.period")}: ${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)} — ${period === "weekly" ? tr("tc.weekly") : tr("tc.biweekly")}`,
      ...(employee ? [`${tr("tc.reportEmployee")}: ${employee}`] : []),
      ...(business ? [`${tr("tc.reportBusiness")}: ${business}`] : []),
      ...(project ? [`${tr("tc.reportProject")}: ${project}`] : []),
    ];
    const sections = [
      {
        heading: tr("tc.reportSessions"),
        table: {
          headers: [tr("tc.reportDate"), tr("tc.entryMode"), tr("tc.reportStart"), tr("tc.reportEnd"), tr("tc.reportNextDay"), tr("tc.reportBreakMin"), tr("tc.reportPaid")],
          widths: [76, 76, 72, 72, 64, 64, 80],
          align: ["left", "left", "left", "left", "left", "right", "right"] as ("left" | "right")[],
          rows: report.sessions.map(s => [
            fmtDate(s.date),
            s.mode === "hours" ? tr("tc.modeHours") : tr("tc.modeTimes"),
            // Hours-only rows leave unavailable start/end/next-day/break blank.
            s.mode === "hours" ? "" : fmtClock(s.start),
            s.mode === "hours" ? "" : fmtClock(s.end),
            s.mode === "hours" ? "" : s.endsNextDay ? tr("tc.reportYes") : tr("tc.reportNo"),
            s.mode === "hours" ? "" : String(s.breakMinutes),
            formatDuration(s.paidMinutes),
          ]),
        },
      },
      {
        heading: tr("tc.reportDailyTotals"),
        table: {
          headers: [tr("tc.reportDate"), tr("tc.reportPaid")],
          widths: [252, 252],
          align: ["left", "right"] as ("left" | "right")[],
          rows: report.dailyTotals.map(d => [fmtDate(d.date), `${formatDuration(d.paidMinutes)} (${formatDecimalHours(d.paidMinutes)})`]),
        },
        lines: [tr("tc.reportDailyNote")],
      },
      ...(period === "biweekly"
        ? [{
            heading: tr("tc.reportWeekTotals"),
            table: {
              headers: [tr("tc.reportWeek"), tr("tc.reportTotalHours"), tr("tc.reportRegularHours"), tr("tc.reportOvertimeHours")],
              widths: [168, 112, 112, 112],
              align: ["left", "right", "right", "right"] as ("left" | "right")[],
              rows: report.weeks.map((w, i) => [
                `${tr("tc.reportWeek")} ${i + 1} (${fmtDate(w.startDate)} – ${fmtDate(w.endDate)})`,
                formatDuration(w.totalMinutes),
                formatDuration(w.regularMinutes),
                formatDuration(w.overtimeMinutes),
              ]),
            },
          }]
        : []),
      {
        heading: tr("tc.reportPaySummary"),
        emphasis: true,
        lines: [
          `${tr("tc.reportTotalHours")}: ${formatDuration(report.totalMinutes)} (${formatDecimalHours(report.totalMinutes)})`,
          `${tr("tc.reportRegularHours")}: ${formatDuration(report.regularMinutes)} (${formatDecimalHours(report.regularMinutes)})`,
          `${tr("tc.reportOvertimeHours")}: ${formatDuration(report.overtimeMinutes)} (${formatDecimalHours(report.overtimeMinutes)})`,
          `${tr("tc.reportThreshold")}: ${tr("tc.reportThresholdValue", { hours: threshold })}`,
          `${tr("tc.reportMultiplier")}: ${tr("tc.reportMultiplierValue", { value: multiplier })}`,
          ...(rate !== null && report.grossPayCents !== null
            ? [
                `${tr("tc.reportRate")}: ${fmtMoney(Math.round(rate * 100), currency)}`,
                `${tr("tc.reportRegularPay")}: ${fmtMoney(report.regularPayCents ?? 0, currency)}`,
                `${tr("tc.reportOvertimePay")}: ${fmtMoney(report.overtimePayCents ?? 0, currency)}`,
                `${tr("tc.pay")}: ${fmtMoney(report.grossPayCents, currency)}`,
              ]
            : []),
          ...(report.outOfPeriodPaidMinutes > 0
            ? [`${tr("tc.reportExcluded")}: ${tr("tc.reportExcludedValue", { duration: formatDuration(report.outOfPeriodPaidMinutes) })}`]
            : []),
        ],
      },
    ];
    const { buildPremiumPdfBytes, fetchLogoBytes } = await import("@/lib/tools/premium-pdf");
    const bytes = await buildPremiumPdfBytes({
      title: nonLatin ? "Work Hours & Time Card" : t("tc.title"),
      meta,
      sections,
      createdWith: tr("common.createdWith"),
      disclaimer: tr("tc.reportDisclaimer"),
      logoBytes: await fetchLogoBytes(),
      pageOfTemplate: tr("common.pageOf"),
      companyName: branding.companyName,
      companyLogo: dataUrlToCompanyLogo(branding.logoDataUrl, branding.logoMime) ?? undefined,
    });
    downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "timesheet.pdf");
  }

  function openInvoice() {
    const rate = hourlyRate === "" ? 0 : Number(hourlyRate);
    const lines: InvoiceLine[] = [];
    if (result.regularMinutes > 0) {
      lines.push({ id: "regular", description: `${t("tc.regular")} (${result.periodStart} to ${result.periodEnd})`, qty: Number(formatDecimalHours(result.regularMinutes)), rate });
    }
    if (result.overtimeMinutes > 0) {
      lines.push({ id: "overtime", description: `${t("tc.overtime")} (${result.periodStart} to ${result.periodEnd})`, qty: Number(formatDecimalHours(result.overtimeMinutes)), rate: rate * Number(multiplier) });
    }
    if (lines.length === 0) {
      lines.push({ id: "hours", description: t("tc.total"), qty: 0, rate });
    }
    setInvoiceLines(lines);
    setInvoiceNumber(`INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`);
    setClientName(project || clientName);
    setInvoiceOpen(true);
  }

  const invoiceSubtotal = invoiceLines.reduce((s, l) => s + l.qty * l.rate, 0);
  const invoiceTax = invoiceSubtotal * (Number(taxPercent) || 0) / 100;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  async function downloadInvoicePdf() {
    const nonLatin = LOCALE_META[locale].script !== "latin";
    const tr = nonLatin ? (key: string, vars?: Record<string, string | number>) => tServer("en", key, vars) : (key: string, vars?: Record<string, string | number>) => t(key, vars);
    const fmtMoney = nonLatin ? formatMoneyAscii : formatMoney;
    const meta = [
      ...(nonLatin ? [tServer("en", "tc.pdfNonLatinNote", { script: LOCALE_META[locale].scriptName })] : []),
      `${tr("tc.invoiceNumber")}: ${invoiceNumber}`,
      `${tr("tc.invoiceDate")}: ${invoiceDate}`,
      ...(seller ? [`${tr("tc.seller")}: ${seller}`] : []),
      ...(clientName ? [`${tr("tc.client")}: ${clientName}`] : []),
    ];
    const itemCount = invoiceLines.length;
    const { buildPremiumPdfBytes, fetchLogoBytes } = await import("@/lib/tools/premium-pdf");
    const bytes = await buildPremiumPdfBytes({
      title: invoiceNumber ? `${tr("tc.invoiceNumber")} ${invoiceNumber}` : tr("tc.invoiceTitle"),
      meta,
      sections: [
        {
          heading: tr("tc.invoiceTitle"),
          table: {
            headers: [tr("tc.description"), tr("tc.quantity"), tr("tc.rate"), tr("tc.amount")],
            widths: [252, 60, 96, 96],
            align: ["left", "right", "right", "right"] as ("left" | "right")[],
            rows: [
              ...invoiceLines.map(l => [l.description, String(l.qty), fmtMoney(Math.round(l.rate * 100), currency), fmtMoney(Math.round(l.qty * l.rate * 100), currency)]),
              [tr("tc.subtotal"), "", "", fmtMoney(Math.round(invoiceSubtotal * 100), currency)],
              [`${tr("tc.tax")} (${taxPercent || "0"}%)`, "", "", fmtMoney(Math.round(invoiceTax * 100), currency)],
              [tr("tc.totalDue"), "", "", fmtMoney(Math.round(invoiceTotal * 100), currency)],
            ],
            subtotalRows: [itemCount],
            totalRow: itemCount + 2,
          },
        },
        { heading: tr("common.notes"), lines: [tr("tc.invoicePrivacyNote")] },
      ],
      createdWith: tr("common.createdWith"),
      logoBytes: await fetchLogoBytes(),
      pageOfTemplate: tr("common.pageOf"),
      companyName: branding.companyName,
      companyLogo: dataUrlToCompanyLogo(branding.logoDataUrl, branding.logoMime) ?? undefined,
    });
    downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), `${invoiceNumber || "invoice"}.pdf`);
  }

  const outOfPeriodSessions = sessions.filter(s => !periodDates.includes(s.date));
  const requiredFields = ["date", "start", "end"] as const;
  const mapFieldLabel: Record<string, string> = {
    date: t("tc.mapDate"),
    start: t("tc.mapStart"),
    end: t("tc.mapEnd"),
    break: t("tc.mapBreak"),
    nextDay: t("tc.mapNextDay"),
    employee: t("tc.mapEmployee"),
    project: t("tc.mapProject"),
    paidHours: t("tc.mapPaidHours"),
  };

  return (
    <>
      <ScrollReveal />
      <section className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <p className="eyebrow-indigo">FREE WORK TOOL</p>
        <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>{t("tc.title")}</h1>
        <p style={{ maxWidth: 720, color: "#475569", lineHeight: 1.6 }}>{t("tc.subtitle")}</p>

        {storageNotice && (
          <p role="status" style={{ background: "#EEF0FF", border: "1px solid #C7D2FE", padding: "12px 16px", borderRadius: 8 }}>{storageNotice}</p>
        )}

        {result.warnings.length > 0 && (
          <div role="alert" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>{t("tc.warningsTitle")}</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {result.warnings.map((w, i) => {
                if (w.code === "break-allocation-overtime") {
                  const sess = result.sessions.find(s => s.session.id === w.sessionId)?.session;
                  return <li key={i}>{sess ? t("tc.warnBreakAllocationOvertime", { date: sess.date, break: sess.breakMinutes }) : w.message}</li>;
                }
                return <li key={i}>{w.message}</li>;
              })}
            </ul>
          </div>
        )}

        {result.errors.length > 0 && (
          <div role="alert" aria-labelledby="tc-errors-heading" style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <h2 id="tc-errors-heading" style={{ fontSize: 16, margin: "0 0 8px" }}>{t("tc.errorsTitle", { count: result.errors.length }, result.errors.length)}</h2>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {result.errors.map((e, i) => <li key={i}>{translateError(e)}</li>)}
            </ul>
          </div>
        )}

        <section aria-labelledby="tc-period-heading" style={{ marginBottom: 24 }}>
          <h2 id="tc-period-heading" style={{ fontSize: 20 }}>{t("tc.period")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-week-start">{t("tc.weekStart")}</label>
              <input id="tc-week-start" className="input-premium" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-period">{t("tc.period")}</label>
              <select id="tc-period" className="input-premium" value={period} onChange={e => setPeriod(e.target.value as PeriodKind)}>
                <option value="weekly">{t("tc.weekly")}</option>
                <option value="biweekly">{t("tc.biweekly")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-hour-format">{t("tc.timeDisplay")}</label>
              <select id="tc-hour-format" className="input-premium" value={hour12 ? "12" : "24"} onChange={e => setHour12(e.target.value === "12")}>
                <option value="12">{t("tc.time12")}</option>
                <option value="24">{t("tc.time24")}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-employee">{t("tc.employee")}</label>
              <input id="tc-employee" className="input-premium" type="text" value={employee} onChange={e => setEmployee(e.target.value)} placeholder={t("tc.employeePlaceholder")} autoComplete="off" />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-business">{t("tc.business")}</label>
              <input id="tc-business" className="input-premium" type="text" value={business} onChange={e => setBusiness(e.target.value)} placeholder={t("tc.businessPlaceholder")} autoComplete="off" />
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-project">{t("tc.project")}</label>
              <input id="tc-project" className="input-premium" type="text" value={project} onChange={e => setProject(e.target.value)} placeholder={t("tc.projectPlaceholder")} autoComplete="off" />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            <button type="button" className="button-indigo" onClick={loadExample}>{t("tc.loadExample")}</button>
            {confirmReset ? (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <span>{t("tc.resetConfirm")}</span>
                <button type="button" className="button-indigo" onClick={doReset}>{t("tc.resetYes")}</button>
                <button type="button" className="button-indigo-secondary" onClick={() => setConfirmReset(false)}>{t("tc.resetKeep")}</button>
              </span>
            ) : (
              <button type="button" className="button-indigo-secondary" onClick={() => (sessions.length > 0 ? setConfirmReset(true) : doReset())}>{t("tc.reset")}</button>
            )}
          </div>
        </section>

        <details style={{ marginBottom: 24, border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t("tc.advanced")}</summary>
          <p style={{ color: "#475569" }}>{t("tc.advancedNote")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-rate">{t("tc.hourlyRate")}</label>
              <input id="tc-rate" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} aria-invalid={rateError || undefined} aria-describedby={rateError ? "tc-rate-error" : undefined} />
              {rateError && <p id="tc-rate-error" style={{ color: "#B91C1C" }}>{t("tc.rateError")}</p>}
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-currency">{t("tc.currency")}</label>
              <select id="tc-currency" className="input-premium" value={currency} onChange={e => { currencyUserSet.current = true; setCurrency(e.target.value); }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-threshold">{t("tc.threshold")}</label>
              <input id="tc-threshold" className="input-premium" type="number" inputMode="decimal" min="1" max="168" step="0.5" value={threshold} onChange={e => setThreshold(e.target.value)} aria-invalid={thresholdError || undefined} />
              {thresholdError && <p style={{ color: "#B91C1C" }}>{t("tc.thresholdError")}</p>}
            </div>
            <div className="field">
              <label className="label-premium" htmlFor="tc-multiplier">{t("tc.multiplier")}</label>
              <input id="tc-multiplier" className="input-premium" type="number" inputMode="decimal" min="1" max="5" step="0.25" value={multiplier} onChange={e => setMultiplier(e.target.value)} aria-invalid={multiplierError || undefined} />
              {multiplierError && <p style={{ color: "#B91C1C" }}>{t("tc.multiplierError")}</p>}
            </div>
          </div>
        </details>

        <section aria-labelledby="tc-days-heading">
          <h2 id="tc-days-heading" style={{ fontSize: 20 }}>{t("tc.timesheetHeading")} — {period === "weekly" ? t("tc.weekly") : t("tc.biweekly")}</h2>
          {sessions.length === 0 && (
            <p style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "16px", borderRadius: 8 }}>{t("tc.noSessions")}</p>
          )}
          <div style={{ display: "grid", gap: 16 }}>
            {periodDates.map(date => {
              const daySessions = sessions.filter(s => s.date === date).sort((a, b) => {
                const aKey = a.mode === "hours" ? Number.POSITIVE_INFINITY : (parseTimeToMinutes(a.start) ?? 0);
                const bKey = b.mode === "hours" ? Number.POSITIVE_INFINITY : (parseTimeToMinutes(b.start) ?? 0);
                return aKey - bKey;
              });
              const dayTotal = result.days.find(d => d.date === date)?.paidMinutes ?? 0;
              const targets = copyTargets[date] ?? [];
              return (
                <article key={date} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <h3 style={{ fontSize: 17, margin: 0 }}>{formatDate(date)} <span style={{ color: "#64748B", fontWeight: 400 }}>({date})</span></h3>
                    <strong>{t("tc.dayTotal")}: {formatDuration(dayTotal)} ({formatDecimalHours(dayTotal)} h)</strong>
                  </div>
                  {daySessions.length === 0 && <p style={{ color: "#64748B" }}>{t("tc.noSessionsDay")}</p>}
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    {daySessions.map(s => {
                      const isHours = s.mode === "hours";
                      const hoursMinutes = draftHoursMinutes(s);
                      const hoursDisplay = s.paidHoursText ?? (s.paidMinutes !== undefined ? formatLocaleNumber(locale, s.paidMinutes / 60) : "");
                      return (
                      <div key={s.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", background: "#F8FAFC", padding: 12, borderRadius: 8 }}>
                        <div className="field">
                          <label className="label-premium" htmlFor={`mode-${s.id}`}>{t("tc.entryMode")}</label>
                          <select id={`mode-${s.id}`} className="input-premium" value={isHours ? "hours" : "times"} onChange={e => requestModeSwitch(s, e.target.value as EntryMode)}>
                            <option value="times">{t("tc.modeTimes")}</option>
                            <option value="hours">{t("tc.modeHours")}</option>
                          </select>
                        </div>
                        {isHours ? (
                          <>
                            <div className="field">
                              <label className="label-premium" htmlFor={`hours-${s.id}`}>{t("tc.paidHoursWorked")}</label>
                              <input
                                id={`hours-${s.id}`}
                                className="input-premium"
                                type="text"
                                inputMode="decimal"
                                dir="ltr"
                                value={hoursDisplay}
                                onChange={e => {
                                  const text = e.target.value;
                                  const parsed = parseLocalizedNumber(text, locale);
                                  updateSession(s.id, { paidHoursText: text, paidMinutes: parsed === null ? undefined : decimalHoursToMinutes(parsed) });
                                }}
                                onBlur={e => {
                                  const text = e.target.value;
                                  if (text.trim() === "") {
                                    updateSession(s.id, { paidHoursText: undefined, paidMinutes: undefined });
                                    return;
                                  }
                                  const parsed = parseLocalizedNumber(text, locale);
                                  // Valid text normalizes to canonical minutes; malformed
                                  // text stays so the engine error can name it.
                                  if (parsed !== null) updateSession(s.id, { paidHoursText: undefined, paidMinutes: decimalHoursToMinutes(parsed) });
                                }}
                              />
                            </div>
                            <span style={{ color: "#475569" }}>
                              {hoursMinutes !== null && Number.isFinite(hoursMinutes) ? `= ${formatDuration(hoursMinutes)}` : ""}
                            </span>
                            <p style={{ color: "#64748B", fontSize: 13, margin: 0, flexBasis: "100%" }}>{t("tc.paidHoursHint")}</p>
                          </>
                        ) : (
                          <>
                            <div className="field">
                              <label className="label-premium" htmlFor={`start-${s.id}`}>{t("tc.start")}</label>
                              <input id={`start-${s.id}`} className="input-premium" type="time" value={s.start} onChange={e => updateSession(s.id, { start: e.target.value })} />
                            </div>
                            <div className="field">
                              <label className="label-premium" htmlFor={`end-${s.id}`}>{t("tc.end")}</label>
                              <input id={`end-${s.id}`} className="input-premium" type="time" value={s.end} onChange={e => updateSession(s.id, { end: e.target.value })} />
                            </div>
                            <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
                              <input type="checkbox" checked={s.endsNextDay} onChange={e => updateSession(s.id, { endsNextDay: e.target.checked })} />
                              {t("tc.endsNextDay")}
                            </label>
                            <div className="field">
                              <label className="label-premium" htmlFor={`break-${s.id}`}>{t("tc.breakMinutes")}</label>
                              <input id={`break-${s.id}`} className="input-premium" type="number" inputMode="numeric" min="0" step="1" value={s.breakMinutes} onChange={e => updateSession(s.id, { breakMinutes: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            </div>
                            <span style={{ color: "#475569" }}>
                              {hour12 && parseTimeToMinutes(s.start) !== null && parseTimeToMinutes(s.end) !== null
                                ? `${formatTime(parseTimeToMinutes(s.start)!, true)} – ${formatTime(parseTimeToMinutes(s.end)!, true)}${s.endsNextDay ? " next day" : ""}`
                                : ""}
                            </span>
                          </>
                        )}
                        {pendingSwitch?.id === s.id && (
                          <div role="alert" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flexBasis: "100%", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "8px 12px", borderRadius: 8 }}>
                            <span>{t("tc.switchModeWarning")}</span>
                            <button type="button" className="button-indigo" onClick={confirmModeSwitch}>{t("tc.switchDiscard")}</button>
                            <button type="button" className="button-indigo-secondary" onClick={() => setPendingSwitch(null)}>{t("tc.switchKeep")}</button>
                          </div>
                        )}
                        <button type="button" className="button-indigo-secondary" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>{t("tc.removeSession")}</button>
                      </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <button type="button" className="button-indigo-secondary" onClick={() => addSession(date)}>{t("tc.addSession")}</button>
                    <button type="button" className="button-indigo-secondary" onClick={() => addHoursEntry(date)}>{t("tc.addHoursEntry")}</button>
                    {daySessions.length > 0 && (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span>{t("tc.copyTo")}</span>
                        {periodDates.filter(d => d !== date).map(d => (
                          <label key={d} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={targets.includes(d)}
                              onChange={e => setCopyTargets(prev => ({ ...prev, [date]: e.target.checked ? [...targets, d] : targets.filter(x => x !== d) }))}
                            />
                            {d}
                          </label>
                        ))}
                        <button type="button" className="button-indigo-secondary" disabled={targets.length === 0} onClick={() => copyDay(date)}>{t("tc.copySchedule")}</button>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {outOfPeriodSessions.length > 0 && (
            <div style={{ marginTop: 16, background: "#FFFBEB", border: "1px solid #FDE68A", padding: 12, borderRadius: 8 }}>
              <strong>{t("tc.outsideTitle")}</strong>
              <p>{t("tc.outsideNote")}</p>
              <ul>
                {outOfPeriodSessions.map(s => {
                  const hm = draftHoursMinutes(s);
                  return (
                    <li key={s.id}>
                      {s.date} {s.mode === "hours" ? (hm !== null && Number.isFinite(hm) ? formatDuration(hm) : t("tc.modeHours")) : `${s.start}–${s.end}`} <button type="button" className="button-indigo-secondary" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>{t("tc.remove")}</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {result.outOfPeriodSegments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>{t("tc.outsideMinutesTitle")}</h3>
              <ul>{result.outOfPeriodSegments.map((d, i) => (
                <li key={i}>{t("tc.outsideDetail", {
                  paid: formatDuration(d.paidMinutes),
                  sessionDate: d.sessionDate,
                  segmentDate: d.segmentDate,
                  period: t(period === "weekly" ? "tc.periodWord.weekly" : "tc.periodWord.biweekly"),
                  periodStart: result.periodStart,
                })}</li>
              ))}</ul>
            </div>
          )}
        </section>

        <section aria-labelledby="tc-summary-heading" style={{ marginTop: 32 }}>
          <h2 id="tc-summary-heading" style={{ fontSize: 20 }}>{t("tc.summary")}</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr><th style={{ textAlign: "start", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("tc.week")}</th><th style={{ textAlign: "end", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("tc.total")}</th><th style={{ textAlign: "end", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("tc.regular")}</th><th style={{ textAlign: "end", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("tc.overtime")}</th><th style={{ textAlign: "end", borderBottom: "2px solid #E2E8F0", padding: 8 }}>{t("tc.pay")}</th></tr>
              </thead>
              <tbody>
                {result.weeks.map(w => (
                  <tr key={w.index}>
                    <td style={{ padding: 8, borderBottom: "1px solid #F1F5F9" }}>{t("tc.week")} {w.index + 1} ({w.startDate} to {w.endDate})</td>
                    <td style={{ textAlign: "end", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.totalMinutes)} ({formatDecimalHours(w.totalMinutes)} h)</td>
                    <td style={{ textAlign: "end", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.regularMinutes)}</td>
                    <td style={{ textAlign: "end", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatDuration(w.overtimeMinutes)}</td>
                    <td style={{ textAlign: "end", padding: 8, borderBottom: "1px solid #F1F5F9" }}>{formatMoney(w.payCents, currency)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: 8, fontWeight: 700 }}>{t("tc.periodTotal")}</td>
                  <td style={{ textAlign: "end", padding: 8, fontWeight: 700 }}>{formatDuration(result.totalMinutes)} ({formatDecimalHours(result.totalMinutes)} h)</td>
                  <td style={{ textAlign: "end", padding: 8, fontWeight: 700 }}>{formatDuration(result.regularMinutes)}</td>
                  <td style={{ textAlign: "end", padding: 8, fontWeight: 700 }}>{formatDuration(result.overtimeMinutes)}</td>
                  <td style={{ textAlign: "end", padding: 8, fontWeight: 700 }}>{formatMoney(result.payCents, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: "#475569" }}>{t("tc.formulaNote", { threshold, multiplier })}</p>
          <div style={{ marginTop: 16 }}>
            <ReportBrandingFields />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            <button type="button" className="button-indigo" onClick={() => window.print()}>{t("common.print")}</button>
            <button type="button" className="button-indigo" onClick={downloadPdf}>{t("tc.downloadPdf")}</button>
            <button type="button" className="button-indigo" onClick={downloadCsv}>{t("tc.downloadCsv")}</button>
            <button type="button" className="button-indigo-secondary" onClick={openInvoice} disabled={result.totalMinutes === 0}>{t("tc.createInvoice")}</button>
          </div>
        </section>

        <section aria-labelledby="tc-import-heading" style={{ marginTop: 32, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
          <h2 id="tc-import-heading" style={{ fontSize: 20 }}>{t("tc.importTitle")}</h2>
          <p style={{ color: "#475569" }}>{t("tc.importNote")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <label className="button-indigo-secondary" style={{ cursor: "pointer" }}>
              {t("tc.chooseFile")}
              <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = ""; }} />
            </label>
            <button type="button" className="button-indigo-secondary" onClick={() => downloadBlob(new Blob([buildSampleCsv()], { type: "text/csv;charset=utf-8" }), "time-card-sample.csv")}>{t("tc.sampleTemplate")}</button>
            <span>{t("tc.importLimits")}</span>
          </div>
          {importError && <p role="alert" style={{ color: "#B91C1C" }}>{importError}</p>}
          {importStep === "map" && importRawRows.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>{t("tc.mapTitle")} ({importFileName})</h3>
              <p>{importRawRows[0].map(v => String(v ?? "")).join(" · ")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {requiredFields.map(field => (
                  <div className="field" key={field}>
                    <label className="label-premium" htmlFor={`map-${field}`}>{mapFieldLabel[field]}</label>
                    <select id={`map-${field}`} className="input-premium" value={importMapping[field] ?? -1} onChange={e => setImportMapping(prev => ({ ...prev, [field]: Number(e.target.value) }))}>
                      <option value={-1}>{t("tc.notMapped")}</option>
                      {importRawRows[0].map((h, i) => <option key={i} value={i}>{String(h ?? "") || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
                {(["break", "nextDay", "paidHours", "employee", "project"] as const).map(field => (
                  <div className="field" key={field}>
                    <label className="label-premium" htmlFor={`map-${field}`}>{mapFieldLabel[field]}</label>
                    <select id={`map-${field}`} className="input-premium" value={importMapping[field] ?? -1} onChange={e => setImportMapping(prev => ({ ...prev, [field]: Number(e.target.value) }))}>
                      <option value={-1}>{t("tc.notMapped")}</option>
                      {importRawRows[0].map((h, i) => <option key={i} value={i}>{String(h ?? "") || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
                <div className="field">
                  <label className="label-premium" htmlFor="import-date-format">{t("tc.dateFormatLabel")}</label>
                  <select id="import-date-format" className="input-premium" value={importDateFormat} onChange={e => setImportDateFormat(e.target.value as DateFormat)}>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-02)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (11/02/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (02/11/2026)</option>
                  </select>
                </div>
              </div>
              <p style={{ color: "#475569" }}>{t("tc.mapModesNote")}</p>
              <button type="button" className="button-indigo" style={{ marginTop: 12 }} disabled={importMapping.date === undefined || ((importMapping.start === undefined || importMapping.end === undefined) && importMapping.paidHours === undefined)} onClick={() => setImportStep("preview")}>{t("tc.previewValidate")}</button>
            </div>
          )}
          {importStep === "preview" && importParsed && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16 }}>{t("tc.previewTitle")}</h3>
              <p>{t("tc.previewValid", { count: importValidRows.length }, importValidRows.length)} {t("tc.previewErrors", { count: importParsed.rows.filter(r => r.session === null && !r.conflict).length })} {importParsed.conflicts.length > 0 && t("tc.previewConflicts", { count: importParsed.conflicts.length }, importParsed.conflicts.length)}</p>
              {importParsed.employees.length > 1 && (
                <div className="field">
                  <label className="label-premium" htmlFor="import-employee">{t("tc.chooseEmployee")}</label>
                  <select id="import-employee" className="input-premium" value={importEmployee} onChange={e => setImportEmployee(e.target.value)}>
                    <option value="">—</option>
                    {importParsed.employees.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                  <thead><tr><th style={{ textAlign: "start", padding: 8 }}>Row</th><th style={{ textAlign: "start", padding: 8 }}>{t("tc.mapDate")}</th><th style={{ textAlign: "start", padding: 8 }}>{t("tc.mapStart")}–{t("tc.mapEnd")}</th><th style={{ textAlign: "start", padding: 8 }}>{t("tc.mapPaidHours")}</th><th style={{ textAlign: "start", padding: 8 }}>{t("tc.mapBreak")}</th><th style={{ textAlign: "start", padding: 8 }}>Status</th></tr></thead>
                  <tbody>
                    {importParsed.rows.slice(0, 100).map(r => (
                      <tr key={r.rowNumber}>
                        <td style={{ padding: 8 }}>{r.rowNumber}</td>
                        <td style={{ padding: 8 }}>{r.session?.date ?? r.conflict?.date ?? "—"}</td>
                        <td style={{ padding: 8 }}>{r.session ? (r.session.mode === "hours" ? t("tc.modeHours") : `${r.session.start}–${r.session.end}${r.session.endsNextDay ? " (next day)" : ""}`) : r.conflict?.timesSession ? `${r.conflict.timesSession.start}–${r.conflict.timesSession.end}${r.conflict.timesSession.endsNextDay ? " (next day)" : ""}` : "—"}</td>
                        <td style={{ padding: 8 }}>{r.session?.mode === "hours" && r.session.paidMinutes !== undefined ? formatDecimalHours(r.session.paidMinutes) : r.conflict ? formatDecimalHours(r.conflict.hoursSession.paidMinutes ?? 0) : "—"}</td>
                        <td style={{ padding: 8 }}>{r.session && r.session.mode !== "hours" ? r.session.breakMinutes : r.conflict?.timesSession ? r.conflict.timesSession.breakMinutes : "—"}</td>
                        <td style={{ padding: 8 }}>
                          {r.errors.length > 0
                            ? r.errors.map((m, i) => {
                                const code = r.errorCodes?.[i];
                                if (!code) return m;
                                const s = r.session;
                                return t(`tc.err.${code}`, {
                                  value: r.errorDetails?.[i] ?? "",
                                  format: importDateFormat,
                                  date: s?.date ?? "",
                                  start: s?.start ?? "",
                                  end: s?.end ?? "",
                                  break: s?.breakMinutes ?? 0,
                                  gross: 0,
                                });
                              }).join("; ")
                            : r.warnings.length > 0
                              ? r.warnings.map((m, i) => {
                                  const code = r.warningCodes?.[i];
                                  return code ? t(`tc.warn.${code}`) : m;
                                }).join("; ")
                              : "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importParsed.conflicts.length > 0 && (
                <div style={{ marginTop: 16, background: "#FFFBEB", border: "1px solid #FDE68A", padding: 12, borderRadius: 8 }}>
                  <h4 style={{ fontSize: 15, margin: "0 0 4px" }}>{t("tc.importConflictTitle")}</h4>
                  <p style={{ margin: "0 0 12px", color: "#475569" }}>{t("tc.importConflictNote")}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <button type="button" className="button-indigo-secondary" onClick={() => setImportChoices(prev => { const next = { ...prev }; importParsed.conflicts.forEach(c => { next[c.rowNumber] = "hours"; }); return next; })}>{t("tc.importApplyAllHours")}</button>
                    <button type="button" className="button-indigo-secondary" onClick={() => setImportChoices(prev => { const next = { ...prev }; importParsed.conflicts.forEach(c => { if (c.timesSession) next[c.rowNumber] = "times"; }); return next; })}>{t("tc.importApplyAllTimes")}</button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {importParsed.conflicts.map(c => (
                      <div key={c.rowNumber} style={{ background: "#FFFFFF", border: "1px solid #FDE68A", padding: 12, borderRadius: 8 }}>
                        <strong>Row {c.rowNumber} — {c.date}</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
                          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="radio" name={`conflict-${c.rowNumber}`} checked={importChoices[c.rowNumber] === "hours"} onChange={() => setImportChoices(prev => ({ ...prev, [c.rowNumber]: "hours" }))} />
                            {t("tc.importUseHours")} ({formatDecimalHours(c.hoursSession.paidMinutes ?? 0)} h)
                          </label>
                          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="radio" name={`conflict-${c.rowNumber}`} disabled={!c.timesSession} checked={importChoices[c.rowNumber] === "times"} onChange={() => setImportChoices(prev => ({ ...prev, [c.rowNumber]: "times" }))} />
                            {t("tc.importUseTimes")} ({c.timesSession ? `${c.timesSession.start}–${c.timesSession.end}${c.timesSession.endsNextDay ? " (next day)" : ""}, ${c.timesSession.breakMinutes} min break` : "—"})
                          </label>
                        </div>
                        {!c.timesSession && c.timesErrors.length > 0 && (
                          <p style={{ color: "#B91C1C", margin: "8px 0 0" }}>
                            {c.timesErrors.map((m, i) => {
                              const code = c.timesErrorCodes[i];
                              return code ? t(`tc.err.${code}`, { date: c.date, value: "" }) : m;
                            }).join("; ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="radio" name="import-mode" checked={importMode === "append"} onChange={() => setImportMode("append")} /> {t("tc.append")}</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="radio" name="import-mode" checked={importMode === "replace"} onChange={() => setImportMode("replace")} /> {t("tc.replace")}</label>
                <button type="button" className="button-indigo" disabled={(importValidRows.length + (importParsed.conflicts.length - importUnresolvedConflicts.length)) === 0 || importUnresolvedConflicts.length > 0 || (importParsed.employees.length > 1 && !importEmployee)} onClick={confirmImport}>{t("tc.confirmImport")}</button>
                <button type="button" className="button-indigo-secondary" onClick={() => setImportStep("map")}>{t("tc.backToMapping")}</button>
              </div>
              <p style={{ color: "#475569" }}>{t("tc.outsideImportNote")}</p>
            </div>
          )}
        </section>

        {invoiceOpen && (
          <section aria-labelledby="tc-invoice-heading" style={{ marginTop: 32, border: "1px solid #C7D2FE", borderRadius: 12, padding: 16, background: "#EEF0FF" }}>
            <h2 id="tc-invoice-heading" style={{ fontSize: 20 }}>{t("tc.invoiceTitle")}</h2>
            <p style={{ color: "#475569" }}>{t("tc.invoiceNote")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div className="field">
                <label className="label-premium" htmlFor="inv-seller">{t("tc.seller")}</label>
                <input id="inv-seller" className="input-premium" type="text" value={seller} onChange={e => setSeller(e.target.value)} placeholder={t("tc.sellerPlaceholder")} autoComplete="off" />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-client">{t("tc.client")}</label>
                <input id="inv-client" className="input-premium" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t("tc.clientPlaceholder")} autoComplete="off" />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-number">{t("tc.invoiceNumber")}</label>
                <input id="inv-number" className="input-premium" type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-date">{t("tc.invoiceDate")}</label>
                <input id="inv-date" className="input-premium" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="field">
                <label className="label-premium" htmlFor="inv-tax">{t("tc.tax")}</label>
                <input id="inv-tax" className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {invoiceLines.map((line, idx) => (
                <div key={line.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", background: "#FFFFFF", padding: 12, borderRadius: 8 }}>
                  <div className="field" style={{ flex: "2 1 240px" }}>
                    <label className="label-premium" htmlFor={`inv-desc-${line.id}`}>{t("tc.description")}</label>
                    <input id={`inv-desc-${line.id}`} className="input-premium" type="text" value={line.description} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l)))} />
                  </div>
                  <div className="field">
                    <label className="label-premium" htmlFor={`inv-qty-${line.id}`}>{t("tc.qtyHours")}</label>
                    <input id={`inv-qty-${line.id}`} className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={line.qty} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, qty: Number(e.target.value) } : l)))} />
                  </div>
                  <div className="field">
                    <label className="label-premium" htmlFor={`inv-rate-${line.id}`}>{t("tc.ratePerHour", { currency })}</label>
                    <input id={`inv-rate-${line.id}`} className="input-premium" type="number" inputMode="decimal" min="0" step="0.01" value={line.rate} onChange={e => setInvoiceLines(prev => prev.map((l, i) => (i === idx ? { ...l, rate: Number(e.target.value) } : l)))} />
                  </div>
                  <strong>{formatMoney(Math.round(line.qty * line.rate * 100), currency)}</strong>
                  <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceLines(prev => prev.filter((_, i) => i !== idx))}>{t("tc.removeLine")}</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, alignItems: "center" }}>
              <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceLines(prev => [...prev, { id: `line-${Date.now()}`, description: t("tc.invoice.additional"), qty: 0, rate: hourlyRate === "" ? 0 : Number(hourlyRate) }])}>{t("tc.addLine")}</button>
              <strong>{t("tc.totalDue")}: {formatMoney(Math.round(invoiceTotal * 100), currency)}</strong>
              <button type="button" className="button-indigo" onClick={downloadInvoicePdf}>{t("tc.downloadInvoicePdf")}</button>
              <button type="button" className="button-indigo-secondary" onClick={() => setInvoiceOpen(false)}>{t("tc.closeInvoice")}</button>
            </div>
            <p style={{ color: "#475569" }}>{t("tc.invoicePrivacyNote")}</p>
          </section>
        )}

        <section aria-labelledby="tc-save-heading" style={{ marginTop: 32, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
          <h2 id="tc-save-heading" style={{ fontSize: 20 }}>{t("tc.saveTitle")}</h2>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            {t("tc.remember")}
          </label>
          <p style={{ color: "#475569" }}>{t("tc.saveNote")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
            <div className="field">
              <label className="label-premium" htmlFor="tc-duplicate-date">{t("tc.duplicateLabel")}</label>
              <input id="tc-duplicate-date" className="input-premium" type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} />
            </div>
            <button type="button" className="button-indigo-secondary" disabled={!isValidDateString(duplicateDate) || sessions.length === 0} onClick={duplicateWeek}>{t("tc.duplicateButton")}</button>
            <button type="button" className="button-indigo-secondary" onClick={deleteSaved}>{t("tc.deleteSaved")}</button>
          </div>
        </section>

        <section aria-labelledby="tc-how-heading" style={{ marginTop: 32 }}>
          <h2 id="tc-how-heading" style={{ fontSize: 20 }}>{t("tc.howTitle")}</h2>
          <ul style={{ lineHeight: 1.7, color: "#334155" }}>
            <li><strong>{t("tc.howFormula")}</strong></li>
            <li>{t("tc.howDecimal")}</li>
            <li>{t("tc.howBreaks")}</li>
            <li>{t("tc.howHoursOnly")}</li>
            <li>{t("tc.howOvernight")}</li>
            <li>{t("tc.howBreakAllocation")}</li>
            <li>{t("tc.howWeekly")}</li>
            <li>{t("tc.howOvertime")}</li>
            <li>{t("tc.howGross")}</li>
            <li>{t("tc.howPrivacy")}</li>
            <li>{t("tc.howExamples")}</li>
          </ul>
        </section>
      </section>
    </>
  );
}
