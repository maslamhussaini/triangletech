import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { Header, NavigationProvider } from "@/components/navigation";
import { Footer } from "@/components/page-parts";
import { business } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(business.url),
  title: { default: "TriangleTech — Business Software and Digital Solutions", template: "%s | TriangleTech" },
  description: "TriangleTech builds practical business software, web applications, mobile apps, ecommerce stores and digital solutions for growing businesses.",
  icons: { icon: [{ url: "/icon" }], apple: [{ url: "/icon" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structured = {
    "@context": "https://schema.org", "@type": "Organization", "@id": `${business.url}/#organization`,
    name: business.name, url: business.url, logo: `${business.url}/icon`, email: business.email,
    address: { "@type": "PostalAddress", addressLocality: "Lahore", addressCountry: "PK" },
    sameAs: [],
  };
  return <html lang="en" className={`${inter.variable} ${sora.variable}`}><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /><NavigationProvider><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></NavigationProvider></body></html>;
}
