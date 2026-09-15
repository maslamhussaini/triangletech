export type PortfolioProject = {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  previewImage: string;
  technologies: string[];
  featured: boolean;
  caseStudySlug: string;
  badge: string;
  mockupTheme: "transport" | "business" | "water-transport";
};

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "umar-juma-transport",
    name: "Umar Juma Transport",
    url: "https://www.umarjumatransport.com/",
    category: "Transport and Business Website",
    description: "A professional transport website designed to present services, build trust and make it easy for customers to get in touch.",
    previewImage: "/portfolio/umar-juma-transport-preview.svg",
    technologies: ["Custom Website"],
    featured: true,
    caseStudySlug: "umar-juma-transport",
    badge: "Client Website",
    mockupTheme: "transport",
  },
  {
    id: "naymil",
    name: "Naymil",
    url: "https://www.naymil.com/",
    category: "Business Website",
    description: "A modern business website focused on clear brand presentation, professional communication and customer engagement.",
    previewImage: "/portfolio/naymil-preview.svg",
    technologies: ["Custom Website"],
    featured: false,
    caseStudySlug: "naymil",
    badge: "Client Website",
    mockupTheme: "business",
  },
  {
    id: "basma-al-madina-transport",
    name: "Basma Al Madina Transport",
    url: "https://basmaalmadinatransport.co/",
    category: "Water Supply and Transport Website",
    description: "A service-focused website designed to present water supply and transport services with clear sections, mobile responsiveness and direct contact options.",
    previewImage: "/portfolio/basma-al-madina-transport-preview.svg",
    technologies: ["Custom Website"],
    featured: false,
    caseStudySlug: "basma-al-madina-transport",
    badge: "Client Website",
    mockupTheme: "water-transport",
  },
];

export type PortfolioCaseStudy = {
  slug: string;
  title: string;
  overview: string;
  problem: string;
  approach: string;
  sections: string[];
  responsive: string;
  tagline: string;
};

export const portfolioCaseStudies: Record<string, PortfolioCaseStudy> = {
  "umar-juma-transport": {
    slug: "umar-juma-transport",
    title: "Umar Juma Transport",
    overview: "A website project for Umar Juma Transport, designed and developed by TriangleTech to give the business a professional online presence for its transport services.",
    problem: "Umar Juma Transport needed a professional website to present its services and build customer trust, giving potential customers a clear, credible place to learn about the business and get in touch.",
    approach: "We used a clean, mobile-first layout with clear service sections and straightforward contact pathways, keeping the focus on making it easy for visitors to understand what the business offers and how to reach it.",
    sections: ["Home", "Services", "About", "Contact"],
    responsive: "Designed and built as a responsive website, so it adapts cleanly across desktop, tablet and mobile screens.",
    tagline: "Responsive business website — Service-focused digital presence",
  },
  naymil: {
    slug: "naymil",
    title: "Naymil",
    overview: "A website project for Naymil, designed and developed by TriangleTech to support clear brand presentation and professional communication.",
    problem: "Naymil needed a professional website to present its services and build customer trust, with a layout that communicates its brand clearly to visitors.",
    approach: "We used a clean, mobile-first layout with clear service sections and straightforward contact pathways, so visitors can quickly understand the business and reach out.",
    sections: ["Home", "Services", "About", "Contact"],
    responsive: "Designed and built as a responsive website, so it adapts cleanly across desktop, tablet and mobile screens.",
    tagline: "Responsive business website — Service-focused digital presence",
  },
  "basma-al-madina-transport": {
    slug: "basma-al-madina-transport",
    title: "Basma Al Madina Transport",
    overview: "A website project for Basma Al Madina Transport, designed and developed by TriangleTech to present its water supply and transport services online. This page is a portfolio reference to a live client website — Basma Al Madina Transport is an independent client business, not a TriangleTech product.",
    problem: "Basma Al Madina Transport needed a professional website to present its water supply and transport services and build customer trust, giving customers a clear way to learn about services and get in touch.",
    approach: "We used a clean, mobile-first layout with clear service sections, straightforward contact pathways and attention to mobile responsiveness throughout.",
    sections: ["Home", "Services", "About", "Contact"],
    responsive: "Designed and built as a responsive website, so it adapts cleanly across desktop, tablet and mobile screens.",
    tagline: "Responsive business website — Service-focused digital presence",
  },
};
