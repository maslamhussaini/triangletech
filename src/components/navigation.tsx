"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { Brand } from "./brand";
import { Icon } from "./icons";
import { business, navigation } from "@/lib/site";

const NavigationContext = createContext<(href: string) => void>(() => {});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <NavigationContext.Provider value={(href) => startTransition(() => router.push(href))}>
    {children}
    <div className={`route-progress ${pending ? "is-pending" : ""}`} role="status" aria-live="polite">
      {pending && <><Brand compact /><span>Opening page…</span></>}
    </div>
  </NavigationContext.Provider>;
}

export function RouteLink({ href, children, onNavigate, ...props }: Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string; onNavigate?: () => void }) {
  const navigate = useContext(NavigationContext);
  return <Link {...props} href={href} onNavigate={(event) => {
    onNavigate?.();
    event.preventDefault();
    navigate(href);
  }}>{children}</Link>;
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !toggle.current?.contains(event.target as Node)) setOpen(false);
    };
    const resize = () => { if (window.innerWidth >= 800) setOpen(false); };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); };
  }, [open]);

  return <header className="site-header">
    <div className="container header-inner">
      <RouteLink href="/" aria-label="TriangleTech — Home" onNavigate={() => setOpen(false)}><Brand /></RouteLink>
      <nav aria-label="Main navigation" className="desktop-nav">
        {navigation.map((item) => <RouteLink key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</RouteLink>)}
      </nav>
      <RouteLink className="button button-accent header-cta" href="/contact">Book a Free Demo</RouteLink>
      <button ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"} /></svg>
      </button>
    </div>
    <div ref={menu} id="mobile-navigation" className="mobile-navigation" hidden={!open} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== toggle.current) setOpen(false);
    }}>
      <nav aria-label="Mobile navigation">{navigation.map((item) => <RouteLink key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onNavigate={() => setOpen(false)}>{item.label}<Icon name="arrow" /></RouteLink>)}</nav>
      <RouteLink className="button button-accent" href="/contact" onNavigate={() => setOpen(false)}>Book a Free Demo</RouteLink>
      <a className="mobile-nav-whatsapp" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Support"><Icon name="chat" />WhatsApp Support</a>
    </div>
  </header>;
}
