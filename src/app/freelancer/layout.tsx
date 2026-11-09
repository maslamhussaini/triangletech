import type { ReactNode } from "react";
import { FreelancerDataProvider } from "./data-context";
import AppShell from "./app-shell";

/**
 * Freelancer app layout (M2): the app-specific shell.
 *
 * Every `/freelancer/*` route renders inside this layout — app header +
 * bottom tab navigation, no website Header/Footer (the root layout's
 * SiteChrome gate suppresses those on app routes). The data provider
 * opens the store once for all app screens.
 */
export default function FreelancerLayout({ children }: { children: ReactNode }) {
  return (
    <FreelancerDataProvider>
      <AppShell>{children}</AppShell>
    </FreelancerDataProvider>
  );
}
