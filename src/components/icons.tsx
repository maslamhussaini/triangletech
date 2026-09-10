export function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    phone: <path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 5-8 2-12-2S2 5 5 3Z" />,
    chat: <><path d="M21 11a9 9 0 0 1-13 8l-5 2 1-5a9 9 0 1 1 17-5Z" /><path d="M8 9h8M8 13h5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    custom: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M8 14h3" /></>,
    erp: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" /></>,
    web: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.3h.01M10 6.3h.01" /></>,
    mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>,
    shopify: <><path d="M6 8 8 4h8l2 4Z" /><path d="M6 8h12l1 12H5Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
    invoice: <><path d="M7 3h8l4 4v14H7Z" /><path d="M15 3v4h4M10 12h6M10 16h6M10 8h2" /></>,
    database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    design: <><path d="M12 21c-4.4 0-8-3.6-8-9a9 9 0 0 1 18 0c0 2.2-1.8 3-3.5 3H16a2 2 0 0 0-1.4 3.4c.4.4.4 1-.1 1.3-.8.5-1.7.8-2.5.8Z" /><circle cx="7.5" cy="10.5" r="1" fill="currentColor" /><circle cx="10.5" cy="7" r="1" fill="currentColor" /><circle cx="15" cy="7.5" r="1" fill="currentColor" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5M3 8l9 5 9-5" opacity=".55" /></>,
    plug: <><path d="M9 3v5M15 3v5M6 8h12l-1 5a5 5 0 0 1-10 0Z" /><path d="M12 17v4" /></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" /><path d="m9 12 2 2 4-4" /></>,
    cloud: <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 8.6 4.5 4.5 0 0 1 16.5 18Z" />,
    building: <><rect x="4" y="10" width="7" height="11" /><rect x="13" y="4" width="7" height="17" /><path d="M6.5 13h2m-2 3h2m9-8h2m-2 3h2m-2 3h2m-2 3h2" /></>,
  };
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.custom}</svg>;
}

export function ServiceVisual({ kind }: { kind: string }) {
  return <span className="service-visual" aria-hidden="true"><Icon name={kind} /></span>;
}

export function HeroEcosystem() {
  return <div className="hero-ecosystem" aria-hidden="true">
    <div className="eco-grid" />
    <div className="eco-card eco-card-ordermate"><span className="eco-dot" /><strong>OrderMate</strong><span>Sales up 12% this week</span></div>
    <div className="eco-card eco-card-fbr"><span className="eco-dot" /><strong>FBR Digital</strong><span>18 invoices submitted</span></div>
    <div className="eco-card eco-card-waterflow"><span className="eco-dot" /><strong>WaterFlow</strong><span>6 deliveries scheduled</span></div>
    <svg className="eco-core" viewBox="0 0 200 200" fill="none">
      <path d="M100 20 176 160H24Z" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
      <path d="M100 60 144 140H56Z" fill="currentColor" opacity=".14" />
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity=".18" />
    </svg>
  </div>;
}
