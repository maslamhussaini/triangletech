import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { HeroVisual } from "@/components/hero-visual";
import { ProductSelector, ProductShowcase } from "@/components/product-showcase";
import { DevicePreview } from "@/components/device-frame";
import { GuidedProductFinder } from "@/components/guided-finder";
import { VideoCard, GuideCard } from "@/components/video-guide-cards";
import { ServiceCard } from "@/components/service-card";
import { PortfolioSection } from "@/components/portfolio-section";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ContactCTA } from "@/components/page-parts";
import { faqs, hero, howItWorks, products, services, stats, technologies, trustPoints, videos, guides, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Business Software and Digital Solutions", "TriangleTech builds practical software for sales, inventory, digital invoicing, delivery operations and ecommerce. Explore our products and book a free demo.", "/");

export default function Home() {
  return <>
    <ScrollReveal />

    <section className="home-hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow light"><span className="status-dot" />{hero.eyebrow}</span>
          <h1>{hero.headline}</h1>
          <p>{hero.supporting}</p>
          <div className="hero-actions">
            <RouteLink className="button button-accent" href="/contact">{hero.primaryCta}<Icon name="arrow" /></RouteLink>
            <RouteLink className="button button-outline-light" href="/#products">{hero.secondaryCta}</RouteLink>
          </div>
          <RouteLink className="text-link light-link hero-tertiary" href="/#how-it-works">{hero.tertiaryCta}<Icon name="arrow" /></RouteLink>
        </div>
        <HeroVisual />
      </div>
    </section>

    <section className="stats-strip"><div className="container stats-grid">
      {stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
    </div></section>

    <section className="section trust-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">HOW WE WORK</span><h2>What you can expect from us.</h2><p className="section-lead">No client-logo wall and no invented numbers — here is how the software is actually built and supported.</p></div></div>
      <div className="why-grid">{trustPoints.map(item => <div key={item.title} className="why-card"><Icon name="check" /><h3>{item.title}</h3><p>{item.description}</p></div>)}</div>
    </div></section>

    <section id="products" className="section products-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">OUR PRODUCTS</span><h2>Four products, four jobs.</h2><p className="section-lead">Pick the one that matches the part of your business that hurts most. Each one can be demoed live.</p></div></div>
      <ProductSelector items={products} />
    </div></section>

    <section id="demos" className="section showcase-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">PRODUCT SHOWCASE</span><h2>Look inside each product.</h2><p className="section-lead">Switch between products to see the screens your team would actually use day to day.</p></div></div>
      <ProductShowcase items={products} />
    </div></section>

    <section className="section device-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WORKS ACROSS YOUR BUSINESS</span><h2>Desk, counter, or van.</h2><p className="section-lead">The same records on every screen size — a delivery marked complete in the field shows up in the office straight away.</p></div></div>
      <DevicePreview layout="stats" accent="cyan" productId="ordermate" />
    </div></section>

    <section id="services" className="section services-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">SERVICES</span><h2>Need something built to order?</h2><p className="section-lead">When none of the four products is the right shape, we build the system your workflow actually needs.</p></div><RouteLink className="text-link" href="/services">View all services<Icon name="arrow" /></RouteLink></div>
      <div className="service-card-grid">{services.slice(0, 6).map(service => <ServiceCard key={service.id} service={service} compact />)}</div>
    </div></section>

    <section className="section finder-section" data-reveal><div className="container finder-grid">
      <div><span className="eyebrow">NOT SURE WHICH SOLUTION FITS?</span><h2>Answer six quick questions.</h2><p>We&apos;ll point you at the product that matches your business — no account, no email required, under a minute.</p></div>
      <GuidedProductFinder />
    </div></section>

    <section id="how-it-works" className="section how-it-works-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>From first look to ongoing support.</h2></div></div>
      <ol className="process-grid process-grid-5">{howItWorks.map(step => <li key={step.step}><span>{step.step}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
    </div></section>

    <PortfolioSection />

    <section className="section video-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WALKTHROUGHS AND GUIDES</span><h2>Recorded demos, in production.</h2><p className="section-lead">We&apos;re recording a walkthrough and writing a user guide for each product. Until they&apos;re published, a live demo covers the same ground — and you can ask questions.</p></div></div>
      <div className="video-grid">{videos.map(v => <VideoCard key={v.id} title={v.title} product={v.product} />)}</div>
      <div className="guide-grid guide-grid-spaced">{guides.map(g => <GuideCard key={g.id} title={g.title} product={g.product} />)}</div>
    </div></section>

    <section className="section technology-section" data-reveal><div className="container">
      <div className="section-heading"><div><span className="eyebrow">TECHNOLOGY WE WORK WITH</span><h2>A modern, dependable stack.</h2><p className="section-lead">Chosen for maintainability — so the system can be extended years from now without a rewrite.</p></div></div>
      <ul className="tech-pill-list">{technologies.map(tech => <li key={tech}>{tech}</li>)}</ul>
    </div></section>

    <section className="section faq-preview" data-reveal><div className="container faq-layout">
      <aside><span className="eyebrow">FAQ</span><h2>Common questions.</h2><p>Have a different question? Speak to our team directly.</p><RouteLink className="text-link" href="/faq">View all questions<Icon name="arrow" /></RouteLink></aside>
      <div className="faq-list">{faqs.slice(0, 5).map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
    </div></section>

    <ContactCTA />
  </>;
}
