import { RouteLink } from "@/components/navigation";
import { Icon } from "@/components/icons";

/**
 * PremiumCTA — the Indigo call-to-action link used on landing surfaces.
 * Primary uses .button-indigo, secondary uses .button-indigo-secondary
 * (add onDark on dark grounds). Internal and external destinations both
 * render through RouteLink so navigation behavior stays consistent with
 * the rest of the site. Server Component.
 */
export function PremiumCTA({
  href,
  children,
  variant = "primary",
  onDark = false,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onDark?: boolean;
  ariaLabel?: string;
}) {
  const className =
    variant === "primary"
      ? "button-indigo"
      : `button-indigo-secondary${onDark ? " on-dark" : ""}`;
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <RouteLink
      className={className}
      href={href}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      <Icon name="arrow" />
    </RouteLink>
  );
}
