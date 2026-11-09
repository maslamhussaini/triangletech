import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import QrGeneratorClient from "./qr-client";

export const metadata: Metadata = pageMetadata(
  "Free QR Code Generator — Website, Wi-Fi, Contact & Text QR Codes (PNG & SVG)",
  "Free QR code generator for websites, Wi-Fi, email, phone, contact cards and text. Real scannable codes, PNG (512–2048px) and SVG downloads, no signup, no watermark, nothing uploaded.",
  "/tools/qr-code-generator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Free QR Code Generator", item: `${business.url}/tools/qr-code-generator` },
  ],
};

const FAQS = [
  {
    question: "Is this QR code generator really free?",
    answer:
      "Yes. Generating and downloading codes is free, with no signup, no watermark and no limit built into this tool. The code is created in your browser, so there is no per-code service behind it to pay for.",
  },
  {
    question: "Do these QR codes expire?",
    answer:
      "No. These are static QR codes — the content (the website address, Wi-Fi details, number or text) is encoded directly in the black-and-white pattern, and the pattern does not expire. What can change is the content itself: if you change your Wi-Fi password, move your website or change your phone number, old printed codes will still point to the old details, so print a fresh code.",
  },
  {
    question: "What is the difference between a static and a dynamic QR code?",
    answer:
      "A static code encodes the final content directly, like this generator produces. A dynamic code encodes a short redirect address owned by a service, which then forwards scanners to your content — that lets the service let you edit the destination later and count scans, but the code stops working if the service or subscription ends, and scans pass through a third party. Static codes work forever with no intermediary; dynamic codes trade that independence for editability and tracking.",
  },
  {
    question: "Should I download PNG or SVG?",
    answer:
      "PNG is a picture made of pixels: it suits screens, documents, email, social posts and ordinary printing at the size you choose (512px for small on-screen use, 1024px for flyers and table cards, 2048px for posters). SVG is a vector drawing: it scales to any size — a business card or a shop-window sign — with perfectly sharp edges, and is what most print shops and designers prefer. Both contain the same QR code.",
  },
  {
    question: "Why won't my QR code scan?",
    answer:
      "The usual causes are low contrast (the code must be clearly darker than its background — this tool blocks combinations that are too faint), printing it too small for the amount of content it holds, a damaged or wrinkled print, or not enough quiet zone — the plain border around the code, which this tool always includes. Test-scan with your own phone before a print run, and if a code is dense, simplify the content (a shorter URL makes a simpler code) or print it larger.",
  },
  {
    question: "Is my Wi-Fi password or contact information uploaded?",
    answer:
      "No. Generation happens entirely in your browser using code this page ships to your device. Nothing you type — URLs, Wi-Fi passwords, contacts — is sent to a server, logged or stored. You can confirm this by loading the page and switching your device to airplane mode: the tool keeps working.",
  },
  {
    question: "Can I change where a printed code points later?",
    answer:
      "Not with a static code. The destination is baked into the pattern, which is exactly why it never expires and needs no service. If having an editable destination matters more, that is what dynamic QR services sell — weigh the ongoing subscription and the risk of the redirect service disappearing against reprinting, which for most menus, cards and signs is the cheaper, safer option.",
  },
  {
    question: "Can I put my logo in the middle of the code?",
    answer:
      "Not in this version, deliberately. A logo covers part of the code and relies on error correction to survive; done carelessly it produces codes that fail on some phones. This generator prioritises codes that scan first time, every time. If you add branding, do it around the code — a labeled frame, your colors at a safe contrast — rather than over it.",
  },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const steps = [
  "Choose the type: website URL, plain text, Wi-Fi, email, phone number or contact card.",
  "Enter the details. Validation appears as you type, and the exact content that will be encoded is shown under the preview — check the destination before you download.",
  "Optional: adjust the colors (the tool protects you from combinations too faint to scan) and the error correction level. The default black on white at level M scans fastest in the widest range of conditions.",
  "Download the PNG at the size you need, or the SVG if the code will be printed large or handled by a designer.",
  "Test-scan the file with your own phone, then print or publish it.",
] as const;

const relatedTools = [
  {
    href: "/tools/image-compressor",
    name: "Image Compressor to Target KB",
    note: "Shrink the photo or graphic that sits next to your QR code to a target file size, in your browser.",
  },
  {
    href: "/tools/product-cost-profit-calculator",
    name: "Product Cost & Profit Calculator",
    note: "Work out true product cost, margin and ROI for the products your QR code sends customers to.",
  },
  {
    href: "/tools/airbnb-booking-profit-calculator",
    name: "Airbnb Booking Profit Calculator",
    note: "For hosts putting a Wi-Fi QR card in the unit: what one booking really contributes after fees and costs.",
  },
] as const;

export default function QrCodeGeneratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <QrGeneratorClient />

      <section className="section qr-gen-content" aria-labelledby="qr-how-to">
        <div className="container">
          <h2 id="qr-how-to">How to make a QR code</h2>
          <ol className="qr-gen-steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h2>Static vs dynamic QR codes — which do you need?</h2>
          <p>
            This generator makes <strong>static</strong> codes. The content is the pattern: a website
            address, Wi-Fi credentials, a phone number, a contact card or text is encoded directly
            into the squares. Static codes never expire, need no account and keep working if every
            QR company in the world shuts down — because there is nothing between the printed code
            and its content.
          </p>
          <p>
            <strong>Dynamic</strong> codes, sold by subscription services, encode that service&apos;s
            short redirect address instead. That buys two things — editing the destination without
            reprinting, and scan analytics — at the cost of the code depending on the service staying
            up and paid. For most small-business uses below, the destination rarely changes and a
            reprint is cheap, so static is the honest default. Choose dynamic only when you know you
            will change destinations often or genuinely need scan counts.
          </p>

          <h2>PNG vs SVG, in one minute</h2>
          <ul className="qr-gen-notes">
            <li><strong>PNG</strong> is a fixed-size picture. Pick a resolution at least as large as the code will be displayed or printed: 512px for screens and small labels, 1024px for flyers, menus and table cards, 2048px for posters and signage.</li>
            <li><strong>SVG</strong> is a scalable vector. It has no fixed size and stays razor-sharp from a business card to a storefront window. Designers and print shops usually ask for SVG (or another vector format) first.</li>
            <li>Never stretch a small PNG larger in a document and assume it will scan — enlarging pixels makes edges fuzzy. If in doubt, download the SVG or a larger PNG.</li>
          </ul>

          <h2>Common business uses</h2>
          <ul className="qr-gen-notes">
            <li><strong>Restaurants and cafés:</strong> a website QR code on the table linking to the menu or ordering page — and a Wi-Fi QR code next to it so guests join without asking staff for the password.</li>
            <li><strong>Home services (plumbing, HVAC, electrical, roofing):</strong> a contact-card QR code on invoices, truck magnets and door hangers that saves your number into the customer&apos;s phone in one scan.</li>
            <li><strong>Retail and markets:</strong> website codes on packaging and shelf talkers linking to product pages, review pages or loyalty sign-up.</li>
            <li><strong>Vacation rentals and offices:</strong> a Wi-Fi QR card in the welcome book — guests scan once instead of typing a long password on a TV remote.</li>
            <li><strong>Events and print ads:</strong> email or phone codes on flyers that open a pre-addressed message or dial you directly, removing the typing step that loses enquiries.</li>
          </ul>

          <h2>Making codes that actually scan</h2>
          <ul className="qr-gen-notes">
            <li>Keep content short. A long URL or a large contact card creates a dense pattern that needs a bigger print size and a better camera.</li>
            <li>Keep strong contrast: dark code, light background. This tool enforces a minimum and warns before you reach it.</li>
            <li>Preserve the quiet zone — the plain border around the code. Cropping it off is a common reason printed codes fail.</li>
            <li>Always test-scan the final printed piece, in the lighting where customers will scan it, before printing in quantity.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="faq-list qr-gen-faq">
            {FAQS.map((faq, index) => (
              <details key={faq.question}>
                <summary>
                  <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
                  {faq.question}
                  <span className="faq-plus" aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>

          <h2>More free tools</h2>
          <p>
            This generator is part of the <Link href="/tools">TriangleTech free tools</Link> collection —
            practical tools that run in your browser with no signup.
          </p>
          <ul className="qr-gen-related">
            {relatedTools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href}>{tool.name}</Link>
                <span>{tool.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
