import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon, ServiceVisual } from "@/components/icons";
import { ContactCTA } from "@/components/page-parts";
import { serviceCta } from "@/components/service-card";
import { business, services, serviceDetails, pageMetadata } from "@/lib/site";

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

  const detail = serviceDetails[service.id];
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
          {cta.href !== "/contact" && <RouteLink className="button button-email" href="/contact"><Icon name="mail" />Contact Us</RouteLink>}
        </div>
        <p>Pricing is confirmed in writing before work begins.</p>
      </div>
    </div></section>
    {detail && <>
      <section className="section"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">THE PROBLEM</span><h2>What this solves.</h2></div></div>
        <p className="section-lead">{detail.problem}</p>
      </div></section>

      <section className="section"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">WHAT IT COVERS</span><h2>What the work includes.</h2></div></div>
        <ul className="service-list service-list-check">{detail.coverage.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul>
      </div></section>

      <section className="section"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>How the work runs.</h2></div></div>
        <div className="why-grid">{detail.process.map((step, index) => <div key={step.title} className="why-card"><span className="eyebrow">STEP {String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.description}</p><p><strong>You receive:</strong> {step.receives}</p></div>)}</div>
      </div></section>

      <section className="section"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">LIMITS</span><h2>When this isn&apos;t the right fit.</h2></div></div>
        <ul className="service-list">{detail.limitations.map(item => <li key={item}>{item}</li>)}</ul>
      </div></section>

      <section className="section faq-preview"><div className="container faq-layout">
        <aside><span className="eyebrow">FAQ</span><h2>Questions about {service.title}.</h2><p>Have a different question? Speak to our team directly.</p><RouteLink className="text-link" href="/contact">Contact us<Icon name="chat" /></RouteLink></aside>
        <div className="faq-list">{detail.faqs.map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div></section>
    </>}
    <ContactCTA />
  </>;
}
