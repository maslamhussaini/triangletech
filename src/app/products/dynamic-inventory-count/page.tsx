import { Metadata } from "next";
import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata(
  "Dynamic Inventory Count",
  "Activity-based cycle counting for Odoo 19. Count fast-moving inventory based on actual stock activity — not only fixed calendar schedules.",
  "/products/dynamic-inventory-count"
);

const odooAppsUrl = "https://apps.odoo.com/apps/modules/19.0/tt_dynamic_inventory_count/";

const screenshots = [
  { src: "/products/dynamic-inventory-count/08_dashboard_polished.png", alt: "Dynamic Inventory Count dashboard", title: "Activity-Based Inventory Counting Dashboard", sub: "See active rules, items due for count, trigger types, locations, and current activity at a glance." },
  { src: "/products/dynamic-inventory-count/01_dynamic_count_rules.png", alt: "Dynamic Count Rules list", title: "Flexible Activity-Based Count Rules", sub: "Configure movement-count or cumulative-quantity thresholds." },
  { src: "/products/dynamic-inventory-count/02_move_count_rule.png", alt: "Move Count rule form", title: "Count After Completed Movements", sub: "Request a physical count after a defined number of completed stock movements." },
  { src: "/products/dynamic-inventory-count/06_cumulative_quantity_rule.png", alt: "Cumulative Quantity rule form", title: "Count After Cumulative Stock Activity", sub: "Request a count after cumulative stock activity reaches the defined quantity threshold in the product's base UoM." },
  { src: "/products/dynamic-inventory-count/03_dynamic_counts_due.png", alt: "Dynamic Counts view showing counts due", title: "Know Exactly What Is Due", sub: "Product + Location counters clearly show why inventory is due for counting." },
  { src: "/products/dynamic-inventory-count/04_native_physical_inventory.png", alt: "Native Odoo Physical Inventory screen", title: "Works With Odoo Physical Inventory", sub: "Due inventory is surfaced through Odoo's native Physical Inventory workflow rather than a replacement reconciliation engine." },
  { src: "/products/dynamic-inventory-count/05_counter_reset.png", alt: "Dynamic Counts view after counter reset", title: "Automatic Counter Reset After Counting", sub: "Relevant activity counters reset after successful physical inventory reconciliation." },
];

const features = [
  { title: "Activity-Based Cycle Counting", desc: "Count inventory based on actual stock activity — receipts, deliveries, internal transfers and returns — instead of waiting for fixed calendar schedules." },
  { title: "Count After X Completed Movements", desc: "Request a physical count after a configurable number of completed stock movements for a product at a location." },
  { title: "Count After X Cumulative Quantity", desc: "Request a count after cumulative stock activity reaches a quantity threshold, normalized to the product's base unit of measure." },
  { title: "Product + Location Counters", desc: "Per-product and per-location counters accumulate automatically as matching stock moves complete." },
  { title: "Receipts, Deliveries, Transfers, Returns", desc: "Incoming receipts, customer deliveries, internal transfers and returns all contribute to activity counters." },
  { title: "Partial and Backorder Completions", desc: "Partial deliveries, receipts and backorder completions contribute their completed quantities as they occur." },
  { title: "Native Odoo Physical Inventory", desc: "Works directly with Odoo's existing Physical Inventory workflow — no replacement counting UI." },
  { title: "Multi-Company Support", desc: "Rules and counters are isolated per company via standard Odoo multi-company record rules." },
  { title: "Dashboard", desc: "A dedicated dashboard shows active rules, items due for count, trigger types, locations, and top due items with clickable navigation." },
  { title: "$39 Price", desc: "Available on the Odoo Apps store for $39, ready for Odoo 19." },
];

