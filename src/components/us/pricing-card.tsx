import { Icon } from "@/components/icons";
import {
  planBadgeLabel,
  priceDisplayText,
  pricingCardClass,
  type LandingPlan,
} from "@/lib/us/landing";
import { PremiumCTA } from "./premium-cta";

/**
 * PricingCard / PricingGrid — plan presentation for the USA landing page.
 * All content arrives via the LandingPlan data contract; nothing about a
 * specific plan (name, price, features) is hardcoded here. Server
 * Components.
 */
export function PricingCard({
  plan,
  ctaHref,
  ctaLabel,
}: {
  plan: LandingPlan;
  ctaHref: string;
  ctaLabel: string;
}) {
  const badge = planBadgeLabel(plan);
  return (
    <article className={pricingCardClass(plan)} aria-label={plan.name}>
      {badge && <span className="plan-badge">{badge}</span>}
      <h3>{plan.name}</h3>
      <p className="plan-tagline">{plan.tagline}</p>
      <p className="plan-price">
        {priceDisplayText(plan)}
        <span className="plan-billing">{plan.billingNote}</span>
      </p>
      <ul className="plan-features">
        {plan.features.map(feature => (
          <li key={feature}>
            <Icon name="check" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.exclusions && plan.exclusions.length > 0 && (
        <p className="plan-exclusions">Not included: {plan.exclusions.join(" · ")}</p>
      )}
      <div className="plan-cta">
        <PremiumCTA href={ctaHref} variant={plan.featured ? "primary" : "secondary"}>
          {ctaLabel}
        </PremiumCTA>
      </div>
    </article>
  );
}

export function PricingGrid({ children }: { children: React.ReactNode }) {
  return <div className="pricing-grid">{children}</div>;
}
