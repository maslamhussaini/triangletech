export type ProductId = "ordermate" | "fbr-digital" | "waterflow" | "shopify-solutions" | "dynamic-inventory-count";

export type SuggestedQuestion = { question: string; answer: string };

export type ProductKnowledge = {
  id: ProductId;
  name: string;
  tagline: string;
  facts: string[];
  suggestedQuestions: SuggestedQuestion[];
};

export const productKnowledge: Record<ProductId, ProductKnowledge> = {
  ordermate: {
    id: "ordermate",
    name: "OrderMate",
    tagline: "Business management platform for sales, inventory, customers and accounting.",
    facts: [
      "OrderMate is a business management platform that connects sales, inventory, customers and accounting in one system.",
      "Sales and orders: create, edit and track orders from placement through to fulfillment, with invoices generated directly from each order.",
      "Inventory: track stock levels across locations with low-stock warnings, so items rarely run out unnoticed.",
      "Customers and business partners: search, filter and open any customer's or partner's order and payment history from one screen.",
      "Location records: manage multiple business locations, each with its own stock, orders and reporting, viewable individually or together.",
      "Accounting workflows: reconcile sales, expenses and payments in one ledger view, so bookkeeping stays current rather than a month behind.",
      "Role-based access: staff only see and do what their role allows, keeping sensitive data and actions restricted appropriately.",
      "Offline-capable architecture: designed to keep working through patchy or interrupted connections, syncing once back online.",
      "Reports: sales trends, top products and staff performance are available from a reports screen.",
      "To move forward with OrderMate, the next step is booking a free demo, where the actual product is walked through live for your kind of business.",
    ],
    suggestedQuestions: [
      { question: "What is OrderMate?", answer: "OrderMate is TriangleTech's business management platform. It connects sales and orders, inventory, customers, and accounting workflows in one system, so a business isn't running on spreadsheets or five disconnected tools." },
      { question: "How does location record management work?", answer: "OrderMate lets you manage multiple business locations, each with its own stock, orders and reporting. You can view a single location's activity or roll everything up together, which is useful once a business grows past one site." },
      { question: "Can I manage customers and business partners?", answer: "Yes. OrderMate includes customer and business-partner management — you can search, filter and open any customer's order and payment history from one screen instead of digging through registers." },
      { question: "Does it support inventory and sales?", answer: "Yes, that's the core of OrderMate. Sales and orders are tracked from placement to fulfillment, invoices generate directly from orders, and inventory is tracked across locations with low-stock warnings." },
      { question: "Can I book a demo?", answer: "Yes — the best next step is a free OrderMate demo, where the actual product is walked through live for your specific kind of business. Would you like to book one now?" },
    ],
  },
  "fbr-digital": {
    id: "fbr-digital",
    name: "FBR Digital",
    tagline: "Structured digital invoicing platform built around FBR's submission workflow.",
    facts: [
      "FBR Digital is a digital invoicing platform built around a structured, FBR-ready submission workflow.",
      "Excel upload: a batch of invoices can be uploaded from an Excel sheet at once, instead of entering each one manually.",
      "Invoice validation: every row is reviewed for missing or incorrect fields — including details like HS code and UOM (unit of measure) — before submission, catching errors before they reach FBR.",
      "Sales tax invoice: individual invoices can also be entered and edited manually through a structured invoice form, for one-off cases outside a batch upload.",
      "FBR submission workflow: validated invoices move through a consistent, repeatable submission process rather than ad hoc manual steps.",
      "Tracking number: every submitted invoice receives a tracking number, which can be looked up later to check its status.",
      "Invoice history: submitted invoices and their tracking numbers are kept in a searchable history rather than scattered across email threads.",
      "PDF invoice: a formatted PDF copy of any submitted invoice can be downloaded, ready to share with clients or auditors.",
      "FBR Digital is a structured workflow tool built by TriangleTech — it is not a government system, and TriangleTech is not affiliated with or endorsed by FBR.",
      "To move forward with FBR Digital, the next step is booking a free demo to see the actual upload-to-submission workflow live.",
    ],
    suggestedQuestions: [
      { question: "What is FBR Digital?", answer: "FBR Digital is TriangleTech's digital invoicing platform. It gives you a structured workflow — Excel upload, validation, submission and tracking — for preparing invoices ready for FBR's submission requirements. It's a workflow tool we built; it isn't a government system and TriangleTech isn't officially affiliated with or endorsed by FBR." },
      { question: "How does Excel invoice upload work?", answer: "You upload a batch of invoices from an Excel sheet in one go, instead of typing each one in manually. From there they move into the validation step before anything is submitted." },
      { question: "How is an invoice validated?", answer: "Every uploaded row is checked for missing or incorrect fields — including things like HS code and unit of measure (UOM) — so errors get caught before submission rather than after." },
      { question: "How does FBR submission work?", answer: "Once invoices pass validation, they move through a structured, repeatable submission workflow. Each submitted invoice gets a tracking number you can look up later." },
      { question: "What is a tracking number?", answer: "A tracking number is assigned to every invoice once it's submitted. You can search your invoice history by tracking number to check status at any time." },
      { question: "Can I book a demo?", answer: "Yes — a free FBR Digital demo walks through the real upload-to-submission workflow live, using an example batch. Want to set one up?" },
    ],
  },
  waterflow: {
    id: "waterflow",
    name: "WaterFlow",
    tagline: "Delivery operations platform for requests, scheduling, dispatch and reporting.",
    facts: [
      "WaterFlow is a delivery operations platform for managing customer requests, deliveries, service operations and reporting in one place.",
      "Customer requests: new delivery requests are logged with location and requirement details, so nothing gets missed between phone calls and drivers.",
      "Delivery scheduling: delivery slots are planned and assigned across a day or week, giving clear visibility into who is delivering what, and when.",
      "Driver and vehicle assignment: operations, including vehicles, service records and staff/driver assignments, are managed from one operations screen.",
      "Delivery tracking: each delivery is tracked from assigned through to completed, so customers get accurate status without needing a phone call.",
      "Completed service records: finished deliveries and service history are kept for reference and reporting.",
      "Operations dashboard: today's scheduled deliveries and open requests are visible at a glance, supporting faster dispatch decisions.",
      "Reports: delivery volume, response time and service trends are available to help spot bottlenecks before they become complaints.",
      "To move forward with WaterFlow, the next step is booking a free demo to see the actual request-to-delivery workflow live.",
    ],
    suggestedQuestions: [
      { question: "What is WaterFlow?", answer: "WaterFlow is TriangleTech's delivery operations platform. It manages customer requests, scheduling, dispatch, driver and vehicle assignment, and reporting — built for businesses running delivery or field-service operations." },
      { question: "How are delivery requests managed?", answer: "New requests are logged with location and requirement details as they come in, so nothing gets missed between phone calls, the schedule and the drivers on the road." },
      { question: "Can I schedule deliveries?", answer: "Yes. Delivery slots are planned and assigned across a day or week, giving clear visibility into who is delivering what, and when." },
      { question: "Can I assign drivers and vehicles?", answer: "Yes — vehicles, service records and driver assignments are managed from an operations screen, alongside the delivery schedule." },
      { question: "Can I track completed deliveries?", answer: "Yes. Each delivery is tracked from assigned through to completed, and finished deliveries are kept as service records for reference and reporting." },
      { question: "Can I book a demo?", answer: "Yes — a free WaterFlow demo walks through the real request-to-delivery workflow live. Would you like to set one up?" },
    ],
  },
  "shopify-solutions": {
    id: "shopify-solutions",
    name: "Shopify Solutions",
    tagline: "Shopify store setup and ecommerce development.",
    facts: [
      "Shopify Solutions covers Shopify store setup and ecommerce website development for businesses that want to sell online.",
      "Shopify store setup: the storefront is configured from scratch, including structure, navigation and initial configuration.",
      "Theme customization: a free Shopify theme is customized to look premium and on-brand, rather than left as an out-of-the-box template.",
      "Product catalog and collections: products are organized into clear, browsable collections so shoppers find what they want in fewer clicks.",
      "Mobile-responsive design: the storefront is built mobile-first, since most shoppers arrive on a phone.",
      "Domain connection: a custom domain is connected to the finished store as part of setup.",
      "Payment and shipping guidance: guidance is provided on configuring payment gateways and shipping options within Shopify.",
      "Ecommerce website development: beyond store setup, product detail pages, cart and checkout flow are all part of the delivered experience.",
      "TriangleTech does not currently claim official Shopify Partner status; store setup work is delivered as a standard Shopify build using Shopify's own platform tools.",
      "There is no published fixed-price package online; the next step is booking a free demo or consultation to scope the right package for your store.",
    ],
    suggestedQuestions: [
      { question: "What Shopify services do you provide?", answer: "Full Shopify store setup and ecommerce development — theme customization, product catalog and collections, mobile-responsive design, domain connection, and guidance on payment and shipping configuration." },
      { question: "Can you customize a free theme?", answer: "Yes. We customize a free Shopify theme to look premium and on-brand, rather than leaving it as an out-of-the-box template. (A paid theme would only be used if you specifically choose and provide one.)" },
      { question: "Can you connect my domain?", answer: "Yes, domain connection is part of the standard store setup process." },
      { question: "Can you create a complete ecommerce store?", answer: "Yes — storefront, product catalog, collections, product detail pages, and the cart/checkout flow are all part of a complete Shopify Solutions build." },
      { question: "Can I see a package?", answer: "We don't publish fixed packages or pricing online since scope varies by store. The best next step is a free demo or consultation, where we scope the right package for your specific store." },
      { question: "Can I book a demo?", answer: "Yes — book a free demo and we'll walk through what a TriangleTech Shopify build looks like, and scope what your store would need." },
    ],
  },
  "dynamic-inventory-count": {
    id: "dynamic-inventory-count",
    name: "Dynamic Inventory Count",
    tagline: "Activity-based cycle counting for Odoo 19. Count based on actual stock movement and cumulative activity.",
    facts: [
      "Dynamic Inventory Count is an Odoo 19 module that triggers physical inventory counts from actual stock movement activity rather than fixed calendar schedules alone.",
      "It supports two trigger types: Count after X completed stock movements, and Count after X cumulative moved quantity.",
      "Counters are maintained per product and per location, accumulating activity as matching stock moves complete.",
      "Supported stock activity includes receipts, deliveries, internal transfers and returns, with partial and backorder completed quantities included.",
      "The module works with Odoo's native Physical Inventory workflow — it does not replace the native counting UI.",
      "A dashboard provides an at-a-glance view of active rules, items due for count, trigger types, locations and top due items.",
      "Multi-company support is included via standard Odoo multi-company record rules.",
      "The module is priced at $39 on the Odoo Apps store.",
      "It does not forecast, predict, or score inventory risk. It only counts completed, actual stock activity that has already occurred.",
      "To move forward with Dynamic Inventory Count, the next step is viewing the Odoo Apps listing or booking a demo to see the module in context.",
    ],
    suggestedQuestions: [
      { question: "What is Dynamic Inventory Count?", answer: "Dynamic Inventory Count is an Odoo 19 module from TriangleTech that triggers physical inventory counts based on actual stock movement activity — completed moves or cumulative quantity — rather than fixed calendar schedules alone." },
      { question: "How does movement-based counting work?", answer: "You define a rule with a movement-count threshold. Every completed stock move for the matching product and location increments a counter. Once the threshold is reached, that product/location is flagged for a physical count." },
      { question: "How does cumulative quantity counting work?", answer: "You define a rule with a quantity threshold. The absolute quantity of every matching stock move is summed into a counter normalized to the product's base unit of measure. Once the threshold is reached, a count is requested." },
      { question: "Does it work with Odoo's native inventory count?", answer: "Yes. It flags items for counting and works directly with Odoo's native Physical Inventory workflow. There is no separate replacement counting UI." },
      { question: "Does it support multiple companies?", answer: "Yes. Rules and counters are isolated per company via standard Odoo multi-company record rules." },
      { question: "How much does it cost?", answer: "Dynamic Inventory Count is priced at $39 on the Odoo Apps store for Odoo 19." },
    ],
  },
};

