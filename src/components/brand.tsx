export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand ${compact ? "brand-compact" : ""}`}>
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" width={compact ? 26 : 34} height={compact ? 26 : 34}>
        <path d="M20 4 36 33H4Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M20 15 27.5 28H12.5Z" fill="currentColor" />
      </svg>
    </span>
    {!compact && <span className="brand-name">TriangleTech<span>BUSINESS SOFTWARE &amp; DIGITAL SOLUTIONS</span></span>}
  </span>;
}
