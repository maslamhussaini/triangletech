import { Icon } from "./icons";
import { toolStatusLabels, type Tool } from "@/lib/tools";

/**
 * A single tool in the /tools directory.
 *
 * Live tools link to their calculator page. Coming-first / coming-soon tools
 * remain non-interactive cards so keyboard and screen-reader users are never
 * handed a focus stop that does nothing.
 */
export function ToolCard({ tool }: { tool: Tool }) {
  const featured = tool.status === "coming-first";
  const live = tool.status === "live";
  const statusLabel = toolStatusLabels[tool.status];
  const availability = live ? "available now" : featured ? "coming first, not yet available" : "coming soon, not yet available";

  if (live) {
    return (
      <a href={`/tools/${tool.slug}`} className={`card-premium reveal-lift tool-card tool-card-featured is-brand`} data-reveal>
        <div className="tool-card-top">
          <span className="tool-card-icon" aria-hidden="true"><Icon name={tool.icon} /></span>
          <span className="tool-badge tool-badge-first">{statusLabel}</span>
        </div>
        <p className="tool-card-category">{tool.category}</p>
        <h3 className="tool-card-title">{tool.name}</h3>
        <p className="tool-card-description">{tool.shortDescription}</p>
      </a>
    );
  }

  return (
    <article
      id={tool.slug}
      className={`card-premium reveal-lift tool-card${featured ? " tool-card-featured is-brand" : ""}`}
      aria-label={`${tool.name} — ${availability}`}
      data-reveal
    >
      <div className="tool-card-top">
        <span className="tool-card-icon" aria-hidden="true"><Icon name={tool.icon} /></span>
        <span className={`tool-badge${featured ? " tool-badge-first" : ""}`}>{statusLabel}</span>
      </div>
      <p className="tool-card-category">{tool.category}</p>
      <h3 className="tool-card-title">{tool.name}</h3>
      <p className="tool-card-description">{tool.shortDescription}</p>
    </article>
  );
}
