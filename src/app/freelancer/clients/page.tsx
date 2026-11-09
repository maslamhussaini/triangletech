import type { Metadata } from "next";
import ClientsClient from "./clients-client";

export const metadata: Metadata = {
  title: "Clients — Freelancer Time & Invoice",
  description: "Manage clients, projects, rates, and overtime settings.",
  robots: { index: false, follow: false },
};

export default function FreelancerClientsPage() {
  return <ClientsClient />;
}
