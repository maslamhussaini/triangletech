import { Icon } from "./icons";

export function FeatureCard({ title, description }: { title: string; description: string }) {
  return <div className="feature-card">
    <Icon name="check" />
    <h3>{title}</h3>
    <p>{description}</p>
  </div>;
}
