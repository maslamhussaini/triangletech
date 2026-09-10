import type { Metadata } from "next";

export const business = {
  name: "TriangleTech",
  legalName: "TriangleTech",
  shortName: "TriangleTech",
  url: "https://triangletech.co",
  phone: "+92 300 0000000",
  phoneHref: "tel:+923000000000",
  whatsapp: "https://wa.me/923000000000",
  email: "hello@triangletech.co",
  address: "Lahore, Pakistan — serving clients worldwide",
  logo: "/logo.svg",
} as const;

export const navigation = [
  { href: "/#products", label: "Products" },
  { href: "/#services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const stats = [
  { value: "20+", label: "Years of combined development experience" },
  { value: "3+", label: "Business products built and maintained" },
  { value: "Web · Mobile · Desktop", label: "Full-stack engineering expertise" },
  { value: "Long-Term", label: "Technical support and improvement" },
];

export const services = [
  { id: "custom-software", title: "Custom Business Software", short: "Software shaped around your workflow.", category: "Custom Development", description: "We design and build custom business software that fits the way your team actually works, instead of forcing your operations into a generic template.", icon: "custom", cta: "Learn more" },
  { id: "erp-accounting", title: "ERP and Accounting Systems", short: "Connected operations and finance.", category: "Business Systems", description: "From inventory to invoicing, we build ERP and accounting systems that keep sales, stock and financial records in one connected platform.", icon: "erp", cta: "Learn more" },
  { id: "web-apps", title: "Web Application Development", short: "Reliable platforms for the web.", category: "Web Development", description: "Modern, fast and maintainable web applications built with production-grade frameworks and clean architecture.", icon: "web", cta: "Learn more" },
  { id: "mobile-apps", title: "Mobile App Development", short: "iOS and Android from one codebase.", category: "Mobile Development", description: "Cross-platform mobile applications that give your customers and staff a fast, native-feeling experience on any device.", icon: "mobile", cta: "Learn more" },
  { id: "shopify-ecommerce", title: "Shopify and Ecommerce Stores", short: "Stores built to convert.", category: "Ecommerce", description: "Professional Shopify storefronts and ecommerce websites, designed for mobile-first browsing and a smooth checkout experience.", icon: "shopify", cta: "Learn more" },
  { id: "fbr-invoicing", title: "FBR Digital Invoicing", short: "Structured, compliant invoicing.", category: "Digital Invoicing", description: "Digital invoicing workflows built around FBR's structured submission requirements, from Excel upload to validation and tracking.", icon: "invoice", cta: "Learn more" },
  { id: "database-backend", title: "Database and Backend Systems", short: "A solid foundation underneath.", category: "Backend Engineering", description: "Well-modelled databases and dependable backend services that keep your application accurate, fast and easy to extend.", icon: "database", cta: "Learn more" },
  { id: "ui-ux-design", title: "UI/UX and Product Design", short: "Interfaces people enjoy using.", category: "Product Design", description: "Clean, purposeful interface design that makes complex business tools genuinely simple for the people who use them daily.", icon: "design", cta: "Learn more" },
] as const;

export const products = [
  {
    id: "ordermate",
    name: "OrderMate",
    category: "Business Management System",
    accent: "cyan",
    description: "Manage sales, inventory, customers, orders and accounting workflows in one connected business platform.",
    features: ["Sales and orders", "Inventory management", "Customer management", "Accounting workflows", "Offline-capable architecture", "Role-based access"],
    cta: "Explore OrderMate",
  },
  {
    id: "fbr-digital",
    name: "FBR Digital",
    category: "Digital Invoicing Platform",
    accent: "blue",
    description: "Create, validate and submit digital sales invoices through a structured invoicing workflow.",
    features: ["Excel invoice upload", "Invoice validation", "FBR submission workflow", "Tracking number management", "Invoice history", "PDF invoice support"],
    cta: "Explore FBR Digital",
  },
  {
    id: "waterflow",
    name: "WaterFlow",
    category: "Water Supply Management",
    accent: "emerald",
    description: "A focused solution for managing water delivery requests, customers, vehicles and service operations.",
    features: ["Customer requests", "Delivery scheduling", "Order tracking", "Service operations", "Business reporting"],
    cta: "Explore WaterFlow",
  },
  {
    id: "shopify-solutions",
    name: "Shopify Solutions",
    category: "Ecommerce Storefronts",
    accent: "violet",
    description: "Professional Shopify stores and ecommerce websites, built to look premium and sell with confidence.",
    features: ["Store setup and theming", "Product collections", "Mobile-first layout", "Domain connection", "Payment and shipping guidance"],
    cta: "Explore Shopify Solutions",
  },
] as const;

export const whyUs = [
  { title: "Practical business-first thinking", description: "We start from how your business actually operates, then shape the software around that reality." },
  { title: "Strong database and backend foundation", description: "Every product we build sits on a well-modelled, dependable data layer, not a fragile shortcut." },
  { title: "Modern web and mobile technologies", description: "We work in current, well-supported frameworks so what we build stays maintainable for years." },
  { title: "Scalable architecture", description: "Systems are structured to grow with your business, from a single location to multiple branches." },
  { title: "Offline and real-world workflow awareness", description: "We design for real conditions — patchy connections, busy counters and staff who need speed over friction." },
  { title: "Long-term support and improvement", description: "We stay involved after launch, refining the product as your business and requirements evolve." },
];

export const processSteps = [
  { step: "01", title: "Understand", description: "We learn about your business, users and current problems." },
  { step: "02", title: "Plan", description: "We define the right features, workflow and technical direction." },
  { step: "03", title: "Build", description: "We design and develop the solution in focused milestones." },
  { step: "04", title: "Improve", description: "We test, launch and continue improving the product." },
];

export const caseStudies = [
  { id: "ordermate-platform", name: "OrderMate Business Management Platform", category: "Business Management System", problem: "A growing retail business needed to replace scattered spreadsheets and manual stock counts with one connected system.", solution: "We built a role-based platform covering sales, inventory, customers and accounting, with an offline-capable architecture for unreliable connections.", tags: ["Next.js", "PostgreSQL", "Supabase", "TypeScript"] },
  { id: "fbr-digital-platform", name: "FBR Digital Invoicing Platform", category: "Digital Invoicing Platform", problem: "A finance team needed a structured way to prepare, validate and submit digital sales invoices without manual re-entry.", solution: "We delivered an invoicing workflow with Excel upload, validation, tracking-number management and full invoice history.", tags: ["Next.js", "REST APIs", "PostgreSQL", "PDF Generation"] },
  { id: "waterflow-operations", name: "WaterFlow Delivery Operations", category: "Water Supply Management", problem: "A water delivery business needed to replace phone-based scheduling with a structured way to manage requests, vehicles and customers.", solution: "We built the WaterFlow platform to handle customer requests, delivery scheduling, order tracking and reporting in one connected system.", tags: ["Next.js", "TypeScript", "PostgreSQL"] },
  { id: "shopify-store-setup", name: "Shopify Ecommerce Store Setup", category: "Ecommerce", problem: "A retail brand wanted to move online quickly with a store that looked premium without a large design budget.", solution: "We configured a Shopify storefront with a customized theme, structured collections and a mobile-first product experience.", tags: ["Shopify", "Liquid", "Ecommerce UX"] },
];

export const shopifyOffer = {
  headline: "Launch a Store That Looks Professional and Sells With Confidence",
  description: "We set up and customize Shopify stores that feel premium from the homepage to checkout, so you can focus on running your business.",
  items: ["Shopify store setup", "Premium-looking free-theme customization", "Product collections", "Product detail pages", "Mobile-first layout", "Domain connection", "Payment and shipping guidance", "Ecommerce website design"],
  cta: "Get Your Shopify Store",
};

export const technologies = ["Flutter", "Dart", "Next.js", "React", "TypeScript", "C#", ".NET", "SQL Server", "PostgreSQL", "Supabase", "Shopify", "REST APIs"];

export const faqs = [
  { question: "What type of software do you build?", answer: "We build custom business software, ERP and accounting systems, web and mobile applications, ecommerce stores and digital invoicing platforms for growing businesses." },
  { question: "Can you build a custom ERP or business system?", answer: "Yes. We design ERP and accounting systems around your actual workflow, covering sales, inventory, customers and financial records in one connected platform." },
  { question: "Do you create Shopify stores?", answer: "Yes. We set up and customize Shopify stores, including theming, collections, product pages and a mobile-first layout, through our Shopify Solutions offering." },
  { question: "Can you connect a domain and deploy the website?", answer: "Yes. We handle domain connection, deployment and go-live for the websites and platforms we build." },
  { question: "Do you provide mobile applications?", answer: "Yes. We build cross-platform mobile applications for iOS and Android using modern frameworks like Flutter." },
  { question: "Can you improve an existing application?", answer: "Yes. We regularly take over, audit and improve existing applications, whether that means new features, performance work or a backend rebuild." },
  { question: "How does the project process work?", answer: "We follow a four-step process: Understand your business and problem, Plan the right features and technical direction, Build in focused milestones, then test, launch and continue to Improve the product." },
  { question: "Do you provide maintenance and support?", answer: "Yes. We offer long-term technical support and ongoing improvement after launch, rather than handing off a project and disappearing." },
];

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | TriangleTech`;
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName: business.name, locale: "en_US", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TriangleTech — Business Software and Digital Solutions" }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: ["/opengraph-image"] },
  };
}
