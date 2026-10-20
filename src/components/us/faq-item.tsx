import type { FaqEntry } from "@/lib/us/landing";

/**
 * FAQItem — one question/answer disclosure using native <details>/<summary>,
 * the same pattern as the existing /faq page (styles come from .faq-list in
 * globals.css, so render items inside a .faq-list container). Keyboard
 * accessible with zero JavaScript. Server Component.
 */
export function FAQItem({
  entry,
  index,
}: {
  entry: FaqEntry;
  index?: number;
}) {
  return (
    <details>
      <summary>
        {typeof index === "number" && (
          <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
        )}
        {entry.question}
        <span className="faq-plus" aria-hidden="true">
          +
        </span>
      </summary>
      <p>{entry.answer}</p>
    </details>
  );
}

export function FAQList({ children }: { children: React.ReactNode }) {
  return <div className="faq-list">{children}</div>;
}
