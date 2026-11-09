/**
 * JSON-LD for /websites-for-us-small-business/, generated from the same
 * typed data that renders the page (landing-data.ts), so structured data
 * can never drift from visible content.
 *
 * Factual boundaries: no prices, no offers, no ratings/reviews, no US
 * address or telephone. The provider references the site's global
 * Organization entity by its @id (emitted once in the root layout)
 * instead of duplicating it. areaServed is the United States; the
 * provider's own location is not stated here and nothing implies a US
 * office (see AGENTS.md).
 */
import { business } from "@/lib/site";
import { FAQS, PAGE_META } from "./landing-data";

export const LANDING_PATH = "/websites-for-us-small-business";

export function buildLandingStructuredData() {
  const pageUrl = `${business.url}${LANDING_PATH}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${pageUrl}/#service`,
        name: "Website Design for US Small Businesses",
        serviceType: "Website design and development",
        description: PAGE_META.description,
        url: pageUrl,
        provider: {
          "@type": "Organization",
          "@id": `${business.url}/#organization`,
          name: business.name,
          url: business.url,
        },
        areaServed: { "@type": "Country", name: "United States" },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}/#faq`,
        mainEntity: FAQS.map(entry => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
          { "@type": "ListItem", position: 2, name: "Websites for US Small Businesses", item: pageUrl },
        ],
      },
    ],
  };
}
