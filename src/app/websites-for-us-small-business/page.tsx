import { pageMetadata } from "@/lib/site";
import { Icon } from "@/components/icons";
import { RouteLink } from "@/components/navigation";
import { LandingSection } from "@/components/us/landing-section";
import { PremiumCTA } from "@/components/us/premium-cta";
import { PricingCard, PricingGrid } from "@/components/us/pricing-card";
import { TrustSignal, TrustSignalGrid } from "@/components/us/trust-signal";
import { FAQItem, FAQList } from "@/components/us/faq-item";
import {
  CONSULTATION,
  ESTIMATOR_SECTION,
  FAQS,
  FINAL_CTA,
  HERO_CTAS,
  PAGE_META,
  PLANS,
  PLAN_CTA,
  PROBLEMS,
  PROCESS_STEPS,
  SERVICE_LEVELS,
  TRUST_SIGNALS,
} from "@/lib/us/landing-data";
import { LeadForm } from "@/components/us/lead-form";
import { Estimator } from "@/components/us/estimator";
import { buildLandingStructuredData, LANDING_PATH } from "@/lib/us/structured-data";

export const metadata = pageMetadata(PAGE_META.title, PAGE_META.description, LANDING_PATH);

const HERO_POINTS = [
  "Clear packages, quoted in writing",
  "You own your website and content",
  "No long-term lock-in",
  "Direct technical consultation",
] as const;

export default function WebsitesForUsSmallBusinessPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingStructuredData()).replace(/</g, "\\u003c"),
        }}
      />
      {/* A — Hero */}
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">WEBSITES FOR US SMALL BUSINESSES</span>
          <h1>Professional websites built to help your business grow</h1>
          <p>
            TriangleTech designs and builds modern, mobile-friendly websites for US small
            businesses — with clear packages, honest scope agreed before work begins, and
            optional SEO and AI-search-readiness services when you are ready to grow.
          </p>
          <div className="hero-actions">
            <PremiumCTA href={HERO_CTAS.primary.href}>{HERO_CTAS.primary.label}</PremiumCTA>
            <PremiumCTA href={HERO_CTAS.secondary.href} variant="secondary">
              {HERO_CTAS.secondary.label}
            </PremiumCTA>
          </div>
          <ul className="us-chip-row">
            {HERO_POINTS.map(point => (
              <li className="us-chip" key={point}>
                <Icon name="check" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* B — Problems */}
      <LandingSection
        eyebrow="SOUND FAMILIAR?"
        title="Your website should be winning you work — not costing you it"
        description="These are the problems we hear most often from small-business owners. A professional website fixes each of them."
      >
        <TrustSignalGrid>
          {PROBLEMS.map(problem => (
            <TrustSignal key={problem.title} signal={problem} />
          ))}
        </TrustSignalGrid>
      </LandingSection>

      {/* C — Services explained */}
      <LandingSection
        eyebrow="WHAT WE DO"
        title="Three levels of service, explained plainly"
        description="Start with a professional website, add a local SEO foundation, or go further with AI search readiness. Each level builds on the one before — you choose how far to go."
      >
        <PricingGrid>
          {SERVICE_LEVELS.map(level => (
            <article className="card-premium" key={level.title}>
              <h3>{level.title}</h3>
              <p className="us-card-text">{level.description}</p>
            </article>
          ))}
        </PricingGrid>
        <p className="us-more-link">
          Looking for custom software, apps or ecommerce instead?{" "}
          <RouteLink className="text-link" href="/services">
            See all TriangleTech services
            <Icon name="arrow" />
          </RouteLink>
        </p>
      </LandingSection>

      {/* D — Packages (label-priced until the owner approves publishing prices) */}
      <LandingSection
        id="packages"
        eyebrow="WEBSITE PACKAGES"
        title="Choose the package that fits your goals"
        description="Every package starts with a written proposal confirming scope, price and timeline before any work begins — the quote is the price, with no surprises later."
      >
        <PricingGrid>
          {PLANS.map(plan => (
            <PricingCard key={plan.id} plan={plan} ctaHref={PLAN_CTA.href} ctaLabel={PLAN_CTA.label} />
          ))}
        </PricingGrid>
      </LandingSection>

      {/* E — Project estimator (P1.9: deterministic, qualitative) */}
      <LandingSection
        id="estimator"
        eyebrow={ESTIMATOR_SECTION.eyebrow}
        title={ESTIMATOR_SECTION.title}
        description={ESTIMATOR_SECTION.description}
      >
        <div className="glass-panel estimator-panel">
          <Estimator />
        </div>
      </LandingSection>

      {/* F — Process */}
      <LandingSection
        eyebrow="HOW WE WORK"
        title="A clear process, from first call to launch"
      >
        <ol className="process-grid process-grid-5">
          {PROCESS_STEPS.map(step => (
            <li key={step.step}>
              <span>{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </LandingSection>

      {/* G — Trust signals */}
      <LandingSection
        eyebrow="WHY TRIANGLETECH"
        title="Straightforward to work with, wherever you are"
      >
        <TrustSignalGrid>
          {TRUST_SIGNALS.map(signal => (
            <TrustSignal key={signal.title} signal={signal} />
          ))}
        </TrustSignalGrid>
      </LandingSection>

      {/* H — FAQ */}
      <LandingSection eyebrow="FAQ" title="Questions, answered honestly">
        <div className="us-faq">
          <FAQList>
            {FAQS.map((entry, index) => (
              <FAQItem key={entry.question} entry={entry} index={index} />
            ))}
          </FAQList>
        </div>
      </LandingSection>

      {/* I — Consultation form (P1.8: email-only lead capture) */}
      <LandingSection
        id="consultation"
        eyebrow={CONSULTATION.eyebrow}
        title={CONSULTATION.title}
        description={CONSULTATION.description}
      >
        <div className="glass-panel lead-form-panel">
          <LeadForm />
        </div>
      </LandingSection>

      {/* J — Final CTA */}
      <section className="contact-cta contact-cta-indigo">
        <span className="cta-orb gradient-drift" aria-hidden="true" />
        <div className="container cta-inner">
          <div>
            <span className="eyebrow light">FREE CONSULTATION</span>
            <h2>
              Tell us about
              <br />
              your business.
            </h2>
            <p className="us-cta-note">
              We will reply with honest next steps and a written quote. No pressure — and if a
              new website is not what you need, we will tell you that instead.
            </p>
          </div>
          <div>
            <PremiumCTA href={FINAL_CTA.href}>{FINAL_CTA.label}</PremiumCTA>
          </div>
        </div>
      </section>
    </>
  );
}
