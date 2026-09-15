import { ImageResponse } from "next/og";

export const alt = "TriangleTech — Business Software and Digital Solutions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#071A2B", color: "#ffffff", display: "flex", padding: 70, alignItems: "center", gap: 56 }}>
      <div style={{ display: "flex", background: "#0e1c38", borderRadius: 24, padding: 28, border: "1px solid #1c2f52" }}>
        <svg width="150" height="150" viewBox="0 0 40 40">
          <path d="M20 4 36 33H4Z" fill="none" stroke="#22D3EE" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M20 15 27.5 28H12.5Z" fill="#22D3EE" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 21, color: "#22D3EE", marginBottom: 24, letterSpacing: 2 }}>TRIANGLETECH</div>
        <div style={{ fontSize: 60, lineHeight: 1.1, marginBottom: 26 }}>Technology That Moves Your Business Forward</div>
        <div style={{ fontSize: 24, color: "#a9b8d4" }}>Business software · Web · Mobile · Ecommerce</div>
      </div>
    </div>,
    size
  );
}
