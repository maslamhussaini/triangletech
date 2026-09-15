const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/page.tsx",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aligned with the :root tokens in src/app/globals.css (these values
        // had drifted). No Tailwind colour utility is used anywhere in the
        // codebase, so this is a documentation-level fix only.
        navy: "#071A2B",
        cyan: "#22D3EE",
        blue: "#2F80ED",
        emerald: "#35D07F",
        violet: "#8b7bff",
        // Indigo Intelligence brand scale (src/app/theme-indigo.css).
        brand: "#4F46E5",
        "brand-strong": "#312E81",
        "brand-soft": "#EEF0FF",
        "brand-secondary": "#7C5CFF",
      },
    },
  },
};

export default config;
