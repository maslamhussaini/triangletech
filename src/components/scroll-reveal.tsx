"use client";

import { useEffect } from "react";

/**
 * Lightweight scroll reveal. One observer for the whole page, no library.
 * Elements opt in with `data-reveal`; CSS handles the actual transition and
 * honours prefers-reduced-motion, so this only toggles a class.
 */
export function ScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (nodes.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach(node => node.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}
