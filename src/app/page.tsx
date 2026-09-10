import { RouteLink } from "@/components/navigation";
import { Icon, HeroEcosystem } from "@/components/icons";
import { ServiceCard, ProductCard, CaseStudyCard } from "@/components/service-card";
import { ContactCTA } from "@/components/page-parts";
import { caseStudies, faqs, processSteps, products, services, shopifyOffer, stats, technologies, whyUs, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Business Software and Digital Solutions", "TriangleTech designs and builds business software, web platforms, mobile applications and ecommerce experiences for growing businesses.", "/");

export default function Home() {
  return <>
    <section className="home-hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow light"><span className="status-dot" />BUILT FOR REAL BUSINESS OPERATIONS</span>
          <h1>Technology that moves<br />your business <em>forward.</em></h1>
          <p>We design and build reliable business software, web platforms, mobile applications and ecommerce experiences for growing businesses. From idea to production.</p>
          <div className="hero-actions">
            <RouteLink className="button button-accent" href="/#products">Explore Our Solutions<Icon name="arrow" /></RouteLink>
            <RouteLink className="button button-outline-light" href="/contact">Start a Conversation</RouteLink>
          </div>
          <div className="hero-support"><span>Built for real business operations</span><span>From idea to production</span></div>
        </div>
        <HeroEcosystem />
      </div>
    </section>

    <section className="stats-strip"><div className="container stats-grid">
      {stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
    </div></section>

    <section id="services" className="section services-preview"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WHAT WE DO</span><h2>Digital solutions built<br />around your business.</h2></div><RouteLink className="text-link" href="/services">View all services<Icon name="arrow" /></RouteLink></div>
      <div className="service-card-grid service-card-grid-4">{services.map(service => <ServiceCard key={service.id} service={service} compact />)}</div>
    </div></section>

    <section id="products" className="section products-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">OUR PRODUCTS</span><h2>Software products built<br />for growing businesses.</h2></div></div>
      <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div>
    </div></section>

    <section className="section why-us"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WHY TRIANGLETECH</span><h2>Built with business<br />understanding.</h2></div></div>
      <p className="why-lede">We&apos;re different because we understand both software and real business workflows — not just the code, but the counters, warehouses and finance teams it needs to serve.</p>
      <div className="why-grid">{whyUs.map(item => <div key={item.title} className="why-card"><Icon name="check" /><h3>{item.title}</h3><p>{item.description}</p></div>)}</div>
    </div></section>

    <section className="section process-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">HOW WE BUILD</span><h2>A process built for<br />clarity, not guesswork.</h2></div></div>
      <ol className="process-grid">{processSteps.map(step => <li key={step.step}><span>{step.step}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
    </div></section>

    <section className="section case-studies-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">CASE STUDIES</span><h2>Projects we&apos;ve delivered.</h2></div><RouteLink className="text-link" href="/case-studies">View all case studies<Icon name="arrow" /></RouteLink></div>
      <div className="case-grid">{caseStudies.slice(0, 2).map(item => <CaseStudyCard key={item.id} item={item} />)}</div>
    </div></section>

    <section className="section shopify-section"><div className="container shopify-inner">
      <div><span className="eyebrow light">SHOPIFY &amp; ECOMMERCE</span><h2>{shopifyOffer.headline}</h2><p>{shopifyOffer.description}</p>
        <RouteLink className="button button-accent" href="/contact?interest=Shopify%20and%20Ecommerce%20Stores">{shopifyOffer.cta}<Icon name="arrow" /></RouteLink>
      </div>
      <ul className="shopify-list">{shopifyOffer.items.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul>
    </div></section>

    <section className="section technology-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">TECHNOLOGY WE WORK WITH</span><h2>A modern, dependable stack.</h2></div></div>
      <ul className="tech-pill-list">{technologies.map(tech => <li key={tech}>{tech}</li>)}</ul>
    </div></section>

    <section className="section focus-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">WHAT WE FOCUS ON</span><h2>How we approach every engagement.</h2></div></div>
      <div className="focus-grid">
        <div><Icon name="shield" /><h3>Reliability first</h3><p>We build systems that hold up under real daily use, not just in a demo.</p></div>
        <div><Icon name="layers" /><h3>Clear communication</h3><p>You always know what stage your project is at and what comes next.</p></div>
        <div><Icon name="plug" /><h3>Sensible architecture</h3><p>We choose the simplest solution that will actually scale with you.</p></div>
      </div>
    </div></section>

    <section className="section faq-preview"><div className="container faq-layout">
      <aside><span className="eyebrow">FAQ</span><h2>Common questions.</h2><p>Have a different question? Speak to our team directly.</p><RouteLink className="text-link" href="/faq">View all questions<Icon name="arrow" /></RouteLink></aside>
      <div className="faq-list">{faqs.slice(0, 4).map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
    </div></section>

    <ContactCTA />
  </>;
}
