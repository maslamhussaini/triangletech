import type { Metadata } from "next";
import TimeCardClient from "./time-card-client";

/**
 * Freelancer Time & Invoice — time card (M2).
 *
 * This is the app's entry point in the scoped Capacitor export
 * (`out-freelancer/index.html` is a copy of this page). It is an APP
 * route, not a public website page: it is intentionally NOT in the
 * sitemap and does not use the website's `pageMetadata()` — the app
 * shell is a separate product surface (plan §2).
 *
 * M2 scope: manual session entry (times + direct hours, break,
 * overnight), stopwatch with a persisted running timer, session list
 * grouped by week/day with totals and pay, edit/delete. M3 adds the
 * Invoices tab (full invoicing UI); this screen links to it and shows
 * each invoiced session's invoice number.
 */
export const metadata: Metadata = {
  title: "Freelancer Time & Invoice",
  description: "Track time per client and turn hours into invoices — offline-first.",
  robots: { index: false, follow: false },
};

export default function FreelancerDashboardPage() {
  return <TimeCardClient />;
}
