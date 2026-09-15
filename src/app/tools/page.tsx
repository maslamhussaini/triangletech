import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ToolCard } from "@/components/tool-card";
import { business, pageMetadata } from "@/lib/site";
import { tools, toolsByCategory, toolStatusLabels } from "@/lib/tools";

export const metadata = pageMetadata(
  "Free Business Calculators & Online Tools",
  "Free business calculators from TriangleTech — product cost and profit tools, sales tax and VAT calculators, and creator and e-commerce earnings tools.",
  "/tools"
);

const valueProps = [
  { title: "Free to use.", note: "Every calculator on this page is free to open and use." },
  { title: "No signup for basic calculators.", note: "Run the numbers without creating an account first." },
  { title: "Fast and practical.", note: "Enter what you know, get the figure you need, move on." },
  { title: "Built for real business decisions.", note: "Built from the same workflows our business software covers." },
];

export default function Tools() {
  const groups = toolsByCategory();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${business.url}/` },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${business.url}/tools` },
    ],
  };

  // No calculator route exists yet, so every item points at its in-page anchor
  // rather than a URL that would 404.
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Business Calculators & Online Tools",
    description: "Free business, tax, creator and e-commerce calculators from TriangleTech.",
    url: `${business.url}/tools`,
    isPartOf: { "@id": `${business.url}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      name: "TriangleTech free tools",
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        description: `${tool.shortDescription} (${toolStatusLabels[tool.status]})`,
        url: `${business.url}/tools#${tool.slug}`,
      })),
    },
  };

  return <>
    <ScrollReveal />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection).replace(/</g, "\\u003c") }} />

    <section className="tools-hero hero-indigo">
      <div className="container tools-hero-inner">
        <div className="tools-hero-copy">
          <span className="eyebrow-indigo">FREE BUSINESS TOOLS</span>
          <h1>Smarter Tools.<br /><span className="tools-hero-accent">Better Decisions.</span></h1>
          <p>Free calculators and practical business tools built to help entrepreneurs, sellers and creators make better decisions.</p>
          <div className="tools-hero-actions">
            <a className="button-indigo" href="#tool-directory">Explore Tools<Icon name="arrow" /></a>
            <RouteLink className="button-indigo-secondary on-dark" href="/products">TriangleTech Solutions</RouteLink>
          </div>
        </div>

        {/* CSS-only motif: a drifting indigo orb behind three static stat chips.
            No JS, no canvas, no images. Fully neutralised under reduced motion. */}
        <div className="tools-hero-visual" aria-hidden="true">
          <span className="tools-orb gradient-drift" />
          <div className="glass-panel on-dark tools-hero-panel">
            <span className="tools-chip"><span className="tools-chip-label">Cost</span><span className="tools-chip-bar" data-fill="w1" /></span>
            <span className="tools-chip"><span className="tools-chip-label">Margin</span><span className="tools-chip-bar" data-fill="w2" /></span>
            <span className="tools-chip"><span className="tools-chip-label">Profit</span><span className="tools-chip-bar" data-fill="w3" /></span>
          </div>
        </div>
      </div>
    </section>

    <div className="container tools-main" id="tool-directory">
      <p className="tools-section-note">Grouped by what you are trying to work out. Nothing here is live yet — each card shows where it stands.</p>

      {groups.map(group => (
        <section key={group.category} className="tools-group" aria-labelledby={`group-${slugify(group.category)}`}>
          <h2 id={`group-${slugify(group.category)}`} className="tools-group-title">{group.category}</h2>
          <div className="tools-grid">
            {group.items.map(tool => <ToolCard key={tool.slug} tool={tool} />)}
          </div>
        </section>
      ))}

      <section className="tools-values" aria-labelledby="tools-values-heading">
        <h2 id="tools-values-heading" className="tools-section-title">What to expect</h2>
        <ul className="tools-values-grid">
          {valueProps.map(item => (
            <li key={item.title} className="metric-card tools-value" data-reveal>
              <span className="tools-value-title">{item.title}</span>
              <span className="tools-value-note">{item.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tools-next" aria-labelledby="tools-next-heading">
        <div className="tools-next-inner">
          <div>
            <h2 id="tools-next-heading" className="tools-next-title">Need more than a calculator?</h2>
            <p>A calculator answers one question. OrderMate, FBR Digital, WaterFlow and our Shopify Solutions handle the sales, invoicing, delivery and store operations behind it.</p>
          </div>
          <div className="tools-next-actions">
            <RouteLink className="button-indigo-secondary" href="/products">See our products</RouteLink>
            <RouteLink className="button-indigo-secondary" href="/contact">Talk to us</RouteLink>
          </div>
        </div>
      </section>
    </div>
  </>;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
