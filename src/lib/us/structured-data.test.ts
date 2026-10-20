import { describe, expect, it } from "vitest";
import { business } from "@/lib/site";
import { FAQS } from "./landing-data";
import { buildLandingStructuredData, LANDING_PATH } from "./structured-data";

const data = buildLandingStructuredData();
const graph = data["@graph"] as unknown as Record<string, unknown>[];
const byType = (type: string) => graph.find(node => node["@type"] === type);

describe("landing structured data", () => {
  it("is valid, serializable JSON-LD with the three expected node types", () => {
    expect(() => JSON.stringify(data)).not.toThrow();
    expect(data["@context"]).toBe("https://schema.org");
    expect(graph.map(node => node["@type"])).toEqual(["Service", "FAQPage", "BreadcrumbList"]);
  });

  it("describes the service factually, referencing the global Organization", () => {
    const service = byType("Service") as Record<string, unknown>;
    expect(service.url).toBe(`${business.url}${LANDING_PATH}`);
    expect(service.areaServed).toEqual({ "@type": "Country", name: "United States" });
    const provider = service.provider as Record<string, unknown>;
    expect(provider["@id"]).toBe(`${business.url}/#organization`);
    expect(provider.name).toBe(business.name);
  });

  it("contains no price, offer, rating, address or phone properties", () => {
    // Property-level check: ordinary prose may legitimately use words like
    // "price" (an FAQ answer mentions written quotes), but the schema must
    // not carry commerce or local-business properties.
    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          keys.add(key);
          walk(nested);
        }
      }
    };
    walk(data);
    for (const forbidden of [
      "offers",
      "price",
      "priceSpecification",
      "aggregateRating",
      "review",
      "telephone",
      "address",
      "geo",
    ]) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect(JSON.stringify(data)).not.toMatch(/\$\s?\d/);
  });

  it("keeps the FAQ schema synchronized with the visible FAQ data", () => {
    const faqPage = byType("FAQPage") as Record<string, unknown>;
    const entities = faqPage.mainEntity as Record<string, unknown>[];
    expect(entities).toHaveLength(FAQS.length);
    entities.forEach((entity, index) => {
      expect(entity.name).toBe(FAQS[index].question);
      const answer = entity.acceptedAnswer as Record<string, unknown>;
      expect(answer.text).toBe(FAQS[index].answer);
    });
  });

  it("builds a two-level breadcrumb ending at the canonical page URL", () => {
    const crumbs = byType("BreadcrumbList") as Record<string, unknown>;
    const items = crumbs.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[1].item).toBe(`${business.url}${LANDING_PATH}`);
  });
});
