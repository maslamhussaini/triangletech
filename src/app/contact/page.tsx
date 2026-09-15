import { ContactDetails } from "@/components/page-parts";
import { DemoRequestForm } from "@/components/demo-form";
import { pageMetadata, demoOptions } from "@/lib/site";

export const metadata = pageMetadata("Book a Free Demo", "Book a free TriangleTech product demo. Call, WhatsApp or send an email with your business details and we'll walk you through OrderMate, FBR Digital, WaterFlow or Shopify Solutions.", "/contact");

export default async function Contact({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const params = await searchParams;
  const interest = demoOptions.find(o => o === params.interest) ?? params.interest ?? "";
  return <section className="contact-page"><div className="container contact-grid">
    <div className="contact-copy"><span className="eyebrow light">BOOK A FREE DEMO</span><h1>See TriangleTech<br /><em>in action.</em></h1><p>Book a personalized walkthrough and discover which solution fits your business. Choose the way you prefer to get in touch.</p><ContactDetails /></div>
    <DemoRequestForm key={interest || "general"} initialInterest={interest} />
  </div></section>;
}