export default function DynamicInventoryCountPage() {
  return (
    <>
      <section className="section product-detail-hero accent-orange" style={{ background: "linear-gradient(160deg,#1a2634 0%,#0f1720 100%)" }}>
        <div className="container product-detail-grid">
          <div className="product-detail-copy">
            <RouteLink className="text-link back-link light-link" href="/products">← All products</RouteLink>
            <span className="eyebrow light">Odoo Inventory Module</span>
            <h1>Dynamic Inventory Count</h1>
            <p className="product-core-line">Count fast-moving inventory based on actual stock activity — not only fixed calendar schedules.</p>
            <p>Activity-based cycle counting for Odoo 19. Automatically identify Product + Location combinations that need physical counting based on completed movements or cumulative stock activity.</p>
            <div className="product-cta hero-actions" style={{ marginTop: 24 }}>
              <a className="button button-accent" href={odooAppsUrl} target="_blank" rel="noopener noreferrer">View on Odoo Apps — $39</a>
              <a className="button button-outline-dark" href={`/contact?interest=${encodeURIComponent("Dynamic Inventory Count")}`}>Book a Demo</a>
            </div>
          </div>
          <div className="product-detail-visual" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <img src="/odoo/banner.png" alt="Dynamic Inventory Count — Odoo marketplace banner" style={{ maxWidth: "100%", height: "auto", borderRadius: 12, border: "1px solid #2a3a5c" }} />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">WHAT IT DOES</span><h2>Count based on real stock movement, not just the calendar.</h2></div></div>
          <div className="feature-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">SCREENSHOTS</span><h2>Real product screenshots from the Odoo module.</h2><p className="section-lead">Actual dashboard and configuration screens from the published module.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {screenshots.map((shot, i) => (
              <figure key={i} style={{ margin: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
                <img src={shot.src} alt={shot.alt} style={{ width: "100%", display: "block", borderBottom: "1px solid var(--border)" }} />
                <figcaption style={{ padding: "14px 16px" }}>
                  <span style={{ fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: 4, fontSize: 14 }}>{shot.title}</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{shot.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--navy-2)", color: "#fff" }}>
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow" style={{ color: "var(--cyan)" }}>HOW IT WORKS</span><h2>From rule to count in a few steps.</h2></div></div>
          <ol className="process-grid process-grid-5">
            <li><span>01</span><h3>Define Rules</h3><p>Set count rules by product, category or location with a movement or quantity threshold.</p></li>
            <li><span>02</span><h3>Activity Accumulates</h3><p>As receipts, deliveries, transfers and returns complete, counters accumulate automatically.</p></li>
            <li><span>03</span><h3>Count Is Requested</h3><p>When a counter reaches its threshold, the product/location is flagged for a physical count.</p></li>
            <li><span>04</span><h3>Native Count</h3><p>Apply the count through Odoo&apos;s native Physical Inventory workflow.</p></li>
            <li><span>05</span><h3>Counter Resets</h3><p>After successful reconciliation, the counter resets and starts accumulating again.</p></li>
          </ol>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">SECURITY &amp; MULTI-COMPANY</span><h2>Built for multi-company Odoo environments.</h2></div></div>
          <div className="feature-grid">
            <div className="feature-card"><h3>Per-Company Isolation</h3><p>Rules and counters are isolated per company via standard Odoo multi-company record rules.</p></div>
            <div className="feature-card"><h3>Role-Based Access</h3><p>Inventory / User has read-only access to rules and counters. Inventory / Administrator has full CRUD access.</p></div>
            <div className="feature-card"><h3>Flexible Scoping</h3><p>Each rule can be scoped by product, product category (exact match) and/or location. Leave a scope field empty to match everything for that dimension.</p></div>
          </div>
        </div>
      </section>

      <section className="section contact-cta contact-cta-indigo">
        <div className="container cta-inner">
          <div><span className="eyebrow light">GET DYNAMIC INVENTORY COUNT</span><h2>Available now on the Odoo Apps store.</h2><p style={{ color: "#9fadc9", marginTop: 12 }}>$39 for Odoo 19. Includes dashboard, activity-based rules, and native Physical Inventory integration.</p></div>
          <div>
            <a className="button-indigo" href={odooAppsUrl} target="_blank" rel="noopener noreferrer">View on Odoo Apps <Icon name="arrow" /></a>
            <RouteLink className="cta-phone" href={`/contact?interest=${encodeURIComponent("Dynamic Inventory Count")}`}>Book a Demo</RouteLink>
          </div>
        </div>
      </section>
    </>
  );
}
