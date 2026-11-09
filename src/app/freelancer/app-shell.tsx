"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/mobile/capacitor";
import { INDIGO, INDIGO_DEEP } from "./styles";

/**
 * Freelancer app shell (M2; M3 adds the Invoices tab; M4 adds the Pro tab): app header + bottom tab navigation.
 *
 * Replaces the website Header/Footer chrome on `/freelancer/*` routes
 * (see SiteChrome in the root layout). Five tabs: Time Card,
 * Invoices, Clients, Pro, Settings. No website links, no dead `/tools/` links.
 *
 * Safe areas: the header pads for the top inset and the tab bar for the
 * bottom inset (`env(safe-area-inset-*)`). In the native shell the
 * `body.capacitor-app` class (set here when running natively, the same
 * mechanism the Tools MobileShell uses) hides the website chat launcher
 * — `/api/chat` has no server in the app bundle — and reserves bottom
 * clearance for the tab bar.
 */
const TABS = [
  { href: "/freelancer", label: "Time Card" },
  { href: "/freelancer/invoices", label: "Invoices" },
  { href: "/freelancer/clients", label: "Clients" },
  { href: "/freelancer/pro", label: "Pro" },
  { href: "/freelancer/settings", label: "Settings" },
] as const;

function isTabActive(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  if (href === "/freelancer") return pathname === "/freelancer" || pathname === "/freelancer/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Inside the Capacitor shell only: mark the body so the shared
    // mobile CSS hides the dead chat launcher, applies tap targets, and
    // reserves bottom clearance for the tab bar.
    if (!isNativeApp()) return;
    document.body.classList.add("capacitor-app");
    return () => {
      document.body.classList.remove("capacitor-app");
    };
  }, []);

  return (
    <>
      <header
        style={{
          background: `linear-gradient(135deg, ${INDIGO_DEEP} 0%, ${INDIGO} 100%)`,
          color: "#FFFFFF",
          padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>Freelancer Time &amp; Invoice</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.85 }}>Track time per client. Turn hours into invoices.</p>
        </div>
      </header>
      {/* Bottom clearance for the fixed tab bar (also covered in-app by
          the body.capacitor-app rule in mobile-shell.css). */}
      <div style={{ paddingBottom: 84 }}>{children}</div>
      <nav
        aria-label="App navigation"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          display: "flex",
          background: INDIGO_DEEP,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -2px 12px rgba(27, 27, 75, 0.25)",
        }}
      >
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              style={{
                flex: 1,
                minHeight: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                background: active ? INDIGO : "none",
                fontSize: 15,
                fontWeight: active ? 700 : 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
