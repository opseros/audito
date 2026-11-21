import type { Config } from "tailwindcss";

// Tokens taken from the AuditMesh prototype.
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
    },
  },
  plugins: [],
} satisfies Config;
