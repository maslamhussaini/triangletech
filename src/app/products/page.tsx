import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ProductSelector } from "@/components/product-showcase";
import { products, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Business Software Products", "OrderMate, FBR Digital, WaterFlow, Shopify Solutions and Dynamic Inventory Count — software TriangleTech builds and maintains.", "/products");

export default function Products() {
  return <><PageIntro label="OUR PRODUCTS" title="Software built for your business.">Focused platforms for business management, digital invoicing, delivery operations and ecommerce — each with a demo walkthrough on request. Status is shown on every card; only Dynamic Inventory Count is sold directly, via Odoo Apps.</PageIntro>
    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">ALL PRODUCTS</span><h2>Every product we build.</h2></div></div>
      <div className="product-selector-section">{<ProductSelector items={products} />}</div>
    </div></section>
    <ContactCTA />
  </>;
}
