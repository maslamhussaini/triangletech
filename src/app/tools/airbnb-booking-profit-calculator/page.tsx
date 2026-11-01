import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import AirbnbBookingClient from "./calculator-client";

export const metadata: Metadata = pageMetadata(
  "Airbnb Booking Profit Calculator — What One Booking Really Contributes",
  "Free Airbnb booking calculator for US hosts: accommodation revenue, gross booking revenue, platform and management fees, and net booking contribution per booking and per night. No signup, nothing uploaded.",
  "/tools/airbnb-booking-profit-calculator"
);

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    {
      "@type": "ListItem",
      position: 3,
      name: "Airbnb Booking Profit Calculator",
      item: `${business.url}/tools/airbnb-booking-profit-calculator`,
    },
  ],
};

const FAQS = [
  {
    question: "Is the net booking contribution the same as my profit from a booking?",
    answer:
      "No, and the difference matters. Contribution is what a booking leaves after the costs that exist because that booking exists: platform and management fees, cleaning, supplies and other per-booking costs. It does not subtract your fixed property costs — mortgage or rent, property tax, insurance, baseline utilities — or income taxes. A month of positively contributing bookings can still lose money overall if the contributions do not cover those fixed costs.",
  },
  {
    question: "What platform fee percentage should I enter?",
    answer:
      "The percentage you were actually charged for a booking like this one, from your payout summary or transaction history. Airbnb's fee structure is not one universal rate: hosts may be on a split-fee structure (a smaller host fee with the guest paying a service fee) or a host-only fee, and the details vary by listing, market and settings. A percentage quoted in an article or by another host may not be the one applied to your listing, which is why this calculator asks you to enter your own and labels the base it applies it to.",
  },
  {
    question: "What exactly are the fees calculated on?",
    answer:
      "In this calculator, both the platform fee and the management fee are percentages of gross booking revenue: accommodation revenue (nightly rate × nights) plus the guest cleaning fee plus additional booking charges. That base is stated on every fee figure so you can compare it directly with your payout breakdown. If your manager or platform charges on a different base, adjust the percentage you enter so the resulting fee amount matches what you actually pay.",
  },
  {
    question: "Should I include the taxes the guest paid?",
    answer:
      "No. Occupancy, lodging and similar taxes collected from the guest are pass-through amounts owed to a tax authority — they are never your revenue, and this calculator excludes them by design. Do not add them to additional booking charges. If a tax amount appears in your payout, it is money you hold briefly on the authority's behalf, not income from the booking.",
  },
  {
    question: "Why list the cleaning fee as revenue and cleaning as a cost?",
    answer:
      "Because both are true, and the gap between them is real money. You collect the guest cleaning fee as part of the booking; you then pay whatever the turnover clean actually costs. If you charge $75 and the clean costs $60, the booking keeps $15 of cleaning spread. If a deep clean costs $110 against the same fee, the booking loses $35 on cleaning. Hosts who net the two off in their head miss which bookings are quietly subsidising the cleaning bill.",
  },
  {
    question: "What is a good contribution margin?",
    answer:
      "There is no universal benchmark, because the right margin depends on the fixed costs the contribution has to cover. A useful test is personal: add up a month's contributions from all bookings and compare them with that month's fixed property costs (mortgage, tax, insurance, utilities). If contributions consistently fall short, the fix is in nightly price, minimum stay, fees or per-booking costs — and this calculator shows which of those is leaking on a single booking.",
  },
  {
    question: "Can I use this for Vrbo or direct bookings?",
    answer:
      "Yes. Nothing in the maths is Airbnb-specific. Enter the channel's own fee percentages from your payout for that channel — a direct booking might have a 0% platform fee but a card processing cost you can put in other booking-specific costs — and the same contribution calculation applies.",
  },
  {
    question: "Are my figures uploaded or stored?",
    answer:
      "No. The calculator runs entirely in your browser. There is no account, no database and no connection to Airbnb or any listing data — the tool cannot see your bookings and knows nothing about your property.",
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

const relatedTools = [
  {
    href: "/tools/rental-property-investment-calculator",
    name: "Rental Property Investment Calculator",
    note: "The full-property picture: NOI, cash flow, break-even occupancy and cash-on-cash, including the fixed costs and mortgage this booking calculator leaves out.",
  },
  {
    href: "/tools/product-cost-profit-calculator",
    name: "Product Cost & Profit Calculator",
    note: "Gross profit, net profit, margin and ROI for products you sell.",
  },
  {
    href: "/tools/image-compressor",
    name: "Image Compressor to Target KB",
    note: "Shrink listing photos to a target file size, in your browser.",
  },
] as const;

export default function AirbnbBookingCalculatorPage() {
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
      <AirbnbBookingClient />

      <section className="section airbnb-calc-content" aria-labelledby="airbnb-how-it-works">
        <div className="container">
          <h2 id="airbnb-how-it-works">How this calculator works</h2>
          <p>
            Hosts usually know a booking&apos;s payout total, but not what the booking contributed once the
            costs it caused are removed. This calculator works that out for one booking at a time, using
            only the figures you enter — no connection to Airbnb, no listing data, no estimates for your
            property.
          </p>

          <h3>The formulas</h3>
          <ul className="airbnb-calc-notes">
            <li><strong>Accommodation revenue</strong> = nightly rate × nights booked.</li>
            <li>
              <strong>Gross booking revenue</strong> = accommodation revenue + guest cleaning fee +
              additional booking charges. Pass-through taxes are excluded — they are collected for a tax
              authority and are never the host&apos;s revenue.
            </li>
            <li>
              <strong>Platform fee</strong> = gross booking revenue × your platform fee percentage.{" "}
              <strong>Management fee</strong> = gross booking revenue × your management fee percentage.
              The base is gross booking revenue in both cases, and it is printed next to every fee figure
              above. Real fee structures vary by listing and market, so enter the percentages from your
              own payout summary.
            </li>
            <li>
              <strong>Total variable costs</strong> = platform fee + management fee + actual cleaning
              expense + supplies expense + other booking-specific costs.
            </li>
            <li>
              <strong>Net booking contribution</strong> = gross booking revenue − total variable costs.{" "}
              <strong>Contribution margin</strong> = contribution ÷ gross booking revenue.{" "}
              <strong>Contribution per night</strong> = contribution ÷ nights booked.
            </li>
          </ul>

          <h3>Worked example</h3>
          <p>
            A 3-night booking at $150 a night, with a $75 guest cleaning fee, a 3% platform fee and a 20%
            management fee. The clean actually cost $60, and supplies came to $15:
          </p>
          <ul className="airbnb-calc-notes">
            <li>Accommodation revenue: $150 × 3 = <strong>$450.00</strong></li>
            <li>Gross booking revenue: $450 + $75 = <strong>$525.00</strong></li>
            <li>Platform fee: 3% of $525 = <strong>$15.75</strong></li>
            <li>Management fee: 20% of $525 = <strong>$105.00</strong></li>
            <li>Total variable costs: $15.75 + $105 + $60 + $15 = <strong>$195.75</strong></li>
            <li>Net booking contribution: $525 − $195.75 = <strong>$329.25</strong> — $109.75 per night, a 62.7% contribution margin</li>
          </ul>
          <p>
            These are the figures the calculator starts with, so you can check its output against this
            example before entering your own booking.
          </p>

          <h3>What a booking contribution leaves out — on purpose</h3>
          <p>
            Contribution analysis answers one question well: <em>was this booking worth taking, at this
            price, with these costs?</em> It does not answer whether the property is profitable. Fixed
            costs — mortgage or rent, property tax, insurance, baseline utilities — exist whether the
            night is booked or empty, so they are not charged against one booking. Neither are income
            taxes. To see whether a property&apos;s bookings cover its fixed costs over a year, use the{" "}
            <Link href="/tools/rental-property-investment-calculator">
              Rental Property Investment Calculator
            </Link>
            , which models the whole property including financing.
          </p>
          <p>
            Two patterns this per-booking view exposes quickly: one-night stays, where a fixed cleaning
            cost is spread over a single night and can erase the contribution entirely; and cleaning-fee
            leakage, where the fee charged is below the real cost of the clean on every stay. Both are
            fixable — higher minimum stays, a realistic cleaning fee, a cleaner quote that matches the
            property — and both are invisible in a payout total.
          </p>

          <h2>Frequently asked questions</h2>
          <div className="faq-list airbnb-calc-faq">
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
            This calculator is part of the <Link href="/tools">TriangleTech free tools</Link> collection —
            practical calculators that run in your browser with no signup.
          </p>
          <ul className="airbnb-calc-related">
            {relatedTools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href}>{tool.name}</Link>
                <span>{tool.note}</span>
              </li>
            ))}
          </ul>
          <p className="airbnb-calc-disclaimer">
            TriangleTech publishes these tools for general information. Airbnb is a trademark of Airbnb,
            Inc.; this tool is not affiliated with or endorsed by Airbnb, and your platform payout
            breakdown is the authoritative record of your fees. This page is not financial or tax advice.
          </p>
        </div>
      </section>
    </>
  );
}
