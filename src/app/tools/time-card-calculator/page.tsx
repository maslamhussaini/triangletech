import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import TimeCardCalculatorClient from "./calculator-client";

export const metadata: Metadata = pageMetadata(
  "Work Hours & Time Card Calculator — Weekly and Biweekly Timesheets",
  "Free work hours calculator: build a weekly or biweekly timesheet with multiple sessions, overnight shifts, unpaid breaks, overtime estimates, CSV/XLSX import, and PDF/CSV export. No signup, nothing uploaded.",
  "/tools/time-card-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Work Hours & Time Card Calculator", item: `${business.url}/tools/time-card-calculator` },
  ],
};

const FAQS = [
  {
    question: "How is overtime calculated here?",
    answer: "Overtime is a configurable estimate: hours above the weekly threshold you set (default 40) in a single workweek are paid at the multiplier you set (default 1.5x). In a biweekly period each week is evaluated separately — there is no single 80-hour threshold. This is not tax, payroll, or labor-law advice, and no state-specific rules are applied.",
  },
  {
    question: "How do overnight shifts work?",
    answer: "Check 'Ends next day' explicitly. An end time earlier than the start time is shown as an error rather than silently treated as overnight. Overnight minutes are split at midnight, and unpaid break minutes are allocated across the midnight segments in proportion to each segment's length, so each date and workweek only counts its own minutes.",
  },
  {
    question: "Is my timesheet uploaded anywhere?",
    answer: "No. The calculator, CSV/XLSX import, and PDF/CSV exports all run in your browser. Nothing is saved unless you check 'Remember on this device', and then it is saved only in that browser's local storage.",
  },
  {
    question: "What is the difference between gross pay and take-home pay?",
    answer: "The pay figure here is estimated gross pay before tax, deductions, or benefits. Take-home pay will be lower, and the exact difference depends on your tax and deduction situation, which this tool does not model.",
  },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Work Hours & Time Card Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${business.url}/#organization` },
};

export default function TimeCardCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <TimeCardCalculatorClient />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>Related tools</h2>
        <ul>
          <li><Link href="/tools/hours-to-decimal">Hours to Decimal Converter</Link> — convert hours and minutes to decimal hours and back, with a conversion table.</li>
          <li><Link href="/tools/work-hours-calculator">Work Hours Calculator</Link> — one shift at a time: duration, unpaid break, and overnight support.</li>
          <li><Link href="/tools">All free tools</Link> — the full TriangleTech tools index.</li>
        </ul>
        <h2>Frequently asked questions</h2>
        {FAQS.map(faq => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
        <p>Powered by TriangleTech. This tool estimates hours and gross pay from the figures you enter; it does not verify employment records, taxes, or labor-law compliance.</p>
      </section>
    </>
  );
}
