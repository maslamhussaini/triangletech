"use client";

/**
 * LeadForm — the consultation inquiry form for the USA landing page (P1.8).
 *
 * Client-side checks reuse the shared zod contract (src/lib/leads/schema)
 * purely for immediate feedback; the server re-validates everything.
 * States: editing → submitting → success (form replaced by a confirmation
 * panel, so an inquiry cannot be sent twice by accident) or failure (the
 * entries stay in place and the site's contact email is offered — an
 * inquiry is never reported as sent when delivery was not confirmed).
 * No response time is promised anywhere in this flow.
 *
 * The fax-number field is a honeypot: positioned off-screen, hidden from
 * assistive technology, removed from the tab order. Humans never see it;
 * bots that fill every field reveal themselves, and the server drops
 * those submissions silently.
 */
import { useEffect, useRef, useState } from "react";
import { business } from "@/lib/site";
import { Icon } from "@/components/icons";
import {
  firstInvalidField,
  parseLeadSubmission,
  SERVICE_OPTIONS,
  type LeadField,
} from "@/lib/leads/schema";

type FormStatus = "editing" | "submitting" | "success" | "failed";

interface FormValues {
  fullName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  serviceInterest: string;
  projectDescription: string;
  consent: boolean;
  faxNumber: string;
}

const EMPTY_VALUES: FormValues = {
  fullName: "",
  businessName: "",
  email: "",
  websiteUrl: "",
  serviceInterest: "",
  projectDescription: "",
  consent: false,
  faxNumber: "",
};

type FieldErrors = Partial<Record<LeadField, string>>;

function errorId(field: string): string {
  return `lead-${field}-error`;
}

