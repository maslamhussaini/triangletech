"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  areaM2, bagResult, buildCsv, bulkOrder, computeMaterial, costScenarios,
  displayAreaToMeters, displayDepthToMeters, displayLengthToMeters,
  metersToDisplayArea, metersToDisplayDepth, metersToDisplayLength,
  validateArea, type AreaInput, type MaterialKind, type Shape, type UnitSystem, type ValidationCode,
} from "@/lib/tools/landscaping";
import { buildPdfBlob, downloadBlob } from "@/lib/tools/simple-pdf";
import { useLanguage } from "@/lib/i18n/provider";
import { getDictionary, translate } from "@/lib/i18n/dictionaries";
import {
  DEFAULT_LOCALE, LOCALE_META, LOCALE_STORAGE_KEY, defaultCurrencyForLocale, detectLocaleFromLanguages, formatLocaleNumber, isLocale, parseLocalizedNumber as parseShared,
  type Locale,
} from "@/lib/i18n/locales";

interface Draft {
  id: string;
  name: string;
  shape: Shape;
  length: string;
  width: string;
  diameter: string;
  area: string;
  depth: string;
  group: string;
}

const emptyDraft = (id: string): Draft => ({ id, name: "", shape: "rectangle", length: "", width: "", diameter: "", area: "", depth: "", group: "" });
let idCounter = 0;
const nextId = () => { idCounter += 1; return `area-${Date.now()}-${idCounter}`; };

function trimNum(n: number): string {
  const s = n.toFixed(4);
  return s.replace(/\.?0+$/, "") || "0";
}
function cap(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function Diagram({ draft, system }: { draft: Draft; system: UnitSystem }) {
  const lenLabel = system === "imperial" ? "ft" : "m";
  const depLabel = system === "imperial" ? "in" : "cm";
  if (draft.shape === "circle") {
    return (
      <svg viewBox="0 0 200 120" role="img" aria-label="Circle diagram" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }}>
        <circle cx="100" cy="58" r="46" fill="#EEF0FF" stroke="#4F46E5" strokeWidth="2" />
        <line x1="54" y1="58" x2="146" y2="58" stroke="#312E81" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="100" y="62" textAnchor="middle" fontSize="11" fill="#1B1B4B">d = {draft.diameter || "—"} {lenLabel}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#475569">depth {draft.depth || "—"} {depLabel}</text>
      </svg>
    );
  }
  if (draft.shape === "direct") {
    return (
      <svg viewBox="0 0 200 120" role="img" aria-label="Direct area diagram" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }}>
        <rect x="30" y="12" width="140" height="80" rx="6" fill="#EEF0FF" stroke="#4F46E5" strokeWidth="2" />
        <text x="100" y="55" textAnchor="middle" fontSize="12" fill="#1B1B4B">area {draft.area || "—"} {system === "imperial" ? "ft²" : "m²"}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#475569">depth {draft.depth || "—"} {depLabel}</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label="Rectangle diagram" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }}>
      <rect x="30" y="12" width="140" height="80" rx="6" fill="#EEF0FF" stroke="#4F46E5" strokeWidth="2" />
      <text x="100" y="48" textAnchor="middle" fontSize="11" fill="#1B1B4B">length {draft.length || "—"} {lenLabel}</text>
      <text x="100" y="66" textAnchor="middle" fontSize="11" fill="#1B1B4B">width {draft.width || "—"} {lenLabel}</text>
      <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#475569">depth {draft.depth || "—"} {depLabel}</text>
    </svg>
  );
}

const ERR_KEY: Record<ValidationCode, string> = {
  "missing-dimensions": "ls.errMissingDimensions",
  "missing-depth": "ls.errMissingDepth",
  "not-positive": "ls.errNotPositive",
  "not-finite": "ls.errNotPositive",
  "too-large": "ls.errTooLarge",
};

