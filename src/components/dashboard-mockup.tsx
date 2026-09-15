import type { ScreenLayout } from "@/lib/site";
import { Icon } from "./icons";
import { getBespokeScreen, productSidebarItems, type MockDevice } from "./product-mockups";

const bars = [62, 84, 48, 96, 70, 55, 88];
const rows = [
  { a: "Order #1042", b: "Acme Traders", c: "$1,240.00", status: "Paid" },
  { a: "Order #1041", b: "Blue Ridge Co.", c: "$860.00", status: "Pending" },
  { a: "Order #1040", b: "Summit Retail", c: "$2,110.00", status: "Paid" },
  { a: "Order #1039", b: "Northgate Ltd.", c: "$430.00", status: "Overdue" },
];

function StatusPill({ status }: { status: string }) {
  const cls = status === "Paid" || status === "Valid" || status === "Delivered" || status === "Completed" ? "pill-ok" : status === "Pending" || status === "In Transit" || status === "Scheduled" ? "pill-warn" : "pill-bad";
  return <span className={`mock-pill ${cls}`}>{status}</span>;
}

export function DashboardMockup({ layout, accent = "cyan", label = "Overview", productId, screenId = "hero", device = "desktop" }: { layout: ScreenLayout; accent?: string; label?: string; productId?: string; screenId?: string; device?: MockDevice }) {
  const bespoke = getBespokeScreen(productId, screenId, { accent, device });
  // Shopify screens are storefronts, not an admin console — they carry their own
  // store navigation, so the app sidebar would read as the wrong product.
  const storefront = productId === "shopify-solutions";
  return <div className={`dashboard-mockup accent-${accent}${storefront ? " is-storefront" : ""}`}>
    <div className="mock-topbar"><span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" /><span className="mock-topbar-label">{label}</span></div>
    <div className="mock-body">
      {!storefront && <aside className="mock-sidebar" aria-hidden="true">
        <span className="mock-side-brand" />
        {productSidebarItems(productId).map(item => <span key={item} className="mock-side-item">{item}</span>)}
      </aside>}
      <div className="mock-main">
        {bespoke ? bespoke : <>
        {layout === "stats" && <>
          <div className="mock-stat-row">
            <div className="mock-stat"><span>Today&apos;s Sales</span><strong>$4,820</strong></div>
            <div className="mock-stat"><span>Open Orders</span><strong>18</strong></div>
            <div className="mock-stat"><span>Low Stock</span><strong>5</strong></div>
          </div>
          <div className="mock-chart">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
        </>}
        {layout === "table" && <div className="mock-table">
          <div className="mock-table-head"><span>Reference</span><span>Name</span><span>Amount</span><span>Status</span></div>
          {rows.map(r => <div className="mock-table-row" key={r.a}><span>{r.a}</span><span>{r.b}</span><span>{r.c}</span><StatusPill status={r.status} /></div>)}
        </div>}
        {layout === "form" && <div className="mock-form">
          <span className="mock-field" /><span className="mock-field" /><span className="mock-field short" />
          <span className="mock-btn" />
        </div>}
        {layout === "upload" && <div className="mock-upload">
          <div className="mock-dropzone"><Icon name="layers" /><span>Drop Excel file to upload</span></div>
          <div className="mock-file-row"><Icon name="invoice" /><span>invoices-batch-04.xlsx</span><span className="mock-pill pill-ok">Uploaded</span></div>
        </div>}
        {layout === "workflow" && <div className="mock-workflow">
          {["Uploaded", "Validated", "Submitted", "Tracked"].map((step, i) => <div className="mock-workflow-step" key={step}><span className={`mock-workflow-dot ${i <= 1 ? "is-done" : ""}`} />{step}</div>)}
        </div>}
        {layout === "grid" && <div className="mock-grid">{Array.from({ length: 6 }).map((_, i) => <div className="mock-grid-card" key={i}><span className="mock-grid-thumb" /><span className="mock-grid-title" /><span className="mock-grid-price" /></div>)}</div>}
        {layout === "product" && <div className="mock-product"><span className="mock-product-image" /><div className="mock-product-info"><span className="mock-field short" /><span className="mock-field" /><span className="mock-btn" /></div></div>}
        {layout === "calendar" && <div className="mock-calendar">{Array.from({ length: 14 }).map((_, i) => <span key={i} className={`mock-cal-cell ${[2, 5, 9, 11].includes(i) ? "is-booked" : ""}`} />)}</div>}
        {layout === "report" && <div className="mock-report"><div className="mock-chart tall">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div><div className="mock-legend"><span /><span /><span /></div></div>}
        {layout === "document" && <div className="mock-document"><div className="mock-doc-page"><span /><span /><span className="short" /></div><span className="mock-btn" /></div>}
        </>}
      </div>
    </div>
  </div>;
}
