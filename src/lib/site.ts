import type { Metadata } from "next";

export const business = {
  name: "TriangleTech",
  legalName: "TriangleTech",
  shortName: "TriangleTech",
  url: "https://triangletech.co",
  email: "info.triangletech@gmail.com",
} as const;

export const navigation = [
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/websites-for-us-small-business", label: "US Websites" },
  { href: "/tools", label: "Tools" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const hero = {
  eyebrow: "CUSTOM SOFTWARE DEVELOPMENT · SAAS PRODUCTS · DIGITAL SOLUTIONS",
  headline: "Business Software That Works the Way You Work",
  supporting: "We build custom business software, mobile and desktop apps, and ecommerce stores for growing businesses — and professional websites with search and AI-search readiness for US small businesses.",
  primaryCta: "Request a Free Consultation",
  secondaryCta: "Explore Our Solutions",
  tertiaryCta: "See How It Works",
};

export const capabilities = [
  { title: "Software Built Around Your Business", description: "Custom applications designed around your actual workflow — sales, stock, invoicing, deliveries — instead of a generic template." },
  { title: "Business Operations & Automation", description: "Inventory, sales, invoicing and reporting connected in one system, with the repetitive steps automated." },
  { title: "Web, Mobile & Desktop Engineering", description: "Web apps, cross-platform mobile apps and desktop software, built and maintained by the same team." },
  { title: "Ongoing Support & Optimization", description: "Maintenance, fixes and improvements after launch, so the software keeps up as your business changes." },
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
  { id: "desktop-software", title: "Desktop Software Development", short: "Windows software for the office.", category: "Desktop Development", description: "Windows desktop applications for the work your team does at the desk — data entry, stock control, reporting and invoicing — built around the way your office actually works.", icon: "desktop" },
  { id: "legacy-modernization", title: "Legacy System Modernization", short: "Move off aging systems, safely.", category: "Modernization", description: "A planned route from the legacy system your business depends on to a modern one — assessed first, then moved in controlled steps, so the business never stops while the system changes.", icon: "refresh" },
  { id: "access-to-dotnet-migration", title: "Microsoft Access to .NET Migration", short: "From Access databases to modern .NET.", category: "Modernization", description: "Your Access databases and VBA logic, moved to a modern .NET and SQL Server system — same business rules, a database and interface that can grow with the business.", icon: "migrate" },
  { id: "business-process-automation", title: "Business Process Automation", short: "Less manual work, fewer mistakes.", category: "Automation", description: "The repetitive steps in your daily work — copying data between systems, chasing approvals, preparing reports — automated so your team spends its time on the work itself.", icon: "workflow" },
  { id: "technical-seo-audit", title: "Technical SEO and Website Audit", short: "Find what is holding your website back.", category: "SEO and Audits", description: "A written technical audit of your website — crawlability, indexing, titles, headings, links, mobile usability and page speed — with prioritised fixes.", icon: "trending" },
  { id: "aeo-geo-readiness", title: "AEO and GEO Readiness", short: "Help search and AI tools understand you.", category: "AI-Search Visibility", description: "Answer-ready content, clear service definitions and structured data that match the visible page, so search and AI tools represent your business accurately.", icon: "layers" },
  { id: "website-performance-conversion", title: "Website Performance and Conversion", short: "Faster pages, clearer next steps.", category: "Web Performance", description: "Measured performance and conversion work on your website — loading speed, mobile layout, navigation and contact paths — with before-and-after measurements.", icon: "clock" },
] as const;

/**
 * Service detail content, keyed by service id. Every service page renders
 * from this map: the problem it solves, what the work covers, the process
 * with what the client receives at each step, honest limitations, and the
 * questions buyers actually ask. No results, timelines or prices are
 * promised here — those are confirmed in writing before work begins.
 */
export type ServiceDetail = {
  problem: string;
  coverage: string[];
  process: { title: string; description: string; receives: string }[];
  limitations: string[];
  faqs: { question: string; answer: string }[];
};

export const serviceDetails: Record<string, ServiceDetail> = {
  "custom-software": {
    problem: "Off-the-shelf software forces your team to work around it: fields that don't match your process, reports that don't exist, and workarounds in spreadsheets that nobody trusts.",
    coverage: [
      "A system designed around your actual workflow, not a generic template",
      "Sales, inventory, customers, invoicing and reporting in one place",
      "Role-based access, so each person sees only their part of the business",
      "Web, mobile or desktop interfaces for the same records",
      "Data migration from your existing spreadsheets or system",
      "Documentation and training for your team",
    ],
    process: [
      { title: "Understand the workflow", description: "We map how a sale, a delivery or an invoice actually moves through your business, including the messy parts.", receives: "A written workflow map and a scope you can approve." },
      { title: "Design the system", description: "Screens and data structure are planned around the workflow, then reviewed with you before anything is built.", receives: "Screen designs and a data model for your sign-off." },
      { title: "Build in stages", description: "The system is built in working stages, so you can use and test each part as it arrives.", receives: "A working system at each stage, not a single big reveal." },
      { title: "Test with your data", description: "We test with your real records and the people who will use the system every day.", receives: "A tested system, with issues fixed before go-live." },
      { title: "Go live and support", description: "Launch, training, and ongoing support while your team settles in.", receives: "Training, documentation, and a support contact." },
    ],
    limitations: [
      "A custom system takes longer to build than buying off the shelf — it fits better, but it is not instant.",
      "If your process changes often, the system will need updates to match; we plan for that, but it is ongoing work.",
      "We build the software; we don't run your business operations for you.",
    ],
    faqs: [
      { question: "How long does a custom system take?", answer: "It depends on the scope. A focused system can take weeks; a full operations platform takes months. The scope and timeline are agreed in writing before we start, and the work is delivered in stages you can test." },
      { question: "Do we own the software?", answer: "Yes. The system is built for your business, and the code and data are yours. You are not locked into a subscription to keep using it." },
      { question: "Can you work with our existing data?", answer: "Yes. We migrate data from spreadsheets or your current system as part of the build, and we check the migrated data with you before go-live." },
      { question: "What happens after launch?", answer: "We provide support and ongoing improvements. Small fixes and adjustments are part of the support arrangement; larger changes are scoped as new work." },
    ],
  },
  "erp-accounting": {
    problem: "Sales in one place, stock in another, accounts in a third — and nobody can answer a simple question like what a customer owes, without checking three systems.",
    coverage: [
      "Sales, purchases, inventory and accounting in one connected platform",
      "Customer and supplier records with full history",
      "Invoicing tied directly to orders, with payment tracking",
      "Stock levels across locations, with low-stock warnings",
      "Reports for sales, margins, outstanding balances and cash flow",
      "Role-based access for staff, accounts and management",
    ],
    process: [
      { title: "Map the current process", description: "We document how orders, stock and money move through your business today.", receives: "A process map and a list of what the new system must handle." },
      { title: "Design the data model", description: "Products, customers, locations and accounts are structured so the numbers reconcile.", receives: "A data structure and screen plan for approval." },
      { title: "Build and migrate", description: "The system is built in stages, with your existing records migrated and checked.", receives: "Working modules and verified migrated data." },
      { title: "Reconcile before go-live", description: "Balances, stock counts and open invoices are checked against your current records.", receives: "A reconciliation report you sign off." },
      { title: "Launch and support", description: "Training for each role, then support while the team settles in.", receives: "Training and a support contact." },
    ],
    limitations: [
      "An ERP replaces several tools at once, so the changeover needs planning — it is not a one-day switch.",
      "Accurate reports depend on accurate data entry; the system can't fix records that were never entered.",
      "Tax and compliance rules are implemented as you define them; we don't provide tax advice.",
    ],
    faqs: [
      { question: "Is this a replacement for QuickBooks or similar tools?", answer: "It can be, for businesses whose operations the accounting tool doesn't cover — sales, stock and orders alongside the accounts. If your accounting tool already works well, we can also build around it instead of replacing it." },
      { question: "Can it handle multiple locations?", answer: "Yes. Stock, orders and reporting can be tracked per location, with a combined view across all of them." },
      { question: "Who owns the data?", answer: "You do. The system and its data belong to your business, and exports are available so you are never locked in." },
      { question: "What if our process is unusual?", answer: "That is the point of a custom system. We design around your process rather than asking you to change it to fit the software." },
    ],
  },
  "web-apps": {
    problem: "Your team runs on spreadsheets, email threads and tools that don't talk to each other — and the workarounds cost more time every month.",
    coverage: [
      "A web application your team opens in a browser — nothing to install",
      "Dashboards, forms, lists and reports built around your workflow",
      "User accounts with role-based access",
      "A database designed so the numbers stay consistent",
      "Integration with the tools you already use, where practical",
      "Hosting, deployment and ongoing maintenance",
    ],
    process: [
      { title: "Define the problem", description: "We work out what the application must do, and what it doesn't need to do.", receives: "A written scope with the features that matter." },
      { title: "Design the screens", description: "The interface is planned around the people who will use it daily.", receives: "Screen designs for your review." },
      { title: "Build in stages", description: "Working features arrive in stages, so you can test with real tasks.", receives: "A usable application at each stage." },
      { title: "Test and launch", description: "Testing with your data and your team, then deployment.", receives: "A live application, with training." },
      { title: "Maintain and improve", description: "Fixes, updates and improvements after launch.", receives: "Ongoing support and a plan for improvements." },
    ],
    limitations: [
      "A web app needs an internet connection to work — offline use is a separate design decision, not automatic.",
      "Very large data volumes or heavy real-time requirements may need a different architecture; we say so during scoping if that's the case.",
      "We build the application; content and data entry remain your team's work.",
    ],
    faqs: [
      { question: "Do our staff need to install anything?", answer: "No. A web application runs in the browser, on any device with internet access." },
      { question: "Can it work on phones too?", answer: "Yes. The interface is designed to work on desktop, tablet and phone, so field staff can use the same records." },
      { question: "What technology do you use?", answer: "Modern web frameworks — typically Next.js and React with a PostgreSQL or Supabase database — chosen for maintainability, so the system can be extended years from now." },
      { question: "Who owns the code?", answer: "You do. The application and its data are yours, and the code is handed over with documentation." },
    ],
  },
  "mobile-apps": {
    problem: "Your staff or customers are on their phones, but your business still runs on a desktop system they can't reach from the field.",
    coverage: [
      "One codebase for iOS and Android, so both platforms stay in step",
      "The same records as your web or desktop system — no double entry",
      "Offline-capable entry where the connection is unreliable",
      "Push notifications for orders, deliveries or approvals",
      "App store submission and updates",
      "Ongoing maintenance and new features",
    ],
    process: [
      { title: "Define the mobile job", description: "We work out what the app must do in the field — and what can stay on the desktop.", receives: "A scope focused on the mobile tasks that matter." },
      { title: "Design for the phone", description: "Screens are designed for one-handed use, small text entry and poor connectivity.", receives: "Phone-first screen designs." },
      { title: "Build and test on devices", description: "The app is built and tested on real phones, not just a simulator.", receives: "A working app on your own devices." },
      { title: "Publish to the stores", description: "App store listings, review and release.", receives: "A live app on the App Store and Google Play." },
      { title: "Maintain and update", description: "Updates for new OS versions, fixes and improvements.", receives: "Ongoing support and release notes." },
    ],
    limitations: [
      "App store review can delay a release by days; we plan for it, but we can't control it.",
      "A phone app is not a replacement for a full desktop system — it covers the tasks that happen away from the desk.",
      "Features that need constant connectivity won't work well offline; we design around that honestly.",
    ],
    faqs: [
      { question: "Do you build for iPhone and Android?", answer: "Yes. We build cross-platform apps with Flutter, so one codebase serves both, and updates reach both at once." },
      { question: "Will it work with our existing system?", answer: "Yes. A mobile app is usually built on the same backend and database as your web or desktop system, so the records stay in sync." },
      { question: "What does the app store process involve?", answer: "We prepare the listing, screenshots and descriptions, submit the app, and handle review feedback. Apple and Google review every submission, which can take a few days." },
      { question: "Who owns the app?", answer: "You do. The code, the app store listings and the data are yours." },
    ],
  },
  "shopify-ecommerce": {
    problem: "You want to sell online, but a template store looks like everyone else's — and the setup, payments and shipping details take longer than the selling.",
    coverage: [
      "A Shopify storefront set up from scratch — structure, navigation and settings",
      "A free theme customized to your brand, not left as the default",
      "Product collections and pages that answer buyer questions",
      "Mobile-first design, because most shoppers arrive on a phone",
      "Domain connection, payment gateway and shipping configuration",
      "Training so your team can add products and manage orders",
    ],
    process: [
      { title: "Plan the store", description: "Products, collections and the pages a buyer needs are mapped out.", receives: "A store plan with the structure agreed." },
      { title: "Set up and customize", description: "The store is built and the theme reworked to look built for your brand.", receives: "A working store you can preview." },
      { title: "Add products", description: "Products, pricing, images and shipping details are loaded and checked.", receives: "A store ready to take orders." },
      { title: "Test the purchase", description: "The full checkout is tested — cart, payment, confirmation — before launch.", receives: "A tested checkout, with any issues fixed." },
      { title: "Launch and hand over", description: "Go-live, then training so your team can run the store.", receives: "A live store and a handover session." },
    ],
    limitations: [
      "Shopify charges its own monthly plan and transaction fees — those are Shopify's, not ours, and we show them before you commit.",
      "A customized free theme looks built for your brand, but it is not a fully bespoke design; a custom theme is a separate, larger project.",
      "We set up the store; product photography and copy are yours unless we agree otherwise.",
    ],
    faqs: [
      { question: "How much does Shopify itself cost?", answer: "Shopify charges a monthly plan plus payment processing fees. We show you the current Shopify pricing before you commit, so there are no surprises." },
      { question: "Can you migrate an existing store?", answer: "Yes. We can move products, customers and orders from another platform to Shopify, and we check the migrated data with you." },
      { question: "Do you write the product descriptions?", answer: "Usually no — you know your products best. We structure the pages and show you where the copy goes; writing copy can be arranged as separate work." },
      { question: "What happens after launch?", answer: "We train your team to add products and manage orders, and we stay available for fixes and improvements." },
    ],
  },
  "fbr-invoicing": {
    problem: "Sales tax invoices need every field right before submission — and preparing them by hand, invoice by invoice, is slow and error-prone.",
    coverage: [
      "Excel upload for a whole batch of invoices at once",
      "Field-by-field validation before anything is submitted",
      "A structured submission workflow, the same steps every time",
      "Tracking numbers for every submitted invoice, with history",
      "PDF copies of submitted invoices for clients and auditors",
      "A record of what was submitted and when",
    ],
    process: [
      { title: "Understand your invoicing", description: "We work out what your invoices contain — items, taxes, buyers — and what FBR expects.", receives: "A written mapping of your invoice data to the submission format." },
      { title: "Build the workflow", description: "Upload, validation, submission and tracking are built as one flow.", receives: "A working invoicing flow to test." },
      { title: "Test with your invoices", description: "Your real invoice data is run through validation and checked with your team.", receives: "Validation results on your own data." },
      { title: "Go live", description: "Your team is trained on the workflow, and the first live submissions are checked.", receives: "Training and a supported first submission." },
      { title: "Support and updates", description: "FBR requirements change; the workflow is updated to match.", receives: "Ongoing support and updates when the rules change." },
    ],
    limitations: [
      "FBR's own portal and rules are outside our control — if FBR changes a requirement, the workflow is updated, but submissions follow FBR's process.",
      "Validation catches format and field errors; it can't verify that a buyer or tax figure is commercially correct — that's your team's check.",
      "We build the invoicing workflow; we don't provide tax advice.",
    ],
    faqs: [
      { question: "Is this an official FBR product?", answer: "No. FBR Digital is TriangleTech's own invoicing platform, built around FBR's structured submission requirements. It is not owned or endorsed by FBR." },
      { question: "Can we upload invoices from Excel?", answer: "Yes. A batch of invoices can be uploaded from a spreadsheet, validated row by row, and then submitted — instead of keying each invoice in by hand." },
      { question: "What happens if a field is wrong?", answer: "Validation flags the row before submission, so you fix it in the sheet and re-upload. Nothing is submitted with known errors." },
      { question: "Can we look up an old invoice?", answer: "Yes. Every submitted invoice keeps its tracking number and history, searchable by reference." },
    ],
  },
  "database-backend": {
    problem: "Your application is slow, the numbers don't reconcile, or every change takes weeks because the data underneath was never properly designed.",
    coverage: [
      "A data model designed around your business, not around one screen",
      "PostgreSQL or SQL Server, chosen for the job",
      "APIs that your web, mobile and desktop apps share",
      "Backups and recovery planned from the start",
      "Performance work on slow queries and reports",
      "Documentation of the data structure for your team",
    ],
    process: [
      { title: "Audit the current data", description: "We look at the existing database — or spreadsheets — and find where it breaks.", receives: "A written audit of the data problems." },
      { title: "Design the model", description: "Tables, relationships and rules are planned so the numbers reconcile.", receives: "A data model for your review." },
      { title: "Build and migrate", description: "The database is built and your data moved, then checked against the old system.", receives: "A working database with verified data." },
      { title: "Connect the applications", description: "APIs are built so your apps read and write the same records.", receives: "Working APIs with documentation." },
      { title: "Monitor and maintain", description: "Backups, performance checks and fixes after launch.", receives: "A maintained database with a backup routine." },
    ],
    limitations: [
      "A good data model can't fix data that was never recorded — migration can only carry over what exists.",
      "Some legacy systems can't be connected cleanly; we say so during the audit if that's the case.",
      "Database work is invisible by nature — the benefit shows up as fewer errors and faster screens, not as a new feature.",
    ],
    faqs: [
      { question: "Do we need to change our applications too?", answer: "Not always. If the applications are sound, we can rebuild the database and APIs underneath them. If the applications are part of the problem, we say so in the audit." },
      { question: "Which database do you use?", answer: "Usually PostgreSQL or SQL Server, depending on the project. The choice is made for maintainability and for what your team already knows." },
      { question: "What about backups?", answer: "Backups and a recovery plan are part of the work from the start — not added later." },
      { question: "Can you fix a slow system without rebuilding it?", answer: "Sometimes. A performance audit often finds a few queries or missing indexes doing most of the damage. If a rebuild is genuinely needed, the audit says why." },
    ],
  },
  "ui-ux-design": {
    problem: "Your software works, but your team avoids using it — too many clicks, unclear labels, and screens that only make sense to the person who built them.",
    coverage: [
      "A review of how your team actually uses the software today",
      "Screen designs that cut steps and make the next action obvious",
      "A consistent layout, labels and patterns across the whole system",
      "Mobile and desktop versions of the same screens",
      "Designs your developers can build from directly",
      "Testing with the people who will use the screens daily",
    ],
    process: [
      { title: "Watch the work", description: "We see how your team uses the software today — where they hesitate, where they work around it.", receives: "A list of the real usability problems." },
      { title: "Redesign the screens", description: "Screens are redesigned around the task, not around the database.", receives: "Screen designs for your review." },
      { title: "Test with users", description: "The people who do the work try the new screens before anything is built.", receives: "Tested designs, with feedback applied." },
      { title: "Hand over to build", description: "Designs are handed over with the detail developers need.", receives: "Build-ready designs and a style guide." },
      { title: "Check after launch", description: "Usage is checked after launch and the rough edges fixed.", receives: "A post-launch review and fixes." },
    ],
    limitations: [
      "Design improves how a system feels to use; it doesn't fix broken data or a missing feature — those are separate work.",
      "A redesign can change habits your team is used to; training and a settling-in period are part of the plan.",
      "We design the interface; branding and marketing design are separate work.",
    ],
    faqs: [
      { question: "Can you redesign just part of the system?", answer: "Yes. The screens your team uses most are usually the right place to start, and the rest can follow." },
      { question: "Do you build the designs too?", answer: "Yes — we are a development team, so the designs are built by the same people who designed them. If you have your own developers, we hand over build-ready designs instead." },
      { question: "How do you know the new design is better?", answer: "We test it with the people who do the work, before building, and check usage after launch. If a screen is slower in practice, we change it." },
      { question: "What do we receive?", answer: "Screen designs, a style guide for consistency, and the built screens if we are doing the development." },
    ],
  },
  "desktop-software": {
    problem: "Your office work runs on a mix of spreadsheets, an old desktop program nobody maintains, and paper — and the person who knows how it all fits together is one resignation away from taking it with them.",
    coverage: [
      "Windows desktop applications for data entry, stock control, reporting and invoicing",
      "A shared database, so every workstation sees the same records",
      "Printing, barcode and label support where the office needs it",
      "User accounts with role-based access",
      "Migration from spreadsheets or the old desktop program",
      "Installation, training and ongoing support",
    ],
    process: [
      { title: "Map the office work", description: "We document what happens at the desk — who enters what, what gets printed, what gets reported.", receives: "A workflow map and a scope you can approve." },
      { title: "Design the application", description: "Screens and data are planned around the office tasks.", receives: "Screen designs and a data model." },
      { title: "Build in stages", description: "Working features arrive in stages for your team to test.", receives: "A usable application at each stage." },
      { title: "Migrate and test", description: "Your existing data is moved and checked with your team.", receives: "Verified data in the new system." },
      { title: "Install and support", description: "Installation on your workstations, training, and support.", receives: "A running system and a support contact." },
    ],
    limitations: [
      "A desktop application runs on the machines it's installed on — remote or field use needs a web or mobile version, which is separate work.",
      "Windows updates and hardware changes can affect any desktop program; we test against your actual machines.",
      "A desktop system is built for your office; it is not a public website or a customer portal.",
    ],
    faqs: [
      { question: "Why desktop instead of web?", answer: "For office work with heavy data entry, printing and barcode scanning, a desktop application is often faster and more reliable — and it can keep working through a patchy internet connection." },
      { question: "Can it share data with our web system?", answer: "Yes. A desktop application is usually built on the same database as your web or mobile system, so the records stay in sync." },
      { question: "What about our old desktop program?", answer: "We migrate the data from it where possible, and we check the migrated records with you before the old program is retired." },
      { question: "Who owns the software?", answer: "You do. The application and its data belong to your business." },
    ],
  },
  "legacy-modernization": {
    problem: "Your business runs on a system that works — but nobody can change it, the vendor is gone, and every new requirement becomes a workaround.",
    coverage: [
      "An assessment of the current system: what it does, what it depends on, what breaks",
      "A migration strategy with the business risk stated plainly",
      "The replacement built in stages, with the old system running alongside",
      "Data migration, checked record by record where it matters",
      "Testing against the old system's results before cutover",
      "A controlled cutover, with the old system kept as a fallback",
    ],
    process: [
      { title: "Assessment", description: "We study the current system — its data, its rules, its dependencies — and report what a move involves.", receives: "A written assessment with risks and options." },
      { title: "Migration strategy", description: "The route is planned: what moves first, what stays, how the business keeps running.", receives: "A migration plan you can approve." },
      { title: "Build in parallel", description: "The new system is built while the old one keeps running.", receives: "A working replacement, tested against the old system." },
      { title: "Test and compare", description: "The same tasks are run on both systems and the results compared.", receives: "A test report showing the new system matches." },
      { title: "Controlled cutover", description: "The switch happens in a planned window, with the old system available as a fallback.", receives: "A live system and a rollback plan." },
    ],
    limitations: [
      "Modernization is not a copy-paste — some old features exist because of old limitations, and rebuilding them exactly may not be the right call; we say so when we find them.",
      "The old system's data is only as good as it is; cleaning it up is part of the work, and it takes time.",
      "A full replacement is a multi-month project. If you need a quick fix instead, we say that too.",
    ],
    faqs: [
      { question: "Can we keep using the old system while the new one is built?", answer: "Yes — that is the point of the plan. The old system keeps running until the new one is tested and the cutover is agreed." },
      { question: "What if the old system has no documentation?", answer: "That is common. The assessment phase exists for exactly this: we study the system and its data, and document what it actually does." },
      { question: "Will the new system do everything the old one did?", answer: "The business functions, yes. Some old screens and quirks will change — usually for the better — and anything that can't be carried over is flagged in the plan, not discovered at cutover." },
      { question: "How do you handle the risk?", answer: "By testing the new system against the old one's results before cutover, and by keeping the old system as a fallback until the new one has proven itself." },
    ],
  },
  "access-to-dotnet-migration": {
    problem: "Your business runs on Access databases and VBA — and it's creaking: slow with more users, fragile when a file corrupts, and nobody wants to be the person who maintains it.",
    coverage: [
      "A full assessment of your Access databases, tables, queries, forms and VBA code",
      "A .NET and SQL Server system built around the same business rules",
      "Your data migrated to SQL Server, checked against the old database",
      "The screens and reports your team uses, rebuilt for the new system",
      "Multi-user access that doesn't slow down or corrupt",
      "Training and support while your team moves over",
    ],
    process: [
      { title: "Assessment", description: "We study every database, table, query, form and macro — and find the business rules hidden in the VBA.", receives: "A written assessment of what the migration involves." },
      { title: "Migration strategy", description: "The route is planned: which database moves first, what gets rebuilt, what gets retired.", receives: "A migration plan with the business risk stated plainly." },
      { title: "Build the new system", description: "The .NET application and SQL Server database are built around your rules.", receives: "A working system to test." },
      { title: "Migrate and compare", description: "Data is moved and the results compared with the Access system — reports, balances, totals.", receives: "A comparison report you sign off." },
      { title: "Controlled cutover", description: "The switch happens in a planned window, with Access kept as a fallback.", receives: "A live system and a rollback plan." },
    ],
    limitations: [
      "Access is flexible in ways a structured system isn't — some ad-hoc habits will change, and we flag them in the plan.",
      "Very large or heavily customized Access estates take months to migrate properly; we don't promise a quick lift-and-shift.",
      "The migration covers your Access system; other legacy tools it connects to are assessed separately.",
    ],
    faqs: [
      { question: "Will our data survive the move?", answer: "Yes. Data is migrated to SQL Server and checked against the Access database — record counts, balances and reports are compared before cutover." },
      { question: "Do our staff need to learn a new system?", answer: "The screens are rebuilt around the same tasks your team already does, so the work feels familiar. Training is part of the move." },
      { question: "Why .NET and SQL Server?", answer: "Because they handle multiple users, larger data and proper security where Access files struggle — and because they are the standard stack for this kind of business system, so the system can be maintained for years." },
      { question: "Can we keep using Access during the migration?", answer: "Yes. Access keeps running until the new system is tested and the cutover is agreed." },
    ],
  },
  "business-process-automation": {
    problem: "Your team spends hours copying data between systems, chasing approvals, and preparing the same reports by hand — work a computer should be doing.",
    coverage: [
      "A review of the repetitive steps in your daily work",
      "Automated data movement between the systems you already use",
      "Approval and notification flows that don't need chasing",
      "Reports generated on schedule, from the live data",
      "Validation that catches errors before they spread",
      "Monitoring, so a failed automation is noticed, not silent",
    ],
    process: [
      { title: "Find the repetitive work", description: "We watch how the work actually happens and list the steps worth automating.", receives: "A list of automation candidates, ranked by time saved." },
      { title: "Design the automation", description: "Each step is designed with its checks and failure handling.", receives: "A design for the first automation, agreed with you." },
      { title: "Build and test", description: "The automation is built and tested with your real data.", receives: "A working automation, tested before it runs live." },
      { title: "Run and watch", description: "It runs live with monitoring, so failures are noticed immediately.", receives: "A running automation with alerts on failure." },
      { title: "Extend", description: "The next steps on the list are automated the same way.", receives: "A growing set of automations, each tested." },
    ],
    limitations: [
      "Automation is only as good as the process it follows — if the process itself is broken, automating it just makes the mistakes faster. We fix the process first.",
      "Some steps need a human decision; those stay with a human, and the automation routes them properly.",
      "Automations that depend on a third-party system can break when that system changes; monitoring catches it, but it still needs fixing.",
    ],
    faqs: [
      { question: "What kind of work can be automated?", answer: "Copying data between systems, approvals, notifications, scheduled reports, and validation checks — the repetitive steps that follow a rule. Work that needs judgement stays with your team." },
      { question: "Do we need new software for this?", answer: "Usually not. Automation is usually built on the systems you already have, connecting them so the data moves itself." },
      { question: "What happens if an automation fails?", answer: "It alerts us, and the work falls back to the manual step until it's fixed — nothing is silently lost." },
      { question: "How do we know it's worth it?", answer: "The first automation is chosen for the time it saves, and the result is measured — hours saved per week — before we move to the next one." },
    ],
  },
  "technical-seo-audit": {
    problem: "Your website exists, but it doesn't bring in inquiries — and nobody can say whether the problem is the content, the structure, or something technical underneath.",
    coverage: [
      "A crawl of your site, the way a search engine sees it",
      "Indexing, titles, descriptions, headings and internal links",
      "Broken links, redirects and duplicate pages",
      "Mobile usability and page speed measurements",
      "Structured data checked against the visible content",
      "A written report with prioritised fixes, ordered by expected impact",
    ],
    process: [
      { title: "Crawl and measure", description: "Your site is crawled and measured — speed, mobile layout, indexing.", receives: "The raw findings, as measured." },
      { title: "Review the content", description: "Titles, descriptions, headings and internal links are checked page by page.", receives: "A page-by-page list of issues." },
      { title: "Prioritise the fixes", description: "Issues are ordered by the impact fixing them is expected to have.", receives: "A prioritised fix list you can act on." },
      { title: "Report and walkthrough", description: "The report is delivered with a walkthrough of the findings.", receives: "A written audit report and a walkthrough call." },
      { title: "Fix or hand over", description: "We can fix the issues, or your team can work from the report.", receives: "Fixed pages, or a report your team can use." },
    ],
    limitations: [
      "An audit finds what's wrong and how to fix it; it doesn't fix the site by itself — the fixes are separate work.",
      "Search results depend on many factors outside any audit — competitors, your content, your reputation. An audit improves your site; it doesn't guarantee rankings.",
      "Some fixes need your developer or your platform's cooperation; the report says which ones.",
    ],
    faqs: [
      { question: "Will an audit improve our rankings?", answer: "An audit finds and fixes the technical problems holding your site back, which is the foundation rankings are built on. Rankings themselves depend on content, competition and time — no audit can guarantee them." },
      { question: "How long does an audit take?", answer: "Usually one to two weeks for a small business site, depending on the number of pages. The timeline is agreed before we start." },
      { question: "What do we receive?", answer: "A written report with every issue found, prioritised by impact, and a walkthrough of the findings. If we do the fixes, you receive the fixed site too." },
      { question: "Is this only for US businesses?", answer: "No. The audit works for any business website, though our US website packages include it as part of the build." },
    ],
  },
  "aeo-geo-readiness": {
    problem: "People now ask AI assistants and AI overviews for recommendations — and your business either doesn't appear, or appears with wrong or incomplete information.",
    coverage: [
      "Answer-ready content: clear service definitions, genuine FAQs, accurate details",
      "Structured data that matches the visible page",
      "A check of how AI tools currently describe your business",
      "Content structure that AI assistants can understand and cite",
      "A written report on what to fix and in what order",
      "Follow-up checks after the changes are live",
    ],
    process: [
      { title: "Check the current picture", description: "We see how AI tools and search currently describe your business.", receives: "A baseline of how you're represented today." },
      { title: "Fix the content", description: "Service definitions, FAQs and business details are written clearly and accurately.", receives: "Revised content, reviewed with you." },
      { title: "Add structured data", description: "Schema markup is added that matches the visible page exactly.", receives: "Structured data that matches the content." },
      { title: "Verify the result", description: "After the changes, we check how the tools describe you again.", receives: "A before-and-after comparison." },
      { title: "Keep it current", description: "As your business changes, the content and data are updated.", receives: "A maintenance plan for the content." },
    ],
    limitations: [
      "No one can guarantee placement in ChatGPT, Google AI Overviews or any AI answer — those tools decide what to show. What we can do is make your business easy to understand and cite accurately.",
      "AI tools update their information on their own schedule; changes can take weeks to appear.",
      "Readiness work is about accuracy and structure, not about gaming the tools — and it only works with true information.",
    ],
    faqs: [
      { question: "What are AEO and GEO?", answer: "AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) mean structuring your content so AI assistants and AI overviews can understand your business and describe it correctly when someone asks." },
      { question: "Can you guarantee we'll appear in AI answers?", answer: "No — and anyone who guarantees that is selling something that doesn't exist. What we can do is make your business easy to understand and cite, with accurate details and structured data, which improves your chances of being represented accurately." },
      { question: "Is this the same as SEO?", answer: "Related, but different. SEO is about appearing in search results; AEO/GEO is about being understood and cited by AI tools. The two work together — good SEO foundations help both." },
      { question: "How do we know it's working?", answer: "We check how the AI tools describe your business before and after the work, and report the difference honestly — including where nothing changed." },
    ],
  },
  "website-performance-conversion": {
    problem: "Your website is slow, visitors leave before it loads, and the contact form gets fewer inquiries than the traffic should produce — but nobody knows which problem matters most.",
    coverage: [
      "Page speed measurements on desktop and mobile, before and after",
      "Image, font and code fixes that make pages load faster",
      "Mobile layout fixes — menus, forms, touch targets",
      "Clearer calls to action and contact paths",
      "Form and checkout checks for the steps where people drop off",
      "A before-and-after report on the pages changed",
    ],
    process: [
      { title: "Measure the baseline", description: "Speed, layout and conversion paths are measured as they are today.", receives: "Baseline measurements you can compare against." },
      { title: "Find the biggest wins", description: "The fixes are ordered by impact — the slow images, the broken menu, the form that loses people.", receives: "A prioritised fix list." },
      { title: "Fix and re-measure", description: "Fixes are applied and the same pages measured again.", receives: "Before-and-after measurements on every page changed." },
      { title: "Check the contact path", description: "The full path from landing to inquiry is tested on desktop and phone.", receives: "A tested contact path, with issues fixed." },
      { title: "Report the difference", description: "The results are reported honestly — what improved, by how much, and what didn't.", receives: "A written report with the measurements." },
    ],
    limitations: [
      "Performance work makes your site faster and easier to use; it doesn't create demand. If the traffic isn't there, the fix is marketing, not speed.",
      "Some speed limits come from the platform or hosting, not the site — we say so when we find them.",
      "Conversion depends on your offer and your market as much as on the site; we improve the site's part of it.",
    ],
    faqs: [
      { question: "How much faster will our site get?", answer: "It depends on what's slowing it down. We measure the baseline first, then report the before-and-after numbers honestly — including where the improvement was small." },
      { question: "Do you rebuild the whole site?", answer: "Usually not. Performance and conversion work is about fixing the existing site — images, layout, calls to action — not starting over. If a rebuild is genuinely the better call, we say so." },
      { question: "What do we receive?", answer: "A faster site, a tested contact path, and a written report with the before-and-after measurements." },
      { question: "Will this help our search rankings?", answer: "Page speed and mobile usability are ranking factors, so fixing them helps — but rankings also depend on content and competition. We report the speed improvement, not a ranking promise." },
    ],
  },
};

/**
 * Verified availability for the products in `products` (2026-11-03 audit).
 * "Demonstration Only" means a demo walkthrough is offered on request;
 * it is not an instant purchase, instant deployment or a runnable demo
 * link. Only Dynamic Inventory Count has a verified purchase route
 * (Odoo Apps) and real screenshots on its dedicated page.
 */
export const productAvailability: Record<string, { status: "Available" | "Demonstration Only"; note: string }> = {
  "ordermate": { status: "Demonstration Only", note: "Demo walkthrough on request. Its dedicated page shows a real dashboard screenshot; other visuals are illustrated walkthroughs." },
  "fbr-digital": { status: "Demonstration Only", note: "Demo walkthrough on request. Visuals on this page are illustrated walkthroughs, not live screenshots." },
  "waterflow": { status: "Demonstration Only", note: "Demo walkthrough on request. Visuals on this page are illustrated walkthroughs, not live screenshots." },
  "shopify-solutions": { status: "Demonstration Only", note: "Demo walkthrough on request. Visuals on this page are illustrated walkthroughs, not live screenshots." },
  "dynamic-inventory-count": { status: "Available", note: "Available on the Odoo Apps store ($39, Odoo 19). Its dedicated page shows real module screenshots." },
};

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
      { id: "dashboard", title: "Dashboard", does: "See today's sales, low-stock alerts and outstanding invoices at a glance.", benefit: "Today's sales, low stock and outstanding invoices in one place.", layout: "stats" },
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
    description: "Create, validate and submit digital invoices through a structured FBR-ready workflow — Excel upload, validation, tracking and PDF copies in one place.",
    coreFeature: "Create, validate and submit digital invoices.",
    audience: "For finance teams that prepare sales tax invoices and need every field right before submission.",
    features: ["Excel invoice upload", "Invoice validation", "FBR submission workflow", "Tracking number management", "Invoice history", "PDF invoice generation"],
    heroLayout: "workflow" as ScreenLayout,
    screens: [
      { id: "login", title: "Login", does: "Sign in securely to access your invoicing workspace.", benefit: "Keeps financial data restricted to authorized staff.", layout: "form" },
      { id: "invoice-form", title: "Invoice Form", does: "Enter or edit a single sales invoice manually.", benefit: "Covers one-off invoices without a full upload.", layout: "form" },
      { id: "excel-upload", title: "Excel Upload", does: "Upload a batch of invoices from an Excel sheet.", benefit: "Upload a batch of invoices at once instead of keying them in one at a time.", layout: "upload" },
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
    description: "Manage customer requests, deliveries, service operations and reporting from one place — dispatch, tracking and reporting for delivery businesses.",
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
  "Receipts, deliveries, internal transfers, returns": "Receipts, deliveries, internal transfers and returns all count toward activity for matching products and locations.",
  "Partial and backorder completed quantities": "Partial deliveries, receipts and backorder completions contribute their completed quantities as they occur.",
  "Native Odoo Physical Inventory integration": "Works directly with Odoo's existing Physical Inventory workflow — no replacement counting UI.",
  "Multi-company support": "Rules and counters are isolated per company via standard Odoo multi-company record rules.",
  "Dashboard": "A dedicated dashboard shows active rules, items due for count, trigger types, locations and top due items with clickable navigation.",
  "$39 price": "Available on the Odoo Apps store for $39, ready for Odoo 19.",
};

export const demoOptions =["OrderMate", "FBR Digital", "WaterFlow", "Shopify Solutions", "Dynamic Inventory Count", "Custom Software"];

export const trustPoints = [
  { title: "We start from your workflow, not a template", description: "Before a screen gets designed, we map how a sale, a delivery or an invoice actually moves through your business — including the messy parts." },
  { title: "Our own products, not resold software", description: "Our own products are designed, coded and maintained by us. When something needs to change, we change it — no vendor queue." },
  { title: "The same system at the counter and in the van", description: "Staff use the same records on a desktop, a tablet and a phone, so a delivery update in the field is visible in the office immediately." },
  { title: "Each person sees only their part of it", description: "Role-based access keeps pricing, accounting and customer records visible to the people who need them and no one else." },
  { title: "Built to keep working on a bad connection", description: "OrderMate is designed to keep accepting entries through patchy connectivity and sync once the connection returns." },
  { title: "We're still here after go-live", description: "Launch is the start. We fix issues, adjust screens and ship improvements as your operations change, rather than handing over and disappearing." },
];

export const howItWorks = [
  { step: "01", title: "Choose a Solution", description: "Tell us what you need — or use the product finder below." },
  { step: "02", title: "Request a Product Demo", description: "See the actual product walked through for your kind of business." },
  { step: "03", title: "See Your Workflow", description: "We map your sales, invoicing or delivery process onto the product." },
  { step: "04", title: "Start Your Project", description: "Begin with guided access or a scoped implementation project." },
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

export const caseStudies = [
  { id: "ordermate-platform", productId: "ordermate", name: "OrderMate Business Management Platform", category: "Business Management Platform", problem: "A growing retail business needed to replace scattered spreadsheets and manual stock counts with one connected system.", solution: "We built a role-based platform covering sales, inventory, customers and accounting, with an offline-capable architecture for unreliable connections.", tags: ["Next.js", "PostgreSQL", "Supabase", "TypeScript"] },
  { id: "fbr-digital-platform", productId: "fbr-digital", name: "FBR Digital Invoicing Platform", category: "Digital Invoicing Platform", problem: "A finance team needed a structured way to prepare, validate and submit digital sales invoices without manual re-entry.", solution: "We delivered an invoicing workflow with Excel upload, validation, tracking-number management and full invoice history.", tags: ["Next.js", "REST APIs", "PostgreSQL", "PDF Generation"] },
  { id: "waterflow-operations", productId: "waterflow", name: "WaterFlow Delivery Operations", category: "Delivery Operations Platform", problem: "A delivery business needed to replace phone-based scheduling with a structured way to manage requests, vehicles and customers.", solution: "We built the WaterFlow platform to handle customer requests, delivery scheduling, order tracking and reporting in one connected system.", tags: ["Next.js", "TypeScript", "PostgreSQL"] },
  { id: "shopify-store-setup", productId: "shopify-solutions", name: "Shopify Ecommerce Store Setup", category: "Ecommerce", problem: "A retail brand wanted to move online quickly with a store that looked premium without a large design budget.", solution: "We configured a Shopify storefront with a customized theme, structured collections and a mobile-first product experience.", tags: ["Shopify", "Liquid", "Ecommerce UX"] },
];

export const technologyGroups = [
  { label: "Web", items: ["Next.js", "React", "TypeScript"] },
  { label: "Mobile", items: ["Flutter", "Dart"] },
  { label: "Backend & data", items: ["C#", ".NET", "SQL Server", "PostgreSQL", "Supabase"] },
  { label: "Platforms", items: ["Shopify", "REST APIs"] },
];

export const faqs = [
  { question: "What type of software do you build?", answer: "We build custom business software, ERP and accounting systems, web and mobile applications, ecommerce stores and digital invoicing platforms for growing businesses." },
  { question: "Can you build a custom ERP or business system?", answer: "Yes. We design ERP and accounting systems around your actual workflow, covering sales, inventory, customers and financial records in one connected platform." },
  { question: "Do you create Shopify stores?", answer: "Yes. We set up and customize Shopify stores, including theming, collections, product pages and a mobile-first layout, through our Shopify Solutions offering." },
  { question: "Can you connect a domain and deploy the website?", answer: "Yes. We handle domain connection, deployment and go-live for the websites and platforms we build." },
  { question: "Do you provide mobile applications?", answer: "Yes. We build cross-platform mobile applications for iOS and Android using modern frameworks like Flutter." },
  { question: "Can you improve an existing application?", answer: "Yes. We regularly take over, audit and improve existing applications, whether that means new features, performance work or a backend rebuild." },
  { question: "How does the project process work?", answer: "Choose a solution, request a product demo, see your workflow mapped onto the product, then start with guided access or a scoped project. We stay involved for support and improvements after launch." },
  { question: "Do you provide maintenance and support?", answer: "Yes. We offer long-term technical support and ongoing improvement after launch." },
  { question: "Is a free trial available?", answer: "Access to OrderMate, FBR Digital and WaterFlow is provided after a demo and a short review, so we can set your workspace up correctly. Request a product demo for access." },
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
