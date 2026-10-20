/**
 * Content data for /websites-for-us-small-business/.
 *
 * Copy is factual and noncommittal where commercial details are still
 * under owner review: no numeric prices are published (plans are
 * label-priced "Request a Quote" — see pricing-review.ts), no revision
 * counts, timelines, hosting or maintenance inclusions are finalized
 * here, and nothing promises rankings, leads or AI placement.
 */
import type { FaqEntry, LandingPlan, TrustSignalData } from "./landing";

/** Single source for the page's metadata and its Service schema text. */
export const PAGE_META = {
  title: "Websites for US Small Businesses",
  description:
    "TriangleTech designs professional, mobile-friendly websites for US small businesses, with optional local SEO and AI-search-readiness services. Clear packages, written quotes, no lock-in.",
} as const;

export const HERO_CTAS = {
  primary: { href: "#consultation", label: "Request a Free Consultation" },
  secondary: { href: "#packages", label: "Explore Website Packages" },
} as const;

export const PLAN_CTA = { href: "#consultation", label: "Request a Quote" } as const;

export const FINAL_CTA = {
  href: "#consultation",
  label: "Request a Free Consultation",
} as const;

/** Heading copy for the project estimator section (P1.9). */
export const ESTIMATOR_SECTION = {
  eyebrow: "PROJECT ESTIMATOR",
  title: "Plan your website project in about a minute",
  description:
    "Answer a few questions and get a recommended package, a feature checklist and an honest picture of what your project involves. The estimator is a planning guide — your written proposal confirms scope, price and timeline.",
} as const;

/** Heading copy for the consultation form section (P1.8). */
export const CONSULTATION = {
  eyebrow: "FREE CONSULTATION",
  title: "Tell us about your project",
  description:
    "Complete the form and your inquiry is delivered to our team by email. We reply with honest next steps and — when a new website is the right fit — a written quote. No account, no mailing list, no obligation.",
} as const;

export const PROBLEMS: TrustSignalData[] = [
  {
    icon: "web",
    title: "No professional website yet",
    description:
      "Customers check online before they call. If they find nothing — or only a social page — many simply move on to a competitor who looks established.",
  },
  {
    icon: "custom",
    title: "An outdated, hard-to-use site",
    description:
      "Slow pages, broken layouts and stale information make a good business look unreliable, even when the work itself is excellent.",
  },
  {
    icon: "mobile",
    title: "A poor mobile experience",
    description:
      "Most local searches happen on a phone. If your site is hard to read or tap on mobile, visitors leave before they find your number.",
  },
  {
    icon: "trending",
    title: "Services that are hard to understand",
    description:
      "If visitors cannot quickly see what you do, where you work and how to reach you, they will not dig — they will go back to the results.",
  },
  {
    icon: "send",
    title: "Visitors who never become inquiries",
    description:
      "Traffic alone does nothing. Clear calls to action and an easy contact path are what turn a visit into a call, a message or a quote request.",
  },
];

export const SERVICE_LEVELS = [
  {
    title: "Website Design & Development",
    description:
      "A modern, mobile-friendly website designed around your services and your customers: clear pages, fast loading, click-to-call contact options and a structure that can grow with your business.",
  },
  {
    title: "Website + SEO Foundation",
    description:
      "Everything in website design, plus the groundwork that helps search engines understand your business. SEO (search engine optimization) is how your site earns visibility in Google results for the services and areas you serve — a foundation, not a promise of rankings.",
  },
  {
    title: "Website + SEO + AI Search Readiness",
    description:
      "Everything above, plus readiness for AI-driven search. AEO and GEO mean structuring your content so AI assistants and AI overviews can understand your business and represent it accurately. No one can guarantee AI placement — we make sure your business is easy to understand and cite.",
  },
] as const;

const QUOTE_NOTE = "Final quote confirmed in writing before any work begins";

export const PLANS: LandingPlan[] = [
  {
    id: "starter-website",
    name: "Starter Website",
    tagline:
      "A professional online presence for businesses that need to look established and be easy to contact.",
    priceLabel: "Request a Quote",
    billingNote: QUOTE_NOTE,
    features: [
      "Mobile-first custom website design",
      "Core pages for your business and services",
      "Click-to-call and contact/inquiry setup",
      "On-page SEO basics: titles, descriptions, headings",
      "Polish of your existing text for clarity",
      "You own your website, domain and content",
    ],
  },
  {
    id: "growth-seo",
    name: "Growth SEO",
    tagline:
      "For businesses that want to be found in local search — not just exist online.",
    priceLabel: "Request a Quote",
    billingNote: QUOTE_NOTE,
    featured: true,
    features: [
      "Everything in Starter Website",
      "Local SEO foundation: keywords, structure, internal linking",
      "Dedicated service and service-area pages",
      "Google Business Profile setup guidance",
      "FAQ content written around real customer questions",
      "Copywriting support for your key pages",
    ],
  },
  {
    id: "ai-visibility",
    name: "AI Visibility",
    tagline:
      "For businesses that want AI search tools — not just Google — to understand them correctly.",
    priceLabel: "Request a Quote",
    billingNote: QUOTE_NOTE,
    features: [
      "Everything in Growth SEO",
      "Structured data and clear business identity for search and AI tools",
      "Answer-ready content: FAQs, definitions, comparisons",
      "Crawlability and indexing review",
      "AI-search readiness check with a written summary",
      "Guidance on keeping your business details consistent across the web",
    ],
  },
];

