import { Icon } from "./icons";

export type MockDevice = "desktop" | "tablet" | "mobile";
type Ctx = { accent: string; device: MockDevice };

const bars = [58, 82, 46, 94, 66, 52, 86];

function ExtPill({ status }: { status: string }) {
  const ok = ["Paid", "Valid", "Delivered", "Completed", "Verified", "Submitted", "Confirmed", "Assigned"];
  const warn = ["Pending", "In Transit", "Scheduled", "Validating", "Out for Delivery", "New Request"];
  const cls = ok.includes(status) ? "pill-ok" : warn.includes(status) ? "pill-warn" : "pill-bad";
  return <span className={`mock-pill ${cls}`}>{status}</span>;
}

/* ---------------- OrderMate ---------------- */

function OmMap() {
  return <div className="om-map" aria-hidden="true">
    <svg viewBox="0 0 220 110" preserveAspectRatio="none">
      <path d="M-10 80 C 40 60, 70 95, 120 70 S 200 40, 230 55" stroke="#22354f" strokeWidth="6" fill="none" />
      <path d="M20 -10 C 40 30, 30 60, 60 110" stroke="#22354f" strokeWidth="5" fill="none" />
      <path d="M150 -10 C 160 40, 190 50, 180 110" stroke="#1a2c46" strokeWidth="4" fill="none" />
      <circle cx="34" cy="86" r="2.4" fill="#2a3a5c" />
      <circle cx="168" cy="30" r="2.4" fill="#2a3a5c" />
      <circle cx="96" cy="20" r="2.4" fill="#2a3a5c" />
    </svg>
    <Icon name="pin" className="om-map-pin" />
    <span className="om-map-label">You are here · Lahore Demo Zone</span>
  </div>;
}

function OmLocationForm() {
  return <div className="om-location">
    <div className="om-search"><Icon name="custom" /><span>Search saved locations…</span></div>
    <OmMap />
    <div className="mock-form" style={{ padding: 0, border: "none", background: "transparent" }}>
      <span className="mock-field" />
      <span className="mock-field" />
      <div className="om-coords"><span className="mock-field" /><span className="mock-field" /></div>
      <div className="om-btn-row"><span className="mock-btn" /><span className="mock-btn outline" /></div>
    </div>
    <div className="om-status-row"><span>Location status</span><ExtPill status="Verified" /></div>
  </div>;
}

function OmDashboard() {
  return <>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Today&apos;s Sales</span><strong>$4,820</strong></div>
      <div className="mock-stat"><span>Open Orders</span><strong>18</strong></div>
      <div className="mock-stat"><span>Low Stock</span><strong>5</strong></div>
    </div>
    <div className="mock-chart">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
    <div className="mock-table" style={{ marginTop: 12 }}>
      <div className="mock-table-head"><span>Order</span><span>Business</span><span>Amount</span><span>Status</span></div>
      <div className="mock-table-row"><span>#OM-1042</span><span>Demo Business</span><span>$1,240</span><ExtPill status="Paid" /></div>
      <div className="mock-table-row"><span>#OM-1041</span><span>Lahore Demo Store</span><span>$860</span><ExtPill status="Pending" /></div>
    </div>
  </>;
}

function OmCustomers() {
  const rows = [
    { name: "Demo Business", contact: "0300-1234567", locations: 3, status: "Verified" },
    { name: "Lahore Demo Store", contact: "0301-7654321", locations: 1, status: "Pending" },
    { name: "Sample Customer", contact: "0302-9988776", locations: 2, status: "Verified" },
  ];
  return <div className="mock-table">
    <div className="mock-table-head"><span>Business Name</span><span>Contact</span><span>Locations</span><span>Status</span></div>
    {rows.map(r => <div className="mock-table-row" key={r.name}><span>{r.name}</span><span>{r.contact}</span><span>{r.locations} saved</span><ExtPill status={r.status} /></div>)}
  </div>;
}