export function LeadForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>("editing");
  const [statusMessage, setStatusMessage] = useState("");
  const [reference, setReference] = useState("");
  // Time-trap start point, captured once when the form first renders.
  const [startedAt] = useState(() => Date.now());

  // Focus management (P1.10 defect D1). The success state replaces the
  // form, and the submit button is disabled while sending — both would
  // otherwise drop keyboard focus to <body>. Instead:
  // - success → focus the confirmation heading (this is also how the
  //   confirmation is announced; the panel deliberately has no live role,
  //   so it is not announced twice);
  // - failure → focus returns to the submit button, ready to retry (the
  //   error itself is announced by its role="alert" region);
  // - "Send another inquiry" → focus returns to the first field.
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const focusFirstFieldOnEditRef = useRef(false);
  useEffect(() => {
    if (status === "success") {
      successHeadingRef.current?.focus();
    } else if (status === "failed") {
      submitButtonRef.current?.focus();
    } else if (status === "editing" && focusFirstFieldOnEditRef.current) {
      focusFirstFieldOnEditRef.current = false;
      firstFieldRef.current?.focus();
    }
  }, [status]);

  function focusFirstInvalid(fieldErrors: FieldErrors) {
    const field = firstInvalidField(fieldErrors);
    if (field) document.getElementById(`lead-${field}`)?.focus();
  }

  function setValue<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field as LeadField];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const elapsedMs = Date.now() - startedAt;
    const parsed = parseLeadSubmission({ ...values, elapsedMs });
    if (!parsed.ok) {
      setErrors(parsed.fieldErrors);
      setStatus("editing");
      setStatusMessage("Please review the highlighted fields and try again.");
      focusFirstInvalid(parsed.fieldErrors);
      return;
    }

    setErrors({});
    setStatusMessage("");
    setStatus("submitting");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.lead, elapsedMs, faxNumber: values.faxNumber }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; reference?: string; error?: string; fields?: FieldErrors }
        | null;

      if (response.ok && body?.ok && typeof body.reference === "string") {
        setReference(body.reference);
        setStatus("success");
        return;
      }
      if (response.status === 400 && body?.fields) {
        setErrors(body.fields);
        setStatus("editing");
        setStatusMessage(body.error ?? "Please review the highlighted fields and try again.");
        focusFirstInvalid(body.fields);
        return;
      }
      setStatus("failed");
      setStatusMessage(
        body?.error ??
          "We could not confirm delivery of your inquiry, so nothing was submitted. Please try again, or email us directly.",
      );
    } catch {
      setStatus("failed");
      setStatusMessage(
        "We could not confirm delivery of your inquiry, so nothing was submitted. Please check your connection and try again, or email us directly.",
      );
    }
  }

  if (status === "success") {
    return (
      // No live role here on purpose: focus moves to the heading (see the
      // focus-management note above), which announces the confirmation —
      // a role="status" region as well would announce it twice.
      <div className="lead-success">
        <span className="lead-success-icon" aria-hidden="true">
          <Icon name="check" />
        </span>
        <h3 ref={successHeadingRef} tabIndex={-1}>
          Thank you — your inquiry has been sent.
        </h3>
        <p>
          Your reference is <strong>{reference}</strong>. We will review your inquiry and reply to{" "}
          <strong>{values.email}</strong> by email. There is nothing else you need to do.
        </p>
        <button
          type="button"
          className="button-indigo-secondary"
          onClick={() => {
            setValues(EMPTY_VALUES);
            setErrors({});
            setStatusMessage("");
            setReference("");
            focusFirstFieldOnEditRef.current = true;
            setStatus("editing");
          }}
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      {status === "failed" && (
        <p className="lead-alert" role="alert">
          {statusMessage}
        </p>
      )}
      {status !== "failed" && hasErrors && (
        <p className="lead-alert" role="alert">
          {statusMessage || "Please review the highlighted fields and try again."}
        </p>
      )}

      <div className="lead-form-grid">
        <div className="field-premium">
          <label htmlFor="lead-fullName">
            Full name <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="lead-fullName"
            ref={firstFieldRef}
            className="input-premium"
            type="text"
            autoComplete="name"
            value={values.fullName}
            onChange={event => setValue("fullName", event.target.value)}
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? errorId("fullName") : undefined}
            required
          />
          {errors.fullName && (
            <p className="error-premium" id={errorId("fullName")}>
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="field-premium">
          <label htmlFor="lead-businessName">
            Business name <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="lead-businessName"
            className="input-premium"
            type="text"
            autoComplete="organization"
            value={values.businessName}
            onChange={event => setValue("businessName", event.target.value)}
            aria-invalid={errors.businessName ? true : undefined}
            aria-describedby={errors.businessName ? errorId("businessName") : undefined}
            required
          />
          {errors.businessName && (
            <p className="error-premium" id={errorId("businessName")}>
              {errors.businessName}
            </p>
          )}
        </div>

        <div className="field-premium">
          <label htmlFor="lead-email">
            Email address <span className="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            id="lead-email"
            className="input-premium"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={event => setValue("email", event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId("email") : undefined}
            required
          />
          {errors.email && (
            <p className="error-premium" id={errorId("email")}>
              {errors.email}
            </p>
          )}
        </div>

        <div className="field-premium">
          <label htmlFor="lead-websiteUrl">
            Current website <span className="optional-mark">(optional)</span>
          </label>
          <input
            id="lead-websiteUrl"
            className="input-premium"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourbusiness.com"
            value={values.websiteUrl}
            onChange={event => setValue("websiteUrl", event.target.value)}
            aria-invalid={errors.websiteUrl ? true : undefined}
            aria-describedby={errors.websiteUrl ? errorId("websiteUrl") : "lead-websiteUrl-helper"}
          />
          {errors.websiteUrl ? (
            <p className="error-premium" id={errorId("websiteUrl")}>
              {errors.websiteUrl}
            </p>
          ) : (
            <p className="helper-premium" id="lead-websiteUrl-helper">
              Leave blank if you do not have a website yet.
            </p>
          )}
        </div>
      </div>

      <div className="field-premium">
        <label htmlFor="lead-serviceInterest">
          What are you interested in? <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <select
          id="lead-serviceInterest"
          className="select-premium"
          value={values.serviceInterest}
          onChange={event => setValue("serviceInterest", event.target.value)}
          aria-invalid={errors.serviceInterest ? true : undefined}
          aria-describedby={errors.serviceInterest ? errorId("serviceInterest") : undefined}
          required
        >
          <option value="">Choose a service…</option>
          {SERVICE_OPTIONS.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.serviceInterest && (
          <p className="error-premium" id={errorId("serviceInterest")}>
            {errors.serviceInterest}
          </p>
        )}
      </div>

      <div className="field-premium">
        <label htmlFor="lead-projectDescription">
          Tell us about your project <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <textarea
          id="lead-projectDescription"
          className="textarea-premium"
          rows={5}
          placeholder="What does your business do, where do you serve customers, and what would you like your website to achieve?"
          value={values.projectDescription}
          onChange={event => setValue("projectDescription", event.target.value)}
          aria-invalid={errors.projectDescription ? true : undefined}
          aria-describedby={errors.projectDescription ? errorId("projectDescription") : undefined}
          required
        />
        {errors.projectDescription && (
          <p className="error-premium" id={errorId("projectDescription")}>
            {errors.projectDescription}
          </p>
        )}
      </div>

      {/* Honeypot — see the module comment. Never shown to humans. */}
      <div className="lead-honeypot" aria-hidden="true">
        <label>
          Fax number
          <input
            type="text"
            name="faxNumber"
            tabIndex={-1}
            autoComplete="off"
            value={values.faxNumber}
            onChange={event => setValue("faxNumber", event.target.value)}
          />
        </label>
      </div>

      <div className="field-premium">
        <label className="lead-consent" htmlFor="lead-consent">
          <input
            id="lead-consent"
            type="checkbox"
            checked={values.consent}
            onChange={event => setValue("consent", event.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? errorId("consent") : undefined}
            required
          />
          <span>
            I agree to TriangleTech using the details above to respond to my inquiry, as described
            in the{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            . <span className="required-mark" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consent && (
          <p className="error-premium" id={errorId("consent")}>
            {errors.consent}
          </p>
        )}
      </div>

      <div className="lead-form-actions">
        <button
          type="submit"
          ref={submitButtonRef}
          className="button-indigo"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending…" : "Send My Inquiry"}
        </button>
        <p className="helper-premium">
          No account needed and no mailing list — your details are used only to respond to this
          inquiry. Prefer email? Write to us at{" "}
          <a className="text-link" href={`mailto:${business.email}`}>
            {business.email}
          </a>
          .
        </p>
      </div>
    </form>
  );
}
