"use client";

import { useId, useState, type FormEvent } from "react";
import { business, services } from "@/lib/site";
import { Icon } from "./icons";

type Fields = { name: string; email: string; company: string; interest: string; message: string };
const initial: Fields = { name: "", email: "", company: "", interest: "", message: "" };

export function RequestForm({ initialInterest = "" }: { initialInterest?: string }) {
  const id = useId();
  const [values, setValues] = useState<Fields>({ ...initial, interest: initialInterest });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [draft, setDraft] = useState<{ channel: string; url: string } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Fields> = {};
    if (values.name.trim().length < 2) nextErrors.name = "Enter your name (at least 2 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!values.interest) nextErrors.interest = "Choose what you're interested in.";
    setErrors(nextErrors);
    setDraft(null);
    const first = Object.keys(nextErrors)[0];
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    const channel = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "email";
    const message = ["New Project Inquiry", "", `Name: ${values.name.trim()}`, `Email: ${values.email.trim()}`, `Company: ${values.company.trim() || "Not specified"}`, `Interested in: ${values.interest}`, `Details: ${values.message.trim() || "Not specified"}`].join("\n");
    const url = channel === "whatsapp"
      ? `${business.whatsapp}?text=${encodeURIComponent(message)}`
      : `mailto:${business.email}?subject=${encodeURIComponent("New Project Inquiry — TriangleTech")}&body=${encodeURIComponent(message)}`;
    setDraft({ channel, url });
    if (channel === "whatsapp") window.open(url, "_blank", "noopener,noreferrer");
    else window.location.href = url;
  }

  const field = (key: keyof Fields) => ({
    id: `${id}-${key}`, name: key, value: values[key],
    "aria-invalid": errors[key] ? true as const : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues({ ...values, [key]: event.target.value });
      setErrors({ ...errors, [key]: undefined }); setDraft(null);
    },
  });
  const error = (key: keyof Fields) => errors[key] && <span className="field-error" id={`${id}-${key}-error`}>{errors[key]}</span>;

  return <section className="request-panel" aria-labelledby={`${id}-title`}>
    <div className="form-heading"><span className="eyebrow">LET&apos;S GET STARTED</span><span className="form-mark"><Icon name="arrow" /></span></div>
    <h2 id={`${id}-title`}>Start your project.</h2>
    <p className="form-intro">Tell us what you need. Connect directly with TriangleTech.</p>
    <form onSubmit={submit} noValidate aria-label="Project inquiry">
      <div className="form-grid">
        <div className="field"><label htmlFor={`${id}-name`}>Your name <span>*</span></label><input {...field("name")} autoComplete="name" placeholder="Full name" required maxLength={100} />{error("name")}</div>
        <div className="field"><label htmlFor={`${id}-email`}>Email <span>*</span></label><input {...field("email")} type="email" autoComplete="email" placeholder="you@company.com" required maxLength={100} />{error("email")}</div>
        <div className="field field-wide"><label htmlFor={`${id}-interest`}>I&apos;m interested in <span>*</span></label><select {...field("interest")} required><option value="">Select an option</option>{services.map(service => <option key={service.id} value={service.title}>{service.title}</option>)}<option value="Something else">Something else</option></select>{error("interest")}</div>
        <div className="field field-wide"><label htmlFor={`${id}-company`}>Company <span className="optional">optional</span></label><input {...field("company")} autoComplete="organization" placeholder="Your company name" maxLength={160} /></div>
        <div className="field field-wide"><label htmlFor={`${id}-message`}>Project details <span className="optional">optional</span></label><textarea {...field("message")} rows={2} placeholder="Tell us about your project or the problem you're solving" maxLength={700} /></div>
      </div>
      <div className="form-actions"><button className="button button-accent" type="submit" value="email"><Icon name="mail" />Send by Email</button><button className="button button-email" type="submit" value="whatsapp"><Icon name="chat" />WhatsApp</button></div>
      <p className="form-note">Opens a draft in your app. Review it and press Send to complete your request. Email requires a configured email app.</p>
      <div role="status" aria-live="polite">{draft && <p className="draft-status">Your {draft.channel === "whatsapp" ? "WhatsApp" : "email"} draft is ready. Your request has not been sent. <a href={draft.url} target={draft.channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">Open the draft again</a>.</p>}</div>
    </form>
  </section>;
}
