"use client";

import { useId, useState, type FormEvent } from "react";
import { business, demoOptions } from "@/lib/site";
import { Icon } from "./icons";

type Fields = { name: string; company: string; email: string; whatsapp: string; businessType: string; interest: string; contactTime: string; message: string };
const initial: Fields = { name: "", company: "", email: "", whatsapp: "", businessType: "", interest: "", contactTime: "", message: "" };

export function DemoRequestForm({ initialInterest = "" }: { initialInterest?: string }) {
  const id = useId();
  const [values, setValues] = useState<Fields>({ ...initial, interest: demoOptions.includes(initialInterest) ? initialInterest : "" });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Fields> = {};
    if (values.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!values.interest) nextErrors.interest = "Choose the product you're interested in.";
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    const message = ["Book a Free Product Demo", "", `Name: ${values.name.trim()}`, `Business name: ${values.company.trim() || "Not specified"}`, `Email: ${values.email.trim()}`, `WhatsApp: ${values.whatsapp.trim() || "Not specified"}`, `Business type: ${values.businessType.trim() || "Not specified"}`, `Product interested in: ${values.interest}`, `Preferred contact time: ${values.contactTime.trim() || "Not specified"}`, `Message: ${values.message.trim() || "Not specified"}`].join("\n");
    const url = `mailto:${business.email}?subject=${encodeURIComponent("Demo Request — TriangleTech")}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    setSubmitted(true);
  }

  const field = (key: keyof Fields) => ({
    id: `${id}-${key}`, name: key, value: values[key],
    "aria-invalid": errors[key] ? true as const : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues({ ...values, [key]: event.target.value });
      setErrors({ ...errors, [key]: undefined }); setSubmitted(false);
    },
  });
  const error = (key: keyof Fields) => errors[key] && <span className="field-error" id={`${id}-${key}-error`}>{errors[key]}</span>;

  if (submitted) return <section className="request-panel demo-success" aria-live="polite">
    <span className="eyebrow">REQUEST READY</span>
    <h2>Your demo request is drafted.</h2>
    <p className="form-intro">We&apos;ve opened an email draft with your details. Review it and press Send to complete your request — nothing has been sent yet.</p>
    <div className="hero-actions">
      <a className="button button-accent" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer"><Icon name="chat" />WhatsApp Us Instead</a>
      <button className="button button-outline-dark" onClick={() => setSubmitted(false)}>Edit Request</button>
    </div>
  </section>;

  return <section className="request-panel" aria-labelledby={`${id}-title`}>
    <div className="form-heading"><span className="eyebrow">BOOK A FREE PRODUCT DEMO</span><span className="form-mark"><Icon name="arrow" /></span></div>
    <h2 id={`${id}-title`}>See it before you decide.</h2>
    <p className="form-intro">Tell us about your business. We&apos;ll walk you through the right product live.</p>
    <form onSubmit={submit} noValidate aria-label="Book a free product demo">
      <div className="form-grid">
        <div className="field"><label htmlFor={`${id}-name`}>Full name <span>*</span></label><input {...field("name")} autoComplete="name" placeholder="Full name" required maxLength={100} />{error("name")}</div>
        <div className="field"><label htmlFor={`${id}-company`}>Business name <span className="optional">optional</span></label><input {...field("company")} autoComplete="organization" placeholder="Your business name" maxLength={160} /></div>
        <div className="field"><label htmlFor={`${id}-email`}>Email <span>*</span></label><input {...field("email")} type="email" autoComplete="email" placeholder="you@company.com" required maxLength={100} />{error("email")}</div>
        <div className="field"><label htmlFor={`${id}-whatsapp`}>WhatsApp number <span className="optional">optional</span></label><input {...field("whatsapp")} type="tel" autoComplete="tel" placeholder="+92 3XX XXXXXXX" maxLength={30} /></div>
        <div className="field"><label htmlFor={`${id}-businessType`}>Business type <span className="optional">optional</span></label><input {...field("businessType")} placeholder="e.g. Retail, distribution, services" maxLength={100} /></div>
        <div className="field"><label htmlFor={`${id}-interest`}>Product interested in <span>*</span></label><select {...field("interest")} required><option value="">Select a product</option>{demoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>{error("interest")}</div>
        <div className="field field-wide"><label htmlFor={`${id}-contactTime`}>Preferred contact time <span className="optional">optional</span></label><input {...field("contactTime")} placeholder="e.g. Weekday afternoons" maxLength={100} /></div>
        <div className="field field-wide"><label htmlFor={`${id}-message`}>Message <span className="optional">optional</span></label><textarea {...field("message")} rows={2} placeholder="Tell us about your business or what you'd like to see in the demo" maxLength={700} /></div>
      </div>
      <div className="form-actions form-actions-single"><button className="button button-accent" type="submit"><Icon name="mail" />Book a Free Demo</button></div>
      <p className="form-note">Opens an email draft in your app. Review it and press Send — access is provided after a short demo/review, not automatically.</p>
    </form>
  </section>;
}
