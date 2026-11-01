import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import LandscapingCalculator from "@/components/tools/landscaping-calculator";

export const metadata: Metadata = pageMetadata(
  "Mulch Calculator — Cubic Yards, Bags, Liters & Cost",
  "Free mulch calculator: enter multiple beds with individual depths, get cubic feet, cubic yards, cubic metres and liters, whole bags to buy, excess after bag rounding, and a bulk-versus-bag cost comparison. No signup, nothing uploaded.",
  "/tools/mulch-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Mulch Calculator", item: `${business.url}/tools/mulch-calculator` },
  ],
};

const FAQS = [
  { question: "How deep should mulch be?", answer: "Suitable depth depends on material and use. University extension guidance commonly cites 2–3 inches for most garden beds (Mississippi State University Extension, 2022). Keep mulch away from trunks and stems, and confirm depth for your plants and material — this calculator does not prescribe a universal depth." },
  { question: "Do I need density for a mulch calculation?", answer: "No. Mulch here is calculated by volume, so no density is required and no gravel compaction assumptions are applied." },
  { question: "Bags versus bulk — which is cheaper?", answer: "Enter both prices and compare the two scenarios on the page. Bagged quantities are rounded up to whole bags; bulk is rounded up only when you set a supplier increment or minimum." },
  { question: "What is the excess after bag rounding?", answer: "It is the purchased volume minus the required volume, caused by rounding up to whole bags. It is shown separately so you can see exactly how much extra material the bag rounding buys." },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mulch Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${business.url}/#organization` },
};

export default function MulchCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <LandscapingCalculator material="mulch" />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>Related tools</h2>
        <ul>
          <li><Link href="/tools/gravel-calculator">Gravel Calculator</Link> — volume-to-weight with supplier density, bagged and bulk costs.</li>
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
