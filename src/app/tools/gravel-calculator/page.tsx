import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import LandscapingCalculator from "@/components/tools/landscaping-calculator";

export const metadata: Metadata = pageMetadata(
  "Gravel Calculator — Cubic Yards, Tons, Bags & Cost",
  "Free gravel calculator: enter rectangles, circles, or direct areas with individual depths, get cubic feet, cubic yards, cubic metres and weight from your supplier density, plus bagged and bulk costs. No signup, nothing uploaded.",
  "/tools/gravel-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Gravel Calculator", item: `${business.url}/tools/gravel-calculator` },
  ],
};

const FAQS = [
  { question: "How much gravel do I need?", answer: "Area × depth gives the base volume. For example, 10 ft × 12 ft at 3 inches = 30 ft³ = 1.111 yd³. Add an extra percentage for waste and use the loose-volume multiplier only when your supplier quotes loose volume." },
  { question: "Why does gravel volume-to-weight conversion need density?", answer: "The same cubic yard weighs very different amounts depending on stone size, moisture, and compaction. Only a supplier density for your actual product gives a trustworthy weight — there is no universal tons-per-yard figure." },
  { question: "What is the difference between required and purchased quantity?", answer: "Required is the physical need. Purchased is what you actually order after bag rounding, supplier increments, and minimums — and it is the quantity used for cost. A supplier minimum never inflates the displayed requirement." },
  { question: "Does this calculator design a driveway or drainage system?", answer: "No. This is a quantity estimator only. It does not design a structurally suitable driveway, foundation, or drainage system." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Gravel Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${business.url}/#organization` },
};

export default function GravelCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <LandscapingCalculator material="gravel" />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>Related tools</h2>
        <ul>
          <li><Link href="/tools/mulch-calculator">Mulch Calculator</Link> — beds, bagged versus bulk, and excess after bag rounding.</li>
          <li><Link href="/tools/topsoil-calculator">Topsoil Calculator</Link> — topsoil and raised-bed fill, bagged versus bulk.</li>
          <li><Link href="/tools">All free tools</Link> — the full TriangleTech tools index.</li>
        </ul>
        <h2>Frequently asked questions</h2>
        {FAQS.map(faq => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
        <p>Powered by TriangleTech. This tool estimates quantities from the figures you enter; it does not verify supplier prices, product quality, or suitability for a specific site.</p>
      </section>
    </>
  );
}
