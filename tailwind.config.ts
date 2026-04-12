import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ades: {
          bg: "#F7F8FC",
          ink: "#0F172A",
          accent: "#2563EB",
          soft: "#E2E8F0"
        }
      }
    }
  },
  plugins: []
};

export default config;
