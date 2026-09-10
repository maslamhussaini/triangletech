import { ContactDetails } from "@/components/page-parts";
import { RequestForm } from "@/components/request-form";
import { pageMetadata, services } from "@/lib/site";

export const metadata = pageMetadata("Contact & Start Your Project", "Contact TriangleTech to start your project. Call, WhatsApp or send an email with your requirements and we'll get back to you.", "/contact");

export default async function Contact({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const params = await searchParams;
  const interest = services.find(s => s.title === params.interest)?.title ?? params.interest ?? "";
  return <section className="contact-page"><div className="container contact-grid">
    <div className="contact-copy"><span className="eyebrow light">CONTACT TRIANGLETECH</span><h1>Have a business idea<br /><em>or a process to improve?</em></h1><p>Let&apos;s turn your business requirements into a reliable digital solution. Choose the way you prefer to get in touch.</p><ContactDetails /></div>
    <RequestForm key={interest || "general"} initialInterest={interest} />
  </div></section>;
}
