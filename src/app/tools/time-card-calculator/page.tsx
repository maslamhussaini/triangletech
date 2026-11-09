import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import { localeFromValue } from "@/lib/i18n/locales";
import { getInitialLocale } from "@/lib/i18n/server-locale";
import { tServer } from "@/lib/i18n/dictionaries";
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

function faqsFor(locale: ReturnType<typeof localeFromValue>) {
  return [
    { question: tServer(locale, "tc.faqOvertimeQ"), answer: tServer(locale, "tc.faqOvertimeA") },
    { question: tServer(locale, "tc.faqOvernightQ"), answer: tServer(locale, "tc.faqOvernightA") },
    { question: tServer(locale, "tc.faqPrivacyQ"), answer: tServer(locale, "tc.faqPrivacyA") },
    { question: tServer(locale, "tc.faqGrossQ"), answer: tServer(locale, "tc.faqGrossA") },
  ];
}

export default async function TimeCardCalculatorPage() {
  const locale = await getInitialLocale();
  const FAQS = faqsFor(locale);
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <TimeCardCalculatorClient />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>{tServer(locale, "tc.relatedTitle")}</h2>
        <ul>
          <li><Link href="/tools/hours-to-decimal">{tServer(locale, "htd.title")}</Link> — {tServer(locale, "tc.relatedHtd")}</li>
          <li><Link href="/tools/work-hours-calculator">{tServer(locale, "wh.title")}</Link> — {tServer(locale, "tc.relatedWh")}</li>
          <li><Link href="/tools">{tServer(locale, "common.toolsIndex")}</Link></li>
        </ul>
        <h2>{tServer(locale, "tc.faqHeading")}</h2>
        {FAQS.map(faq => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
        <p>{tServer(locale, "tc.poweredNote")}</p>
      </section>
    </>
  );
}
