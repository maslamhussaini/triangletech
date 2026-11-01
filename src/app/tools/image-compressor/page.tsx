import type { Metadata } from "next";
import { pageMetadata, business } from "@/lib/site";
import ImageCompressorClient from "./compressor-client";

export const metadata: Metadata = pageMetadata(
  "Image Compressor to Target KB — Compress JPG, PNG & WebP Free",
  "Compress JPG, PNG and WebP images to a target size in KB — 50, 100, 200, 500 KB or custom — right in your browser. No uploads, no signup, free.",
  "/tools/image-compressor",
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    { "@type": "ListItem", position: 3, name: "Image Compressor to Target KB", item: `${business.url}/tools/image-compressor` },
  ],
};

const FAQS = [
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. Compression runs entirely in your browser using its built-in image encoding. Your file never leaves your device, and there is no account, database or server copy involved.",
  },
  {
    question: "How does the tool hit a specific size in KB?",
    answer:
      "It encodes the image, measures the actual result, and adjusts quality step by step. If the lowest acceptable quality is still too large, it reduces the dimensions and tries again. The size shown is always the real size of the file you download — if the target cannot be reached at acceptable quality, the tool says so instead of claiming success.",
  },
  {
    question: "Why couldn't my image reach the target size?",
    answer:
      "Some images resist compression: detailed photos, noisy low-light shots, and screenshots full of text or sharp edges. Reaching a very small target would mean quality or dimensions too low to be useful, so the tool stops at the smallest acceptable result and explains why.",
  },
  {
    question: "Should I download JPG or WebP?",
    answer:
      "JPG works everywhere — email, forms, older software. WebP is usually smaller at similar quality and keeps transparent backgrounds, and is supported by all modern browsers and most current platforms. Check what the site or service you are uploading to accepts.",
  },
  {
    question: "What happens to a transparent background?",
    answer:
      "WebP output keeps transparency. JPG has no transparency support, so transparent areas are filled with white. The tool warns you before you compress if your image has transparency and JPG is selected.",
  },
  {
    question: "What are the limits?",
    answer:
      "Files up to 25 MB, up to 12,000 pixels on a side and up to 40 megapixels total. Targets can be set from 10 KB to 10,000 KB. These limits keep processing reliable on phones as well as desktops.",
  },
  {
    question: "Does compressing remove photo metadata?",
    answer:
      "Yes. Re-encoding draws the picture into a fresh file, so EXIF data such as camera details and GPS location are not carried over. Photo orientation is applied to the image itself, so pictures still display the right way up.",
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
  "Add your image — drop it on the panel, or tap it to pick a photo on your phone. JPG, PNG and WebP are supported.",
  "Pick a target size: 50, 100, 200 or 500 KB, or enter a custom figure.",
  "Choose JPG for the widest compatibility or WebP for a usually smaller file that keeps transparency.",
  "Select Compress image, check the before/after sizes, and download the result. If the target cannot be reached at acceptable quality, the tool tells you and offers the smallest version it can produce.",
] as const;

export default function ImageCompressorPage() {
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
      <ImageCompressorClient />

      <section className="section image-compressor-content" aria-labelledby="image-compressor-how">
        <div className="container">
          <h2 id="image-compressor-how">How to use it</h2>
          <ol className="image-compressor-steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h2>Good to know</h2>
          <ul className="image-compressor-notes">
            <li>Common uses: profile and product photos with an upload limit, form and portal attachments, marketplace listings, and images for websites and email.</li>
            <li>Government, school and job portals often state a limit such as 100 KB or 200 KB. Set that figure as the target and check the result line confirms the target was met before you download.</li>
            <li>Compressing an already small image to a much larger target will not improve its quality — the tool simply re-encodes it, and the result may even be slightly larger.</li>
            <li>Your original file is never modified. Keep it if you might need the full-quality version later.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="faq-list image-compressor-faq">
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
        </div>
      </section>
    </>
  );
}
