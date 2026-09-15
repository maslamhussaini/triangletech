import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { BrowserFrame } from "@/components/device-frame";
import { DashboardMockup } from "@/components/dashboard-mockup";
import { DevicePreview } from "@/components/device-frame";
import { FeatureCard } from "@/components/feature-card";
import { ScreenWalkthrough } from "@/components/screen-walkthrough";
import { ProductCTA } from "@/components/product-cta";
import { ChatTriggerButton } from "@/components/chat-trigger-button";
import { ContactCTA } from "@/components/page-parts";
import { business, faqs, featureNotes, products, pageMetadata } from "@/lib/site";

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

  const productFaqs = faqs.filter(f => f.question.toLowerCase().includes(product.name.toLowerCase()) || f.answer.toLowerCase().includes(product.name.toLowerCase()));
  // Always show a useful set: product-specific questions first, topped up with
  // general ones so a page never renders a single lonely accordion row.
  const relevantFaqs = [...productFaqs, ...faqs.filter(f => !productFaqs.includes(f))].slice(0, 4);

  return <>
    <section className={`section product-detail-hero accent-${product.accent}`}><div className="container product-detail-grid">
      <div className="product-detail-copy">
        <RouteLink className="text-link back-link light-link" href="/products">← All products</RouteLink>
        <span className="eyebrow light">{product.category}</span>
        <h1>{product.name}</h1>
        <p className="product-core-line">{product.coreFeature}</p>
        <p>{product.description}</p>
        <p className="product-audience-line">{product.audience}</p>
        <ProductCTA productId={product.id} productName={product.name} />
      </div>
      <div className="product-detail-visual"><BrowserFrame label={`app.triangletech.co/${product.id}`}><DashboardMockup layout={product.heroLayout} accent={product.accent} label={product.name} productId={product.id} screenId="hero" /></BrowserFrame></div>
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">MAIN FEATURES</span><h2>What {product.name} handles for you.</h2></div></div>
      <div className="feature-grid">{product.features.map(f => <FeatureCard key={f} title={f} description={featureNotes[f] ?? `Part of ${product.name} from the first screen, not a paid add-on.`} />)}</div>
      <div className="feature-grid-cta"><ChatTriggerButton productId={product.id} /></div>
    </div></section>

    <section className={`section device-section accent-${product.accent}`}><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WORKS ACROSS YOUR BUSINESS</span><h2>{product.name} on every device.</h2></div></div>
      <DevicePreview layout={product.heroLayout} accent={product.accent} productId={product.id} screenId="hero" />
      <div className="device-section-cta"><ChatTriggerButton productId={product.id} className="button button-accent" /></div>
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">SCREEN-BY-SCREEN GUIDE</span><h2>Inside {product.name}.</h2></div></div>
      <ScreenWalkthrough screens={product.screens} accent={product.accent} productId={product.id} />
    </div></section>

    <section className="section faq-preview"><div className="container faq-layout">
      <aside><span className="eyebrow">FAQ</span><h2>Questions about {product.name}.</h2><p>Have a different question? Speak to our team directly.</p><a className="text-link" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer">WhatsApp us<Icon name="chat" /></a></aside>
      <div className="faq-list">{relevantFaqs.map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
    </div></section>

    <ContactCTA />
  </>;
}
