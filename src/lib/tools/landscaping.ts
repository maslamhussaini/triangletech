/**
 * Shared calculation engine for the landscaping material calculators
 * (gravel, mulch, topsoil). Pure functions only — no UI strings, no
 * locale, no DOM. Every quantity is kept at full precision internally;
 * rounding happens only at display / bag / supplier-rounding time.
 *
 * Verified unit constants (prompt §10):
 *   1 ft = 0.3048 m · 1 yd³ = 27 ft³ · 1 yd³ = 0.764554857984 m³
 *   1 lb = 0.45359237 kg · 1 US short ton = 2,000 lb · 1 tonne = 1,000 kg
 * Canonical internal units: metres, square metres, cubic metres.
 * Weight is NEVER derived without a density: density is always an
 * explicit, editable, supplier-supplied input. There is no universal
 * "one yard equals X tons" conversion anywhere in this module.
 */

export const FT_PER_M = 1 / 0.3048;
export const FT3_PER_M3 = Math.pow(1 / 0.3048, 3); // 35.31466672148859
export const M3_PER_FT3 = Math.pow(0.3048, 3); // 0.028316846592
export const FT3_PER_YD3 = 27;
export const M3_PER_YD3 = 0.764554857984;
export const KG_PER_LB = 0.45359237;
export const LB_PER_SHORT_TON = 2000;
export const KG_PER_TONNE = 1000;
export const LITERS_PER_M3 = 1000;

export type Shape = "rectangle" | "circle" | "direct";
export type MaterialKind = "gravel" | "mulch" | "topsoil";
export type UnitSystem = "imperial" | "metric";

export interface AreaInput {
  id: string;
  name: string;
  shape: Shape;
  /** Canonical metres / square metres. Undefined = not entered. */
  lengthM?: number;
  widthM?: number;
  diameterM?: number;
  areaM2?: number;
  depthM?: number;
  /** Optional grouping label. Empty = ungrouped. Areas with different
   *  non-empty groups are NEVER combined into one order. */
  group?: string;
}

export type ValidationCode =
  | "missing-dimensions"
  | "missing-depth"
  | "not-positive"
  | "not-finite"
  | "too-large";

