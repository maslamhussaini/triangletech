import { RouteLink } from "./navigation";
import { Icon, ServiceVisual } from "./icons";
import type { caseStudies, products, services } from "@/lib/site";

type Service = (typeof services)[number];
type Product = (typeof products)[number];
type CaseStudy = (typeof caseStudies)[number];

export function ServiceCard({ service, compact = false }: { service: Service; compact?: boolean }) {
  return <div className="service-card">
    <ServiceVisual kind={service.icon} />
    <span className="service-card-body">
      <span className="eyebrow">{service.category}</span>
      <h3>{service.title}</h3>
      <p>{compact ? service.short : service.description}</p>
      <RouteLink className="text-link" href="/services">Learn More<Icon name="arrow" /></RouteLink>
    </span>
  </div>;
}

export function ProductCard({ product }: { product: Product }) {
  return <article className={`product-card product-accent-${product.accent}`}>
    <div className="product-card-top">
      <span className="eyebrow">{product.category}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
    </div>
    <ul className="product-features">{product.features.map(feature => <li key={feature}><Icon name="check" />{feature}</li>)}</ul>
    <RouteLink className="button button-outline-dark" href={`/products/${product.id}`}>{product.cta}<Icon name="arrow" /></RouteLink>
  </article>;
}

export function CaseStudyCard({ item }: { item: CaseStudy }) {
  return <article className="case-card">
    <span className="eyebrow">{item.category}</span>
    <h3>{item.name}</h3>
    <div className="case-block"><h4>The problem</h4><p>{item.problem}</p></div>
    <div className="case-block"><h4>Our solution</h4><p>{item.solution}</p></div>
    <ul className="tech-tags">{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
    <RouteLink className="text-link" href="/contact">View Project<Icon name="arrow" /></RouteLink>
  </article>;
}
