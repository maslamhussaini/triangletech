import { RouteLink } from "./navigation";
import { Icon, ServiceVisual } from "./icons";
import type { caseStudies, services } from "@/lib/site";

type Service = (typeof services)[number];
type CaseStudy = (typeof caseStudies)[number];

const WEB_SERVICE_IDS = ["web-apps", "technical-seo-audit", "aeo-geo-readiness", "website-performance-conversion"];

export function serviceCta(service: Service): { href: string; label: string } {
  return WEB_SERVICE_IDS.includes(service.id)
    ? { href: "/websites-for-us-small-business#consultation", label: "Request a Free Consultation" }
    : { href: "/websites-for-us-small-business#consultation", label: "Request a Free Consultation" };
}

export function ServiceCard({ service, compact = false }: { service: Service; compact?: boolean }) {
  const cta = serviceCta(service);
  return <div className="service-card">
    <ServiceVisual kind={service.icon} />
    <span className="service-card-body">
      <span className="eyebrow">{service.category}</span>
      <h3>{service.title}</h3>
      <p>{compact ? service.short : service.description}</p>
      <RouteLink className="text-link" href={`/services/${service.id}`} aria-label={`Learn more about ${service.title}`}>Learn More<Icon name="arrow" /></RouteLink>
      <RouteLink className="text-link" href={cta.href}>{cta.label}<Icon name="arrow" /></RouteLink>
    </span>
  </div>;
}

export function CaseStudyCard({ item }: { item: CaseStudy }) {
  return <article className="case-card">
    <span className="eyebrow">{item.category}</span>
    <h3>{item.name}</h3>
    <div className="case-block"><h4>The problem</h4><p>{item.problem}</p></div>
    <div className="case-block"><h4>Our solution</h4><p>{item.solution}</p></div>
    <ul className="tech-tags">{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
    <RouteLink className="text-link" href={`/case-studies/${item.id}`}>Read the case study<Icon name="arrow" /></RouteLink>
  </article>;
}