export function isFinitePositive(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Area in m², or undefined when the shape's dimensions are incomplete. */
export function areaM2(area: AreaInput): number | undefined {
  if (area.shape === "rectangle") {
    if (!isFinitePositive(area.lengthM) || !isFinitePositive(area.widthM)) return undefined;
    return (area.lengthM as number) * (area.widthM as number);
  }
  if (area.shape === "circle") {
    if (!isFinitePositive(area.diameterM)) return undefined;
    const r = (area.diameterM as number) / 2;
    return Math.PI * r * r;
  }
  return isFinitePositive(area.areaM2) ? (area.areaM2 as number) : undefined;
}

export function validateArea(area: AreaInput): ValidationCode[] {
  const codes: ValidationCode[] = [];
  const dims: (number | undefined)[] =
    area.shape === "rectangle"
      ? [area.lengthM, area.widthM]
      : area.shape === "circle"
        ? [area.diameterM]
        : [area.areaM2];
  if (dims.some(v => v === undefined)) codes.push("missing-dimensions");
  if (area.depthM === undefined) codes.push("missing-depth");
  const all = [...dims, area.depthM];
  if (all.some(v => v !== undefined && (!Number.isFinite(v as number) || (v as number) <= 0))) codes.push("not-positive");
  if (all.some(v => v !== undefined && !Number.isFinite(v as number))) codes.push("not-finite");
  const a = areaM2(area);
  if (a !== undefined && a > 1_000_000) codes.push("too-large");
  if (area.depthM !== undefined && area.depthM > 10) codes.push("too-large");
  if (dims.some(v => v !== undefined && (v as number) > 10_000)) codes.push("too-large");
  return [...new Set(codes)];
}

export interface MaterialAssumptions {
  /** Extra allowance, percent, >= 0. Gravel default 0, mulch 0, topsoil 0. */
  extraPercent: number;
  /** Loose-volume / compaction multiplier. Gravel default 1.00.
   *  loose ordering volume = installed volume × multiplier. */
  looseMultiplier: number;
  /** Density in lb/ft³ (gravel/topsoil weight only). Undefined = no weight. */
  densityLbPerFt3?: number;
}

export function validateAssumptions(a: MaterialAssumptions): ValidationCode[] {
  const codes: ValidationCode[] = [];
  if (!Number.isFinite(a.extraPercent) || a.extraPercent < 0 || a.extraPercent > 1000) codes.push("not-positive");
  if (!Number.isFinite(a.looseMultiplier) || a.looseMultiplier <= 0 || a.looseMultiplier > 10) codes.push("not-positive");
  if (a.densityLbPerFt3 !== undefined && (!Number.isFinite(a.densityLbPerFt3) || a.densityLbPerFt3 <= 0)) codes.push("not-positive");
  return codes;
}

export interface AreaResult {
  area: AreaInput;
  areaM2: number;
  baseM3: number;
  orderingM3: number;
}

export interface MaterialTotals {
  areas: AreaResult[];
  baseM3: number;
  orderingM3: number;
  baseFt3: number;
  orderingFt3: number;
  baseYd3: number;
  orderingYd3: number;
  orderingLiters: number;
  /** Weight from ordering volume × density, only when density is given. */
  weightLb?: number;
  weightKg?: number;
  weightShortTons?: number;
  weightTonnes?: number;
  /** Per-group subtotals (key = group label, "" = ungrouped). */
  groups: { group: string; baseM3: number; orderingM3: number }[];
}

/** Ceiling that does not add a phantom unit at an exact boundary:
 *  15.0000000001 bags-worth of volume still rounds up, but exactly
 *  15.0 (within 1e-9) does not become 16. */
export function ceilUnits(quantity: number, capacity: number): number {
  if (!(capacity > 0) || !Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.ceil(quantity / capacity - 1e-9));
}

export function roundUpToIncrement(quantity: number, increment: number): number {
  if (!(increment > 0)) return quantity;
  return Math.ceil(quantity / increment - 1e-9) * increment;
}

export function computeMaterial(areas: AreaInput[], assumptions: MaterialAssumptions): MaterialTotals {
  const results: AreaResult[] = [];
  for (const area of areas) {
    const a = areaM2(area);
    const depth = area.depthM;
    if (a === undefined || depth === undefined) continue;
    const base = a * depth;
    const ordering = base * assumptions.looseMultiplier * (1 + assumptions.extraPercent / 100);
    results.push({ area, areaM2: a, baseM3: base, orderingM3: ordering });
  }
  const baseM3 = results.reduce((s, r) => s + r.baseM3, 0);
  const orderingM3 = results.reduce((s, r) => s + r.orderingM3, 0);
  const orderingFt3 = orderingM3 * FT3_PER_M3;
  const groupsMap = new Map<string, { baseM3: number; orderingM3: number }>();
  for (const r of results) {
    const key = (r.area.group ?? "").trim();
    const g = groupsMap.get(key) ?? { baseM3: 0, orderingM3: 0 };
    g.baseM3 += r.baseM3;
    g.orderingM3 += r.orderingM3;
    groupsMap.set(key, g);
  }
  const totals: MaterialTotals = {
    areas: results,
    baseM3,
    orderingM3,
    baseFt3: baseM3 * FT3_PER_M3,
    orderingFt3,
    baseYd3: (baseM3 * FT3_PER_M3) / FT3_PER_YD3,
    orderingYd3: orderingFt3 / FT3_PER_YD3,
    orderingLiters: orderingM3 * LITERS_PER_M3,
    groups: [...groupsMap.entries()].map(([group, v]) => ({ group, ...v })),
  };
  if (assumptions.densityLbPerFt3 !== undefined) {
    const lb = orderingFt3 * assumptions.densityLbPerFt3;
    totals.weightLb = lb;
    totals.weightKg = lb * KG_PER_LB;
    totals.weightShortTons = lb / LB_PER_SHORT_TON;
    totals.weightTonnes = (lb * KG_PER_LB) / KG_PER_TONNE;
  }
  return totals;
}

/** Bagged quantity for an ordering volume expressed in the bag's unit. */
export function bagResult(orderingQty: number, capacityPerBag: number): { bags: number; purchasedQty: number; excessQty: number } {
  const bags = ceilUnits(orderingQty, capacityPerBag);
  const purchasedQty = bags * capacityPerBag;
  return { bags, purchasedQty, excessQty: purchasedQty - orderingQty };
}

export interface BulkOrder {
  requiredQty: number;
  purchasedQty: number;
  /** True when a supplier minimum/increment changed the purchased qty. */
  roundedBySupplier: boolean;
}

export function bulkOrder(requiredQty: number, increment?: number, minimum?: number): BulkOrder {
  let purchased = requiredQty;
  if (increment !== undefined && increment > 0) purchased = roundUpToIncrement(purchased, increment);
  if (minimum !== undefined && minimum > 0) purchased = Math.max(purchased, minimum);
  return { requiredQty, purchasedQty: purchased, roundedBySupplier: purchased !== requiredQty };
}

export type BulkPriceUnit = "yd3" | "m3";
export type WeightPriceUnit = "shortTon" | "tonne" | "lb" | "kg";

export interface CostInputs {
  currency: string;
  bulkPrice?: number;
  bulkPriceUnit: BulkPriceUnit;
  bagPrice?: number;
  delivery: number;
  taxPercent: number;
  deliveryTaxable: boolean;
}

export interface CostScenario {
  kind: "bagged" | "bulk";
  requiredQty: number;
  purchasedQty: number;
  qtyUnit: string;
  materialSubtotal?: number;
  delivery: number;
  tax?: number;
  total?: number;
}

export function costScenarios(
  _totals: MaterialTotals,
  bag: { orderingQty: number; bags: number; purchasedQty: number; qtyUnit: string } | undefined,
  bulk: BulkOrder,
  bulkQtyUnit: BulkPriceUnit,
  cost: CostInputs
): { bagged?: CostScenario; bulk: CostScenario } {
  // NOTE: bulk.purchasedQty is always passed in the price unit by the
  // caller (yd³ when bulkPriceUnit is yd3, m³ otherwise).
  void bulkQtyUnit;
  const mk = (kind: "bagged" | "bulk", requiredQty: number, purchasedQty: number, qtyUnit: string, unitPrice?: number): CostScenario => {
    const materialSubtotal = unitPrice === undefined ? undefined : purchasedQty * unitPrice;
    const taxable = materialSubtotal === undefined ? undefined : materialSubtotal + (cost.deliveryTaxable ? cost.delivery : 0);
    const tax = taxable === undefined ? undefined : (taxable * cost.taxPercent) / 100;
    const total = materialSubtotal === undefined ? undefined : materialSubtotal + cost.delivery + (tax ?? 0);
    return { kind, requiredQty, purchasedQty, qtyUnit, materialSubtotal, delivery: cost.delivery, tax, total };
  };
  // Bagged cost is per BAG, not per volume unit: subtotal = bags × price.
  // Bulk cost is per volume unit (yd³ or m³) × purchased volume.
  const bagged = bag && cost.bagPrice !== undefined
    ? (() => {
        const materialSubtotal = bag.bags * cost.bagPrice!;
        const taxable = materialSubtotal + (cost.deliveryTaxable ? cost.delivery : 0);
        const tax = (taxable * cost.taxPercent) / 100;
        return { kind: "bagged" as const, requiredQty: bag.orderingQty, purchasedQty: bag.purchasedQty, qtyUnit: bag.qtyUnit, materialSubtotal, delivery: cost.delivery, tax, total: materialSubtotal + cost.delivery + tax };
      })()
    : bag
      ? { kind: "bagged" as const, requiredQty: bag.orderingQty, purchasedQty: bag.purchasedQty, qtyUnit: bag.qtyUnit, delivery: cost.delivery }
      : undefined;
  const bulkScenario = mk("bulk", bulk.requiredQty, bulk.purchasedQty, bulkQtyUnit === "yd3" ? "yd³" : "m³", cost.bulkPrice);
  return { bagged, bulk: bulkScenario };
}

/** Convert an ordering volume to the unit a bulk price is quoted in. */
export function bulkQtyInPriceUnit(totals: MaterialTotals, unit: BulkPriceUnit): number {
  return unit === "yd3" ? totals.orderingYd3 : totals.orderingM3;
}

export function formatMoney(currency: string, value: number, localeIntl: string): string {
  try {
    return new Intl.NumberFormat(localeIntl, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** CSV cell escaping + formula-injection protection (prompt §13):
 *  cells starting with =, +, -, @, tab or CR are prefixed with a single
 *  quote so spreadsheet apps do not execute user text as a formula. */
export function csvCell(value: string | number): string {
  const raw = String(value);
  const needsQuote = /[",\n\r]/.test(raw);
  const injection = /^[=+\-@\t\r]/.test(raw);
  const safe = injection ? `'${raw}` : raw;
  return needsQuote ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsv(rows: (string | number)[][]): string {
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Unit conversions for display / input handling. */
export function metersToDisplayLength(m: number, system: UnitSystem): number {
  return system === "imperial" ? m * FT_PER_M : m;
}
export function displayLengthToMeters(v: number, system: UnitSystem): number {
  return system === "imperial" ? v * 0.3048 : v;
}
export function metersToDisplayDepth(m: number, system: UnitSystem): number {
  return system === "imperial" ? m / 0.0254 : m * 100;
}
export function displayDepthToMeters(v: number, system: UnitSystem): number {
  return system === "imperial" ? v * 0.0254 : v / 100;
}
export function metersToDisplayArea(m2: number, system: UnitSystem): number {
  return system === "imperial" ? m2 * Math.pow(FT_PER_M, 2) : m2;
}
export function displayAreaToMeters(v: number, system: UnitSystem): number {
  return system === "imperial" ? v / Math.pow(FT_PER_M, 2) : v;
}
