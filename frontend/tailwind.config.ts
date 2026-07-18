import type { Config } from "tailwindcss";

/**
 * SchoolConnect theme: Modern Minimal.
 * Primary: Navy Blue | Secondary: White | Accent: Gray.
 * Large border radius, comfortable spacing, soft shadows.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        navy: {
          50: "#eef2f9",
          100: "#d6e0f0",
          200: "#adc0e0",
          300: "#7f9bcd",
          400: "#5678b8",
          500: "#3a5a9e",
          600: "#2c477d",
          700: "#233a66",
          800: "#1b2d4f",
          900: "#152238",
          950: "#0d1526",
        },
        primary: {
          DEFAULT: "#1b2d4f",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#6b7280",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(21, 34, 56, 0.12)",
        card: "0 2px 12px -2px rgba(21, 34, 56, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
