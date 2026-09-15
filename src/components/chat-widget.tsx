"use client";

import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "./icons";
import { Brand } from "./brand";
import { business } from "@/lib/site";
import { generalKnowledge, productKnowledge, type ProductId } from "@/lib/ai/product-knowledge";

type Lead = { name: string; email: string; phone: string; businessName: string };
type Message = { id: string; role: "user" | "assistant"; text: string };
type Stage = "closed" | "lead" | "chat";

type ChatContextValue = { openChat: (productId?: ProductId | null) => void };
const ChatContext = createContext<ChatContextValue>({ openChat: () => {} });
export const useChatWidget = () => useContext(ChatContext);

const MAX_MESSAGE_LENGTH = 800;
const emptyLead: Lead = { name: "", email: "", phone: "", businessName: "" };

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function AutoResizeTextarea(props, forwardedRef) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [props.value]);
  return <textarea ref={innerRef} rows={1} {...props} />;
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>("closed");
  const [minimized, setMinimized] = useState(false);
  const [productId, setProductId] = useState<ProductId | null>(null);
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [leadErrors, setLeadErrors] = useState<Partial<Record<keyof Lead, string>>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [mode, setMode] = useState<"unknown" | "live" | "demo">("unknown");

  const listRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const product = productId ? productKnowledge[productId] : null;
  const knowledge = product ?? generalKnowledge;

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (stage === "lead") nameInputRef.current?.focus();
    else if (stage === "chat" && !minimized) messageInputRef.current?.focus();
  }, [stage, minimized]);

  useEffect(() => {
    if (stage === "closed") return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'))
        .filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stage]);

  function openChat(nextProductId?: ProductId | null) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setProductId(nextProductId ?? null);
    setMinimized(false);
    if (stage === "chat" && messages.length > 0) return; // resume existing session
    setLead(emptyLead);
    setLeadErrors({});
    setMessages([]);
    setErrored(false);
    setMode("unknown");
    setStage("lead");
  }

  function close() {
    setStage("closed");
    setMinimized(false);
    const target = returnFocusRef.current;
    if (target && document.contains(target)) requestAnimationFrame(() => target.focus());
  }

  function validateLead(): boolean {
    const errors: Partial<Record<keyof Lead, string>> = {};
    if (lead.name.trim().length < 2) errors.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) errors.email = "Enter a valid email address.";
    if (lead.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone or WhatsApp number.";
    setLeadErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateLead()) return;
    const firstName = lead.name.trim().split(" ")[0];
    const greeting = product
      ? `Hi ${firstName}, I'm the TriangleTech assistant for ${product.name}. I can help you understand features, workflows, demo options and next steps. What would you like to know?`
      : `Hi ${firstName}, I'm the TriangleTech assistant. Ask me about OrderMate, FBR Digital, WaterFlow or Shopify Solutions, or book a free demo.`;
    setMessages([{ id: "greet", role: "assistant", text: greeting }]);
    setStage("chat");
  }

  function whatsappHrefFor(prefillName: string) {
    const productLine = product ? `I would like to know more about ${product.name}` : "I would like to know more about TriangleTech";
    const text = prefillName.trim() ? `Hello TriangleTech, ${productLine}. My name is ${prefillName.trim()}.` : `Hello TriangleTech, ${productLine}.`;
    return `${business.whatsappPrimary}?text=${encodeURIComponent(text)}`;
  }

  async function requestReply(history: Message[]) {
    setLoading(true);
    setErrored(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product: productId ?? "general",
          visitor: { name: lead.name, email: lead.email, phone: lead.phone, businessName: lead.businessName },
          messages: history.map(m => ({ role: m.role, content: m.text })),
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setMode(data.mode === "live" ? "live" : "demo");
      setMessages(m => [...m, { id: `a${Date.now()}`, role: "assistant", text: data.reply }]);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed || loading) return;
    const userMessage: Message = { id: `u${Date.now()}`, role: "user", text: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setDraft("");
    requestReply(history);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function retryLast() {
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") return;
    requestReply(messages);
  }

  const buttonLabel = product ? "Chat About This Product" : "Ask TriangleTech";

  return <ChatContext.Provider value={{ openChat }}>
    {children}

    {stage === "closed" && <button className="chat-launcher" onClick={() => openChat(null)} aria-label={buttonLabel}><Icon name="chat" /></button>}

    {stage !== "closed" && !minimized && <div ref={dialogRef} className="chat-window" role="dialog" aria-modal="true" aria-label={product ? `Chat about ${product.name}` : "Chat with TriangleTech"}>
      <div className="chat-header">
        <span className="chat-header-brand"><Brand compact /></span>
        <div className="chat-header-copy">
          <strong>{product ? product.name : "TriangleTech"}</strong>
          <span>{stage === "chat" ? <><span className="chat-online-dot" aria-hidden="true" />{mode === "demo" ? "Answers from our product knowledge base" : "Product assistant"}</> : "Let's talk"}</span>
        </div>
        <div className="chat-header-actions">
          {stage === "chat" && <button className="chat-icon-btn" onClick={() => setMinimized(true)} aria-label="Minimize chat">–</button>}
          <button className="chat-icon-btn" onClick={close} aria-label="Close chat"><Icon name="close" /></button>
        </div>
      </div>

      {stage === "lead" && <form className="chat-lead-form" onSubmit={submitLead} noValidate>
        <h3>{product ? `Let's Talk About ${product.name}` : "Let's Talk"}</h3>
        <p>Tell us a little about yourself and our product assistant will help answer your questions.</p>
        <div className="field-premium"><label htmlFor="chat-lead-name">Full name <span className="required-mark">*</span></label><input className="input-premium" ref={nameInputRef} id="chat-lead-name" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} placeholder="Full name" aria-invalid={!!leadErrors.name} maxLength={100} />{leadErrors.name && <span className="error-premium">{leadErrors.name}</span>}</div>
        <div className="field-premium"><label htmlFor="chat-lead-email">Email address <span className="required-mark">*</span></label><input className="input-premium" id="chat-lead-email" type="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} placeholder="you@company.com" aria-invalid={!!leadErrors.email} maxLength={100} />{leadErrors.email && <span className="error-premium">{leadErrors.email}</span>}</div>
        <div className="field-premium"><label htmlFor="chat-lead-phone">Phone / WhatsApp number <span className="required-mark">*</span></label><input className="input-premium" id="chat-lead-phone" type="tel" value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })} placeholder="+92 3XX XXXXXXX" aria-invalid={!!leadErrors.phone} maxLength={30} />{leadErrors.phone && <span className="error-premium">{leadErrors.phone}</span>}</div>
        <div className="field-premium"><label htmlFor="chat-lead-business">Business name <span className="optional-mark">optional</span></label><input className="input-premium" id="chat-lead-business" value={lead.businessName} onChange={e => setLead({ ...lead, businessName: e.target.value })} placeholder="Your business name" maxLength={160} /></div>
        <p className="chat-privacy-note">Your information is used to continue this product conversation and respond to your request.</p>
        <button className="button-indigo chat-lead-submit" type="submit">Talk to Us<Icon name="arrow" /></button>
        <a className="chat-whatsapp-secondary" href={whatsappHrefFor(lead.name)} target="_blank" rel="noopener noreferrer"><Icon name="chat" />Continue with WhatsApp</a>
      </form>}

      {stage === "chat" && <>
        <div className="chat-messages" ref={listRef}>
          {messages.map(m => <div key={m.id} className={`chat-bubble chat-${m.role === "user" ? "user" : "bot"}`}>{m.text}</div>)}
          {messages.length === 1 && <div className="chat-suggestions">
            {knowledge.suggestedQuestions.map(sq => <button key={sq.question} className="chat-suggestion" onClick={() => sendMessage(sq.question)} disabled={loading}>{sq.question}</button>)}
          </div>}
          {mode === "demo" && <p className="chat-mode-note">Live AI isn&apos;t connected right now, so answers come from TriangleTech&apos;s written product knowledge rather than a live model. For anything it can&apos;t cover, continue on WhatsApp below.</p>}
          {loading && <div className="chat-bubble chat-bot chat-typing" aria-live="polite"><span /><span /><span /></div>}
          {errored && <div className="chat-error"><span>Something went wrong sending that message.</span><button className="text-link" onClick={retryLast}>Retry<Icon name="arrow" /></button></div>}
        </div>
        <div className="chat-input-row">
          <AutoResizeTextarea ref={messageInputRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleInputKeyDown} placeholder="Ask a question… (Enter to send, Shift+Enter for new line)" maxLength={MAX_MESSAGE_LENGTH} aria-label="Type your question" />
          <button className="chat-send" onClick={() => sendMessage(draft)} disabled={loading || !draft.trim()} aria-label="Send message"><Icon name="send" /></button>
        </div>
        <a className="chat-whatsapp-handoff" href={whatsappHrefFor(lead.name)} target="_blank" rel="noopener noreferrer"><Icon name="chat" />Continue on WhatsApp</a>
        <p className="chat-consent-note">Your details are being used only to continue this conversation. The TriangleTech team can contact you through the information you provided.</p>
      </>}
    </div>}

    {stage !== "closed" && minimized && <button className="chat-minibar" onClick={() => setMinimized(false)} aria-label="Reopen chat">
      <Icon name="chat" /><span>{product ? `${product.name} chat` : "TriangleTech chat"}</span>
    </button>}
  </ChatContext.Provider>;
}
