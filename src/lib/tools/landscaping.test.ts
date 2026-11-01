import { describe, expect, it } from "vitest";
import {
  areaM2, bagResult, buildCsv, bulkOrder, ceilUnits, computeMaterial, costScenarios,
  csvCell, displayDepthToMeters, displayLengthToMeters, metersToDisplayDepth,
  type AreaInput,
} from "./landscaping";

const base = { extraPercent: 0, looseMultiplier: 1 };
const rect10x12x3in: AreaInput = {
  id: "a", name: "Drive", shape: "rectangle",
  lengthM: displayLengthToMeters(10, "imperial"), widthM: displayLengthToMeters(12, "imperial"),
  depthM: displayDepthToMeters(3, "imperial"),
};

describe("contract cases (prompt §10)", () => {
  it("A: 10×12 ft × 3 in = 30 ft³ = 1.111… yd³, 15× 2 ft³ bags", () => {
    const t = computeMaterial([rect10x12x3in], base);
    expect(t.orderingFt3).toBeCloseTo(30, 9);
    expect(t.orderingYd3).toBeCloseTo(30 / 27, 9);
    const bags = bagResult(t.orderingFt3, 2);
    expect(bags.bags).toBe(15);
    expect(bags.excessQty).toBeCloseTo(0, 9);
  });
  it("B: same +10% extra = 33 ft³, 17 bags, 34 ft³ purchased", () => {
    const t = computeMaterial([rect10x12x3in], { extraPercent: 10, looseMultiplier: 1 });
    expect(t.orderingFt3).toBeCloseTo(33, 9);
    const bags = bagResult(t.orderingFt3, 2);
    expect(bags.bags).toBe(17);
    expect(bags.purchasedQty).toBe(34);
    expect(bags.excessQty).toBeCloseTo(1, 9);
  });
  it("C: 100 ft² at 3 in = 25 ft³ = 0.9259… yd³; at 100 lb/ft³ = 2500 lb = 1.25 short tons", () => {
    const area: AreaInput = { id: "a", name: "Bed", shape: "direct", areaM2: 100 / Math.pow(1 / 0.3048, 2), depthM: displayDepthToMeters(3, "imperial") };
    const t = computeMaterial([area], { ...base, densityLbPerFt3: 100 });
    expect(t.orderingFt3).toBeCloseTo(25, 9);
    expect(t.orderingYd3).toBeCloseTo(25 / 27, 9);
    expect(t.weightLb).toBeCloseTo(2500, 6);
    expect(t.weightShortTons).toBeCloseTo(1.25, 9);
    expect(t.weightTonnes).toBeCloseTo(2500 * 0.45359237 / 1000, 9);
    expect(t.weightKg).toBeCloseTo(2500 * 0.45359237, 6);
  });
  it("D: 2×3 m × 0.1 m = 0.6 m³ = 600 L, 12× 50 L bags", () => {
    const area: AreaInput = { id: "a", name: "Bed", shape: "rectangle", lengthM: 2, widthM: 3, depthM: 0.1 };
    const t = computeMaterial([area], base);
    expect(t.orderingM3).toBeCloseTo(0.6, 9);
    expect(t.orderingLiters).toBeCloseTo(600, 9);
    expect(bagResult(t.orderingLiters, 50).bags).toBe(12);
  });
  it("E: 17 bags × $4.50 + $20 delivery, no tax = $96.50", () => {
    const totals = computeMaterial([rect10x12x3in], { extraPercent: 10, looseMultiplier: 1 });
    const bag = bagResult(totals.orderingFt3, 2);
    const scenarios = costScenarios(totals, { orderingQty: totals.orderingFt3, bags: bag.bags, purchasedQty: bag.purchasedQty, qtyUnit: "ft³" }, bulkOrder(totals.orderingYd3), "yd3", { currency: "USD", bagPrice: 4.5, bulkPriceUnit: "yd3", delivery: 20, taxPercent: 0, deliveryTaxable: false });
    expect(scenarios.bagged?.materialSubtotal).toBeCloseTo(17 * 4.5, 9);
    expect(scenarios.bagged?.total).toBeCloseTo(96.5, 9);
  });
  it("F: bulk minimum 2 yd³ leaves requirement 1.1 yd³, purchased 2 yd³", () => {
    const o = bulkOrder(1.1, undefined, 2);
    expect(o.requiredQty).toBe(1.1);
    expect(o.purchasedQty).toBe(2);
    expect(o.roundedBySupplier).toBe(true);
  });
});

