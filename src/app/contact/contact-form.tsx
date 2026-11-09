"use client";

import { useSearchParams } from "next/navigation";
import { DemoRequestForm } from "@/components/demo-form";
import { demoOptions } from "@/lib/site";

/**
 * Demo-request form that reads `?interest=` on the client.
 *
 * The /contact page used to await server `searchParams`, which opts the
 * page into dynamic rendering and blocks the mobile static export
 * (`output: 'export'`). Reading the same parameter with `useSearchParams`
 * inside a <Suspense> boundary keeps the page statically exportable while
 * preserving behaviour: the interest value is applied after hydration
 * (the Suspense fallback renders the general form first).
 */
export function ContactForm() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("interest") ?? "";
  const interest = demoOptions.find((o) => o === raw) ?? raw;
  return <DemoRequestForm key={interest || "general"} initialInterest={interest} />;
}
