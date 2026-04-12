import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ades: {
          bg: "#F5F7FB",
          ink: "#0F172A",
          accent: "#2563EB",
          soft: "#E2E8F0",
          panel: "#FFFFFF",
          board: "#F3F5FA"
        }
      }
    }
  },
  plugins: []
};

export default config;
