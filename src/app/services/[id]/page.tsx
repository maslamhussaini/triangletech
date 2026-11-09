import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon, ServiceVisual } from "@/components/icons";
import { ContactCTA } from "@/components/page-parts";
import { serviceCta } from "@/components/service-card";
import { business, services, pageMetadata } from "@/lib/site";

export function generateStaticParams() {
  return services.map(service => ({ id: service.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const service = services.find(s => s.id === id);
  if (!service) return {};
  return pageMetadata(service.title, service.description, `/services/${service.id}`);
}

export default async function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = services.find(s => s.id === id);
  if (!service) notFound();

  const cta = serviceCta(service);
  const isUsWebService = ["web-apps", "technical-seo-audit", "aeo-geo-readiness", "website-performance-conversion"].includes(service.id);
  const structured = { "@context": "https://schema.org", "@type": "Service", name: service.title, description: service.description, url: `${business.url}/services/${service.id}`, provider: { "@id": `${business.url}/#organization` }, ...(isUsWebService ? { areaServed: { "@type": "Country", name: "United States" } } : {}) };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    <section className="section service-detail"><div className="container service-detail-grid">
      <div className="service-detail-media"><ServiceVisual kind={service.icon} /></div>
      <div className="service-detail-copy">
        <RouteLink className="text-link back-link" href="/services">← All services</RouteLink>
        <span className="eyebrow">{service.category}</span>
        <h1>{service.title}</h1>
        <p>{service.description}</p>
        <div className="hero-actions">
          <RouteLink className="button button-accent" href={cta.href}>{cta.label}<Icon name="arrow" /></RouteLink>
          <a className="button button-email" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer"><Icon name="chat" />WhatsApp Support</a>
        </div>
        <p>Pricing is confirmed in writing before work begins. No price is published on this page.</p>
      </div>
    </div></section>
    <ContactCTA />
  </>;
}