describe("geometry and units", () => {
  it("circle area = π(d/2)²", () => {
    const a: AreaInput = { id: "c", name: "Round", shape: "circle", diameterM: 2, depthM: 0.1 };
    expect(areaM2(a)).toBeCloseTo(Math.PI, 9);
  });
  it("imperial/metric equivalence: 10 ft ≈ 3.048 m gives the same volume", () => {
    const imp: AreaInput = { id: "i", name: "I", shape: "rectangle", lengthM: displayLengthToMeters(10, "imperial"), widthM: displayLengthToMeters(10, "imperial"), depthM: displayDepthToMeters(12, "imperial") };
    const met: AreaInput = { id: "m", name: "M", shape: "rectangle", lengthM: 3.048, widthM: 3.048, depthM: 0.3048 };
    expect(computeMaterial([imp], base).orderingM3).toBeCloseTo(computeMaterial([met], base).orderingM3, 9);
    expect(metersToDisplayDepth(0.3048, "imperial")).toBeCloseTo(12, 9);
  });
  it("multiple areas with different depths sum, and groups stay separate", () => {
    const areas: AreaInput[] = [
      { id: "1", name: "A", shape: "rectangle", lengthM: 2, widthM: 2, depthM: 0.1, group: "Driveway" },
      { id: "2", name: "B", shape: "rectangle", lengthM: 2, widthM: 2, depthM: 0.2, group: "Path" },
    ];
    const t = computeMaterial(areas, base);
    expect(t.baseM3).toBeCloseTo(0.4 + 0.8, 9);
    expect(t.groups).toHaveLength(2);
    expect(t.groups.find(g => g.group === "Driveway")?.baseM3).toBeCloseTo(0.4, 9);
  });
  it("loose multiplier applies in the stated direction: ordering = installed × multiplier", () => {
    const t = computeMaterial([rect10x12x3in], { extraPercent: 0, looseMultiplier: 1.25 });
    expect(t.orderingFt3).toBeCloseTo(37.5, 9);
  });
  it("no weight without density", () => {
    expect(computeMaterial([rect10x12x3in], base).weightLb).toBeUndefined();
  });
});

describe("rounding, supplier rules, cost", () => {
  it("exact bag boundary does not add a phantom bag", () => {
    expect(ceilUnits(30, 2)).toBe(15);
    // A floating-point artifact just below the boundary must not add a bag.
    expect(ceilUnits(29.999999999, 2)).toBe(15);
    // A real excess, however small in practical terms, rounds up.
    expect(ceilUnits(30.001, 2)).toBe(16);
    expect(bagResult(30, 2).bags).toBe(15);
  });
  it("supplier increment rounds up only when enabled", () => {
    expect(bulkOrder(1.1, 0.5, undefined).purchasedQty).toBeCloseTo(1.5, 9);
    expect(bulkOrder(1.1, undefined, undefined).purchasedQty).toBe(1.1);
  });
  it("tax on delivery only when deliveryTaxable", () => {
    const totals = computeMaterial([rect10x12x3in], base);
    const cost = { currency: "USD", bulkPrice: 100, bulkPriceUnit: "yd3" as const, delivery: 20, taxPercent: 10, deliveryTaxable: false };
    const s1 = costScenarios(totals, undefined, bulkOrder(totals.orderingYd3), "yd3", cost);
    expect(s1.bulk.tax).toBeCloseTo((totals.orderingYd3 * 100 * 10) / 100, 6);
    const s2 = costScenarios(totals, undefined, bulkOrder(totals.orderingYd3), "yd3", { ...cost, deliveryTaxable: true });
    expect(s2.bulk.tax).toBeCloseTo(((totals.orderingYd3 * 100 + 20) * 10) / 100, 6);
    expect(s2.bulk.total).toBeCloseTo(totals.orderingYd3 * 100 + 20 + (s2.bulk.tax ?? 0), 6);
  });
  it("no price entered => no fabricated cost", () => {
    const totals = computeMaterial([rect10x12x3in], base);
    const s = costScenarios(totals, undefined, bulkOrder(totals.orderingYd3), "yd3", { currency: "USD", bulkPriceUnit: "yd3", delivery: 0, taxPercent: 0, deliveryTaxable: false });
    expect(s.bulk.materialSubtotal).toBeUndefined();
    expect(s.bulk.total).toBeUndefined();
  });
});

describe("validation and CSV safety", () => {
  it("incomplete areas are excluded and flagged", () => {
    const bad: AreaInput = { id: "x", name: "", shape: "rectangle", lengthM: 5, depthM: 0.1 };
    expect(areaM2(bad)).toBeUndefined();
    expect(computeMaterial([bad], base).areas).toHaveLength(0);
  });
  it("CSV injection: user text starting with = + - @ is neutralised, quotes escaped", () => {
    expect(csvCell("=2+2")).toBe("'=2+2");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(buildCsv([["Project", "=evil"], ["A", "ok"]])).toContain("'=evil");
  });
});
