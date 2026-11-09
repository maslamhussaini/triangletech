import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { Header, NavigationProvider } from "@/components/navigation";
import { Footer } from "@/components/page-parts";
import SiteChrome from "@/components/site-chrome";
import { ChatProvider } from "@/components/chat-widget";
import MobileShell from "@/components/mobile/mobile-shell";
import { Analytics } from "@/components/analytics";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { business } from "@/lib/site";
import "./globals.css";
import "./portfolio.css";
import "./theme-indigo.css";
import "@/components/mobile/mobile-shell.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(business.url),
  title: { default: "TriangleTech | Business Software and Digital Solutions", template: "%s | TriangleTech" },
  description: "TriangleTech builds practical business software, digital invoicing platforms, delivery solutions and ecommerce experiences. Explore our products and request a free consultation.",
  icons: { icon: [{ url: "/icon" }], apple: [{ url: "/icon" }] },
};

/**
 * Mobile viewport: `viewportFit: "cover"` lets the Capacitor shell draw
 * into the iOS safe areas (the shell pads content with
 * env(safe-area-inset-*)). Harmless on desktop web.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Language/direction for tool pages comes from the tools layout, which
  // reads the saved cookie server-side. The root stays static so non-tool
  // pages keep their existing rendering behavior.
  const structured = {
    "@context": "https://schema.org", "@type": "Organization", "@id": `${business.url}/#organization`,
    name: business.name, url: business.url, logo: `${business.url}/triangletech-logo.png`, email: business.email,
    sameAs: [],
  };
  return <html lang="en" className={`${inter.variable} ${sora.variable}`}><head><noscript><style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style></noscript></head><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /><NavigationProvider><ChatProvider><SiteChrome header={<Header />} footer={<Footer />} mobileShell={<MobileShell />}>{children}</SiteChrome></ChatProvider></NavigationProvider><Analytics /><AnalyticsConsent /></body></html>;
}