function OmInventory() {
  return <>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Total SKUs</span><strong>312</strong></div>
      <div className="mock-stat"><span>Low Stock</span><strong>5</strong></div>
      <div className="mock-stat"><span>Locations</span><strong>4</strong></div>
    </div>
    <div className="mock-table">
      <div className="mock-table-head"><span>Item</span><span>Location</span><span>On Hand</span><span>Status</span></div>
      <div className="mock-table-row"><span>Demo Widget A</span><span>Lahore Demo Store</span><span>42</span><ExtPill status="Paid" /></div>
      <div className="mock-table-row"><span>Demo Widget B</span><span>Demo Business</span><span>6</span><ExtPill status="Overdue" /></div>
    </div>
  </>;
}

function OmOrders() {
  return <>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Orders Today</span><strong>18</strong></div>
      <div className="mock-stat"><span>Sales Value</span><strong>$4,820</strong></div>
      <div className="mock-stat"><span>Avg. Order</span><strong>$267</strong></div>
    </div>
    <div className="mock-chart">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
  </>;
}

function OmMobile() {
  return <div className="om-mobile">
    <div className="om-mobile-header"><strong>OrderMate</strong><span>Demo Business</span></div>
    <div className="om-location">
      <OmMap />
      <div className="mock-form" style={{ padding: 0, border: "none", background: "transparent" }}>
        <span className="mock-field" />
        <span className="mock-btn" />
      </div>
    </div>
    <div className="om-recent-list">
      <div className="om-recent-item"><span>Lahore Demo Store</span><ExtPill status="Verified" /></div>
      <div className="om-recent-item"><span>Sample Customer</span><ExtPill status="Pending" /></div>
    </div>
    <div className="om-bottomnav">
      <span className="om-bottomnav-item is-active"><Icon name="erp" />Dashboard</span>
      <span className="om-bottomnav-item"><Icon name="invoice" />Orders</span>
      <span className="om-bottomnav-item"><Icon name="pin" />Locations</span>
      <span className="om-bottomnav-item"><Icon name="layers" />More</span>
    </div>
  </div>;
}

/* ---------------- FBR Digital ---------------- */

const fbrRows = [
  { inv: "INV-2026-001", cust: "Demo Business", hs: "8471.3010", desc: "Office Equipment", uom: "PCS", qty: 4, price: "12,500", excl: "50,000", tax: "18%", taxAmt: "9,000", further: "1,000", disc: "500", total: "59,500", status: "Submitted" },
  { inv: "INV-2026-002", cust: "Lahore Demo Store", hs: "3924.1090", desc: "Plastic Housewares", uom: "DZN", qty: 10, price: "1,800", excl: "18,000", tax: "18%", taxAmt: "3,240", further: "180", disc: "0", total: "21,420", status: "Validating" },
  { inv: "INV-2026-003", cust: "Sample Customer", hs: "6109.1000", desc: "Cotton T-Shirts", uom: "PCS", qty: 60, price: "450", excl: "27,000", tax: "18%", taxAmt: "4,860", further: "270", disc: "300", total: "31,830", status: "Pending" },
  { inv: "INV-2026-004", cust: "Demo Business", hs: "8517.1200", desc: "Mobile Accessories", uom: "PCS", qty: 8, price: "3,200", excl: "25,600", tax: "18%", taxAmt: "4,608", further: "256", disc: "0", total: "30,464", status: "Failed" },
];

