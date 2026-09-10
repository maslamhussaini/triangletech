import { PageIntro, ContactCTA } from "@/components/page-parts";
import { ProductCard } from "@/components/service-card";
import { products, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Products", "OrderMate, FBR Digital, WaterFlow and Shopify Solutions — the software products TriangleTech builds and maintains for growing businesses.", "/products");

export default function Products() {
  return <><PageIntro label="OUR PRODUCTS" title="Software products built for growing businesses.">Focused platforms for business management, digital invoicing, water supply operations and ecommerce.</PageIntro>
    <div className="container product-grid product-grid-full">{products.map(product => <ProductCard key={product.id} product={product} />)}</div>
    <ContactCTA />
  </>;
}
