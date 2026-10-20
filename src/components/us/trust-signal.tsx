import { Icon } from "@/components/icons";
import type { TrustSignalData } from "@/lib/us/landing";

/**
 * TrustSignal — one factual capability/trust point, composed from the
 * Indigo card primitive. Content is supplied as data and must stay
 * factual: no testimonials, logos, reviews, awards or invented results
 * (see AGENTS.md). Server Component.
 */
export function TrustSignal({ signal }: { signal: TrustSignalData }) {
  return (
    <div className="card-premium trust-signal">
      <Icon name={signal.icon ?? "check"} />
      <h3>{signal.title}</h3>
      <p>{signal.description}</p>
    </div>
  );
}

export function TrustSignalGrid({ children }: { children: React.ReactNode }) {
  return <div className="why-grid">{children}</div>;
}
