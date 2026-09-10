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
        navy: "#081226",
        cyan: "#3fd7ff",
        blue: "#3a7bff",
        emerald: "#22c58f",
        violet: "#8b7bff",
      },
    },
  },
};

export default config;
