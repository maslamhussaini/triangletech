import { describe, expect, it } from "vitest";
import { business } from "@/lib/site";
import sitemap from "./sitemap";

const entries = sitemap();
const urls = entries.map(entry => entry.url);

describe("sitemap", () => {
  it("includes the USA landing page exactly once, at its canonical URL", () => {
    const matches = urls.filter(url => url.endsWith("/websites-for-us-small-business"));
    expect(matches).toEqual([`${business.url}/websites-for-us-small-business`]);
  });

  it("contains no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("uses the canonical business domain for every entry", () => {
    for (const url of urls) {
      expect(url.startsWith(business.url)).toBe(true);
    }
  });
});
