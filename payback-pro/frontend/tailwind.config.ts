import type { Config } from "tailwindcss";

// Design system: "Ledger" — evokes a passbook / lending ledger.
// Paper tones + ink navy + moss (recovered) + rust (overdue) + amber (pending).
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FAF8F3",
          muted: "#F1EDE3",
        },
        ink: {
          DEFAULT: "#1C2333",
          light: "#2E3750",
          muted: "#5B6478",
        },
        moss: {
          DEFAULT: "#3F6B4F",
          light: "#E7EFE8",
        },
        rust: {
          DEFAULT: "#B4552D",
          light: "#F6E6DC",
        },
        amber: {
          DEFAULT: "#B8862B",
          light: "#F7EEDC",
        },
        line: "#E4DFD2",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "stub-tear":
          "repeating-linear-gradient(to right, transparent 0 6px, #E4DFD2 6px 8px)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,35,51,0.04), 0 1px 12px rgba(28,35,51,0.05)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
