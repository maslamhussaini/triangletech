import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, business } from "@/lib/site";
import RentalCalculatorClient from "./calculator-client";

export const metadata: Metadata = pageMetadata(
  "Rental Property Investment Calculator — Should I Buy This Rental Property?",
  "Free rental property calculator for US short-term rental investors: mortgage payment, revenue, NOI, cash flow, break-even occupancy and cash-on-cash return from your own figures. No signup, nothing uploaded.",
  "/tools/rental-property-investment-calculator"
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
      name: "Rental Property Investment Calculator",
      item: `${business.url}/tools/rental-property-investment-calculator`,
    },
  ],
};

const FAQS = [
  {
    question: "Is this calculator financial advice?",
    answer:
      "No. It is a preliminary analysis tool that does arithmetic on the figures you enter and explains what the results mean. It does not know the property, the market or your finances, and it never recommends buying or passing on a property. Decisions of this size belong with your own research and, where needed, a lender, a tax professional and a real-estate attorney.",
  },
  {
    question: "What is the difference between NOI and cash flow?",
    answer:
      "NOI (net operating income) is gross income minus operating expenses — and operating expenses never include the mortgage. Cash flow is NOI minus debt service (your mortgage payment). Two buyers can purchase the same property with the same NOI and end up with completely different cash flow because they financed it differently. This calculator keeps the two separate so you can see both the property's performance and your deal's performance.",
  },
  {
    question: "How is cash-on-cash return calculated?",
    answer:
      "Cash-on-cash return is annual cash flow divided by the total cash you actually put in: down payment plus closing costs plus furnishing and setup costs. Borrowed money is not counted as invested cash. If you put no cash in, the return is undefined and the calculator shows a dash rather than a misleading 0%.",
  },
  {
    question: "What occupancy rate and nightly rate should I enter?",
    answer:
      "Figures you have verified yourself from comparable nearby listings — similar size, location and quality — over a full year, not a peak-season month. Be careful with projections supplied by a seller or agent: they often assume top-decile pricing and occupancy at the same time. The conservative scenario in this tool (rate 10% lower, occupancy 10 points lower) is a useful stress test of any optimistic projection.",
  },
  {
    question: "Why can break-even occupancy be above 100%?",
    answer:
      "Break-even occupancy is the share of your available nights that must be booked for cash flow to reach exactly zero. If fixed costs plus the mortgage are larger than a fully booked year can generate after fees and cleaning costs, break-even lands above 100% — meaning the property cannot cover its costs on these assumptions even if every available night is booked. That is worth knowing before you buy, not a calculation error.",
  },
  {
    question: "Does the calculator include income tax, depreciation or appreciation?",
    answer:
      "No. Results are before income tax, and the tool does not model depreciation, loan pay-down (equity build-up) or property appreciation. Those can materially change a property's total return in either direction, which is one reason the assessment here is deliberately framed as preliminary cash-flow analysis rather than a verdict on the investment.",
  },
  {
    question: "How does cleaning make or lose money?",
    answer:
      "Cleaning is per stay, not per night. If you charge guests a $120 cleaning fee and pay your cleaner $90, each stay contributes $30 before other costs — and shorter stays mean more turnovers, so the same occupancy can produce very different cleaning economics depending on average stay length. Enter the fee, the cost and your average stay in Advanced and the calculator works out stays per year (booked nights ÷ average stay) and shows fees as income and costs as expenses, separately.",
  },
  {
    question: "Can I use this for a long-term rental instead?",
    answer:
      "Yes, with a conversion. Set the nightly rate to your monthly rent divided by about 30.4, occupancy to your expected tenancy level (for example 95% to allow for gaps between tenants), platform and management fees to whatever you actually pay, and cleaning fees and costs to zero unless you charge and pay them between tenancies. The NOI, cash flow, break-even and cash-on-cash maths is the same.",
  },
  {
    question: "Are my figures uploaded or stored?",
    answer:
      "No. The calculator runs entirely in your browser. There is no account, no database and no property-data lookup — the tool knows nothing about any real property and cannot estimate rent or occupancy for an address.",
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
    href: "/tools/product-cost-profit-calculator",
    name: "Product Cost & Profit Calculator",
    note: "Gross profit, net profit, margin and ROI for products you sell.",
  },
  {
    href: "/tools/image-compressor",
    name: "Image Compressor to Target KB",
    note: "Shrink listing and marketing photos to a target file size, in your browser.",
  },
  {
    href: "/tools/pakistan-sales-tax-calculator",
    name: "Pakistan Sales Tax Calculator",
    note: "Sales tax by HS/PCT code, including Third Schedule and further tax.",
  },
] as const;

