import { DashboardMockup } from "./dashboard-mockup";
import type { ProductScreen } from "@/lib/site";

export function ScreenWalkthrough({ screens, accent, productId }: { screens: readonly ProductScreen[]; accent: string; productId?: string }) {
  return <div className="screen-walkthrough">
    {screens.map(screen => <article key={screen.id} className="screen-card">
      <div className="screen-visual"><DashboardMockup layout={screen.layout} accent={accent} label={screen.title} productId={productId} screenId={screen.id} /></div>
      <h3>{screen.title}</h3>
      <p><strong>What you can do: </strong>{screen.does}</p>
      <p className="screen-benefit"><strong>Why it matters: </strong>{screen.benefit}</p>
    </article>)}
  </div>;
}
