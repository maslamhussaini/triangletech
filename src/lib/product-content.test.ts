import { describe, expect, it } from "vitest";
import { featureNotes, productAvailability, products } from "./site";

/**
 * Product content regression: every product feature must have a specific
 * note (the feature grid must never fall back to filler), and every
 * product must carry a verified availability status.
 */
describe("product content", () => {
  it("has a specific note for every product feature", () => {
    for (const product of products) {
      for (const feature of product.features) {
        expect(featureNotes[feature], `${product.id}: no feature note for "${feature}"`).toBeDefined();
        expect(featureNotes[feature].trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("carries a verified availability status for every product", () => {
    for (const product of products) {
      const availability = productAvailability[product.id];
      expect(availability, `missing productAvailability for ${product.id}`).toBeDefined();
      expect(["Available", "Demonstration Only"]).toContain(availability.status);
      expect(availability.note.trim().length).toBeGreaterThan(10);
    }
  });
});
