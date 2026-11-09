import type { Metadata } from "next";
import ProClient from "./pro-client";

export const metadata: Metadata = {
  title: "Pro — Freelancer Time & Invoice",
  description: "Upgrade to Pro for unlimited invoices, clients and templates — no ads.",
  robots: { index: false, follow: false },
};

export default function FreelancerProPage() {
  return <ProClient />;
}