export default function RentalPropertyCalculatorPage() {
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
      <RentalCalculatorClient />

      <section className="section rental-calc-content" aria-labelledby="rental-how-it-works">
        <div className="container">
          <h2 id="rental-how-it-works">How this calculator works</h2>
          <p>
            Every figure on this page comes from the values you type in. There are no paid data feeds, no
            scraped listings and no rent estimates for real addresses — when a number is an assumption, it
            is yours. The starting example is labelled illustrative for the same reason.
          </p>

          <h3>The formulas, in plain language</h3>
          <ul className="rental-calc-notes">
            <li>
              <strong>Mortgage payment</strong> uses the standard amortisation formula — principal × monthly
              rate × (1 + monthly rate)<sup>payments</sup> ÷ ((1 + monthly rate)<sup>payments</sup> − 1). At
              a 0% rate the principal is simply divided evenly across the term. The payment shown is
              principal and interest only; tax and insurance are separate lines, never bundled in.
            </li>
            <li>
              <strong>Revenue</strong> is nightly rate × booked nights, where booked nights = available
              nights × occupancy. Cleaning fees charged to guests are added as income: fee per stay × stays
              per year, and stays per year = booked nights ÷ average stay length.
            </li>
            <li>
              <strong>NOI</strong> is gross income minus operating expenses. Operating expenses include
              platform and management fees (percentages of rental revenue), cleaning costs, property tax,
              insurance, HOA dues, utilities, repairs and your other monthly costs. The mortgage is{" "}
              <em>not</em> an operating expense, so financing choices never move NOI.
            </li>
            <li>
              <strong>Cash flow</strong> is NOI minus debt service (the mortgage). <strong>Cash-on-cash
              return</strong> is annual cash flow divided by total cash invested — down payment, closing
              costs and furnishing only. <strong>Cap rate</strong> is NOI divided by purchase price.
            </li>
            <li>
              <strong>Break-even occupancy</strong> works out what each booked night contributes after the
              costs that scale with bookings (fee percentages and the cleaning fee/cost spread), then
              divides your fixed annual costs — plus the mortgage, for the cash-flow figure — by that
              contribution. It can legitimately come out above 100%, which means the property cannot break
              even on your assumptions even fully booked.
            </li>
          </ul>

          <h3>How to use it</h3>
          <ol className="rental-calc-steps">
            <li>Start with Quick Analysis: price, down payment, a real lender rate and term, and the nightly rate and occupancy you have verified from comparable listings.</li>
            <li>Open Advanced and itemise property tax, insurance, HOA, utilities and repairs. If your quick monthly-expenses figure already covered any of these, lower it so nothing is counted twice.</li>
            <li>Add closing and furnishing costs so cash-on-cash is measured against everything you actually put in, not just the down payment.</li>
            <li>Set cleaning fee, cleaning cost and average stay length — for short stays, cleaning economics can quietly decide the result.</li>
            <li>Reduce available nights for owner use, blocked dates and any local limits on rental nights, then read the assessment and all three scenarios — especially the conservative one.</li>
            <li>Work through the due diligence checklist before treating any positive result as a reason to proceed.</li>
          </ol>

          <h2>What the numbers cannot tell you</h2>
          <p>
            Four checks decide many real short-term rental purchases, and none of them can be done by a
            calculator. <strong>Legality:</strong> many US cities and counties restrict short-term rentals —
            permits, primary-residence rules, night caps or outright bans — and rules change.{" "}
            <strong>HOA restrictions:</strong> an HOA or condo association can prohibit short-term renting
            even where the city allows it. <strong>Insurance:</strong> a standard homeowner policy commonly
            excludes STR activity, so cover has to be arranged for this use. <strong>Financing:</strong>{" "}
            the loan has to permit short-term rental use, and the payment has to be survivable in a slow
            season, not just an average month. The checklist next to the calculator covers each of these,
            plus permits, lodging taxes and safety basics.
          </p>
          <p>
            The analysis is also deliberately narrow in scope: it is before income tax, it does not model
            appreciation, equity build-up from loan pay-down, depreciation, major capital repairs (a roof
            or HVAC replacement) or the value of your own management time if you self-manage. A property can
            be cash-flow negative and still build equity — or cash-flow positive on paper and disappoint
            once those items land. That is why the result is presented as a preliminary assessment of your
            assumptions, never as an unconditional recommendation.
          </p>

          <h2>Frequently asked questions</h2>
          <div className="faq-list rental-calc-faq">
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
          <ul className="rental-calc-related">
            {relatedTools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href}>{tool.name}</Link>
                <span>{tool.note}</span>
              </li>
            ))}
          </ul>
          <p className="rental-calc-disclaimer">
            TriangleTech builds business software and publishes these tools for general information. This
            page is not financial, tax or legal advice, and no result here is a recommendation to buy or
            not buy any property. Verify rates, rules and restrictions for the specific property and
            jurisdiction before committing funds.
          </p>
        </div>
      </section>
    </>
  );
}
