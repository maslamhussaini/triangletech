import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import LandscapingCalculator from "@/components/tools/landscaping-calculator";

export const metadata: Metadata = pageMetadata(
  "Topsoil Calculator — Cubic Yards, Bags, Liters & Raised-Bed Fill",
  "Free topsoil calculator: enter rectangles, circles, or direct areas with individual depths, get cubic feet, cubic yards, cubic metres and liters, bagged-versus-bulk quantities, and an optional raised-bed fill mode. No signup, nothing uploaded.",
  "/tools/topsoil-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Topsoil Calculator", item: `${business.url}/tools/topsoil-calculator` },
  ],
};

const FAQS = [
  { question: "Is raised-bed growing mix the same as topsoil?", answer: "No. Raised-bed growing mix and topsoil are different products with different composition. Do not substitute one for the other on the basis of volume alone — the raised-bed mode here only labels the fill; it does not change the product." },
  { question: "When is a weight estimate shown?", answer: "Only when you enter a density, or select an explicitly sourced estimate. Weight changes with composition and moisture, so no weight is invented from volume alone." },
  { question: "What is the settlement / extra allowance?", answer: "Loose fill settles after spreading and watering. The allowance (default 0%) adds that percentage on top of the base volume, separately from the loose-volume multiplier, so the assumption stays visible." },
  { question: "Bags versus bulk — how do I compare?", answer: "Enter a price per bag and a bulk price, and both scenarios are shown with required quantity, purchased quantity after rounding and supplier rules, delivery, tax if configured, and estimated total." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Topsoil Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${business.url}/#organization` },
};

export default function TopsoilCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <LandscapingCalculator material="topsoil" />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>Related tools</h2>
        <ul>
          <li><Link href="/tools/gravel-calculator">Gravel Calculator</Link> — volume-to-weight with supplier density, bagged and bulk costs.</li>
          <li><Link href="/tools/mulch-calculator">Mulch Calculator</Link> — beds, bagged versus bulk, and excess after bag rounding.</li>
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
