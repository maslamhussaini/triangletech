"use client";

import { Icon } from "./icons";
import { useChatWidget } from "./chat-widget";
import type { ProductId } from "@/lib/ai/product-knowledge";

export function ChatTriggerButton({ productId, className = "button button-outline-dark" }: { productId: ProductId; className?: string }) {
  const { openChat } = useChatWidget();
  return <button className={className} onClick={() => openChat(productId)}><Icon name="chat" />Chat About This Product</button>;
}
