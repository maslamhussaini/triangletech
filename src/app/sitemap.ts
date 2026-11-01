import type { MetadataRoute } from "next";
import { business, caseStudies, products, services } from "@/lib/site";
import { portfolioCaseStudies } from "@/lib/portfolio";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/services", "/products", "/case-studies", "/tools", "/tools/image-compressor", "/tools/qr-code-generator", "/tools/rental-property-investment-calculator", "/tools/airbnb-booking-profit-calculator", "/tools/product-cost-profit-calculator", "/tools/pakistan-sales-tax-calculator", "/tools/time-card-calculator", "/tools/hours-to-decimal", "/tools/work-hours-calculator", "/tools/gravel-calculator", "/tools/mulch-calculator", "/tools/topsoil-calculator", "/about", "/faq", "/contact", "/privacy", "/terms", "/websites-for-us-small-business"];
  const pages = staticPages.map(path => ({ url: `${business.url}${path}` }));
  const serviceDetails = services.map(service => ({ url: `${business.url}/services/${service.id}` }));
  const productDetails = products.map(product => ({ url: `${business.url}/products/${product.id}` }));
  const caseStudyDetails = [...Object.keys(portfolioCaseStudies), ...caseStudies.map(item => item.id)]
    .map(slug => ({ url: `${business.url}/case-studies/${slug}` }));
  return [...pages, ...serviceDetails, ...productDetails, ...caseStudyDetails];
}
