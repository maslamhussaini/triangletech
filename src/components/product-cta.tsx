"use client";

import { RouteLink } from "./navigation";
import { Icon } from "./icons";
import { useChatWidget } from "./chat-widget";
import type { ProductId } from "@/lib/ai/product-knowledge";

export function ProductCTA({ productId, productName }: { productId: ProductId; productName: string }) {
  const { openChat } = useChatWidget();
  return <div className="product-cta hero-actions">
    <RouteLink className="button button-accent" href={`/contact?interest=${encodeURIComponent(productName)}`}>Book {productName} Demo<Icon name="arrow" /></RouteLink>
    <button className="button button-outline-dark" onClick={() => openChat(productId)}><Icon name="chat" />Chat About This Product</button>
  </div>;
}
