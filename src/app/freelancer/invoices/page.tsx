import type { Metadata } from "next";
import InvoicesClient from "./invoices-client";

export const metadata: Metadata = {
  title: "Invoices — Freelancer Time & Invoice",
  description: "Create invoices from tracked hours, track statuses, and share branded PDFs.",
  robots: { index: false, follow: false },
};

export default function FreelancerInvoicesPage() {
  return <InvoicesClient />;
}