function FbrValidationTable() {
  return <div className="fbr-table-wrap">
    <table className="fbr-table">
      <thead><tr><th>Invoice #</th><th>Customer</th><th>HS Code</th><th>Description</th><th>UOM</th><th>Qty</th><th>Unit Price</th><th>Value Excl. Tax</th><th>Tax %</th><th>Tax Amount</th><th>Further Tax</th><th>Discount</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>{fbrRows.map(r => <tr key={r.inv}>
        <td>{r.inv}</td><td>{r.cust}</td><td>{r.hs}</td><td>{r.desc}</td><td>{r.uom}</td><td>{r.qty}</td><td>{r.price}</td><td>{r.excl}</td><td>{r.tax}</td><td>{r.taxAmt}</td><td>{r.further}</td><td>{r.disc}</td><td>{r.total}</td><td><ExtPill status={r.status} /></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function FbrDashboard() {
  return <>
    <div className="fbr-stat-chips">
      <div className="fbr-chip"><span>Total Invoices</span><strong>128</strong></div>
      <div className="fbr-chip"><span>Validated</span><strong>96</strong></div>
      <div className="fbr-chip"><span>Submitted</span><strong>84</strong></div>
      <div className="fbr-chip"><span>Failed</span><strong>6</strong></div>
    </div>
    <div className="mock-table" style={{ marginTop: 12 }}>
      <div className="mock-table-head"><span>Invoice</span><span>Customer</span><span>Total</span><span>Status</span></div>
      <div className="mock-table-row"><span>INV-2026-004</span><span>Demo Business</span><span>Rs 30,464</span><ExtPill status="Failed" /></div>
      <div className="mock-table-row"><span>INV-2026-003</span><span>Sample Customer</span><span>Rs 31,830</span><ExtPill status="Pending" /></div>
    </div>
  </>;
}

function FbrInvoiceForm() {
  return <div className="mock-form">
    {["Invoice Number", "Customer", "HS Code", "Description", "Quantity", "Unit Price", "Sales Tax %"].map(label => <span key={label} className="mock-field" title={label} />)}
    <span className="mock-btn" />
  </div>;
}

function FbrSubmissionTracking() {
  return <>
    <div className="mock-workflow">
      {["Uploaded", "Validated", "Submitted", "Tracked"].map((step, i) => <div className="mock-workflow-step" key={step}><span className={`mock-workflow-dot ${i <= 2 ? "is-done" : ""}`} />{step}</div>)}
    </div>
    <div className="fbr-tracking-card" style={{ marginTop: 12 }}>
      <Icon name="check" />
      <strong>Tracking Number Generated</strong>
      <span className="fbr-tracking-num">FBR-TRK-2026-041732</span>
      <span>Invoice INV-2026-001 submitted successfully</span>
    </div>
  </>;
}

function FbrTrackingHistory() {
  return <div className="mock-table">
    <div className="mock-table-head"><span>Tracking #</span><span>Customer</span><span>Amount</span><span>Status</span></div>
    <div className="mock-table-row"><span>FBR-TRK-2026-041732</span><span>Demo Business</span><span>Rs 59,500</span><ExtPill status="Submitted" /></div>
    <div className="mock-table-row"><span>FBR-TRK-2026-041698</span><span>Lahore Demo Store</span><span>Rs 21,420</span><ExtPill status="Validating" /></div>
    <div className="mock-table-row"><span>FBR-TRK-2026-041655</span><span>Sample Customer</span><span>Rs 31,830</span><ExtPill status="Failed" /></div>
  </div>;
}

function FbrPdfPreview() {
  return <div className="mock-document">
    <div className="fbr-invoice-page">
      <div className="row"><strong>INVOICE</strong><span>INV-2026-001</span></div>
      <span className="line short" />
      <span className="line" />
      <span className="line" />
      <div className="row"><span className="line short" /><span className="line short" /></div>
      <div className="row total"><span>Total</span><span>Rs 59,500</span></div>
    </div>
    <span className="mock-btn" />
  </div>;
}

function FbrMobile() {
  return <div className="om-mobile">
    <div className="om-mobile-header"><strong>FBR Digital</strong><span>Invoicing</span></div>
    <div className="mock-dropzone"><Icon name="layers" /><span>Upload Excel file</span></div>
    <div className="fbr-stat-chips">
      <div className="fbr-chip"><span>Total</span><strong>128</strong></div>
      <div className="fbr-chip"><span>Valid</span><strong>96</strong></div>
      <div className="fbr-chip"><span>Errors</span><strong>6</strong></div>
    </div>
    <span className="mock-btn" style={{ width: "100%" }} />
    <div className="fbr-tracking-card">
      <Icon name="check" />
      <span className="fbr-tracking-num">FBR-TRK-2026-041732</span>
    </div>
    <div className="mock-workflow">
      {["Uploaded", "Validated", "Submitted", "Tracked"].map((step, i) => <div className="mock-workflow-step" key={step}><span className={`mock-workflow-dot ${i <= 2 ? "is-done" : ""}`} />{step}</div>)}
    </div>
  </div>;
}

/* ---------------- WaterFlow ---------------- */

function WfDashboard() {
  return <>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Today&apos;s Deliveries</span><strong>22</strong></div>
      <div className="mock-stat"><span>Pending Requests</span><strong>7</strong></div>
      <div className="mock-stat"><span>Completed</span><strong>15</strong></div>
    </div>
    <div className="mock-chart">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
    <p style={{ fontSize: 10, color: "#7686aa", marginTop: 10 }}>Service area: Lahore Demo Zone · 4 vehicles active</p>
  </>;
}

function WfRequestForm() {
  return <div className="mock-form">
    {["Customer Name", "Delivery Location", "Requested Date & Time", "Water Quantity / Type"].map(label => <span key={label} className="mock-field" title={label} />)}
    <span className="mock-btn" />
  </div>;
}

function WfSchedule() {
  return <div className="mock-calendar">{Array.from({ length: 14 }).map((_, i) => <span key={i} className={`mock-cal-cell ${[2, 5, 9, 11].includes(i) ? "is-booked" : ""}`} />)}</div>;
}

const wfSteps = ["New Request", "Confirmed", "Scheduled", "Assigned", "Out for Delivery", "Delivered"];

function WfStatusTimeline() {
  return <div className="wf-timeline">
    {wfSteps.map((step, i) => <div className="wf-timeline-step" key={step}>
      <span className={`wf-timeline-dot ${i < 4 ? "is-done" : i === 4 ? "is-current" : ""}`} />
      <span className="wf-timeline-label">{step}<span>Delivery #WF-1001 · Demo Business</span></span>
    </div>)}
  </div>;
}

function WfOperations() {
  return <div className="mock-table">
    <div className="mock-table-head"><span>Driver</span><span>Vehicle</span><span>Delivery</span><span>Status</span></div>
    <div className="mock-table-row"><span>Driver A</span><span>WF-VAN-01</span><span>#WF-1001</span><ExtPill status="Assigned" /></div>
    <div className="mock-table-row"><span>Driver B</span><span>WF-VAN-02</span><span>#WF-1002</span><ExtPill status="Out for Delivery" /></div>
    <div className="mock-table-row"><span>Driver C</span><span>WF-VAN-03</span><span>#WF-1003</span><ExtPill status="Delivered" /></div>
  </div>;
}

function WfReports() {
  return <div className="mock-report">
    <div className="mock-chart tall">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Avg. Response</span><strong>34m</strong></div>
      <div className="mock-stat"><span>Deliveries / Week</span><strong>146</strong></div>
    </div>
  </div>;
}

function WfMobile() {
  return <div className="om-mobile">
    <div className="om-mobile-header"><strong>WaterFlow</strong><span>Demo Business</span></div>
    <div className="mock-form" style={{ padding: 0, border: "none", background: "transparent" }}>
      <span className="mock-field" title="Requested date & time" />
      <span className="mock-field short" title="Lahore Demo Zone" />
    </div>
    <div className="wf-timeline">
      {wfSteps.slice(0, 5).map((step, i) => <div className="wf-timeline-step" key={step}>
        <span className={`wf-timeline-dot ${i < 4 ? "is-done" : "is-current"}`} />
        <span className="wf-timeline-label">{step}</span>
      </div>)}
    </div>
    <div className="om-btn-row"><span className="mock-btn" /><span className="mock-btn outline" /></div>
    <div className="om-recent-list">
      <div className="om-recent-item"><span>Delivery #WF-0998</span><ExtPill status="Delivered" /></div>
      <div className="om-recent-item"><span>Delivery #WF-0991</span><ExtPill status="Delivered" /></div>
    </div>
  </div>;
}

/* ---------------- OrderMate (continued) ---------------- */

function OmInvoice() {
  return <div className="mock-document">
    <div className="fbr-invoice-page">
      <div className="row"><strong>INVOICE</strong><span>OM-INV-1042</span></div>
      <div className="row"><span className="line short" /><span className="line short" /></div>
      <div className="om-invoice-lines">
        <div className="om-invoice-line"><span>Demo Widget A × 12</span><span>$1,020</span></div>
        <div className="om-invoice-line"><span>Demo Widget B × 4</span><span>$168</span></div>
        <div className="om-invoice-line"><span>Delivery</span><span>$52</span></div>
      </div>
      <div className="row total"><span>Total due</span><span>$1,240</span></div>
    </div>
    <div className="om-btn-row"><span className="mock-btn" /><span className="mock-btn outline" /></div>
  </div>;
}

function OmAccounting() {
  const rows = [
    { a: "Sales — Lahore Demo Store", b: "Revenue", c: "+$4,820", status: "Paid" },
    { a: "Supplier payment", b: "Expense", c: "−$1,960", status: "Completed" },
    { a: "Customer receipt #1041", b: "Revenue", c: "+$860", status: "Pending" },
  ];
  return <>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Receivables</span><strong>$12,430</strong></div>
      <div className="mock-stat"><span>Payables</span><strong>$5,120</strong></div>
      <div className="mock-stat"><span>Unreconciled</span><strong>3</strong></div>
    </div>
    <div className="mock-table">
      <div className="mock-table-head"><span>Entry</span><span>Type</span><span>Amount</span><span>Status</span></div>
      {rows.map(r => <div className="mock-table-row" key={r.a}><span>{r.a}</span><span>{r.b}</span><span>{r.c}</span><ExtPill status={r.status} /></div>)}
    </div>
  </>;
}

function OmReports() {
  return <div className="mock-report">
    <div className="mock-chart tall">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
    <div className="mock-stat-row">
      <div className="mock-stat"><span>Top product</span><strong>Widget A</strong></div>
      <div className="mock-stat"><span>Sales vs last week</span><strong>+14%</strong></div>
    </div>
  </div>;
}

/* ---------------- Shopify Solutions ---------------- */

const shopProducts = [
  { name: "Everyday Tote", price: "$48.00", tone: 0 },
  { name: "Linen Shirt", price: "$62.00", tone: 1 },
  { name: "Ceramic Mug", price: "$24.00", tone: 2 },
  { name: "Wool Throw", price: "$95.00", tone: 3 },
  { name: "Canvas Cap", price: "$32.00", tone: 4 },
  { name: "Leather Belt", price: "$58.00", tone: 5 },
];

function ShopThumb({ tone }: { tone: number }) {
  return <span className={`shop-thumb shop-tone-${tone % 6}`} aria-hidden="true">
    <svg viewBox="0 0 80 60" preserveAspectRatio="none">
      <rect width="80" height="60" fill="currentColor" opacity=".16" />
      <circle cx="26" cy="22" r="10" fill="currentColor" opacity=".38" />
      <path d="M4 56 L28 32 L48 50 L62 38 L78 56 Z" fill="currentColor" opacity=".3" />
    </svg>
  </span>;
}

function ShopStorefront() {
  return <div className="shop-store">
    <div className="shop-nav"><strong>DEMO&nbsp;STORE</strong><span>Shop</span><span>Collections</span><span>About</span><span className="shop-cart"><Icon name="layers" />2</span></div>
    <div className="shop-hero">
      <div className="shop-hero-copy"><strong>New season, in stock now</strong><span>Free delivery on orders over $75</span><span className="shop-cta">Shop the collection</span></div>
      <ShopThumb tone={1} />
    </div>
    <div className="shop-row-label"><span>Featured products</span><span className="shop-link">View all</span></div>
    <div className="shop-grid">{shopProducts.slice(0, 3).map(p => <div className="shop-card" key={p.name}>
      <ShopThumb tone={p.tone} /><span className="shop-name">{p.name}</span><span className="shop-price">{p.price}</span>
    </div>)}</div>
  </div>;
}

function ShopCollections() {
  return <div className="shop-store">
    <div className="shop-breadcrumb">Home / Collections / <strong>All products</strong></div>
    <div className="shop-filters"><span className="is-active">All</span><span>Apparel</span><span>Home</span><span>Accessories</span><span className="shop-sort">Sort: Featured</span></div>
    <div className="shop-grid shop-grid-6">{shopProducts.map(p => <div className="shop-card" key={p.name}>
      <ShopThumb tone={p.tone} /><span className="shop-name">{p.name}</span><span className="shop-price">{p.price}</span>
    </div>)}</div>
  </div>;
}

function ShopProductDetail() {
  return <div className="shop-store shop-pdp">
    <div className="shop-pdp-gallery">
      <ShopThumb tone={1} />
      <div className="shop-pdp-thumbs"><ShopThumb tone={1} /><ShopThumb tone={2} /><ShopThumb tone={3} /></div>
    </div>
    <div className="shop-pdp-info">
      <span className="shop-pdp-brand">Demo Store</span>
      <strong>Linen Shirt</strong>
      <span className="shop-price shop-price-lg">$62.00</span>
      <span className="shop-pdp-label">Size</span>
      <div className="shop-variants"><span className="is-active">S</span><span>M</span><span>L</span><span>XL</span></div>
      <span className="shop-pdp-label">Colour</span>
      <div className="shop-swatches"><span className="shop-tone-0 is-active" /><span className="shop-tone-2" /><span className="shop-tone-4" /></div>
      <span className="shop-buy">Add to cart</span>
      <span className="shop-note">In stock · Ships in 1–2 days</span>
    </div>
  </div>;
}

function ShopCheckout() {
  return <div className="shop-store">
    <div className="shop-checkout">
      <div className="shop-checkout-main">
        <span className="shop-pdp-label">Contact</span>
        <span className="mock-field" />
        <span className="shop-pdp-label">Delivery address</span>
        <span className="mock-field" />
        <div className="om-coords"><span className="mock-field" /><span className="mock-field" /></div>
        <span className="shop-pdp-label">Payment</span>
        <div className="shop-pay"><span className="is-active">Card</span><span>Cash on delivery</span></div>
        <span className="shop-buy">Pay now</span>
      </div>
      <div className="shop-summary">
        <span className="shop-pdp-label">Order summary</span>
        <div className="shop-summary-line"><span>Linen Shirt × 1</span><span>$62.00</span></div>
        <div className="shop-summary-line"><span>Ceramic Mug × 2</span><span>$48.00</span></div>
        <div className="shop-summary-line"><span>Shipping</span><span>Free</span></div>
        <div className="shop-summary-line shop-summary-total"><span>Total</span><span>$110.00</span></div>
      </div>
    </div>
  </div>;
}

function ShopMobile() {
  return <div className="om-mobile shop-store">
    <div className="shop-nav shop-nav-mobile"><span className="shop-burger" aria-hidden="true" /><strong>DEMO&nbsp;STORE</strong><span className="shop-cart"><Icon name="layers" />2</span></div>
    <div className="shop-hero shop-hero-mobile"><div className="shop-hero-copy"><strong>New season</strong><span className="shop-cta">Shop now</span></div></div>
    <div className="shop-grid shop-grid-mobile">{shopProducts.slice(0, 4).map(p => <div className="shop-card" key={p.name}>
      <ShopThumb tone={p.tone} /><span className="shop-name">{p.name}</span><span className="shop-price">{p.price}</span>
    </div>)}</div>
    <div className="om-bottomnav">
      <span className="om-bottomnav-item is-active"><Icon name="shopify" />Shop</span>
      <span className="om-bottomnav-item"><Icon name="layers" />Cart</span>
      <span className="om-bottomnav-item"><Icon name="custom" />Search</span>
    </div>
  </div>;
}

/* ---------------- registry ---------------- */

type Renderer = (ctx: Ctx) => React.ReactNode;

const registry: Record<string, Record<string, Renderer>> = {
  ordermate: {
    hero: ctx => ctx.device === "mobile" ? <OmMobile /> : <OmDashboard />,
    dashboard: ctx => ctx.device === "mobile" ? <OmMobile /> : <OmDashboard />,
    customers: () => <OmCustomers />,
    locations: ctx => ctx.device === "mobile" ? <OmMobile /> : <OmLocationForm />,
    inventory: () => <OmInventory />,
    products: () => <OmInventory />,
    orders: () => <OmOrders />,
    invoices: () => <OmInvoice />,
    accounting: () => <OmAccounting />,
    reports: () => <OmReports />,
  },
  "fbr-digital": {
    hero: ctx => ctx.device === "mobile" ? <FbrMobile /> : <FbrSubmissionTracking />,
    dashboard: ctx => ctx.device === "mobile" ? <FbrMobile /> : <FbrDashboard />,
    "invoice-form": () => <FbrInvoiceForm />,
    validation: () => <FbrValidationTable />,
    submission: ctx => ctx.device === "mobile" ? <FbrMobile /> : <FbrSubmissionTracking />,
    tracking: () => <FbrTrackingHistory />,
    pdf: () => <FbrPdfPreview />,
  },
  waterflow: {
    hero: ctx => ctx.device === "mobile" ? <WfMobile /> : <WfSchedule />,
    dashboard: ctx => ctx.device === "mobile" ? <WfMobile /> : <WfDashboard />,
    requests: () => <WfRequestForm />,
    schedule: () => <WfSchedule />,
    status: ctx => ctx.device === "mobile" ? <WfMobile /> : <WfStatusTimeline />,
    operations: () => <WfOperations />,
    reports: () => <WfReports />,
  },
  "shopify-solutions": {
    hero: ctx => ctx.device === "mobile" ? <ShopMobile /> : <ShopStorefront />,
    storefront: ctx => ctx.device === "mobile" ? <ShopMobile /> : <ShopStorefront />,
    collections: ctx => ctx.device === "mobile" ? <ShopMobile /> : <ShopCollections />,
    "product-detail": () => <ShopProductDetail />,
    "cart-checkout": () => <ShopCheckout />,
    mobile: () => <ShopMobile />,
  },
};

export function getBespokeScreen(productId: string | undefined, screenId: string, ctx: Ctx): React.ReactNode | null {
  if (!productId) return null;
  const fn = registry[productId]?.[screenId];
  return fn ? fn(ctx) : null;
}

export function productSidebarItems(productId: string | undefined): string[] {
  if (productId === "ordermate") return ["Dashboard", "Customers", "Locations", "Inventory", "Orders"];
  if (productId === "fbr-digital") return ["Dashboard", "Invoices", "Validation", "Submission", "Tracking"];
  if (productId === "waterflow") return ["Dashboard", "Requests", "Schedule", "Tracking", "Reports"];
  if (productId === "shopify-solutions") return ["Storefront", "Products", "Collections", "Orders", "Analytics"];
  return ["Dashboard", "Orders", "Customers", "Inventory", "Reports"];
}
