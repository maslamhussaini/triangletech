import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ProductSelector } from "@/components/product-showcase";
import { products, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Products", "OrderMate, FBR Digital, WaterFlow and Shopify Solutions — the software products TriangleTech builds and maintains for growing businesses.", "/products");

export default function Products() {
  return <><PageIntro label="OUR PRODUCTS" title="Software built for your business.">Focused platforms for business management, digital invoicing, delivery operations and ecommerce — each with a live product demo.</PageIntro>
    <div className="container product-selector-section">{<ProductSelector items={products} />}</div>
    <ContactCTA />
  </>;
}
