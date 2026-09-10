import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { ContactCTA } from "@/components/page-parts";
import { products, pageMetadata } from "@/lib/site";

export function generateStaticParams() {
  return products.map(product => ({ id: product.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = products.find(p => p.id === id);
  if (!product) return {};
  return pageMetadata(product.name, product.description, `/products/${product.id}`);
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find(p => p.id === id);
  if (!product) notFound();

  return <>
    <section className={`section product-detail product-accent-${product.accent}`}><div className="container product-detail-grid">
      <div className="product-detail-copy">
        <RouteLink className="text-link back-link" href="/products">← All products</RouteLink>
        <span className="eyebrow">{product.category}</span>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <div className="hero-actions">
          <RouteLink className="button button-accent" href={`/contact?interest=${encodeURIComponent(product.name)}`}>Start a project<Icon name="arrow" /></RouteLink>
        </div>
      </div>
      <div className="product-detail-panel"><h2>Key features</h2><ul className="product-features">{product.features.map(feature => <li key={feature}><Icon name="check" />{feature}</li>)}</ul></div>
    </div></section>
    <ContactCTA />
  </>;
}
