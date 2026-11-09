import { Suspense } from "react";
import { ContactDetails } from "@/components/page-parts";
import { DemoRequestForm } from "@/components/demo-form";
import { ContactForm } from "./contact-form";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Request a Product Demo", "Request a free TriangleTech product demo. Call, WhatsApp or send an email with your business details and we'll walk you through OrderMate, FBR Digital, WaterFlow, Shopify Solutions or Dynamic Inventory Count.", "/contact");

export default function Contact() {
  return <section className="contact-page"><div className="container contact-grid">
    <div className="contact-copy"><span className="eyebrow light">REQUEST A PRODUCT DEMO</span><h1>See TriangleTech<br /><em>in action.</em></h1><p>Request a personalized walkthrough and discover which solution fits your business. Choose the way you prefer to get in touch.</p><ContactDetails /></div>
    <Suspense fallback={<DemoRequestForm initialInterest="" />}>
      <ContactForm />
    </Suspense>
  </div></section>;
}
