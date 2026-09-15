import { business, navigation, products, services } from "@/lib/site";
import { Brand } from "./brand";
import { Icon } from "./icons";
import { RouteLink } from "./navigation";
import { MobileCta } from "./mobile-cta";

export function PageIntro({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return <section className="page-intro page-intro-indigo"><div className="container"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{children}</p></div></section>;
}
export function ContactCTA() {
  return <section className="contact-cta contact-cta-indigo"><span className="cta-orb gradient-drift" aria-hidden="true" /><div className="container cta-inner"><div><span className="eyebrow light">SEE TRIANGLETECH IN ACTION</span><h2>Book a personalized<br />product walkthrough.</h2></div><div><RouteLink className="button-indigo" href="/contact">Book a Free Demo<Icon name="arrow" /></RouteLink><RouteLink className="cta-phone" href="/contact">Contact TriangleTech</RouteLink></div></div></section>;
}
export function ContactDetails() {
  return <div className="contact-details">
    <div><Icon name="chat" /><div><h3>WhatsApp Support</h3><a href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer">{business.whatsappPrimaryLabel} <span aria-hidden="true">↗</span></a></div></div>
    <div><Icon name="chat" /><div><h3>Business Inquiries</h3><a href={business.whatsappSecondary} target="_blank" rel="noopener noreferrer">{business.whatsappSecondaryLabel} <span aria-hidden="true">↗</span></a></div></div>
    <div><Icon name="mail" /><div><h3>Email</h3><a href={`mailto:${business.email}`}>{business.email}</a></div></div>
  </div>;
}
export function Footer() {
  return <><footer className="site-footer site-footer-indigo"><div className="container"><div className="footer-grid">
    <div><RouteLink href="/" aria-label="TriangleTech home"><Brand /></RouteLink><p>We design and build reliable business software, web platforms, mobile applications and ecommerce experiences for growing businesses.</p>
      <div className="footer-social" aria-label="Social media"><span className="footer-social-link" aria-hidden="true"><Icon name="chat" /></span><span className="footer-social-link" aria-hidden="true"><Icon name="mail" /></span></div>
    </div>
    <nav aria-label="Products"><h2>Products</h2>{products.map(product => <RouteLink key={product.id} href={`/products/${product.id}`}>{product.name}</RouteLink>)}</nav>
    <nav aria-label="Services"><h2>Services</h2>{services.slice(0, 5).map(service => <RouteLink key={service.id} href={`/services/${service.id}`}>{service.title}</RouteLink>)}</nav>
    <nav aria-label="Company"><h2>Company</h2>{navigation.filter(n => !n.href.includes("#")).map(item => <RouteLink key={item.href} href={item.href}>{item.label}</RouteLink>)}<RouteLink href="/privacy">Privacy Policy</RouteLink><RouteLink href="/terms">Terms of Service</RouteLink></nav>
    <div className="footer-contact"><h2>Get in touch</h2><a href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer">{business.whatsappPrimaryLabel} (WhatsApp)</a><a href={`mailto:${business.email}`}>{business.email}</a></div>
  </div><div className="footer-bottom"><span>© 2026 TriangleTech. All rights reserved.</span><span>Technology that moves your business forward.</span></div></div></footer>
    <a className="floating-whatsapp" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Support — Chat with TriangleTech"><Icon name="chat" /></a>
    <MobileCta />
  </>;
}
