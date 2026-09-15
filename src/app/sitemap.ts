import type { MetadataRoute } from "next";
import { business, caseStudies, products, services } from "@/lib/site";
import { portfolioCaseStudies } from "@/lib/portfolio";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/services", "/products", "/case-studies", "/about", "/faq", "/contact", "/privacy", "/terms"];
  const pages = staticPages.map(path => ({ url: `${business.url}${path}` }));
  const serviceDetails = services.map(service => ({ url: `${business.url}/services/${service.id}` }));
  const productDetails = products.map(product => ({ url: `${business.url}/products/${product.id}` }));
  const caseStudyDetails = [...Object.keys(portfolioCaseStudies), ...caseStudies.map(item => item.id)]
    .map(slug => ({ url: `${business.url}/case-studies/${slug}` }));
  return [...pages, ...serviceDetails, ...productDetails, ...caseStudyDetails];
}
