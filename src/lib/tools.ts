/**
 * Free tools registry — metadata only.
 *
 * This file intentionally contains NO calculation logic. It is the single
 * source of truth for what appears in the /tools directory, the same way
 * `products` / `services` in site.ts drive their own sections.
 *
 * Phase 1A: nothing is live yet, so no tool has a route. `slug` is stored for
 * display, anchors and future linking only — do not build an href from it
 * until the corresponding route actually exists.
 */

export const toolCategories = [
  "Business & Profit",
  "Tax & Invoice",
  "Creator Economy",
  "Affiliate & E-commerce",
] as const;

export type ToolCategory = (typeof toolCategories)[number];

/** "coming-first" = next tool we ship. No "live" status exists yet. */
export type ToolStatus = "coming-first" | "coming-soon";

export type Tool = {
  slug: string;
  name: string;
  shortDescription: string;
  category: ToolCategory;
  status: ToolStatus;
  featured: boolean;
  /** Key into the `Icon` registry in components/icons.tsx. */
  icon: string;
};

export const toolStatusLabels: Record<ToolStatus, string> = {
  "coming-first": "Coming First",
  "coming-soon": "Coming Soon",
};

export const tools: Tool[] = [
  {
    slug: "product-cost-profit-calculator",
    name: "Product Cost & Profit Calculator",
    shortDescription: "Calculate true product cost, gross profit, net profit, margin and ROI.",
    category: "Business & Profit",
    status: "coming-first",
    featured: true,
    icon: "calculator",
  },
  {
    slug: "pakistan-sales-tax-calculator",
    name: "Pakistan Sales Tax Calculator",
    shortDescription: "Work out sales tax on any amount, and split a gross figure back into net and tax.",
    category: "Tax & Invoice",
    status: "coming-soon",
    featured: false,
    icon: "tax",
  },
  {
    slug: "uae-vat-calculator",
    name: "UAE VAT Calculator",
    shortDescription: "Add or remove UAE VAT on an amount and see the net, VAT and gross figures.",
    category: "Tax & Invoice",
    status: "coming-soon",
    featured: false,
    icon: "percent",
  },
  {
    slug: "tiktok-money-calculator",
    name: "TikTok Money Calculator",
    shortDescription: "Estimate creator earnings from views, engagement rate and typical rate ranges.",
    category: "Creator Economy",
    status: "coming-soon",
    featured: false,
    icon: "creator",
  },
  {
    slug: "affiliate-earnings-calculator",
    name: "Affiliate Earnings Calculator",
    shortDescription: "Estimate affiliate income from traffic, conversion rate, order value and commission.",
    category: "Affiliate & E-commerce",
    status: "coming-soon",
    featured: false,
    icon: "affiliate",
  },
];

/** Tools grouped by category, in the declared category order. Empty categories are dropped. */
export function toolsByCategory(): { category: ToolCategory; items: Tool[] }[] {
  return toolCategories
    .map(category => ({ category, items: tools.filter(tool => tool.category === category) }))
    .filter(group => group.items.length > 0);
}
