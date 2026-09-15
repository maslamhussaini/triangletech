import { PageIntro, ContactCTA } from "@/components/page-parts";
import { Brand } from "@/components/brand";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("About TriangleTech", "Meet TriangleTech, a technology company building OrderMate, FBR Digital, WaterFlow and Shopify Solutions for growing businesses.", "/about");

export default function About() {
  return <><PageIntro label="ABOUT TRIANGLETECH" title="Software built by people who've run the workflow.">We build OrderMate, FBR Digital and WaterFlow as real products, and build custom web, mobile and ecommerce solutions alongside them.</PageIntro>
    <section className="section"><div className="container about-story">
      <div className="identity-panel"><Brand /><div className="identity-rings" aria-hidden="true" /><div><span className="eyebrow light">PAKISTAN · WORLDWIDE CLIENTS</span><p>Book a demo.<br /><em>See it working first.</em></p></div></div>
      <div><span className="eyebrow">WHO WE ARE</span><h2>Focused on business<br />problems, not just code.</h2><p>{business.name} builds OrderMate for sales and inventory, FBR Digital for structured invoicing, and WaterFlow for delivery operations — each a maintained product, not a one-off build. We also design and build custom web apps, mobile apps and Shopify stores.</p><p>Every product ships with a live demo, so you see the actual screens your team would use before you commit to anything.</p><RouteLink className="text-link" href="/#products">See our products<Icon name="arrow" /></RouteLink></div>
    </div></section>
    <section className="section about-principles"><div className="container"><span className="eyebrow">WORKING WITH TRIANGLETECH</span><div className="principles-grid">
      <div><h2>Built around<br />your requirements.</h2><p>Everyday operations and larger projects deserve the same clear communication.</p></div>
      <dl>
        <div><dt>Demo before commitment</dt><dd>You see the real product working on your kind of business before you decide anything.</dd></div>
        <div><dt>Direct communication</dt><dd>Speak with our team by WhatsApp or email throughout your project — no account managers, no runaround.</dd></div>
        <div><dt>Long-term support</dt><dd>We stay involved after launch, improving the product as your requirements evolve.</dd></div>
      </dl>
    </div></div></section>
    <ContactCTA />
  </>;
}
