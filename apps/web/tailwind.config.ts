import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#1f2320",
        "ink-muted": "#5f5d57",
        sand: {
          50: "#fdf7f0",
          100: "#f7ecdf",
          200: "#efdac3",
          300: "#e6c6a1",
          400: "#d8a56f",
          500: "#c98545",
          600: "#b16d37",
          700: "#8e552c",
          800: "#6f4225",
          900: "#54331d",
        },
        ocean: {
          50: "#f0f8f7",
          100: "#d3ece8",
          200: "#a7d9d2",
          300: "#6fbfb6",
          400: "#3aa39b",
          500: "#19867f",
          600: "#0f6a63",
          700: "#0b4f4a",
          800: "#083b38",
          900: "#062c2a",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-bottom": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.8s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        shake: "shake 0.3s ease-in-out",
      },
      boxShadow: {
        "glow-ocean": "0 0 20px -5px rgba(25, 134, 127, 0.4)",
        "glow-emerald": "0 0 20px -5px rgba(16, 185, 129, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
