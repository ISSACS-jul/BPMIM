/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          50: withOpacity('--color-slate-50'),
          100: withOpacity('--color-slate-100'),
          200: withOpacity('--color-slate-200'),
          300: withOpacity('--color-slate-300'),
          400: withOpacity('--color-slate-400'),
          500: withOpacity('--color-slate-500'),
          600: withOpacity('--color-slate-600'),
          700: withOpacity('--color-slate-700'),
          750: withOpacity('--color-slate-750'),
          800: withOpacity('--color-slate-800'),
          850: withOpacity('--color-slate-850'),
          900: withOpacity('--color-slate-900'),
          950: withOpacity('--color-slate-950'),
        },
        sky: {
          50: withOpacity('--color-sky-50'),
          100: withOpacity('--color-sky-100'),
          200: withOpacity('--color-sky-200'),
          300: withOpacity('--color-sky-300'),
          400: withOpacity('--color-sky-400'),
          500: withOpacity('--color-sky-500'),
          600: withOpacity('--color-sky-600'),
          700: withOpacity('--color-sky-700'),
          800: withOpacity('--color-sky-800'),
          900: withOpacity('--color-sky-900'),
          950: withOpacity('--color-sky-950'),
        },
        dark: {
          950: withOpacity('--color-slate-950'),
          900: withOpacity('--color-slate-900'),
          850: withOpacity('--color-slate-850'),
          800: withOpacity('--color-slate-800'),
          750: withOpacity('--color-slate-750'),
          700: withOpacity('--color-slate-700'),
          600: withOpacity('--color-slate-600'),
          500: withOpacity('--color-slate-500'),
        },
        brand: {
          50: withOpacity('--color-sky-50'),
          100: withOpacity('--color-sky-100'),
          200: withOpacity('--color-sky-200'),
          300: withOpacity('--color-sky-300'),
          400: withOpacity('--color-sky-400'),
          500: withOpacity('--color-sky-500'),
          600: withOpacity('--color-sky-600'),
          700: withOpacity('--color-sky-700'),
          800: withOpacity('--color-sky-800'),
          900: withOpacity('--color-sky-900'),
          950: withOpacity('--color-sky-950'),
        },
        accent: {
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          indigo: "#6366f1",
        },
        clmim: {
          blue: "#3b82f6",
          cyan: "#22d3ee",
          amber: "#f59e0b",
          emerald: "#10b981",
          rose: "#f43f5e",
          violet: "#8b5cf6",
          indigo: "#6366f1",
          slate: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "clmim": "0 0 0 1px rgba(var(--color-sky-500) / 0.2), 0 4px 24px rgba(0,0,0,0.5)",
        "clmim-sm": "0 1px 8px rgba(0,0,0,0.4)",
        "clmim-glow": "0 0 12px rgba(var(--color-sky-500) / 0.3)",
      },
    },
  },
  plugins: [],
};
