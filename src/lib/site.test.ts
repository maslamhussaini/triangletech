import { describe, expect, it } from "vitest";
import { business } from "./site";

/**
 * Privacy regression: the owner's personal phone / WhatsApp numbers must
 * never be published on the website. The business object is the single
 * source of truth for contact details (see AGENTS.md), so asserting on it
 * covers every component that renders contact information.
 */
describe("business contact details (privacy)", () => {
  it("exposes no phone number or WhatsApp contact", () => {
    const keys = Object.keys(business);
    expect(keys.filter((key) => /whatsapp|phone|tel/i.test(key))).toEqual([]);
    const serialized = JSON.stringify(business);
    expect(serialized).not.toMatch(/wa\.me|whatsapp|tel:/i);
    // No digit sequences that could be a phone number in any format.
    expect(serialized).not.toMatch(/\d{7,}/);
  });

  it("keeps the verified business email as the contact channel", () => {
    expect(business.email).toBe("info.triangletech@gmail.com");
  });
});
