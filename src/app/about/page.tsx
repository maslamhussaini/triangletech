import { PageIntro, ContactCTA } from "@/components/page-parts";
import { Brand } from "@/components/brand";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("About TriangleTech", "Meet TriangleTech, a technology company building practical business software, web platforms, mobile apps and ecommerce experiences.", "/about");

export default function About() {
  return <><PageIntro label="ABOUT TRIANGLETECH" title="A practical approach. A dependable build.">Engineering-focused software built by people who understand real business operations, not just code.</PageIntro>
    <section className="section"><div className="container about-story">
      <div className="identity-panel"><Brand /><div className="identity-rings" aria-hidden="true" /><div><span className="eyebrow light">PAKISTAN · WORLDWIDE CLIENTS</span><p>Technology that moves<br /><em>your business forward.</em></p></div></div>
      <div><span className="eyebrow">WHO WE ARE</span><h2>Focused on business<br />problems, not just code.</h2><p>{business.name} is a technology company building business management systems, digital invoicing platforms, water supply operations software and ecommerce storefronts for growing businesses.</p><p>Whether it&apos;s a connected ERP, a structured invoicing workflow or a premium Shopify store, our aim is to make software genuinely useful for the people running the business.</p><RouteLink className="text-link" href="/services">Explore what we do<Icon name="arrow" /></RouteLink></div>
    </div></section>
    <section className="section about-principles"><div className="container"><span className="eyebrow">WORKING WITH TRIANGLETECH</span><div className="principles-grid">
      <div><h2>Built around<br />your requirements.</h2><p>Everyday operations and larger projects deserve the same clear communication.</p></div>
      <dl>
        <div><dt>Practical business-first thinking</dt><dd>We start from how your business actually operates, then shape the software around that.</dd></div>
        <div><dt>Direct communication</dt><dd>Speak with our team by phone, WhatsApp or email throughout your project.</dd></div>
        <div><dt>Long-term support</dt><dd>We stay involved after launch, improving the product as your requirements evolve.</dd></div>
      </dl>
    </div></div></section>
    <section className="section"><div className="container office-line"><div><span className="eyebrow">OUR BASE</span><h2>Lahore, Pakistan.</h2></div><address>{business.address}</address><RouteLink className="text-link" href="/contact">Contact TriangleTech<Icon name="arrow" /></RouteLink></div></section>
    <ContactCTA />
  </>;
}
