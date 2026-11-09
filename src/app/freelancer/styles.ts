/**
 * Freelancer app — shared inline styles (M2).
 *
 * Inline styles on purpose: the app shell is a separate product surface
 * and must not restyle the website (theme-indigo.css is ADDITIVE ONLY).
 * Palette is the premium Indigo set: primary #4F46E5, deep #312E81,
 * violet #7C5CFF, light #EEF0FF, dark text #1B1B4B.
 */
import type { CSSProperties } from "react";

export const INDIGO = "#4F46E5";
export const INDIGO_DEEP = "#312E81";
export const INDIGO_LIGHT = "#EEF0FF";
export const INK = "#1B1B4B";
export const MUTED = "#64748B";
export const BORDER = "#E2E8F0";
export const DANGER = "#DC2626";
export const DANGER_BG = "#FEF2F2";
export const WARN_BG = "#FFFBEB";
export const WARN_BORDER = "#FCD34D";

export const pageWrap: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "16px 16px 32px",
};

export const card: CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

export const h1: CSSProperties = { fontSize: 22, lineHeight: 1.25, color: INK, margin: "4px 0 4px" };
export const h2: CSSProperties = { fontSize: 17, lineHeight: 1.3, color: INK, margin: "0 0 8px" };
export const h3: CSSProperties = { fontSize: 15, lineHeight: 1.35, color: INK, margin: "0 0 6px" };
export const mutedText: CSSProperties = { color: MUTED, fontSize: 14, lineHeight: 1.5, margin: "0 0 8px" };

export const label: CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: INK,
  marginBottom: 4,
};

export const input: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  border: `1px solid #CBD5E1`,
  borderRadius: 8,
  fontSize: 16,
  color: INK,
  background: "#FFFFFF",
  boxSizing: "border-box",
};

export const row: CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
export const field: CSSProperties = { flex: "1 1 140px", minWidth: 0, marginBottom: 12 };

export const primaryButton: CSSProperties = {
  minHeight: 48,
  padding: "12px 20px",
  border: "none",
  borderRadius: 10,
  background: INDIGO,
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  minHeight: 44,
  padding: "10px 16px",
  border: `1px solid #CBD5E1`,
  borderRadius: 10,
  background: "#FFFFFF",
  color: INK,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export const dangerButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "#FCA5A5",
  color: DANGER,
};

export const errorText: CSSProperties = { color: DANGER, fontSize: 14, lineHeight: 1.45, margin: "4px 0 0" };
export const noticeBox: CSSProperties = {
  background: WARN_BG,
  border: `1px solid ${WARN_BORDER}`,
  padding: 12,
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 14,
  lineHeight: 1.5,
  color: INK,
};
export const alertBox: CSSProperties = {
  background: DANGER_BG,
  border: "1px solid #FCA5A5",
  padding: 12,
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 14,
  lineHeight: 1.5,
  color: INK,
};
