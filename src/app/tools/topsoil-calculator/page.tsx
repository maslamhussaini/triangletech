import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { pageMetadata, business } from "@/lib/site";
import { LOCALE_COOKIE, localeFromValue } from "@/lib/i18n/locales";
import { tServer } from "@/lib/i18n/dictionaries";
import LandscapingCalculator from "@/components/tools/landscaping-calculator";

export const metadata: Metadata = pageMetadata(
  "Topsoil Calculator — Cubic Yards, Bags, Liters & Raised-Bed Fill",
  "Free topsoil calculator: enter rectangles, circles, or direct areas with individual depths, get cubic feet, cubic yards, cubic metres and liters, bagged-versus-bulk quantities, and a raised-bed fill mode. No signup, nothing uploaded.",
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

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Topsoil Calculator",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${business.url}/#organization` },
};

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export default async function TopsoilCalculatorPage() {
  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const FAQS = [1, 2, 3, 4].map(i => ({
    question: tServer(locale, `ls.topsoilFaq${i}Q`),
    answer: tServer(locale, `ls.topsoilFaq${i}A`),
  }));
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }} />
      <LandscapingCalculator material="topsoil" />
      <section className="container" style={{ paddingBottom: 48 }}>
        <h2>{tServer(locale, "ls.relatedTitle")}</h2>
        <ul>
          <li><Link href="/tools/mulch-calculator">{tServer(locale, "ls.title", { material: cap(tServer(locale, "mat.mulch")) })}</Link> — {tServer(locale, "ls.relatedMulchDesc")}</li>
          <li><Link href="/tools/gravel-calculator">{tServer(locale, "ls.title", { material: cap(tServer(locale, "mat.gravel")) })}</Link> — {tServer(locale, "ls.relatedGravelDesc")}</li>
          <li><Link href="/tools">{tServer(locale, "common.toolsIndex")}</Link> — {tServer(locale, "ls.relatedIndexDesc")}</li>
        </ul>
        <h2>{tServer(locale, "ls.faqHeading")}</h2>
        {FAQS.map(faq => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
        <p>{tServer(locale, "common.poweredBy")}. {tServer(locale, "ls.disclaimer")}</p>
      </section>
    </>
  );
}
