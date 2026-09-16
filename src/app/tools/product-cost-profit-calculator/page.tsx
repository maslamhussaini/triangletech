import { Metadata } from "next";
import { pageMetadata, business } from "@/lib/site";
import CalculatorClient from "./calculator-client";

export const metadata: Metadata = pageMetadata(
  "Product Cost & Profit Calculator – Gross Profit, Net Profit & Margin",
  "Calculate true product cost, landed cost, gross profit, net profit, profit margin and ROI for ecommerce, retail and small business products.",
  "/tools/product-cost-profit-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Product Cost & Profit Calculator", item: `${business.url}/tools/product-cost-profit-calculator` },
  ],
};

export default function ProductCostProfitCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <CalculatorClient />
    </>
  );
}
