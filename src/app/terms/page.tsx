import { PageIntro } from "@/components/page-parts";
import { business, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Terms of Service", "The terms that apply to using the TriangleTech website and engaging TriangleTech for a project.", "/terms");

export default function Terms() {
  return <><PageIntro label="LEGAL" title="Terms of Service">
    This website is provided for informational purposes. Project scope, pricing and delivery terms for any engagement are agreed separately in writing between TriangleTech and the client. For questions, contact us at {business.email}.
  </PageIntro>
  <section className="section"><div className="container">
    <h2>1. Use of this website</h2>
    <p>You may browse this website for information about TriangleTech products and services. You must not misuse the website, attempt to interfere with its operation, or use content from it to misrepresent TriangleTech.</p>
    <h2>2. Project terms are agreed separately</h2>
    <p>Nothing on this website is a binding quote, a guarantee of a result, or a promise of a ranking, lead volume or AI-search placement. Scope, price, timeline and deliverables for any project are confirmed in a separate written proposal before work begins.</p>
    <h2>3. Content and accuracy</h2>
    <p>Product and service descriptions describe what TriangleTech builds and offers. Availability is shown on each product page. TriangleTech may update website content without notice, and does not claim testimonials, client results or certifications that are not shown with verifiable detail.</p>
    <h2>4. Third-party links</h2>
    <p>Links to third-party sites, such as the Odoo Apps store or WhatsApp, are provided for convenience. TriangleTech is not responsible for third-party content, pricing or terms.</p>
    <h2>5. Liability</h2>
    <p>This website is provided as-is for information. TriangleTech is not liable for decisions made solely from website information without a written proposal and agreement.</p>
    <h2>6. Changes and contact</h2>
    <p>These terms may be updated on this page. Questions about these terms can be sent to {business.email}.</p>
  </div></section></>;
}
