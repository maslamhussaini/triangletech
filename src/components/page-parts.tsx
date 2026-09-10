import { business, navigation, products, services } from "@/lib/site";
import { Brand } from "./brand";
import { Icon } from "./icons";
import { RouteLink } from "./navigation";
import { MobileCta } from "./mobile-cta";

export function PageIntro({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return <section className="page-intro"><div className="container"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{children}</p></div></section>;
}
export function ContactCTA() {
  return <section className="contact-cta"><div className="container cta-inner"><div><span className="eyebrow light">HAVE A BUSINESS IDEA OR A PROCESS TO IMPROVE?</span><h2>Let&apos;s turn your requirements<br />into a reliable solution.</h2></div><div><RouteLink className="button button-accent" href="/contact">Start Your Project<Icon name="arrow" /></RouteLink><RouteLink className="cta-phone" href="/contact">Contact TriangleTech</RouteLink></div></div></section>;
}
export function ContactDetails() {
  return <div className="contact-details">
    <div><Icon name="phone" /><div><h3>Call us</h3><a href={business.phoneHref}>{business.phone}</a></div></div>
    <div><Icon name="chat" /><div><h3>WhatsApp</h3><a href={business.whatsapp} target="_blank" rel="noopener noreferrer">Start a conversation <span aria-hidden="true">↗</span></a></div></div>
    <div><Icon name="mail" /><div><h3>Email</h3><a href={`mailto:${business.email}`}>{business.email}</a></div></div>
    <div><Icon name="pin" /><div><h3>Location</h3><address>{business.address}</address></div></div>
  </div>;
}
export function Footer() {
  return <><footer className="site-footer"><div className="container"><div className="footer-grid">
    <div><RouteLink href="/" aria-label="TriangleTech home"><Brand /></RouteLink><p>We design and build reliable business software, web platforms, mobile applications and ecommerce experiences for growing businesses.</p>
      <div className="footer-social" aria-label="Social media"><span className="footer-social-link" aria-hidden="true"><Icon name="chat" /></span><span className="footer-social-link" aria-hidden="true"><Icon name="mail" /></span><span className="footer-social-link" aria-hidden="true"><Icon name="pin" /></span></div>
    </div>
    <nav aria-label="Products"><h2>Products</h2>{products.map(product => <RouteLink key={product.id} href="/#products">{product.name}</RouteLink>)}</nav>
    <nav aria-label="Services"><h2>Services</h2>{services.slice(0, 5).map(service => <RouteLink key={service.id} href="/#services">{service.title}</RouteLink>)}</nav>
    <div><h2>Company</h2>{navigation.filter(n => !n.href.includes("#")).map(item => <RouteLink key={item.href} href={item.href}>{item.label}</RouteLink>)}<RouteLink href="/privacy">Privacy Policy</RouteLink><RouteLink href="/terms">Terms of Service</RouteLink></div>
    <div className="footer-contact"><h2>Get in touch</h2><a href={business.phoneHref}>{business.phone}</a><a href={`mailto:${business.email}`}>{business.email}</a><address>{business.address}</address></div>
  </div><div className="footer-bottom"><span>© 2026 TriangleTech. All rights reserved.</span><span>Technology that moves your business forward.</span></div></div></footer>
    <a className="floating-whatsapp" href={business.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Chat with TriangleTech on WhatsApp"><Icon name="chat" /></a>
    <MobileCta />
  </>;
}
