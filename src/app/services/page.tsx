import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ServiceCard } from "@/components/service-card";
import { business, services, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Services", "Custom business software, ERP and accounting systems, web and mobile development, Shopify stores, FBR digital invoicing and more.", "/services");

export default function Services() {
  const structured = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: services.map((service, index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "Service", name: service.title, description: service.description, url: `${business.url}/services/${service.id}`, provider: { "@id": `${business.url}/#organization` } } })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /><PageIntro label="OUR SERVICES" title="Digital solutions built around your business.">From custom software to ecommerce stores, find the service that fits, then talk directly with our team.</PageIntro>
    <div className="container service-card-grid service-card-grid-full">{services.map(service => <ServiceCard key={service.id} service={service} />)}</div>
    <ContactCTA />
  </>;
}
