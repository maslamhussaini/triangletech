import type { Metadata } from "next";

export const business = {
  name: "TriangleTech",
  legalName: "TriangleTech",
  shortName: "TriangleTech",
  url: "https://triangletech.co",
  email: "info.triangletech@gmail.com",
  whatsappPrimary: "https://wa.me/923343355695",
  whatsappPrimaryLabel: "+92 334 3355695",
  whatsappSecondary: "https://wa.me/923133355695",
  whatsappSecondaryLabel: "+92 313 3355695",
} as const;

export const navigation = [
  { href: "/#products", label: "Products" },
  { href: "/#demos", label: "Demos" },
  { href: "/tools", label: "Tools" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const hero = {
  eyebrow: "EXPLORE OUR SOFTWARE · SEE HOW IT WORKS",
  headline: "Business Software That Works the Way You Work",
  supporting: "TriangleTech builds practical software for sales, inventory, digital invoicing, delivery operations and ecommerce.",
  primaryCta: "Book a Free Demo",
  secondaryCta: "Explore Our Products",
  tertiaryCta: "See How It Works",
};

export const stats = [
  { value: "4", label: "Products we build and maintain ourselves" },
  { value: "Sales · Invoicing · Delivery", label: "The operations our software covers" },
  { value: "Web · Mobile · Desktop", label: "Where your team can use it" },
  { value: "After launch", label: "We stay on for support and improvements" },
];

export type ScreenLayout = "stats" | "table" | "form" | "upload" | "workflow" | "grid" | "product" | "calendar" | "report" | "document";

export const services = [
  { id: "custom-software", title: "Custom Business Software", short: "Software shaped around your workflow.", category: "Custom Development", description: "We design and build custom business software that fits the way your team actually works, instead of forcing your operations into a generic template.", icon: "custom" },
  { id: "erp-accounting", title: "ERP and Accounting Systems", short: "Connected operations and finance.", category: "Business Systems", description: "From inventory to invoicing, we build ERP and accounting systems that keep sales, stock and financial records in one connected platform.", icon: "erp" },
  { id: "web-apps", title: "Web Application Development", short: "Reliable platforms for the web.", category: "Web Development", description: "Modern, fast and maintainable web applications built with production-grade frameworks and clean architecture.", icon: "web" },
  { id: "mobile-apps", title: "Mobile App Development", short: "iOS and Android from one codebase.", category: "Mobile Development", description: "Cross-platform mobile applications that give your customers and staff a fast, native-feeling experience on any device.", icon: "mobile" },
  { id: "shopify-ecommerce", title: "Shopify and Ecommerce Stores", short: "Stores built to convert.", category: "Ecommerce", description: "Professional Shopify storefronts and ecommerce websites, designed for mobile-first browsing and a smooth checkout experience.", icon: "shopify" },
  { id: "fbr-invoicing", title: "FBR Digital Invoicing", short: "Structured, compliant invoicing.", category: "Digital Invoicing", description: "Digital invoicing workflows built around FBR's structured submission requirements, from Excel upload to validation and tracking.", icon: "invoice" },
  { id: "database-backend", title: "Database and Backend Systems", short: "A solid foundation underneath.", category: "Backend Engineering", description: "Well-modelled databases and dependable backend services that keep your application accurate, fast and easy to extend.", icon: "database" },
  { id: "ui-ux-design", title: "UI/UX and Product Design", short: "Interfaces people enjoy using.", category: "Product Design", description: "Clean, purposeful interface design that makes complex business tools genuinely simple for the people who use them daily.", icon: "design" },
] as const;

export type ProductScreen = { id: string; title: string; does: string; benefit: string; layout: ScreenLayout };

export const products = [
  {
    id: "ordermate",
    name: "OrderMate",
    category: "Business Management Platform",
    accent: "cyan",
    description: "Manage sales, inventory, customers, orders and accounting workflows in one connected system.",
    coreFeature: "Location records and business operations.",
    audience: "For retail, wholesale and distribution businesses running on spreadsheets and paper registers.",
    features: ["Sales and orders", "Inventory management", "Customer management", "Business location records", "Accounting workflows", "Role-based access", "Offline-capable architecture"],
    heroLayout: "stats" as ScreenLayout,
    screens: [
      { id: "dashboard", title: "Dashboard", does: "See today's sales, low-stock alerts and outstanding invoices at a glance.", benefit: "One screen replaces five spreadsheets.", layout: "stats" },
      { id: "customers", title: "Customers", does: "Search, filter and open any customer's order and payment history.", benefit: "No more digging through registers for a balance.", layout: "table" },
      { id: "locations", title: "Location Records", does: "Capture and verify a business location on a map, with address and coordinates.", benefit: "Every delivery or visit goes to the right place, every time.", layout: "form" },
      { id: "products", title: "Products", does: "Manage your catalog, pricing and stock levels in one list.", benefit: "Keeps pricing consistent across every sale.", layout: "table" },
      { id: "orders", title: "Orders", does: "Create, edit and track orders from placement to fulfillment.", benefit: "Every order is traceable end to end.", layout: "table" },
      { id: "invoices", title: "Invoices", does: "Generate and send invoices tied directly to each order.", benefit: "Removes manual invoice re-typing.", layout: "document" },
      { id: "inventory", title: "Inventory", does: "Track stock across locations with low-stock warnings.", benefit: "Fewer stockouts and fewer overstocked shelves.", layout: "table" },
      { id: "accounting", title: "Accounting", does: "Reconcile sales, expenses and payments in one ledger view.", benefit: "Bookkeeping stays current, not a month behind.", layout: "report" },
      { id: "reports", title: "Reports", does: "View sales trends, top products and staff performance.", benefit: "Decisions based on real numbers, not guesses.", layout: "report" },
    ] as ProductScreen[],
    cta: "Explore OrderMate",
  },
  {
    id: "fbr-digital",
    name: "FBR Digital",
    category: "Digital Invoicing Platform",
    accent: "blue",
    description: "Create, validate and submit digital invoices through a structured FBR-ready workflow.",
    coreFeature: "Create, validate and submit digital invoices.",
    audience: "For finance teams that prepare sales tax invoices and need every field right before submission.",
    features: ["Excel invoice upload", "Invoice validation", "FBR submission workflow", "Tracking number management", "Invoice history", "PDF invoice generation"],
    heroLayout: "workflow" as ScreenLayout,
    screens: [
      { id: "login", title: "Login", does: "Sign in securely to access your invoicing workspace.", benefit: "Keeps financial data restricted to authorized staff.", layout: "form" },
      { id: "invoice-form", title: "Invoice Form", does: "Enter or edit a single sales invoice manually.", benefit: "Covers one-off invoices without a full upload.", layout: "form" },
      { id: "excel-upload", title: "Excel Upload", does: "Upload a batch of invoices from an Excel sheet.", benefit: "Turns a full day of data entry into minutes.", layout: "upload" },
      { id: "validation", title: "Validation", does: "Review each row for missing or incorrect fields before submission.", benefit: "Catches errors before they reach FBR.", layout: "table" },
      { id: "submission", title: "Submission", does: "Submit validated invoices through the structured workflow.", benefit: "A consistent, repeatable submission process.", layout: "workflow" },
      { id: "tracking", title: "Tracking History", does: "Look up any invoice by its tracking number and status.", benefit: "No more searching email threads for a submission.", layout: "table" },
      { id: "pdf", title: "PDF Download", does: "Download a formatted PDF copy of any submitted invoice.", benefit: "Ready to share with clients or auditors instantly.", layout: "document" },
    ] as ProductScreen[],
    cta: "Explore FBR Digital",
  },
  {
    id: "waterflow",
    name: "WaterFlow",
    category: "Delivery Operations Platform",
    accent: "emerald",
    description: "Manage customer requests, deliveries, service operations and reporting from one place.",
    coreFeature: "Manage delivery operations from request to completion.",
    audience: "For delivery and field-service businesses still dispatching by phone call and notebook.",
    features: ["Customer requests", "Delivery scheduling", "Service tracking", "Operations management", "Business reporting"],
    heroLayout: "calendar" as ScreenLayout,
    screens: [
      { id: "dashboard", title: "Dashboard", does: "See today's scheduled deliveries and open requests at a glance.", benefit: "Dispatch decisions in seconds, not phone calls.", layout: "stats" },
      { id: "requests", title: "Customer Request", does: "Log a new delivery request with location and requirement.", benefit: "Nothing gets missed between calls and drivers.", layout: "form" },
      { id: "schedule", title: "Schedule", does: "Plan and assign delivery slots across the day or week.", benefit: "Clear visibility into who is delivering what, when.", layout: "calendar" },
      { id: "status", title: "Delivery Status", does: "Track each delivery from assigned to completed.", benefit: "Customers get accurate status without a phone call.", layout: "workflow" },
      { id: "operations", title: "Operations", does: "Manage vehicles, service records and staff assignments.", benefit: "Keeps the operational side as organized as sales.", layout: "table" },
      { id: "reports", title: "Reports", does: "Review delivery volume, response time and service trends.", benefit: "Spot bottlenecks before they become complaints.", layout: "report" },
    ] as ProductScreen[],
    cta: "Explore WaterFlow",
  },
  {
    id: "shopify-solutions",
    name: "Shopify Solutions",
    category: "Ecommerce Setup and Development",
    accent: "violet",
    description: "Launch a professional online store with product collections, mobile-first design and conversion-focused shopping experiences.",
    coreFeature: "Launch and manage a professional online store.",
    audience: "For retailers moving online who want a store that looks built, not templated.",
    features: ["Shopify store setup", "Theme customization", "Product collections", "Mobile-first ecommerce design", "Domain connection", "Payment and shipping guidance"],
    heroLayout: "grid" as ScreenLayout,
    screens: [
      { id: "storefront", title: "Storefront", does: "A branded homepage showcasing featured products and collections.", benefit: "First impression that looks premium, not templated.", layout: "grid" },
      { id: "collections", title: "Collections", does: "Organize products into clear, browsable categories.", benefit: "Shoppers find what they want in fewer clicks.", layout: "grid" },
      { id: "product-detail", title: "Product Detail", does: "Show product images, pricing, variants and descriptions.", benefit: "Answers buyer questions before they have to ask.", layout: "product" },
      { id: "cart-checkout", title: "Cart & Checkout", does: "A streamlined cart and checkout flow with shipping and payment.", benefit: "Fewer abandoned carts at the final step.", layout: "form" },
      { id: "mobile", title: "Mobile View", does: "The full storefront adapted for phone-first shopping.", benefit: "Most shoppers arrive on mobile — this is built for them.", layout: "grid" },
    ] as ProductScreen[],
    cta: "Explore Shopify Solutions",
  },
  {
    id: "dynamic-inventory-count",
    name: "Dynamic Inventory Count",
    category: "Odoo Inventory Module",
    accent: "orange",
    description: "Count fast-moving inventory based on actual stock activity — not only fixed calendar schedules. Activity-based cycle counting for Odoo 19.",
    coreFeature: "Count based on actual stock movement and cumulative activity.",
    audience: "For Odoo inventory teams that need faster cycle counts for fast-moving stock without waiting for the next scheduled count.",
    features: ["Activity-Based Cycle Counting", "Count after X completed stock movements", "Count after X cumulative moved quantity", "Product + Location counters", "Receipts, deliveries, internal transfers, returns", "Partial and backorder completed quantities", "Native Odoo Physical Inventory integration", "Multi-company support", "Dashboard", "$39 price"],
    heroLayout: "stats" as ScreenLayout,
    screens: [
      { id: "dashboard", title: "Dashboard", does: "See active rules, items due for count, trigger types and locations at a glance.", benefit: "Stock managers can prioritize counts without digging through lists.", layout: "stats" },
      { id: "rules", title: "Dynamic Count Rules", does: "Configure activity-based count rules scoped by product, category or location.", benefit: "Flexible rules replace one-size-fits-all calendar schedules.", layout: "form" },
      { id: "move-count", title: "Move Count Rule", does: "Request a physical count after a defined number of completed stock movements.", benefit: "Fast-moving items get counted sooner, not later.", layout: "form" },
      { id: "cumulative-quantity", title: "Cumulative Quantity Rule", does: "Request a count after cumulative stock activity reaches a quantity threshold.", benefit: "High-volume items are caught by total activity, not just move count.", layout: "form" },
      { id: "counts-due", title: "Counts Due", does: "View product + location combinations flagged for counting with trigger details.", benefit: "Clear visibility into what needs counting and why.", layout: "table" },
      { id: "physical-inventory", title: "Native Physical Inventory", does: "Apply counts through Odoo's native Physical Inventory workflow.", benefit: "No replacement engine — works with the inventory process your team already knows.", layout: "workflow" },
      { id: "counter-reset", title: "Counter Reset", does: "Automatic counter reset after successful physical inventory reconciliation.", benefit: "Counters start fresh without manual cleanup.", layout: "stats" },
    ] as ProductScreen[],
    cta: "View on Odoo Apps",
  },
] as const;

/** One specific line per feature, so feature grids don't fall back to filler. */
export const featureNotes: Record<string, string> = {
  "Sales and orders": "Raise an order, edit it, and follow it through to fulfillment without re-typing it anywhere else.",
  "Inventory management": "Stock counts per location, with a low-stock warning before an item runs out rather than after.",
  "Customer management": "Every customer's orders, balances and payment history on one screen instead of a paper register.",
  "Business location records": "Save and verify each location on a map with its address and coordinates, so deliveries land in the right place.",
  "Accounting workflows": "Sales, expenses and payments reconciled in one ledger view, so the books stay current.",
  "Role-based access": "Staff see only what their role allows — pricing, accounting and customer data stay restricted.",
  "Offline-capable architecture": "Keeps accepting entries through a patchy connection and syncs once it's back.",
  "Excel invoice upload": "Upload a whole batch of invoices from a spreadsheet instead of keying them in one at a time.",
  "Invoice validation": "Every row is checked for missing or wrong fields — HS code, UOM, tax — before anything is submitted.",
  "FBR submission workflow": "Validated invoices move through the same repeatable submission steps every time.",
  "Tracking number management": "Each submitted invoice gets a tracking number you can look up later by reference.",
  "Invoice history": "A searchable record of what was submitted and when, instead of digging through email threads.",
  "PDF invoice generation": "Download a formatted PDF of any submitted invoice to send to a client or an auditor.",
  "Customer requests": "Log a delivery request with its location and requirement the moment the call comes in.",
  "Delivery scheduling": "Plan and assign delivery slots across a day or week so dispatch isn't guesswork.",
  "Service tracking": "Follow each delivery from assigned to completed, so status answers don't need a phone call.",
  "Operations management": "Vehicles, service records and driver assignments handled alongside the schedule.",
  "Business reporting": "Delivery volume, response time and service trends, so bottlenecks show up early.",
  "Shopify store setup": "The storefront configured from scratch — structure, navigation and initial settings.",
  "Theme customization": "A free Shopify theme reworked to look built for your brand rather than out of the box.",
  "Product collections": "Products grouped into clear, browsable categories so shoppers get there in fewer clicks.",
  "Mobile-first ecommerce design": "Designed for the phone first, because that's where most of your shoppers arrive.",
  "Domain connection": "Your own domain connected to the finished store as part of setup.",
  "Payment and shipping guidance": "Hands-on guidance configuring payment gateways and shipping options inside Shopify.",
  "Activity-Based Cycle Counting": "Count inventory based on actual stock activity — receipts, deliveries, transfers and returns — instead of waiting for fixed calendar schedules.",
  "Count after X completed stock movements": "Request a physical count after a configurable number of completed stock movements for a product at a location.",
  "Count after X cumulative moved quantity": "Request a count after cumulative stock activity reaches a quantity threshold, normalized to the product's base unit of measure.",
  "Product + Location counters": "Per-product and per-location counters accumulate automatically as matching stock moves complete.",
  "Receipts": "Incoming receipts contribute to activity counters for matching products and locations.",
  "Deliveries": "Customer deliveries contribute to activity counters for matching products and locations.",
  "Internal transfers": "Internal transfers contribute to activity counters for matching products and locations.",
  "Returns": "Returns contribute to activity counters for matching products and locations.",
  "Partial/backorder completed quantities": "Partial deliveries, receipts and backorder completions contribute their completed quantities as they occur.",
  "Native Odoo Physical Inventory integration": "Works directly with Odoo's existing Physical Inventory workflow — no replacement counting UI.",
  "Multi-company support": "Rules and counters are isolated per company via standard Odoo multi-company record rules.",
  "Dashboard": "A dedicated dashboard shows active rules, items due for count, trigger types, locations and top due items with clickable navigation.",
  "$39 price": "Available on the Odoo Apps store for $39, ready for Odoo 19.",
};

export const demoOptions =["OrderMate", "FBR Digital", "WaterFlow", "Shopify Solutions", "Custom Software"];

export const trustPoints = [
  { title: "We start from your workflow, not a template", description: "Before a screen gets designed, we map how a sale, a delivery or an invoice actually moves through your business — including the messy parts." },
  { title: "Our own products, not resold software", description: "OrderMate, FBR Digital and WaterFlow are designed, coded and maintained by us. When something needs to change, we change it — no vendor queue." },
  { title: "The same system at the counter and in the van", description: "Staff use the same records on a desktop, a tablet and a phone, so a delivery update in the field is visible in the office immediately." },
  { title: "Each person sees only their part of it", description: "Role-based access keeps pricing, accounting and customer records visible to the people who need them and no one else." },
  { title: "Built to keep working on a bad connection", description: "OrderMate is designed to keep accepting entries through patchy connectivity and sync once the connection returns." },
  { title: "We're still here after go-live", description: "Launch is the start. We fix issues, adjust screens and ship improvements as your operations change, rather than handing over and disappearing." },
];

export const howItWorks = [
  { step: "01", title: "Choose a Solution", description: "Tell us what you need — or use the product finder below." },
  { step: "02", title: "Book a Demo", description: "See the actual product walked through for your kind of business." },
  { step: "03", title: "See Your Workflow", description: "We map your sales, invoicing or delivery process onto the product." },
  { step: "04", title: "Start Your Trial or Project", description: "Begin with guided access or a scoped implementation project." },
  { step: "05", title: "Get Support and Improvements", description: "We stay involved, fixing issues and shipping improvements as you grow." },
];

export const finderQuestions = [
  {
    id: "type",
    question: "What type of business do you run?",
    options: [
      { label: "Retail, wholesale or a shop", weights: { ordermate: 2 } },
      { label: "A business that submits tax invoices", weights: { "fbr-digital": 2 } },
      { label: "Water or delivery-based service", weights: { waterflow: 2 } },
      { label: "I want to sell products online", weights: { "shopify-solutions": 2 } },
    ],
  },
  {
    id: "manage",
    question: "What do you need help managing most?",
    options: [
      { label: "Sales, stock and customers", weights: { ordermate: 2 } },
      { label: "Invoices and tax submissions", weights: { "fbr-digital": 2 } },
      { label: "Deliveries and field operations", weights: { waterflow: 2 } },
      { label: "An online storefront", weights: { "shopify-solutions": 2 } },
    ],
  },
  {
    id: "inventory",
    question: "Do you need inventory and sales management?",
    options: [
      { label: "Yes, that's a core need", weights: { ordermate: 2 } },
      { label: "Not really", weights: {} },
    ],
  },
  {
    id: "invoicing",
    question: "Do you need structured digital invoicing?",
    options: [
      { label: "Yes, we submit invoices regularly", weights: { "fbr-digital": 2 } },
      { label: "Not currently", weights: {} },
    ],
  },
  {
    id: "deliveries",
    question: "Do you manage deliveries or field operations?",
    options: [
      { label: "Yes, we schedule and dispatch deliveries", weights: { waterflow: 2 } },
      { label: "No", weights: {} },
    ],
  },
  {
    id: "store",
    question: "Do you need an online store?",
    options: [
      { label: "Yes, I want to sell online", weights: { "shopify-solutions": 2 } },
      { label: "No", weights: {} },
    ],
  },
] as const;

export const videos = [
  { id: "ordermate-walkthrough", title: "OrderMate Walkthrough", product: "OrderMate" },
  { id: "fbr-walkthrough", title: "FBR Digital Walkthrough", product: "FBR Digital" },
  { id: "waterflow-walkthrough", title: "WaterFlow Walkthrough", product: "WaterFlow" },
  { id: "shopify-walkthrough", title: "Shopify Store Setup Walkthrough", product: "Shopify Solutions" },
];

export const guides = [
  { id: "ordermate-guide", title: "OrderMate User Guide", product: "OrderMate" },
  { id: "fbr-guide", title: "FBR Digital User Guide", product: "FBR Digital" },
  { id: "waterflow-guide", title: "WaterFlow User Guide", product: "WaterFlow" },
  { id: "shopify-guide", title: "Shopify Store Setup Guide", product: "Shopify Solutions" },
];

export const caseStudies = [
  { id: "ordermate-platform", name: "OrderMate Business Management Platform", category: "Business Management Platform", problem: "A growing retail business needed to replace scattered spreadsheets and manual stock counts with one connected system.", solution: "We built a role-based platform covering sales, inventory, customers and accounting, with an offline-capable architecture for unreliable connections.", tags: ["Next.js", "PostgreSQL", "Supabase", "TypeScript"] },
  { id: "fbr-digital-platform", name: "FBR Digital Invoicing Platform", category: "Digital Invoicing Platform", problem: "A finance team needed a structured way to prepare, validate and submit digital sales invoices without manual re-entry.", solution: "We delivered an invoicing workflow with Excel upload, validation, tracking-number management and full invoice history.", tags: ["Next.js", "REST APIs", "PostgreSQL", "PDF Generation"] },
  { id: "waterflow-operations", name: "WaterFlow Delivery Operations", category: "Delivery Operations Platform", problem: "A delivery business needed to replace phone-based scheduling with a structured way to manage requests, vehicles and customers.", solution: "We built the WaterFlow platform to handle customer requests, delivery scheduling, order tracking and reporting in one connected system.", tags: ["Next.js", "TypeScript", "PostgreSQL"] },
  { id: "shopify-store-setup", name: "Shopify Ecommerce Store Setup", category: "Ecommerce", problem: "A retail brand wanted to move online quickly with a store that looked premium without a large design budget.", solution: "We configured a Shopify storefront with a customized theme, structured collections and a mobile-first product experience.", tags: ["Shopify", "Liquid", "Ecommerce UX"] },
];

export const technologies = ["Flutter", "Dart", "Next.js", "React", "TypeScript", "C#", ".NET", "SQL Server", "PostgreSQL", "Supabase", "Shopify", "REST APIs"];

export const faqs = [
  { question: "What type of software do you build?", answer: "We build custom business software, ERP and accounting systems, web and mobile applications, ecommerce stores and digital invoicing platforms for growing businesses." },
  { question: "Can you build a custom ERP or business system?", answer: "Yes. We design ERP and accounting systems around your actual workflow, covering sales, inventory, customers and financial records in one connected platform." },
  { question: "Do you create Shopify stores?", answer: "Yes. We set up and customize Shopify stores, including theming, collections, product pages and a mobile-first layout, through our Shopify Solutions offering." },
  { question: "Can you connect a domain and deploy the website?", answer: "Yes. We handle domain connection, deployment and go-live for the websites and platforms we build." },
  { question: "Do you provide mobile applications?", answer: "Yes. We build cross-platform mobile applications for iOS and Android using modern frameworks like Flutter." },
  { question: "Can you improve an existing application?", answer: "Yes. We regularly take over, audit and improve existing applications, whether that means new features, performance work or a backend rebuild." },
  { question: "How does the project process work?", answer: "Choose a solution, book a demo, see your workflow mapped onto the product, then start a trial or scoped project. We stay involved for support and improvements after launch." },
  { question: "Do you provide maintenance and support?", answer: "Yes. We offer long-term technical support and ongoing improvement after launch, rather than handing off a project and disappearing." },
  { question: "Is a free trial available?", answer: "Access to OrderMate, FBR Digital and WaterFlow is provided after a demo and a short review, so we can set your workspace up correctly. Book a demo to request access." },
];

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = path === "/" ? "TriangleTech | Business Software and Digital Solutions" : `${title} | TriangleTech`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName: business.name, locale: "en_US", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TriangleTech — Business Software and Digital Solutions" }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: ["/opengraph-image"] },
  };
}
