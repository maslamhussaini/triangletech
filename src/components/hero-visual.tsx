import { DashboardMockup } from "./dashboard-mockup";
import { BrowserFrame } from "./device-frame";
import { Icon } from "./icons";

/**
 * The hero reads as a small product ecosystem rather than one flat panel:
 * the OrderMate dashboard sits in a browser frame, with an FBR Digital
 * invoice-status card and a WaterFlow delivery-status card layered around it.
 * Everything is decorative, so the whole block is hidden from assistive tech —
 * the headline and copy carry the meaning.
 */
export function HeroVisual() {
  return <div className="hero-visual" aria-hidden="true">
    <BrowserFrame label="app.triangletech.co/ordermate">
      <DashboardMockup layout="stats" accent="cyan" label="OrderMate — Business Overview" productId="ordermate" screenId="dashboard" />
    </BrowserFrame>

    <div className="hero-card hero-card-fbr">
      <div className="hero-card-head"><Icon name="invoice" /><strong>FBR Digital</strong></div>
      <div className="hero-card-row"><span>INV-2026-001</span><span className="mock-pill pill-ok">Submitted</span></div>
      <div className="hero-card-row"><span>INV-2026-002</span><span className="mock-pill pill-warn">Validating</span></div>
      <span className="hero-card-foot">Tracking FBR-TRK-2026-041732</span>
    </div>

    <div className="hero-card hero-card-wf">
      <div className="hero-card-head"><Icon name="pin" /><strong>WaterFlow</strong></div>
      <div className="hero-card-row"><span>Delivery #WF-1001</span><span className="mock-pill pill-ok">Delivered</span></div>
      <div className="hero-card-row"><span>Delivery #WF-1002</span><span className="mock-pill pill-warn">In Transit</span></div>
      <span className="hero-card-foot">6 scheduled today · 4 vehicles active</span>
    </div>

    <div className="hero-float hero-float-sales"><span className="eco-dot" /><strong>Sales today</strong><span>$4,820 across 3 locations</span></div>
    <div className="hero-float hero-float-inventory"><span className="eco-dot" /><strong>Low stock</strong><span>5 items need reordering</span></div>
  </div>;
}