/**
 * Knowledge used when the visitor opens the general assistant rather than a
 * specific product. Keeps answers grounded in the same verified facts and
 * routes people toward the right product.
 */
export const generalKnowledge: ProductKnowledge = {
  id: "general" as ProductId,
  name: "TriangleTech",
  tagline: "Business software, digital invoicing, delivery operations and ecommerce.",
  facts: [
    "TriangleTech builds practical software for sales, inventory, digital invoicing, delivery operations and ecommerce.",
    "There are five products: OrderMate for sales, inventory and business operations; FBR Digital for structured digital invoicing; WaterFlow for delivery operations; Shopify Solutions for online stores; and Dynamic Inventory Count, an Odoo 19 module for activity-based cycle counting.",
    "OrderMate connects sales, orders, inventory, customers, business location records and accounting workflows in one system.",
    "FBR Digital covers creating, validating and submitting digital invoices, with Excel upload, tracking numbers and PDF invoices. It is not a government system and TriangleTech is not affiliated with or endorsed by FBR.",
    "WaterFlow manages delivery operations from customer request through scheduling, driver and vehicle assignment, delivery tracking and reporting.",
    "Shopify Solutions covers Shopify store setup, theme customization, collections, mobile-first storefront design, domain connection and payment/shipping guidance.",
    "Beyond the products, TriangleTech also builds custom business software, ERP and accounting systems, web and mobile applications, and backend/database systems.",
    "TriangleTech can be reached by email at info.triangletech@gmail.com or on WhatsApp.",
    "There is no published fixed pricing online; scope varies, so the next step is a free demo or consultation.",
    "The next step for any product is booking a free demo, where the product is walked through live for your kind of business.",
  ],
  suggestedQuestions: [
    { question: "What does TriangleTech build?", answer: "We build four products — OrderMate for sales, inventory and business operations; FBR Digital for structured digital invoicing; WaterFlow for delivery operations; and Shopify Solutions for online stores. We also take on custom business software, ERP systems, and web and mobile applications." },
    { question: "Which product is right for my business?", answer: "It depends on what's hurting most. Sales, stock and customers scattered across spreadsheets — OrderMate. Preparing and submitting sales tax invoices — FBR Digital. Dispatching deliveries by phone — WaterFlow. Selling online — Shopify Solutions. Tell me what your business does and I'll narrow it down." },
    { question: "Can you build something custom?", answer: "Yes. When none of the four products is the right shape, we design and build custom business software, ERP and accounting systems, and web or mobile applications around your actual workflow." },
    { question: "How much does it cost?", answer: "We don't publish fixed pricing, because scope varies a lot between businesses. The next step is a free demo or consultation, where we look at your workflow and scope the right package." },
    { question: "How do I book a demo?", answer: "Use the Book a Free Demo button, or continue on WhatsApp and we'll arrange a time. A demo walks through the actual product live for your kind of business." },
  ],
};

export const assistantKnowledge: Record<string, ProductKnowledge> = { ...productKnowledge, general: generalKnowledge };

export function findKnowledgeMatch(productId: string, question: string): string | null {
  const knowledge = assistantKnowledge[productId];
  if (!knowledge) return null;
  const q = question.toLowerCase().trim();

  const exact = knowledge.suggestedQuestions.find(sq => sq.question.toLowerCase() === q);
  if (exact) return exact.answer;

  const words = q.split(/\W+/).filter(w => w.length > 3);
  let best: { answer: string; score: number } | null = null;
  for (const sq of knowledge.suggestedQuestions) {
    const target = (sq.question + " " + sq.answer).toLowerCase();
    const score = words.filter(w => target.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { answer: sq.answer, score };
  }
  if (best && best.score >= 2) return best.answer;

  const factMatch = knowledge.facts.find(fact => {
    const target = fact.toLowerCase();
    return words.filter(w => target.includes(w)).length >= 2;
  });
  if (factMatch) return factMatch;

  return null;
}
