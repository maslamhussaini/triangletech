import { Metadata } from "next";
import { pageMetadata, business } from "@/lib/site";
import CalculatorClient from "./calculator-client";

export const metadata: Metadata = pageMetadata(
  "Pakistan Sales Tax Calculator with HS/PCT Code",
  "Calculate Pakistan sales tax for products using HS/PCT codes. Supports standard rate, Third Schedule retail-price treatment, further tax, and input/output tax estimator.",
  "/tools/pakistan-sales-tax-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Pakistan Sales Tax Calculator", item: `${business.url}/tools/pakistan-sales-tax-calculator` },
  ],
};

export default function PakistanSalesTaxCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }}
      />
      <CalculatorClient />
    </>
  );
}
