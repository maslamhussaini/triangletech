import type { MetadataRoute } from "next";
import { business, products, services } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/services", "/products", "/case-studies", "/about", "/faq", "/contact", "/privacy", "/terms"];
  const pages = staticPages.map(path => ({ url: `${business.url}${path}` }));
  const serviceDetails = services.map(service => ({ url: `${business.url}/services/${service.id}` }));
  const productDetails = products.map(product => ({ url: `${business.url}/products/${product.id}` }));
  return [...pages, ...serviceDetails, ...productDetails];
}
