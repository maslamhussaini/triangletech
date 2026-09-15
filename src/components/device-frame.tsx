"use client";

import { useState } from "react";
import { DashboardMockup } from "./dashboard-mockup";
import type { ScreenLayout } from "@/lib/site";

export function BrowserFrame({ children, label = "app.triangletech.co" }: { children: React.ReactNode; label?: string }) {
  return <div className="browser-frame">
    <div className="browser-chrome"><span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-url">{label}</span></div>
    <div className="browser-body">{children}</div>
  </div>;
}

export function TabletFrame({ children }: { children: React.ReactNode }) {
  return <div className="tablet-frame"><div className="tablet-body">{children}</div></div>;
}

export function MobileFrame({ children }: { children: React.ReactNode }) {
  return <div className="mobile-frame"><span className="mobile-notch" /><div className="mobile-body">{children}</div></div>;
}

const devices = [
  { id: "desktop", label: "Desktop View" },
  { id: "tablet", label: "Tablet View" },
  { id: "mobile", label: "Mobile View" },
] as const;

export function DevicePreview({ layout, accent, productId, screenId = "hero" }: { layout: ScreenLayout; accent: string; productId?: string; screenId?: string }) {
  const [device, setDevice] = useState<(typeof devices)[number]["id"]>("desktop");
  return <div className="device-preview">
    <div className="device-tabs" role="tablist" aria-label="Device preview">
      {devices.map(d => <button key={d.id} role="tab" aria-selected={device === d.id} className={`device-tab ${device === d.id ? "is-active" : ""}`} onClick={() => setDevice(d.id)}>{d.label}</button>)}
    </div>
    <div className="device-stage">
      {device === "desktop" && <BrowserFrame><DashboardMockup layout={layout} accent={accent} productId={productId} screenId={screenId} device="desktop" /></BrowserFrame>}
      {device === "tablet" && <TabletFrame><DashboardMockup layout={layout} accent={accent} productId={productId} screenId={screenId} device="tablet" /></TabletFrame>}
      {device === "mobile" && <MobileFrame><DashboardMockup layout={layout} accent={accent} productId={productId} screenId={screenId} device="mobile" /></MobileFrame>}
    </div>
  </div>;
}
