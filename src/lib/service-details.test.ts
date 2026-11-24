import { describe, expect, it } from "vitest";
import { serviceDetails, services } from "./site";
import { iconNames } from "@/components/icons";
import sitemap from "@/app/sitemap";

/**
 * Service detail regression: every service in the directory must have a
 * complete detail entry (problem, coverage, process with what the client
 * receives, limitations, FAQs), a real icon, and a sitemap URL. A service
 * added to `services` without a detail entry would otherwise render a
 * thin page with one paragraph and a CTA.
 */
describe("service details", () => {
  it("covers every service in the directory", () => {
    for (const service of services) {
      expect(serviceDetails[service.id], `missing serviceDetails for ${service.id}`).toBeDefined();
    }
    expect(Object.keys(serviceDetails).length).toBe(services.length);
  });

  it("gives every service a complete detail entry", () => {
    for (const service of services) {
      const detail = serviceDetails[service.id];
      expect(detail.problem.trim().length, `${service.id}: problem`).toBeGreaterThan(40);
      expect(detail.coverage.length, `${service.id}: coverage`).toBeGreaterThanOrEqual(3);
      expect(detail.process.length, `${service.id}: process`).toBeGreaterThanOrEqual(3);
      for (const step of detail.process) {
        expect(step.title.trim().length, `${service.id}: step title`).toBeGreaterThan(0);
        expect(step.description.trim().length, `${service.id}: step description`).toBeGreaterThan(20);
        expect(step.receives.trim().length, `${service.id}: step receives`).toBeGreaterThan(10);
      }
      expect(detail.limitations.length, `${service.id}: limitations`).toBeGreaterThanOrEqual(2);
      expect(detail.faqs.length, `${service.id}: faqs`).toBeGreaterThanOrEqual(3);
      for (const faq of detail.faqs) {
        expect(faq.question.trim().length, `${service.id}: faq question`).toBeGreaterThan(0);
        expect(faq.answer.trim().length, `${service.id}: faq answer`).toBeGreaterThan(20);
      }
    }
  });

  it("uses a real icon for every service (no silent fallback)", () => {
    for (const service of services) {
      expect(iconNames.has(service.icon), `unknown icon "${service.icon}" for ${service.id}`).toBe(true);
    }
  });

  it("lists every service page in the sitemap", () => {
    const urls = sitemap().map(entry => entry.url);
    for (const service of services) {
      expect(urls).toContain(`https://triangletech.co/services/${service.id}`);
    }
  });
});
