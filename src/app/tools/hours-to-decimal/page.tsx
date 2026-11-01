import type { Metadata } from "next";
import { pageMetadata, business } from "@/lib/site";
import HoursToDecimalClient from "./client";

export const metadata: Metadata = pageMetadata(
  "Hours to Decimal Converter — Minutes to Decimal Hours",
  "Free hours-to-decimal converter: turn hours and minutes into decimal hours and back, with a conversion table. 30 minutes = 0.50 hours, 45 minutes = 0.75 hours.",
  "/tools/hours-to-decimal"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Hours to Decimal Converter", item: `${business.url}/tools/hours-to-decimal` },
  ],
};

export default function HoursToDecimalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <HoursToDecimalClient />
      <section className="container" style={{ paddingBottom: 48 }}>
        <p>Powered by TriangleTech. For a full timesheet, see the <a href="/tools/time-card-calculator">Work Hours &amp; Time Card Calculator</a>.</p>
      </section>
    </>
  );
}
