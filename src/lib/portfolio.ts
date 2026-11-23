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
    previewImage: "/portfolio/umar-juma-transport-desktop.png",
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
    previewImage: "/portfolio/naymil-desktop.png",
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
    previewImage: "/portfolio/basma-al-madina-transport-desktop.png",
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
    overview: "A website for Umar Juma Transport, designed and built by TriangleTech to present its transport and water services and make it easy for customers to enquire.",
    problem: "Umar Juma Transport offers six distinct services in Dubai — water transport, waste management, sludge removal, sewage water removal, TSE water supply and sweet water supply — and needed one website that presents each service clearly to residential, commercial and industrial customers.",
    approach: "We built a service-first layout with each of the six services given its own section, a single enquiry path, and a mobile-first build so customers can get in touch from site as easily as from a desk.",
    sections: ["Home", "Services", "All Services", "About Us", "Why Choose Us", "Contact"],
    responsive: "Built responsive, so customers on site can enquire from a phone as easily as from a desk.",
    tagline: "Transport and water services website — six services, one enquiry path",
  },
  naymil: {
    slug: "naymil",
    title: "Naymil",
    overview: "A website for Naymil Delivery Services, designed and built by TriangleTech to present its rider and driver services to businesses that need deliveries.",
    problem: "Naymil supplies riders and drivers — bikes, cycles and vans — to businesses that need deliveries done, and needed a website that explains that model clearly and makes it easy for a business to partner with them.",
    approach: "We built a clear services page for each rider type, put the daily delivery volume and careful-handling promise up front, and added a straightforward partner enquiry path.",
    sections: ["Home", "Our Services", "About Us", "Industries", "Contact Us"],
    responsive: "Built responsive, so business customers can check the services and get in touch from any device.",
    tagline: "Delivery services website — riders and drivers for businesses that deliver",
  },
  "basma-al-madina-transport": {
    slug: "basma-al-madina-transport",
    title: "Basma Al Madina Transport",
    overview: "A website for Basma Al Madina Transport, designed and built by TriangleTech to present its water supply and tanker delivery services in Dubai and the UAE.",
    problem: "Basma Al Madina Transport delivers potable and non-potable water by tanker across Dubai and the UAE, and needed a website that explains the service for homes, businesses and construction sites — and makes requesting a delivery simple.",
    approach: "We built the site around the services — water supply and tanker delivery, split by customer type — with a request-a-delivery path and an FAQ for the common questions.",
    sections: ["Home", "Services", "About", "FAQ", "Contact"],
    responsive: "Built responsive, so a delivery can be requested from a phone on site.",
    tagline: "Water supply and tanker delivery website — residential, commercial and construction",
  },
};
