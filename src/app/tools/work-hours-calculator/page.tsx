import type { Metadata } from "next";
import { pageMetadata, business } from "@/lib/site";
import WorkHoursClient from "./client";

export const metadata: Metadata = pageMetadata(
  "Work Hours Calculator — Single Shift Duration with Breaks",
  "Free work hours calculator for a single shift: duration, unpaid break, decimal hours, and explicit overnight support. No signup, nothing uploaded.",
  "/tools/work-hours-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Work Hours Calculator", item: `${business.url}/tools/work-hours-calculator` },
  ],
};

export default function WorkHoursPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <WorkHoursClient />
      <section className="container" style={{ paddingBottom: 48 }}>
        <p>Powered by TriangleTech. For weekly and biweekly timesheets with overtime and import, see the <a href="/tools/time-card-calculator">Work Hours &amp; Time Card Calculator</a>, and for conversions see the <a href="/tools/hours-to-decimal">Hours to Decimal Converter</a>.</p>
      </section>
    </>
  );
}
