"use client";

/**
 * Estimator — the interactive website project estimator (P1.9).
 *
 * A three-step wizard over the deterministic rules engine in
 * src/lib/tools/website-estimator.ts. All computation happens locally in
 * the browser: nothing is transmitted, no estimate is stored, and the
 * result is qualitative (a recommended package, an inclusion checklist, a
 * complexity classification and the assumptions) — never a price. The
 * result guides the visitor to the consultation form (#consultation);
 * no estimator data is added to the lead form or the lead API payload.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { PremiumCTA } from "@/components/us/premium-cta";
import { focusTargetAfterViewChange } from "@/lib/us/landing";
import {
  BUSINESS_CATEGORIES,
  CAPABILITIES,
  CAPABILITY_LABELS,
  PAGE_BANDS,
  PAGE_BAND_LABELS,
  parseEstimatorInput,
  estimateProject,
  type EstimatorField,
  type EstimatorResult,
} from "@/lib/tools/website-estimator";

const CATEGORY_OPTIONS: Record<(typeof BUSINESS_CATEGORIES)[number], string> = {
  hvac: "HVAC (heating & cooling)",
  plumbing: "Plumbing",
  electrical: "Electrical",
  roofing: "Roofing",
  landscaping: "Landscaping / lawn care",
  "other-home-services": "Another home service",
  "professional-services": "Professional services",
  "retail-local": "Retail / local shop",
  other: "Something else",
};

const STEPS = [
  { name: "Your project", fields: ["projectType", "businessCategory", "pageBand"] as EstimatorField[] },
  { name: "Goals & features", fields: ["capabilities", "seoInterest", "aiInterest"] as EstimatorField[] },
  { name: "Readiness & timing", fields: ["contentReadiness", "priority"] as EstimatorField[] },
];

interface Values {
  projectType: string;
  businessCategory: string;
  pageBand: string;
  capabilities: string[];
  seoInterest: string;
  aiInterest: string;
  contentReadiness: string;
  priority: string;
}

const EMPTY: Values = {
  projectType: "",
  businessCategory: "",
  pageBand: "",
  capabilities: [],
  seoInterest: "",
  aiInterest: "",
  contentReadiness: "",
  priority: "",
};

type FieldErrors = Partial<Record<EstimatorField, string>>;

function RadioGroup({
  legend,
  name,
  options,
  value,
  error,
  onChange,
}: {
  legend: string;
  name: EstimatorField;
  options: ReadonlyArray<{ value: string; label: string; hint?: string }>;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `estimator-${name}-error`;
  return (
    <fieldset className="estimator-fieldset" aria-describedby={error ? errorId : undefined}>
      <legend>{legend}</legend>
      <div className="estimator-options">
        {options.map(option => (
          <label className="estimator-option" key={option.value}>
            <input
              type="radio"
              name={`estimator-${name}`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <span className="estimator-option-label">{option.label}</span>
              {option.hint && <span className="estimator-option-hint">{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="error-premium" id={errorId}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Estimator() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<EstimatorResult | null>(null);

  // Focus management (P1.10 defect D1): a step/result change unmounts the
  // control the user activated and focus would fall back to <body>. Move
  // focus to the incoming view's heading instead — but never on initial
  // mount and never when the view did not change (see
  // focusTargetAfterViewChange for the decision table).
  const stepHeadingRef = useRef<HTMLParagraphElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const viewKey = result ? "result" : `step-${step}`;
  const previousViewRef = useRef<string | null>(null);
  useEffect(() => {
    const target = focusTargetAfterViewChange(previousViewRef.current, viewKey);
    previousViewRef.current = viewKey;
    if (target === "step-heading") stepHeadingRef.current?.focus();
    if (target === "result-heading") resultHeadingRef.current?.focus();
  }, [viewKey]);

  function setValue(field: keyof Values, value: string | string[]) {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field as EstimatorField];
      return next;
    });
  }

  function toggleCapability(cap: string) {
    const next = values.capabilities.includes(cap)
      ? values.capabilities.filter(c => c !== cap)
      : [...values.capabilities, cap];
    setValue("capabilities", next);
  }

  function validateStep(index: number): boolean {
    const parsed = parseEstimatorInput(values, STEPS[index].fields);
    if (parsed.ok) {
      setErrors({});
      return true;
    }
    setErrors(parsed.fieldErrors);
    return false;
  }

  function onNext() {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    const outcome = estimateProject(values);
    if (outcome.ok) {
      setResult(outcome.result);
      setErrors({});
    } else {
      setErrors(outcome.fieldErrors);
    }
  }

  function onBack() {
    setErrors({});
    if (result) {
      setResult(null);
      setStep(0);
      return;
    }
    setStep(Math.max(0, step - 1));
  }

  function onStartOver() {
    setValues(EMPTY);
    setErrors({});
    setResult(null);
    setStep(0);
  }

  if (result) {
    return (
      <div className="estimator-result" role="status">
        {result.outcome === "tiered" ? (
          <>
            <p className="estimator-result-eyebrow">YOUR RECOMMENDED PACKAGE</p>
            <h3 ref={resultHeadingRef} tabIndex={-1}>
              {result.tierName}
            </h3>
            <ul className="estimator-summary">
              {result.scopeSummary.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="estimator-complexity">
              <strong>{result.complexity.label}</strong>
              {result.complexity.reasons.length > 0 && (
                <span> — based on: {result.complexity.reasons.join("; ").toLowerCase()}.</span>
              )}
            </p>
            <h4>Included in {result.tierName}</h4>
            <ul className="estimator-checklist">
              {result.included.map(item => (
                <li key={item}>
                  <Icon name="check" />
                  {item}
                </li>
              ))}
            </ul>
            {result.additionalScope.length > 0 && (
              <>
                <h4>Additional scope you selected</h4>
                <ul className="estimator-checklist">
                  {result.additionalScope.map(item => (
                    <li key={item}>
                      <Icon name="check" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="helper-premium">
                  Additional items are scoped and priced in your written proposal — nothing is
                  added silently.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p className="estimator-result-eyebrow">YOUR ESTIMATE</p>
            <h3 ref={resultHeadingRef} tabIndex={-1}>
              {result.heading}
            </h3>
            <ul className="estimator-summary">
              {result.scopeSummary.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="estimator-explanation">{result.explanation}</p>
          </>
        )}

        <h4>Good to know</h4>
        <ul className="estimator-assumptions">
          {result.assumptions.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="estimator-nav">
          <PremiumCTA href={result.nextStep.href}>{result.nextStep.label}</PremiumCTA>
          <button type="button" className="button-indigo-secondary" onClick={onBack}>
            Edit your answers
          </button>
          <button type="button" className="button-indigo-secondary" onClick={onStartOver}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="estimator">
      <div className="estimator-progress-row">
        <p className="estimator-progress-label" ref={stepHeadingRef} tabIndex={-1}>
          Step {step + 1} of {STEPS.length} — {STEPS[step].name}
        </p>
        <div
          className="estimator-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Estimator progress"
        >
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="lead-alert" role="alert">
          Please answer the highlighted {Object.keys(errors).length === 1 ? "question" : "questions"} to continue.
        </p>
      )}

      {step === 0 && (
        <>
          <RadioGroup
            legend="What do you need?"
            name="projectType"
            value={values.projectType}
            error={errors.projectType}
            onChange={value => setValue("projectType", value)}
            options={[
              { value: "new", label: "A new website", hint: "Starting from scratch" },
              { value: "redesign", label: "A redesign", hint: "Replacing or rebuilding my current site" },
            ]}
          />
          <div className="field-premium">
            <label htmlFor="estimator-businessCategory">
              What kind of business do you run?{" "}
              <span className="required-mark" aria-hidden="true">*</span>
            </label>
            <select
              id="estimator-businessCategory"
              className="select-premium"
              value={values.businessCategory}
              onChange={event => setValue("businessCategory", event.target.value)}
              aria-invalid={errors.businessCategory ? true : undefined}
              aria-describedby={errors.businessCategory ? "estimator-businessCategory-error" : undefined}
            >
              <option value="">Choose your business type…</option>
              {BUSINESS_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {CATEGORY_OPTIONS[category]}
                </option>
              ))}
            </select>
            {errors.businessCategory && (
              <p className="error-premium" id="estimator-businessCategory-error">
                {errors.businessCategory}
              </p>
            )}
          </div>
          <RadioGroup
            legend="About how many pages do you need?"
            name="pageBand"
            value={values.pageBand}
            error={errors.pageBand}
            onChange={value => setValue("pageBand", value)}
            options={PAGE_BANDS.map(band => ({
              value: band,
              label: band === "20+" ? "20 or more pages" : `${PAGE_BAND_LABELS[band]} pages`,
            }))}
          />
        </>
      )}

      {step === 1 && (
        <>
          <fieldset className="estimator-fieldset">
            <legend>Which of these does your website need?</legend>
            <p className="helper-premium">Choose any that apply — or none.</p>
            <div className="estimator-options">
              {CAPABILITIES.map(cap => (
                <label className="estimator-option" key={cap}>
                  <input
                    type="checkbox"
                    checked={values.capabilities.includes(cap)}
                    onChange={() => toggleCapability(cap)}
                  />
                  <span className="estimator-option-label">{CAPABILITY_LABELS[cap]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <RadioGroup
            legend="How much does being found in local Google search matter?"
            name="seoInterest"
            value={values.seoInterest}
            error={errors.seoInterest}
            onChange={value => setValue("seoInterest", value)}
            options={[
              { value: "on-page-basics", label: "On-page basics are enough", hint: "Correct titles, descriptions and headings" },
              { value: "local-seo", label: "A local SEO foundation matters", hint: "Structured to be found by nearby customers" },
            ]}
          />
          <RadioGroup
            legend="What about AI search — ChatGPT, AI overviews and assistants?"
            name="aiInterest"
            value={values.aiInterest}
            error={errors.aiInterest}
            onChange={value => setValue("aiInterest", value)}
            options={[
              { value: "not-now", label: "Not a priority right now" },
              { value: "ai-visibility", label: "I want to be represented accurately in AI answers" },
            ]}
          />
        </>
      )}

      {step === 2 && (
        <>
          <RadioGroup
            legend="How ready is your content — text and photos?"
            name="contentReadiness"
            value={values.contentReadiness}
            error={errors.contentReadiness}
            onChange={value => setValue("contentReadiness", value)}
            options={[
              { value: "ready", label: "Ready to go", hint: "Text and photos are prepared" },
              { value: "partial", label: "Some of it is ready" },
              { value: "need-help", label: "I need help creating it" },
            ]}
          />
          <RadioGroup
            legend="How urgent is the project?"
            name="priority"
            value={values.priority}
            error={errors.priority}
            onChange={value => setValue("priority", value)}
            options={[
              { value: "standard", label: "A standard timeline is fine" },
              { value: "priority", label: "It is a priority", hint: "The sooner, the better" },
            ]}
          />
        </>
      )}

      <div className="estimator-nav">
        {step > 0 && (
          <button type="button" className="button-indigo-secondary" onClick={onBack}>
            Back
          </button>
        )}
        <button type="button" className="button-indigo" onClick={onNext}>
          {step < STEPS.length - 1 ? "Continue" : "See My Estimate"}
        </button>
      </div>
    </div>
  );
}
