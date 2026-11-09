import type { Metadata } from "next";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "Settings — Freelancer Time & Invoice",
  description: "App defaults and company branding for PDF reports.",
  robots: { index: false, follow: false },
};

export default function FreelancerSettingsPage() {
  return <SettingsClient />;
}
