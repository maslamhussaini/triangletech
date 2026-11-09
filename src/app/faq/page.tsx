import { PageIntro, ContactCTA } from "@/components/page-parts";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { faqs, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Frequently Asked Questions", "Answers to common TriangleTech questions about custom software, ERP systems, Shopify stores, mobile apps and our project process.", "/faq");

export default function FAQ() {
  return <><PageIntro label="A LITTLE CLARITY" title="Before you start a project.">Straightforward answers about our products, services and how to get in touch.</PageIntro>
    <section className="section"><div className="container faq-layout">
      <aside><h2>How can we help?</h2><p>For a question about your specific project, speak to our team directly.</p><RouteLink className="text-link" href="/contact">Ask our team<Icon name="arrow" /></RouteLink></aside>
      <div className="faq-list">{faqs.map((faq, index) => <details key={faq.question}><summary><span className="faq-number">0{index + 1}</span>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
    </div></section>
    <ContactCTA />
  </>;
}
