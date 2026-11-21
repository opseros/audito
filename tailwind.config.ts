import type { Config } from "tailwindcss";

// Tokens taken from the AuditOps prototype.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
      },
      colors: {
        canvas: "#F6F7F9",
        ink: "#0F172A",
        muted: "#475569",
        label: "#334155",
        line: "#E2E8F0",
        hair: "#F1F5F9",
        field: "#CBD5E1",
        org: { DEFAULT: "#2B4ACB", tint: "#E6EBFB", ink: "#1E3796", dark: "#1E3796" },
        auditor: { DEFAULT: "#0F6B5C", tint: "#E3F1EE", ink: "#0A4F44", soft: "#F0F7F5" },
        provider: { DEFAULT: "#B4500F", tint: "#FBEDE3", ink: "#6E2F08" },
        admin: { DEFAULT: "#6D28D9", tint: "#EDE9FE", ink: "#4C1D95" },
        danger: { DEFAULT: "#B42318", tint: "#FDECEA" },
        warn: { DEFAULT: "#8A4B08", tint: "#FEF3E2" },
      },
      borderRadius: { card: "12px" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        "pop-in": { "0%": { opacity: "0", transform: "scale(0.85)" }, "100%": { opacity: "1", transform: "none" } },
        "slide-in": { "0%": { opacity: "0", transform: "translateX(-10px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        glow: { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "0.9" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in": "slide-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
        glow: "glow 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
