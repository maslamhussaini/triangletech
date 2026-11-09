export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand ${compact ? "brand-compact" : ""}`}>
    <span className="brand-mark" aria-hidden="true">
      <img src="/triangletech-logo.png" alt="" width={compact ? 34 : 48} height={compact ? 34 : 48} style={{ display: "block", width: compact ? 34 : 48, height: compact ? 34 : 48 }} />
    </span>
    {!compact && <span className="brand-name">TriangleTech<span>BUSINESS SOFTWARE &amp; DIGITAL SOLUTIONS</span></span>}
  </span>;
}
