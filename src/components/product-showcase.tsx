"use client";

import { useState } from "react";
import { RouteLink } from "./navigation";
import { Icon } from "./icons";
import { DashboardMockup } from "./dashboard-mockup";
import { BrowserFrame } from "./device-frame";
import { useChatWidget } from "./chat-widget";
import type { products } from "@/lib/site";

type Product = (typeof products)[number];

export function ProductSelector({ items }: { items: readonly Product[] }) {
  const { openChat } = useChatWidget();
  return <div className="product-selector-grid">
    {items.map(product => <article key={product.id} className={`selector-card accent-${product.accent}`}>
      <div className="selector-visual"><DashboardMockup layout={product.heroLayout} accent={product.accent} label={product.name} productId={product.id} screenId="hero" /></div>
      <span className="eyebrow">{product.category}</span>
      <h3>{product.name}</h3>
      <p className="selector-core"><Icon name="check" />{product.coreFeature}</p>
      <p>{product.description}</p>
      <p className="selector-audience">{product.audience}</p>
      <ul className="product-features product-features-compact">{product.features.slice(0, 4).map(f => <li key={f}><Icon name="check" />{f}</li>)}</ul>
      <div className="selector-card-actions">
        <RouteLink className="button button-accent" href={`/contact?interest=${encodeURIComponent(product.name)}`}>Book a Demo<Icon name="arrow" /></RouteLink>
        <button className="button button-outline-dark" onClick={() => openChat(product.id)}><Icon name="chat" />Chat About This Product</button>
        <RouteLink className="button button-outline-dark" href={`/products/${product.id}`}>{product.cta}<Icon name="arrow" /></RouteLink>
      </div>
    </article>)}
  </div>;
}

export function ProductShowcase({ items }: { items: readonly Product[] }) {
  const { openChat } = useChatWidget();
  const [active, setActive] = useState(items[0].id);
  const product = items.find(p => p.id === active) ?? items[0];
  return <div className={`product-showcase accent-${product.accent}`}>
    <div className="showcase-tabs" role="tablist" aria-label="Select a product">
      {items.map(p => <button key={p.id} role="tab" aria-selected={active === p.id} className={`showcase-tab ${active === p.id ? "is-active" : ""}`} onClick={() => setActive(p.id)}>{p.name}</button>)}
    </div>
    <div className="showcase-panel">
      <div className="showcase-copy">
        <span className="eyebrow">{product.category}</span>
        <h3>{product.name}</h3>
        <p className="selector-core"><Icon name="check" />{product.coreFeature}</p>
        <p>{product.description}</p>
        <p className="selector-audience">{product.audience}</p>
        <ul className="product-features">{product.features.map(f => <li key={f}><Icon name="check" />{f}</li>)}</ul>
        <div className="hero-actions">
          <RouteLink className="button button-accent" href={`/contact?interest=${encodeURIComponent(product.name)}`}>Book a Demo<Icon name="arrow" /></RouteLink>
          <button className="button button-outline-dark" onClick={() => openChat(product.id)}><Icon name="chat" />Chat About This Product</button>
          <RouteLink className="button button-outline-dark" href={`/products/${product.id}`}>Explore Product<Icon name="arrow" /></RouteLink>
        </div>
      </div>
      <div className="showcase-visual"><BrowserFrame label={`app.triangletech.co/${product.id}`}><DashboardMockup layout={product.heroLayout} accent={product.accent} label={product.name} productId={product.id} screenId="hero" /></BrowserFrame></div>
    </div>
  </div>;
}
