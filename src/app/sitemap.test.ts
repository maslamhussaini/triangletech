import { describe, expect, it } from "vitest";
import { business } from "@/lib/site";
import { tools } from "@/lib/tools";
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

  it("includes every live tool from the registry exactly once", () => {
    // Regression guard: two live calculator routes were missing from the
    // sitemap for a long time because routes were added by hand. A tool
    // marked live in the registry must always be discoverable here.
    const liveTools = tools.filter(tool => tool.status === "live");
    expect(liveTools.length).toBeGreaterThan(0);
    for (const tool of liveTools) {
      const matches = urls.filter(url => url === `${business.url}/tools/${tool.slug}`);
      expect(matches, `live tool ${tool.slug} must appear exactly once in the sitemap`).toHaveLength(1);
    }
  });

  it("does not list tools that are not live yet", () => {
    for (const tool of tools.filter(tool => tool.status !== "live")) {
      expect(urls).not.toContain(`${business.url}/tools/${tool.slug}`);
    }
  });
});