export const PROCESS_STEPS = [
  {
    step: "01",
    title: "Discovery",
    description:
      "A short consultation about your business, services, service area and goals — and an honest view of whether a new website is the right next step.",
  },
  {
    step: "02",
    title: "Proposal",
    description:
      "A written proposal with scope, deliverables, price and timeline agreed before any work begins. No surprises, no pressure to decide on the call.",
  },
  {
    step: "03",
    title: "Design & Development",
    description:
      "We design and build your site, write or polish the content with you, and keep you posted as it comes together.",
  },
  {
    step: "04",
    title: "Review",
    description:
      "You review the finished site and request changes within the agreed scope. We refine until it is ready to represent your business.",
  },
  {
    step: "05",
    title: "Launch",
    description:
      "We launch, run final checks, and hand over your website. Optional care plans are available if you want ongoing help — never bundled in silently.",
  },
] as const;

export const TRUST_SIGNALS: TrustSignalData[] = [
  {
    icon: "check",
    title: "Clear scope, in writing",
    description:
      "Deliverables, price and timeline are agreed in a written proposal before work begins — you know exactly what you are paying for.",
  },
  {
    icon: "shield",
    title: "You own everything",
    description:
      "Your domain, your website and your content are yours. If you ever move on, you take them with you — no lock-in.",
  },
  {
    icon: "chat",
    title: "Direct technical consultation",
    description:
      "You talk with the people actually building your website, not a sales layer. Questions get technical answers, in plain language.",
  },
  {
    icon: "pin",
    title: "Honest positioning",
    description:
      "We are a Pakistan-based development team serving US clients remotely — and we say so plainly. No fake local office, no invented results.",
  },
  {
    icon: "custom",
    title: "A modern, maintainable build",
    description:
      "Your site is built on current, widely supported technology with security-conscious configuration, so it can be maintained and extended over time.",
  },
  {
    icon: "send",
    title: "Built for your customers",
    description:
      "Plain-language pages, obvious contact options and fast mobile pages — designed around the people who will actually hire you.",
  },
];

export const FAQS: FaqEntry[] = [
  {
    question: "What information do you need from me to start?",
    answer:
      "Your business name, the services you offer, your service area, and any logo, photos or existing text you have. If some of that does not exist yet, your proposal will say plainly what is needed and what we can help create.",
  },
  {
    question: "Can you redesign my existing website?",
    answer:
      "Yes. We start by reviewing what you have, keep what still works — content, pages, search presence — and rebuild what is holding you back. The proposal explains what we recommend changing and why.",
  },
  {
    question: "Is SEO included in every package?",
    answer:
      "On-page SEO basics are included in every package. The local SEO foundation — keyword-focused structure, service and area pages, internal linking — is part of Growth SEO and AI Visibility. Ongoing SEO campaigns are a separate service and are never implied or bundled silently.",
  },
  {
    question: "What is AI search readiness?",
    answer:
      "More people now ask AI assistants and AI overviews for recommendations instead of only using traditional search. AI search readiness means structuring your website and business information clearly — accurate details, answer-ready content, structured data — so those tools can understand your business and describe it correctly. It improves your chances of being represented accurately; no one can guarantee placement in AI answers, and we will not claim otherwise.",
  },
  {
    question: "Are hosting and maintenance separate?",
    answer:
      "Yes. Hosting and your domain stay in your name and are paid separately, and optional care plans for updates and small changes are available if you want them. Your proposal lists exactly what is included and what is separate before you commit to anything.",
  },
  {
    question: "How long will my website take?",
    answer:
      "It depends on the package, the number of pages, and how quickly content and feedback come together. Rather than quote a generic number, we agree a specific timeline in your written proposal — and we will tell you during discovery if your deadline is unrealistic.",
  },
  {
    question: "Can a US business work with TriangleTech remotely?",
    answer:
      "Yes — it is how we work with clients today. Consultations happen by video call and email, scheduled at times that suit US business hours, and everything important — scope, price, deliverables — is confirmed in writing. We are based in Pakistan and serve clients worldwide.",
  },
];
