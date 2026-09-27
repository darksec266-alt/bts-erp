/** @type {import('tailwindcss').Config} */
const path = require("path");
// Every value here is sourced directly from docs/ui.md §2-4 (v3.0 design
// tokens) — component code should reference these token names
// (e.g. `bg-primary`, `text-ink`), never raw hex values (ui.md §2).
module.exports = {
  content: [
    path.resolve(__dirname, "./src/**/*.{js,ts,jsx,tsx,mdx}"),
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2F6FED",
          hover: "#1E56C9",
          tint: "rgba(47,111,237,.10)",
          "tint-strong": "rgba(47,111,237,.16)",
        },
        success: { DEFAULT: "#16A34A", tint: "rgba(22,163,74,.12)" },
        warning: { DEFAULT: "#DA8B14", tint: "rgba(240,194,68,.20)" },
        danger: { DEFAULT: "#D73E3D", tint: "rgba(215,62,61,.12)" },
        purple: { DEFAULT: "#7C5CFC", tint: "rgba(124,92,252,.12)" },
        teal: { DEFAULT: "#0EA5A0", tint: "rgba(14,165,160,.12)" },
        ink: "#0D0B33",
        "text-muted": "#5C5C5C",
        border: "#E4E6ED",
        surface: "#FFFFFF",
        "page-bg": "#F5F6FA",
        sidebar: {
          bg: "#0A1730",
          "bg-hover": "#132646",
          text: "#9FACCB",
          "text-active": "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        h1: ["26px", { lineHeight: "34px", fontWeight: "700" }],
        h2: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        h3: ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-strong": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        label: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      spacing: {
        // 4px base unit, exact steps only (ui.md §4) — extends Tailwind's
        // default scale rather than replacing it, since the default scale
        // already covers these px values at different key names.
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
      },
      boxShadow: {
        "elevation-1": "0 1px 2px rgba(13,11,51,0.06)",
        "elevation-2": "0 8px 24px rgba(13,11,51,0.12)",
      },
      maxWidth: {
        content: "1440px",
        form: "960px",
      },
    },
  },
  plugins: [],
};
