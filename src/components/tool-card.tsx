import { Icon } from "./icons";
import { toolStatusLabels, type Tool } from "@/lib/tools";

/**
 * A single tool in the /tools directory.
 *
 * Phase 1A: no calculator route exists, so NO card links anywhere. The card is
 * a plain <article> — not an <a>, not a <button>, not tabbable — so keyboard
 * and screen-reader users are never handed a focus stop that does nothing.
 * Status is carried by visible text (the badge) as well as colour, and is
 * repeated in the article's aria-label for anyone skimming by landmark/list.
 */
export function ToolCard({ tool }: { tool: Tool }) {
  const featured = tool.status === "coming-first";
  const statusLabel = toolStatusLabels[tool.status];
  const availability = featured ? "coming first, not yet available" : "coming soon, not yet available";

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
