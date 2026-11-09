"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Website chrome gate (M2).
 *
 * The root layout renders the website Header/Footer (and the Tools app's
 * MobileShell) for every route. The Freelancer Time & Invoice app is a
 * separate product surface on the same Next.js tree: its routes
 * (`/freelancer/*`) get the app-specific shell from
 * `src/app/freelancer/layout.tsx` instead, with NO website chrome and
 * NO dead `/tools/` links. Every other route is unchanged.
 *
 * Why a client gate instead of a separate root layout: Next.js has one
 * root layout per app, so the chrome decision has to happen here. The
 * gate is pathname-only and renders the exact previous markup for
 * non-app routes, so the website build is unaffected (verified by the
 * plain `next build` + the freelancer scoped export).
 */
export function isFreelancerRoute(pathname: string | null): boolean {
  return pathname === "/freelancer" || (pathname?.startsWith("/freelancer/") ?? false);
}

export default function SiteChrome({
  header,
  footer,
  mobileShell,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  mobileShell: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (isFreelancerRoute(pathname)) {
    return (
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    );
  }
  return (
    <>
      {mobileShell}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {header}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      {footer}
    </>
  );
}
