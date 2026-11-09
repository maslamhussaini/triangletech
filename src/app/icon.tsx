import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#1B1B4B", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
      <svg width="44" height="44" viewBox="0 0 40 40">
        <path d="M20 4 36 33H4Z" fill="none" stroke="#A79BFF" strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 15 27.5 28H12.5Z" fill="#7C5CFF" />
      </svg>
    </div>,
    size
  );
}
