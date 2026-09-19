import { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { BrowserFrame } from "@/components/device-frame";
import { DevicePreview } from "@/components/device-frame";
import { FeatureCard } from "@/components/feature-card";
import { ScreenWalkthrough } from "@/components/screen-walkthrough";
import { ProductCTA } from "@/components/product-cta";
import { ChatTriggerButton } from "@/components/chat-trigger-button";
import { ContactCTA } from "@/components/page-parts";
import { business, featureNotes, products, pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata("OrderMate", "Manage sales, inventory, customers, orders and accounting workflows in one connected system with OrderMate.", "/products/ordermate");

const product = products.find(p => p.id === "ordermate")!;

export default function OrderMateProduct() {
  const productFaqs = [
    { question: "What is OrderMate?", answer: "OrderMate is TriangleTech's business management platform. It connects sales and orders, inventory, customers, and accounting workflows in one system, so a business isn't running on spreadsheets or five disconnected tools." },
    { question: "How does location record management work?", answer: "OrderMate lets you manage multiple business locations, each with its own stock, orders and reporting. You can view a single location's activity or roll everything up together, which is useful once a business grows past one site." },
    { question: "Can I manage customers and business partners?", answer: "Yes. OrderMate includes customer and business-partner management — you can search, filter and open any customer's order and payment history from one screen instead of digging through registers." },
    { question: "Does it support inventory and sales?", answer: "Yes, that's the core of OrderMate. Sales and orders are tracked from placement to fulfillment, invoices generate directly from orders, and inventory is tracked across locations with low-stock warnings." },
  ];

  return <>
    <section className="section product-detail-hero accent-cyan"><div className="container product-detail-grid">
      <div className="product-detail-copy">
        <RouteLink className="text-link back-link light-link" href="/products">← All products</RouteLink>
        <span className="eyebrow light">{product.category}</span>
        <h1>{product.name}</h1>
        <p className="product-core-line">{product.coreFeature}</p>
        <p>{product.description}</p>
        <p className="product-audience-line">{product.audience}</p>
        <ProductCTA productId={product.id} productName={product.name} />
      </div>
      <div className="product-detail-visual">
        <BrowserFrame label={`app.triangletech.co/${product.id}`}>
          <img src="/products/ordermate/dashboard-desktop.png" alt="OrderMate dashboard screenshot" style={{ width: "100%", height: "auto", display: "block" }} />
        </BrowserFrame>
      </div>
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
      <div className="faq-list">{productFaqs.map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
    </div></section>

    <ContactCTA />
  </>;
}