export default function LandscapingCalculator({ material }: { material: MaterialKind }) {
  // Single shared localization system (src/lib/i18n): the shared tools
  // layout provides the language dropdown and sets html lang/dir, so this
  // component no longer keeps its own locale state or dropdown. Adapters
  // below keep the existing t(locale, ...) / formatNumber(locale, ...) /
  // parseLocalizedNumber(..., locale) call sites working against the
  // provider's current locale.
  // The provider owns the current locale, but export code passes an
  // explicit locale (English for non-Latin PDFs), so these adapters must
  // honour the locale argument — they translate/format/parse with it
  // directly against the shared dictionaries, not the provider's locale.
  // (An earlier version ignored the argument and broke the PDF fallback:
  // Arabic titles rendered as "?????" instead of English.)
  const { locale } = useLanguage();
  const t = useCallback((l: Locale, key: string, vars?: Record<string, string | number>) => translate(l, getDictionary(l), getDictionary("en"), key, vars), []);
  const formatNumber = useCallback((l: Locale, n: number, d = 2) => formatLocaleNumber(l, n, d), []);
  const parseLocalizedNumber = useCallback((s: string, l: Locale) => { const v = parseShared(s, l); return v === null ? undefined : v; }, []);
  const [mounted, setMounted] = useState(false);
  const [system, setSystem] = useState<UnitSystem>("imperial");
  const [areas, setAreas] = useState<Draft[]>([]);
  const [extra, setExtra] = useState("0");
  const [loose, setLoose] = useState(material === "gravel" ? "1.00" : "1");
  const [density, setDensity] = useState("");
  const [bagMode, setBagMode] = useState<"volume" | "weight">("volume");
  const [bagVolume, setBagVolume] = useState(material === "mulch" ? "2" : "2");
  const [bagVolumeUnit, setBagVolumeUnit] = useState<"ft3" | "m3" | "L">("ft3");
  const [bagWeight, setBagWeight] = useState("50");
  const [bulkUnit, setBulkUnit] = useState<"yd3" | "m3">("yd3");
  const [bulkIncrement, setBulkIncrement] = useState("");
  const [bulkMinimum, setBulkMinimum] = useState("");
  const [raisedBed, setRaisedBed] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bagPrice, setBagPrice] = useState("");
  const [delivery, setDelivery] = useState("");
  const [tax, setTax] = useState("");
  const [deliveryTaxable, setDeliveryTaxable] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [remember, setRemember] = useState(false);
  const [notice, setNotice] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const restoredRef = useRef(false);

  const meta = LOCALE_META[locale];
  const materialName = t(locale, `mat.${material}`);
  const title = t(locale, "ls.title", { material: cap(materialName) });

  // Mount: saved language first, then browser language, then English.
  // Fresh-form currency/unit defaults apply only here, while the form
  // is still empty — never on a later language switch.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    let initial: Locale = DEFAULT_LOCALE;
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(saved)) initial = saved;
      else if (navigator.languages?.length) initial = detectLocaleFromLanguages(navigator.languages);
      else if (navigator.language) initial = detectLocaleFromLanguages([navigator.language]);
    } catch { /* storage unavailable: stay English */ }
    // Note: the provider owns the locale (saved cookie, then browser
    // language). This effect only derives fresh-form defaults from the
    // same detection, without changing the locale itself.
    const region = (navigator.language ?? "").split("-")[1]?.toUpperCase();
    if (region && !["US", "LR", "MM"].includes(region)) setSystem("metric");
    setCurrency(defaultCurrencyForLocale(initial, navigator.language));
    setBulkUnit(region && !["US", "LR", "MM"].includes(region) ? "m3" : "yd3");
    setBagVolumeUnit(region && !["US", "LR", "MM"].includes(region) ? "L" : "ft3");
    try {
      const raw = window.localStorage.getItem(`triangletech-landscaping-${material}`);
      if (raw) {
        const saved = JSON.parse(raw) as { areas?: Draft[]; system?: UnitSystem; extra?: string; loose?: string; density?: string; projectName?: string; currency?: string };
        if (Array.isArray(saved.areas)) setAreas(saved.areas);
        if (saved.system) setSystem(saved.system);
        if (saved.extra !== undefined) setExtra(saved.extra);
        if (saved.loose !== undefined) setLoose(saved.loose);
        if (saved.density !== undefined) setDensity(saved.density);
        if (saved.projectName !== undefined) setProjectName(saved.projectName);
        if (saved.currency) setCurrency(saved.currency);
        setRemember(true);
        setNotice(t(initial, "ls.savedRestored"));
      }
    } catch { /* corrupt saved data: ignore, do not delete */ }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted || !remember) return;
    try {
      window.localStorage.setItem(`triangletech-landscaping-${material}`, JSON.stringify({ areas, system, extra, loose, density, projectName, currency }));
    } catch { /* storage full/blocked: tool still works */ }
  }, [mounted, remember, areas, system, extra, loose, density, projectName, currency, material]);

  const toCanonical = (d: Draft): AreaInput => {
    const p = (s: string) => parseLocalizedNumber(s, locale);
    const lengthM = d.length === "" ? undefined : p(d.length) === undefined ? undefined : displayLengthToMeters(p(d.length) as number, system);
    const widthM = d.width === "" ? undefined : p(d.width) === undefined ? undefined : displayLengthToMeters(p(d.width) as number, system);
    const diameterM = d.diameter === "" ? undefined : p(d.diameter) === undefined ? undefined : displayLengthToMeters(p(d.diameter) as number, system);
    const areaM2v = d.area === "" ? undefined : p(d.area) === undefined ? undefined : displayAreaToMeters(p(d.area) as number, system);
    const depthM = d.depth === "" ? undefined : p(d.depth) === undefined ? undefined : displayDepthToMeters(p(d.depth) as number, system);
    return { id: d.id, name: d.name, shape: d.shape, lengthM, widthM, diameterM, areaM2: areaM2v, depthM, group: d.group };
  };

  const canonical = areas.map(toCanonical);
  const areaErrors = useMemo(() => canonical.map(a => {
    const codes = validateArea(a);
    const draft = areas.find(d => d.id === a.id);
    const badNumber = draft && [draft.length, draft.width, draft.diameter, draft.area, draft.depth].some(s => s !== "" && parseLocalizedNumber(s, locale) === undefined);
    return { codes, badNumber };
  }), [canonical, areas, locale, parseLocalizedNumber]);

  const extraNum = parseLocalizedNumber(extra, locale) ?? 0;
  const looseNum = parseLocalizedNumber(loose, locale) ?? 1;
  const densityNum = density === "" ? undefined : parseLocalizedNumber(density, locale);
  const assumptionsValid = extraNum >= 0 && extraNum <= 1000 && looseNum > 0 && looseNum <= 10 && (densityNum === undefined || densityNum > 0);
  const validAreas = canonical.filter((a, i) => areaErrors[i].codes.length === 0 && !areaErrors[i].badNumber);
  const totals = useMemo(() => computeMaterial(validAreas, { extraPercent: extraNum, looseMultiplier: material === "mulch" ? 1 : looseNum, densityLbPerFt3: densityNum }), [validAreas, extraNum, looseNum, densityNum, material]);
  const hasResults = validAreas.length > 0;

  const bagOrderingQty = bagMode === "weight"
    ? (totals.weightLb ?? 0)
    : bagVolumeUnit === "ft3" ? totals.orderingFt3 : bagVolumeUnit === "m3" ? totals.orderingM3 : totals.orderingLiters;
  const bagCapacity = bagMode === "weight" ? (parseLocalizedNumber(bagWeight, locale) ?? 0) : (parseLocalizedNumber(bagVolume, locale) ?? 0);
  const bag = hasResults && bagCapacity > 0 ? bagResult(bagOrderingQty, bagCapacity) : undefined;
  const bagQtyUnit = bagMode === "weight" ? "lb" : bagVolumeUnit === "ft3" ? "ft³" : bagVolumeUnit === "m3" ? "m³" : "L";
  const bulkRequired = bulkUnit === "yd3" ? totals.orderingYd3 : totals.orderingM3;
  const bulk = bulkOrder(bulkRequired, bulkIncrement === "" ? undefined : parseLocalizedNumber(bulkIncrement, locale), bulkMinimum === "" ? undefined : parseLocalizedNumber(bulkMinimum, locale));
  const scenarios = costScenarios(totals, bag ? { orderingQty: bagOrderingQty, bags: bag.bags, purchasedQty: bag.purchasedQty, qtyUnit: bagQtyUnit } : undefined, bulk, bulkUnit, {
    currency, bulkPrice: bulkPrice === "" ? undefined : parseLocalizedNumber(bulkPrice, locale), bulkPriceUnit: bulkUnit,
    bagPrice: bagPrice === "" ? undefined : parseLocalizedNumber(bagPrice, locale),
    delivery: parseLocalizedNumber(delivery, locale) ?? 0, taxPercent: parseLocalizedNumber(tax, locale) ?? 0, deliveryTaxable,
  });

  const fmt = (n: number, d = 2) => formatNumber(locale, n, d);
  const money = (n: number) => {
    try { return new Intl.NumberFormat(meta.intl, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
    catch { return `${currency} ${n.toFixed(2)}`; }
  };

  const updateDraft = (id: string, patch: Partial<Draft>) => setAreas(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  const addArea = () => setAreas(prev => [...prev, emptyDraft(nextId())]);
  const duplicateArea = (d: Draft) => setAreas(prev => [...prev, { ...d, id: nextId(), name: d.name ? `${d.name} (2)` : "" }]);
  const loadExample = () => {
    const len = system === "imperial" ? "10" : trimNum(metersToDisplayLength(10 * 0.3048, "metric"));
    const wid = system === "imperial" ? "12" : trimNum(metersToDisplayLength(12 * 0.3048, "metric"));
    const dep = system === "imperial" ? "3" : trimNum(metersToDisplayDepth(3 * 0.0254, "metric"));
    setAreas([{ id: nextId(), name: `${t(locale, "common.example")}: ${t(locale, "ls.areaNamePlaceholder")}`, shape: "rectangle", length: len, width: wid, diameter: "", area: "", depth: dep, group: "" }]);
  };
  const doReset = () => {
    setAreas([]); setExtra("0"); setLoose(material === "gravel" ? "1.00" : "1"); setDensity(""); setBulkIncrement(""); setBulkMinimum("");
    setBulkPrice(""); setBagPrice(""); setDelivery(""); setTax(""); setProjectName(""); setConfirmReset(false); setNotice("");
  };
  const deleteSaved = () => {
    try { window.localStorage.removeItem(`triangletech-landscaping-${material}`); } catch { /* ignore */ }
    setRemember(false); setNotice(t(locale, "ls.savedDeleted"));
  };

  const lenUnit = system === "imperial" ? "ft" : "m";
  const depUnit = system === "imperial" ? "in" : "cm";
  const areaUnit = system === "imperial" ? "ft²" : "m²";

  const exportLines = (forPdf: boolean): string[] => {
    const lang: Locale = forPdf && meta.script !== "latin" ? "en" : locale;
    const L = (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
    const lines: string[] = [];
    lines.push(`${L("ls.title", { material: cap(L(`mat.${material}`)) })} — TriangleTech`);
    if (projectName) lines.push(`${L("ls.projectName")}: ${projectName}`);
    try { lines.push(new Intl.DateTimeFormat(LOCALE_META[lang].intl).format(new Date())); } catch { lines.push(new Date().toISOString().slice(0, 10)); }
    lines.push("");
    lines.push(`${L("ls.areas")}:`);
    validAreas.forEach(a => {
      const am = areaM2(a);
      lines.push(`- ${a.name || L("ls.area")}: ${am !== undefined ? fmt(am, 2) : ""} m², ${L("ls.depth")} ${a.depthM !== undefined ? fmt(metersToDisplayDepth(a.depthM, system), 2) : ""} ${depUnit}${a.group ? ` [${a.group}]` : ""}`);
    });
    lines.push("");
    lines.push(`${L("ls.baseVolume")}: ${fmt(totals.baseFt3, 2)} ft³ = ${fmt(totals.baseYd3, 4)} yd³ = ${fmt(totals.baseM3, 3)} m³`);
    lines.push(`${L("ls.orderingVolume")}: ${fmt(totals.orderingFt3, 2)} ft³ = ${fmt(totals.orderingYd3, 4)} yd³ = ${fmt(totals.orderingM3, 3)} m³ = ${fmt(totals.orderingLiters, 0)} L`);
    if (totals.weightLb !== undefined) lines.push(`${L("ls.weight")}: ${fmt(totals.weightLb, 0)} lb = ${fmt(totals.weightKg ?? 0, 0)} kg = ${fmt(totals.weightShortTons ?? 0, 3)} US short tons = ${fmt(totals.weightTonnes ?? 0, 3)} tonnes (density ${density} lb/ft³, supplier-supplied)`);
    if (bag) lines.push(`${L("ls.bagsToBuy")}: ${bag.bags} × ${bagCapacity} ${bagQtyUnit} = ${fmt(bag.purchasedQty, 2)} ${bagQtyUnit} (${L("ls.excess")}: ${fmt(bag.excessQty, 2)} ${bagQtyUnit})`);
    lines.push(`${L("ls.bulk")}: ${L("ls.required")} ${fmt(bulk.requiredQty, 4)} ${bulkUnit}; ${L("ls.purchased")} ${fmt(bulk.purchasedQty, 4)} ${bulkUnit}`);
    lines.push(`${L("ls.assumptions", {})}: ${L("ls.extra")} ${extra}%; ${L("ls.looseMultiplier")} ${loose}${material === "topsoil" && raisedBed ? `; ${L("ls.raisedBed")}` : ""}`);
    lines.push("");
    lines.push(`${L("ls.cost")}:`);
    if (scenarios.bagged) {
      const b = scenarios.bagged;
      lines.push(`${L("ls.bagged")}: ${L("ls.required")} ${fmt(b.requiredQty, 2)} ${b.qtyUnit}; ${L("ls.purchased")} ${fmt(b.purchasedQty, 2)} ${b.qtyUnit}${b.materialSubtotal !== undefined ? `; ${L("ls.subtotal")} ${money(b.materialSubtotal)}; ${L("ls.delivery")} ${money(b.delivery)}; ${L("ls.tax")} ${b.tax !== undefined ? money(b.tax) : ""}; ${L("ls.total")} ${b.total !== undefined ? money(b.total) : ""}` : `; ${L("ls.noPriceNote")}`}`);
    }
    const bk = scenarios.bulk;
    lines.push(`${L("ls.bulk")}: ${L("ls.required")} ${fmt(bk.requiredQty, 4)} ${bk.qtyUnit}; ${L("ls.purchased")} ${fmt(bk.purchasedQty, 4)} ${bk.qtyUnit}${bk.materialSubtotal !== undefined ? `; ${L("ls.subtotal")} ${money(bk.materialSubtotal)}; ${L("ls.delivery")} ${money(bk.delivery)}; ${L("ls.tax")} ${bk.tax !== undefined ? money(bk.tax) : ""}; ${L("ls.total")} ${bk.total !== undefined ? money(bk.total) : ""}` : `; ${L("ls.noPriceNote")}`}`);
    lines.push("");
    lines.push(L("ls.requiredVsPurchased"));
    lines.push(L("ls.disclaimer"));
    lines.push(L("common.poweredBy"));
    if (forPdf && meta.script !== "latin") lines.push(`Note: this PDF is rendered in English because the built-in PDF font does not support ${meta.scriptName} script. Use Print in your browser for a fully translated copy.`);
    return lines;
  };

  const downloadPdf = () => {
    const lines = exportLines(true);
    downloadBlob(buildPdfBlob(title, lines), `${material}-calculator.pdf`);
  };
  const downloadCsv = () => {
    const rows: (string | number)[][] = [
      ["tool", material], ["project", projectName], ["material", materialName],
      ["area", "shape", "area_m2", "depth_m", "group"],
      ...validAreas.map(a => [a.name || "", a.shape, areaM2(a) ?? "", a.depthM ?? "", a.group ?? ""]),
      ["base_ft3", totals.baseFt3], ["base_yd3", totals.baseYd3], ["base_m3", totals.baseM3],
      ["ordering_ft3", totals.orderingFt3], ["ordering_yd3", totals.orderingYd3], ["ordering_m3", totals.orderingM3], ["ordering_liters", totals.orderingLiters],
      ...(totals.weightLb !== undefined ? [["weight_lb", totals.weightLb], ["weight_kg", totals.weightKg ?? ""], ["weight_short_tons", totals.weightShortTons ?? ""], ["weight_tonnes", totals.weightTonnes ?? ""]] : []),
      ...(bag ? [["bags", bag.bags], ["bag_purchased", bag.purchasedQty], ["bag_unit", bagQtyUnit], ["bag_excess", bag.excessQty]] : []),
      ["bulk_required", bulk.requiredQty], ["bulk_purchased", bulk.purchasedQty], ["bulk_unit", bulkUnit],
      ["bulk_material_subtotal", scenarios.bulk.materialSubtotal ?? ""], ["bulk_total", scenarios.bulk.total ?? ""],
      ...(scenarios.bagged ? [["bagged_material_subtotal", scenarios.bagged.materialSubtotal ?? ""], ["bagged_total", scenarios.bagged.total ?? ""]] : []),
    ];
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${material}-calculator.csv`);
  };
  const copyResults = async () => {
    const text = exportLines(false).join("\n");
    try { await navigator.clipboard.writeText(text); setCopyStatus(t(locale, "common.copied")); }
    catch { setCopyStatus(t(locale, "common.copyFailed")); }
  };

  const switchSystem = (next: UnitSystem) => {
    if (next === system) return;
    // Preserve physical measurements: convert every draft value.
    setAreas(prev => prev.map(d => {
      const conv = (s: string, kind: "length" | "depth" | "area") => {
        const v = parseLocalizedNumber(s, locale);
        if (v === undefined || s === "") return s;
        if (kind === "length") return trimNum(metersToDisplayLength(displayLengthToMeters(v, system), next));
        if (kind === "depth") return trimNum(metersToDisplayDepth(displayDepthToMeters(v, system), next));
        return trimNum(metersToDisplayArea(displayAreaToMeters(v, system), next));
      };
      return { ...d, length: conv(d.length, "length"), width: conv(d.width, "length"), diameter: conv(d.diameter, "length"), area: conv(d.area, "area"), depth: conv(d.depth, "depth") };
    }));
    setSystem(next);
  };

  if (!mounted) return <section className="container" style={{ padding: 32 }}><p>Loading…</p></section>;

  return (
    <section className="container" dir={meta.dir} style={{ paddingTop: 32, paddingBottom: 48, overflowX: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <p className="eyebrow-indigo">FREE LANDSCAPING TOOL</p>
        {/* Language is chosen in the shared tools header above (src/app/tools/layout.tsx). */}
      </div>
      <h1 style={{ fontSize: 34, lineHeight: 1.2, margin: "8px 0" }}>{title}</h1>
      <p style={{ maxWidth: 760, color: "#475569", lineHeight: 1.6 }}>{t(locale, "ls.subtitle", { material: materialName })}</p>
      <p style={{ maxWidth: 760, color: "#475569", lineHeight: 1.6 }}>{t(locale, "ls.intro")}</p>
      {notice && <div role="status" style={{ background: "#EEF0FF", border: "1px solid #C7D2FE", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>{notice}</div>}
      {meta.script !== "latin" && (
        <div role="note" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          {t(locale, "ls.pdfNonLatinNote", { script: meta.scriptName })}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="field">
          <label className="label-premium" htmlFor="ls-system">{t(locale, "ls.unitSystem")}</label>
          <select id="ls-system" className="select-premium" value={system} onChange={e => switchSystem(e.target.value as UnitSystem)} style={{ minHeight: 44 }}>
            <option value="imperial">{t(locale, "ls.imperial")}</option>
            <option value="metric">{t(locale, "ls.metric")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label-premium" htmlFor="ls-project">{t(locale, "ls.projectName")}</label>
          <input id="ls-project" className="input-premium" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={t(locale, "ls.projectNamePlaceholder")} style={{ minHeight: 44 }} />
        </div>
        <button type="button" className="button-indigo-secondary" onClick={loadExample} style={{ minHeight: 44 }}>{t(locale, "common.loadExample")}</button>
        <button type="button" className="button-indigo-secondary" onClick={() => setConfirmReset(true)} style={{ minHeight: 44 }}>{t(locale, "common.reset")}</button>
      </div>
      <p style={{ color: "#475569" }}>{t(locale, "ls.unitNote")}</p>
      {confirmReset && (
        <div role="alertdialog" aria-label={t(locale, "common.reset")} style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <p>{t(locale, "common.resetConfirm")}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="button-indigo" onClick={doReset}>{t(locale, "common.resetYes")}</button>
            <button type="button" className="button-indigo-secondary" onClick={() => setConfirmReset(false)}>{t(locale, "common.resetKeep")}</button>
          </div>
        </div>
      )}

      <h2>{t(locale, "ls.areas")}</h2>
      {areas.length === 0 && <p>{t(locale, "ls.noResults")} <button type="button" className="button-indigo-secondary" onClick={addArea}>{t(locale, "ls.addArea")}</button></p>}
      <div style={{ display: "grid", gap: 16 }}>
        {areas.map((d, idx) => {
          const errs = areaErrors[idx];
          return (
            <article key={d.id} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
                <div className="field" style={{ flex: "1 1 180px" }}>
                  <label className="label-premium" htmlFor={`name-${d.id}`}>{t(locale, "ls.areaName")}</label>
                  <input id={`name-${d.id}`} className="input-premium" value={d.name} onChange={e => updateDraft(d.id, { name: e.target.value })} placeholder={t(locale, "ls.areaNamePlaceholder")} style={{ minHeight: 44 }} />
                </div>
                <div className="field">
                  <label className="label-premium" htmlFor={`shape-${d.id}`}>{t(locale, "ls.shape")}</label>
                  <select id={`shape-${d.id}`} className="select-premium" value={d.shape} onChange={e => updateDraft(d.id, { shape: e.target.value as Shape })} style={{ minHeight: 44 }}>
                    <option value="rectangle">{t(locale, "ls.rectangle")}</option>
                    <option value="circle">{t(locale, "ls.circle")}</option>
                    <option value="direct">{t(locale, "ls.direct")}</option>
                  </select>
                </div>
                <button type="button" className="button-indigo-secondary" onClick={() => duplicateArea(d)} style={{ minHeight: 44 }}>{t(locale, "ls.duplicate")}</button>
                <button type="button" className="button-indigo-secondary" onClick={() => setAreas(prev => prev.filter(x => x.id !== d.id))} style={{ minHeight: 44 }}>{t(locale, "ls.remove")}</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "end" }}>
                {d.shape === "rectangle" && (<>
                  <div className="field"><label className="label-premium" htmlFor={`len-${d.id}`}>{t(locale, "ls.length")} ({lenUnit})</label><input id={`len-${d.id}`} className="input-premium" inputMode="decimal" value={d.length} onChange={e => updateDraft(d.id, { length: e.target.value })} style={{ minHeight: 44, direction: "ltr", textAlign: "start" }} /></div>
                  <div className="field"><label className="label-premium" htmlFor={`wid-${d.id}`}>{t(locale, "ls.width")} ({lenUnit})</label><input id={`wid-${d.id}`} className="input-premium" inputMode="decimal" value={d.width} onChange={e => updateDraft(d.id, { width: e.target.value })} style={{ minHeight: 44, direction: "ltr", textAlign: "start" }} /></div>
                </>)}
                {d.shape === "circle" && (
                  <div className="field"><label className="label-premium" htmlFor={`dia-${d.id}`}>{t(locale, "ls.diameter")} ({lenUnit})</label><input id={`dia-${d.id}`} className="input-premium" inputMode="decimal" value={d.diameter} onChange={e => updateDraft(d.id, { diameter: e.target.value })} style={{ minHeight: 44, direction: "ltr", textAlign: "start" }} /></div>
                )}
                {d.shape === "direct" && (
                  <div className="field"><label className="label-premium" htmlFor={`area-${d.id}`}>{t(locale, "ls.area")} ({areaUnit})</label><input id={`area-${d.id}`} className="input-premium" inputMode="decimal" value={d.area} onChange={e => updateDraft(d.id, { area: e.target.value })} style={{ minHeight: 44, direction: "ltr", textAlign: "start" }} /></div>
                )}
                <div className="field"><label className="label-premium" htmlFor={`dep-${d.id}`}>{t(locale, "ls.depth")} ({depUnit})</label><input id={`dep-${d.id}`} className="input-premium" inputMode="decimal" value={d.depth} onChange={e => updateDraft(d.id, { depth: e.target.value })} style={{ minHeight: 44, direction: "ltr", textAlign: "start" }} /></div>
                <div className="field" style={{ flex: "1 1 200px" }}><label className="label-premium" htmlFor={`grp-${d.id}`}>{t(locale, "ls.group")}</label><input id={`grp-${d.id}`} className="input-premium" value={d.group} onChange={e => updateDraft(d.id, { group: e.target.value })} placeholder={t(locale, "ls.groupPlaceholder")} style={{ minHeight: 44 }} /></div>
              </div>
              <p style={{ color: "#475569", fontSize: 14 }}>{t(locale, "ls.groupNote")}</p>
              <Diagram draft={d} system={system} />
              {(errs.codes.length > 0 || errs.badNumber) && (
                <div role="alert" style={{ color: "#B91C1C", marginTop: 8 }}>
                  {errs.badNumber && <p>{t(locale, "ls.errInvalidNumber")}</p>}
                  {errs.codes.map(c => <p key={c}>{t(locale, ERR_KEY[c])}</p>)}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {areas.length > 0 && <button type="button" className="button-indigo" onClick={addArea} style={{ marginTop: 16, minHeight: 44 }}>{t(locale, "ls.addArea")}</button>}

      <details open={showAdvanced} onToggle={e => setShowAdvanced((e.target as HTMLDetailsElement).open)} style={{ marginTop: 24, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 44, display: "flex", alignItems: "center" }}>{t(locale, "ls.assumptions")}</summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "end" }}>
          <div className="field"><label className="label-premium" htmlFor="ls-extra">{material === "topsoil" ? t(locale, "ls.settlement") : t(locale, "ls.extra")}</label><input id="ls-extra" className="input-premium" inputMode="decimal" value={extra} onChange={e => setExtra(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
          {material !== "mulch" && (
            <div className="field"><label className="label-premium" htmlFor="ls-loose">{t(locale, "ls.looseMultiplier")}</label><input id="ls-loose" className="input-premium" inputMode="decimal" value={loose} onChange={e => setLoose(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
          )}
          {material !== "mulch" && (
            <div className="field"><label className="label-premium" htmlFor="ls-density">{t(locale, "ls.density")}</label><input id="ls-density" className="input-premium" inputMode="decimal" value={density} onChange={e => setDensity(e.target.value)} placeholder={t(locale, "ls.densityPlaceholder")} style={{ minHeight: 44, direction: "ltr" }} /></div>
          )}
          {material === "topsoil" && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}><input type="checkbox" checked={raisedBed} onChange={e => setRaisedBed(e.target.checked)} />{t(locale, "ls.raisedBed")}</label>
          )}
        </div>
        {material !== "mulch" && <p style={{ color: "#475569" }}>{t(locale, "ls.looseNote")}</p>}
        {material !== "mulch" && <p style={{ color: "#475569" }}>{t(locale, "ls.densityNote")}</p>}
        {material === "topsoil" && raisedBed && <p style={{ color: "#475569" }}>{t(locale, "ls.raisedBedNote")}</p>}
        {!assumptionsValid && <p role="alert" style={{ color: "#B91C1C" }}>{t(locale, "ls.errNotPositive")}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "end" }}>
          <div className="field"><label className="label-premium" htmlFor="ls-bagmode">Bag</label>
            <select id="ls-bagmode" className="select-premium" value={bagMode} onChange={e => setBagMode(e.target.value as "volume" | "weight")} style={{ minHeight: 44 }}>
              <option value="volume">{t(locale, "ls.bagVolume")}</option>
              {material !== "mulch" && <option value="weight">{t(locale, "ls.bagWeight")}</option>}
            </select>
          </div>
          {bagMode === "volume" ? (<>
            <div className="field"><label className="label-premium" htmlFor="ls-bagvol">{t(locale, "ls.bagVolume")}</label><input id="ls-bagvol" className="input-premium" inputMode="decimal" value={bagVolume} onChange={e => setBagVolume(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
            <div className="field"><label className="label-premium" htmlFor="ls-bagunit">Unit</label><select id="ls-bagunit" className="select-premium" value={bagVolumeUnit} onChange={e => setBagVolumeUnit(e.target.value as "ft3" | "m3" | "L")} style={{ minHeight: 44 }}><option value="ft3">ft³</option><option value="m3">m³</option><option value="L">L</option></select></div>
            {material === "mulch" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["1.5", "2", "3"].map(v => <button key={v} type="button" className="button-indigo-secondary" onClick={() => { setBagVolume(v); setBagVolumeUnit("ft3"); }}>{v} ft³</button>)}</div>}
          </>) : (
            <div className="field"><label className="label-premium" htmlFor="ls-bagwt">{t(locale, "ls.bagWeight")}</label><input id="ls-bagwt" className="input-premium" inputMode="decimal" value={bagWeight} onChange={e => setBagWeight(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
          )}
          <p style={{ color: "#475569", flexBasis: "100%" }}>{t(locale, "ls.bagExamplesNote")}</p>
          <div className="field"><label className="label-premium" htmlFor="ls-bulkunit">Bulk unit</label><select id="ls-bulkunit" className="select-premium" value={bulkUnit} onChange={e => setBulkUnit(e.target.value as "yd3" | "m3")} style={{ minHeight: 44 }}><option value="yd3">yd³</option><option value="m3">m³</option></select></div>
          <div className="field"><label className="label-premium" htmlFor="ls-inc">{t(locale, "ls.bulkIncrement")}</label><input id="ls-inc" className="input-premium" inputMode="decimal" value={bulkIncrement} onChange={e => setBulkIncrement(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
          <div className="field"><label className="label-premium" htmlFor="ls-min">{t(locale, "ls.bulkMinimum")}</label><input id="ls-min" className="input-premium" inputMode="decimal" value={bulkMinimum} onChange={e => setBulkMinimum(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
        </div>
      </details>

      <h2 style={{ marginTop: 24 }}>{t(locale, "ls.results")}</h2>
      {!hasResults && <p>{t(locale, "ls.noResults")} {areas.length > 0 && t(locale, "ls.incompleteNote")}</p>}
      {hasResults && (
        <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
          <p><strong>{t(locale, "ls.baseVolume")}:</strong> {fmt(totals.baseFt3)} ft³ = {fmt(totals.baseYd3, 4)} yd³ = {fmt(totals.baseM3, 3)} m³</p>
          <p><strong>{t(locale, "ls.orderingVolume")}:</strong> {fmt(totals.orderingFt3)} ft³ = {fmt(totals.orderingYd3, 4)} yd³ = {fmt(totals.orderingM3, 3)} m³ = {fmt(totals.orderingLiters, 0)} L</p>
          {totals.weightLb !== undefined && <p><strong>{t(locale, "ls.weight")}:</strong> {fmt(totals.weightLb, 0)} lb = {fmt(totals.weightKg ?? 0, 0)} kg = {fmt(totals.weightShortTons ?? 0, 3)} US short tons = {fmt(totals.weightTonnes ?? 0, 3)} tonnes</p>}
          {bag && <p><strong>{t(locale, "ls.bagsToBuy")}:</strong> {bag.bags} — {t(locale, "ls.actualPurchased")}: {fmt(bag.purchasedQty)} {bagQtyUnit}; {t(locale, "ls.excess")}: {fmt(bag.excessQty)} {bagQtyUnit}</p>}
          {bagMode === "weight" && totals.weightLb === undefined && <p role="alert" style={{ color: "#B91C1C" }}>{t(locale, "ls.densityNote")}</p>}
          {totals.groups.length > 1 && (
            <div>
              <p><strong>Groups (separate orders):</strong></p>
              <ul>{totals.groups.map(g => <li key={g.group || "ungrouped"}>{g.group || "—"}: {fmt(g.orderingM3 * 35.31466672148859)} ft³ = {fmt(g.orderingM3 / 0.764554857984, 4)} yd³</li>)}</ul>
            </div>
          )}
          <p style={{ color: "#475569" }}>{t(locale, "ls.requiredVsPurchased")}</p>
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>{t(locale, "ls.cost")}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <div className="field"><label className="label-premium" htmlFor="ls-currency">{t(locale, "ls.currency")}</label><select id="ls-currency" className="select-premium" value={currency} onChange={e => setCurrency(e.target.value)} style={{ minHeight: 44 }}>{["USD", "EUR", "GBP", "CAD", "AUD", "PKR", "INR", "MXN", "BRL", "SAR", "EGP", "CNY", "JPY"].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="field"><label className="label-premium" htmlFor="ls-bulkprice">{t(locale, "ls.bulkPrice")} / {bulkUnit}</label><input id="ls-bulkprice" className="input-premium" inputMode="decimal" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
        <div className="field"><label className="label-premium" htmlFor="ls-bagprice">{t(locale, "ls.bagPrice")}</label><input id="ls-bagprice" className="input-premium" inputMode="decimal" value={bagPrice} onChange={e => setBagPrice(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
        <div className="field"><label className="label-premium" htmlFor="ls-delivery">{t(locale, "ls.delivery")}</label><input id="ls-delivery" className="input-premium" inputMode="decimal" value={delivery} onChange={e => setDelivery(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
        <div className="field"><label className="label-premium" htmlFor="ls-tax">{t(locale, "ls.tax")}</label><input id="ls-tax" className="input-premium" inputMode="decimal" value={tax} onChange={e => setTax(e.target.value)} style={{ minHeight: 44, direction: "ltr" }} /></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}><input type="checkbox" checked={deliveryTaxable} onChange={e => setDeliveryTaxable(e.target.checked)} />{t(locale, "ls.deliveryTaxable")}</label>
      </div>
      <p style={{ color: "#475569" }}>{t(locale, "ls.noPriceNote")}</p>
      {hasResults && (
        <div style={{ display: "grid", gap: 16 }}>
          {scenarios.bagged && (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
              <h3>{t(locale, "ls.bagged")}</h3>
              <p>{t(locale, "ls.required")}: {fmt(scenarios.bagged.requiredQty)} {scenarios.bagged.qtyUnit} · {t(locale, "ls.purchased")}: {fmt(scenarios.bagged.purchasedQty)} {scenarios.bagged.qtyUnit}</p>
              {scenarios.bagged.materialSubtotal !== undefined ? (<>
                <p>{t(locale, "ls.subtotal")}: {money(scenarios.bagged.materialSubtotal)} · {t(locale, "ls.delivery")}: {money(scenarios.bagged.delivery)} · {t(locale, "ls.tax")}: {money(scenarios.bagged.tax ?? 0)}</p>
                <p><strong>{t(locale, "ls.total")}: {money(scenarios.bagged.total ?? 0)}</strong></p>
              </>) : <p>{t(locale, "ls.noPriceNote")}</p>}
            </div>
          )}
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <h3>{t(locale, "ls.bulk")}</h3>
            <p>{t(locale, "ls.required")}: {fmt(scenarios.bulk.requiredQty, 4)} {scenarios.bulk.qtyUnit} · {t(locale, "ls.purchased")}: {fmt(scenarios.bulk.purchasedQty, 4)} {scenarios.bulk.qtyUnit}</p>
            {scenarios.bulk.materialSubtotal !== undefined ? (<>
              <p>{t(locale, "ls.subtotal")}: {money(scenarios.bulk.materialSubtotal)} · {t(locale, "ls.delivery")}: {money(scenarios.bulk.delivery)} · {t(locale, "ls.tax")}: {money(scenarios.bulk.tax ?? 0)}</p>
              <p><strong>{t(locale, "ls.total")}: {money(scenarios.bulk.total ?? 0)}</strong></p>
            </>) : <p>{t(locale, "ls.noPriceNote")}</p>}
          </div>
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>{t(locale, "ls.shoppingList")}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="button-indigo" onClick={downloadPdf} disabled={!hasResults} style={{ minHeight: 44 }}>{t(locale, "common.downloadPdf")}</button>
        <button type="button" className="button-indigo-secondary" onClick={downloadCsv} disabled={!hasResults} style={{ minHeight: 44 }}>{t(locale, "common.downloadCsv")}</button>
        <button type="button" className="button-indigo-secondary" onClick={copyResults} disabled={!hasResults} style={{ minHeight: 44 }}>{t(locale, "common.copy")}</button>
        <button type="button" className="button-indigo-secondary" onClick={() => window.print()} style={{ minHeight: 44 }}>{t(locale, "common.print")}</button>
      </div>
      {copyStatus && <p role="status">{copyStatus}</p>}

      <div style={{ marginTop: 24, border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
        <h3>{t(locale, "ls.saveTitle")}</h3>
        <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}><input type="checkbox" checked={remember} onChange={e => { setRemember(e.target.checked); if (!e.target.checked) { try { window.localStorage.removeItem(`triangletech-landscaping-${material}`); } catch { /* ignore */ } } }} />{t(locale, "ls.remember")}</label>
        <p style={{ color: "#475569" }}>{t(locale, "ls.saveNote")}</p>
        <button type="button" className="button-indigo-secondary" onClick={deleteSaved} style={{ minHeight: 44 }}>{t(locale, "ls.deleteSaved")}</button>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>{t(locale, "ls.howTitle")}</h2>
        <p>{t(locale, "ls.howMuch")}</p>
        <p>{t(locale, "ls.howUnits")}</p>
        <p>{t(locale, "ls.howBagsBulk")}</p>
        <p>{t(locale, "ls.howDensity")}</p>
        <p>{t(locale, "ls.howRequired")}</p>
        <p>{t(locale, "ls.howWaste")}</p>
        <p>{t(locale, "ls.howExample")}</p>
        {material === "gravel" && <p><strong>{t(locale, "ls.gravelNote")}</strong></p>}
        {material === "mulch" && <p><strong>{t(locale, "ls.mulchNote")}</strong></p>}
        {material === "topsoil" && <p><strong>{t(locale, "ls.topsoilNote")}</strong></p>}
        <p>{t(locale, "ls.disclaimer")}</p>
        <p>{t(locale, "ls.privacy")}</p>
        <p>{t(locale, "common.poweredBy")}</p>
      </section>
    </section>
  );
}
