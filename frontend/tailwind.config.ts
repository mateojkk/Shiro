import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        shiro: {
          bg: "#080808",
          obsidian: "#000000",
          card: "#101010",
          cardHover: "#161616",
          panel: "#0C0C0C",
          border: "rgba(255, 255, 255, 0.05)",
          borderHover: "rgba(255, 255, 255, 0.12)",
          accent: "#FFFFFF",
          muted: "#888888",
          subtle: "#444444",
        },
        okx: {
          DEFAULT: "#00E266",
          hover: "#00FF70",
          glow: "rgba(0, 226, 102, 0.08)",
          border: "rgba(0, 226, 102, 0.15)",
          dark: "#031F0F",
          subtle: "#00401C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
      },
    },
  },
  plugins: [],
};
export default config;
