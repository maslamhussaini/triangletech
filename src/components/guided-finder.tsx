"use client";

import { useState } from "react";
import { RouteLink } from "./navigation";
import { Icon } from "./icons";
import { business, finderQuestions, products } from "@/lib/site";

type Weights = Record<string, number>;

export function GuidedProductFinder() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Weights>({});
  const done = step >= finderQuestions.length;

  function choose(weights: Partial<Record<string, number>>) {
    setScores(prev => {
      const next = { ...prev };
      for (const [id, w] of Object.entries(weights)) next[id] = (next[id] ?? 0) + (w ?? 0);
      return next;
    });
    setStep(s => s + 1);
  }

  function restart() { setStep(0); setScores({}); }

  const topId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0];
  const recommended = products.find(p => p.id === topId);

  return <div className="finder-panel">
    {!done && <>
      <div className="finder-progress"><span style={{ width: `${(step / finderQuestions.length) * 100}%` }} /></div>
      <span className="eyebrow">QUESTION {step + 1} OF {finderQuestions.length}</span>
      <h3>{finderQuestions[step].question}</h3>
      <div className="finder-options">
        {finderQuestions[step].options.map(opt => <button key={opt.label} className="finder-option" onClick={() => choose(opt.weights as Partial<Record<string, number>>)}>{opt.label}<Icon name="arrow" /></button>)}
      </div>
    </>}
    {done && <div className="finder-result">
      {recommended ? <>
        <span className="eyebrow">RECOMMENDED FOR YOU</span>
        <h3>{recommended.name}</h3>
        <p>{recommended.description}</p>
        <p className="finder-reason">Based on your answers, {recommended.name} best matches how your business operates.</p>
      </> : <>
        <span className="eyebrow">RECOMMENDED FOR YOU</span>
        <h3>Custom Software Consultation</h3>
        <p>Your business needs don&apos;t map neatly to one product — let&apos;s talk through a custom solution.</p>
      </>}
      <div className="hero-actions">
        <RouteLink className="button button-accent" href={`/contact?interest=${encodeURIComponent(recommended?.name ?? "Custom Software")}`}>Book a Demo<Icon name="arrow" /></RouteLink>
        <a className="button button-outline-dark" href={business.whatsappPrimary} target="_blank" rel="noopener noreferrer"><Icon name="chat" />WhatsApp Us</a>
      </div>
      <button className="text-link finder-restart" onClick={restart}>Start over<Icon name="arrow" /></button>
    </div>}
  </div>;
}
