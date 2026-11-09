"use client";

import { useEffect } from "react";
import { useFreelancerData } from "./data-context";
import type { BannerScreen } from "@/lib/freelancer/ads";

/**
 * Banner ad slot (M4). Renders nothing in the DOM: the banner is a
 * native overlay managed by the AdMob plugin.
 *
 * Placement is enforced by the ads service — this component only ever
 * mounts on the two allowed list screens (time-card list, client
 * list) and asks the service to show the banner for that screen; the
 * service refuses every other screen, refuses Pro users, and refuses
 * when consent is unsettled or the SDK failed to initialise. On the
 * web preview there is no ad port, so this is a no-op. The banner is
 * hidden when the screen unmounts.
 */
export default function AdBanner({ screen }: { screen: BannerScreen }) {
  const { ads, isPro } = useFreelancerData();

  useEffect(() => {
    if (!ads || isPro) return;
    let cancelled = false;
    ads
      .initialize()
      .then(() => {
        if (!cancelled) void ads.showBanner(screen);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void ads.hideBanner();
    };
  }, [ads, isPro, screen]);

  return null;
}
