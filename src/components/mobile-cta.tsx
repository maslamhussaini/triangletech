"use client";

import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { RouteLink } from "./navigation";

// One intentional mobile contact pattern: a single sticky consultation
// button. WhatsApp stays available from the mobile menu, footer, and
// contact page, and the in-page chat buttons — it is not duplicated here,
// and no floating control sits above this bar on mobile.
export function MobileCta() {
  const pathname = usePathname();
  if (pathname === "/contact" || pathname.startsWith("/websites-for-us-small-business")) return null;
  return <div className="mobile-cta mobile-cta-single" aria-label="Quick contact">
    <RouteLink href="/websites-for-us-small-business#consultation"><Icon name="arrow" />Request a Free Consultation</RouteLink>
  </div>;
}
