import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ProductSelector } from "@/components/product-showcase";
import { products, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Products", "OrderMate, FBR Digital, WaterFlow, Shopify Solutions and Dynamic Inventory Count — the software products TriangleTech builds and maintains for growing businesses.", "/products");

export default function Products() {
  return <><PageIntro label="OUR PRODUCTS" title="Software built for your business.">Focused platforms for business management, digital invoicing, delivery operations and ecommerce — each with a demo walkthrough on request. Status is shown on every card; only Dynamic Inventory Count is sold directly, via Odoo Apps.</PageIntro>
    <div className="container product-selector-section">{<ProductSelector items={products} />}</div>
    <ContactCTA />
  </>;
}
