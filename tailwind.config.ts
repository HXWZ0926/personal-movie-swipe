import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080B12",
        panel: "rgba(19, 24, 35, 0.72)",
        ember: "#F97316",
        mint: "#34D399",
        skyglass: "#38BDF8"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(20, 184, 166, 0.2)",
        card: "0 30px 90px rgba(0, 0, 0, 0.42)"
      }
    }
  },
  plugins: []
};

export default config;
