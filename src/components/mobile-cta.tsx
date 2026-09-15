"use client";

import { usePathname } from "next/navigation";
import { business } from "@/lib/site";
import { Icon } from "./icons";
import { RouteLink } from "./navigation";

export function MobileCta() {
  const pathname = usePathname();
  if (pathname === "/contact") return null;
  return <div className="mobile-cta" aria-label="Quick contact">
    <RouteLink href="/contact"><Icon name="arrow" />Book a Demo</RouteLink>
    <a href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Support"><Icon name="chat" />WhatsApp</a>
  </div>;
}
