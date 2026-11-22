/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#07090f",
          900: "#0d1117",
          850: "#111827",
          800: "#161e2e",
          780: "#1a2235",
          750: "#1e2a3e",
          700: "#243048",
          600: "#2e3f5a",
          500: "#3d5270",
        },
        brand: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        clmim: {
          blue:    "#3b82f6",
          cyan:    "#22d3ee",
          amber:   "#f59e0b",
          emerald: "#10b981",
          rose:    "#f43f5e",
          violet:  "#8b5cf6",
          indigo:  "#6366f1",
          slate:   "#64748b",
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "clmim": "0 0 0 1px rgba(59,130,246,0.15), 0 4px 24px rgba(0,0,0,0.5)",
        "clmim-sm": "0 1px 8px rgba(0,0,0,0.4)",
        "clmim-glow": "0 0 12px rgba(59,130,246,0.25)",
      },
    },
  },
  plugins: [],
}
