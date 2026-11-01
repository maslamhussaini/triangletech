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
  "Work & Time",
  "Landscaping & Construction",
  "Tax & Invoice",
  "Creator Economy",
  "Affiliate & E-commerce",
  "Image & Media",
] as const;

export type ToolCategory = (typeof toolCategories)[number];

/** "coming-first" = next tool we ship. "live" = available now. */
export type ToolStatus = "live" | "coming-first" | "coming-soon";

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
  live: "Available Now",
  "coming-first": "Coming First",
  "coming-soon": "Coming Soon",
};

export const tools: Tool[] = [
  {
    slug: "product-cost-profit-calculator",
    name: "Product Cost & Profit Calculator",
    shortDescription: "Calculate true product cost, gross profit, net profit, margin and ROI.",
    category: "Business & Profit",
    status: "live",
    featured: true,
    icon: "calculator",
  },
  {
    slug: "rental-property-investment-calculator",
    name: "Rental Property Investment Calculator",
    shortDescription: "Should you buy this rental property? Mortgage, revenue, NOI, cash flow, break-even occupancy and cash-on-cash for short-term rentals.",
    category: "Business & Profit",
    status: "live",
    featured: true,
    icon: "building",
  },
  {
    slug: "airbnb-booking-profit-calculator",
    name: "Airbnb Booking Profit Calculator",
    shortDescription: "What one Airbnb booking really contributes after platform and management fees, cleaning and supplies — per booking and per night.",
    category: "Business & Profit",
    status: "live",
    featured: true,
    icon: "wallet",
  },
  {
    slug: "time-card-calculator",
    name: "Work Hours & Time Card Calculator",
    shortDescription: "Build a weekly or biweekly timesheet with multiple sessions, overnight shifts, unpaid breaks, overtime estimates, CSV/XLSX import, and PDF/CSV export. No signup, nothing uploaded.",
    category: "Work & Time",
    status: "live",
    featured: true,
    icon: "clock",
  },
  {
    slug: "hours-to-decimal",
    name: "Hours to Decimal Converter",
    shortDescription: "Convert hours and minutes to decimal hours and back, with a conversion table. 30 minutes = 0.50 hours.",
    category: "Work & Time",
    status: "live",
    featured: false,
    icon: "clock",
  },
  {
    slug: "work-hours-calculator",
    name: "Work Hours Calculator",
    shortDescription: "How long is one shift? Duration, unpaid break, decimal hours, and explicit overnight support for a single shift.",
    category: "Work & Time",
    status: "live",
    featured: false,
    icon: "clock",
  },
  {
    slug: "gravel-calculator",
    name: "Gravel Calculator",
    shortDescription: "How much gravel for a path or driveway? Multiple areas and depths, cubic yards and weight from your supplier density, plus bagged and bulk costs. No signup, nothing uploaded.",
    category: "Landscaping & Construction",
    status: "live",
    featured: true,
    icon: "calculator",
  },
  {
    slug: "mulch-calculator",
    name: "Mulch Calculator",
    shortDescription: "How much mulch for your beds? Multiple beds and depths, cubic yards and liters, whole bags to buy, excess after bag rounding, and bulk-versus-bag costs.",
    category: "Landscaping & Construction",
    status: "live",
    featured: false,
    icon: "calculator",
  },
  {
    slug: "topsoil-calculator",
    name: "Topsoil Calculator",
    shortDescription: "How much topsoil or raised-bed fill? Rectangles, circles, or direct areas, bagged-versus-bulk quantities, and an optional settlement allowance.",
    category: "Landscaping & Construction",
    status: "live",
    featured: false,
    icon: "calculator",
  },
  {
    slug: "pakistan-sales-tax-calculator",
    name: "Pakistan Sales Tax Calculator",
    shortDescription: "Calculate Pakistan sales tax using HS/PCT codes. Supports standard rate, Third Schedule, and further tax.",
    category: "Tax & Invoice",
    status: "live",
    featured: true,
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
  {
    slug: "qr-code-generator",
    name: "Free QR Code Generator",
    shortDescription: "Create scannable QR codes for websites, Wi-Fi, email, phone, contacts and text. PNG and SVG downloads, no signup, nothing uploaded.",
    category: "Image & Media",
    status: "live",
    featured: true,
    icon: "qr",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor to Target KB",
    shortDescription: "Compress JPG, PNG or WebP images to a target size in KB, entirely in your browser. No uploads.",
    category: "Image & Media",
    status: "live",
    featured: true,
    icon: "image",
  },
];

/** Tools grouped by category, in the declared category order. Empty categories are dropped. */
export function toolsByCategory(): { category: ToolCategory; items: Tool[] }[] {
  return toolCategories
    .map(category => ({ category, items: tools.filter(tool => tool.category === category) }))
    .filter(group => group.items.length > 0);
}
