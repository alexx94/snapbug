import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "on-tertiary-fixed": "#002020",
        "on-error": "#ffffff",
        "secondary-fixed": "#ffd7f5",
        "on-surface": "#121c2b",
        "surface-container": "#e6eeff",
        "surface-tint": "#006e15",
        "surface-container-low": "#f0f3ff",
        "surface-container-lowest": "#ffffff",
        "on-primary-fixed": "#002202",
        "on-surface-variant": "#3d4a3a",
        "surface-container-high": "#dee9fd",
        "tertiary-fixed-dim": "#00dddd",
        background: "#f9f9ff",
        "on-error-container": "#93000a",
        "inverse-primary": "#54e256",
        "on-secondary-fixed-variant": "#810081",
        "inverse-on-surface": "#ebf1ff",
        "secondary-container": "#fe00fe",
        secondary: "#a900a9",
        outline: "#6d7b68",
        tertiary: "#006a6a",
        "surface-bright": "#f9f9ff",
        "secondary-fixed-dim": "#ffabf3",
        "on-primary-container": "#006a14",
        "inverse-surface": "#273140",
        "on-secondary-fixed": "#380038",
        "primary-fixed-dim": "#54e256",
        "on-background": "#121c2b",
        "tertiary-container": "#00ebeb",
        "outline-variant": "#bccbb5",
        "on-primary": "#ffffff",
        "on-tertiary-fixed-variant": "#004f4f",
        "tertiary-fixed": "#00fbfb",
        primary: "#006e15",
        "on-primary-fixed-variant": "#00530e",
        "surface-container-highest": "#d9e3f7",
        "on-tertiary-container": "#006666",
        "on-tertiary": "#ffffff",
        "error-container": "#ffdad6",
        "surface-variant": "#d9e3f7",
        "on-secondary": "#ffffff",
        surface: "#f9f9ff",
        "primary-container": "#62ef62",
        error: "#ba1a1a",
        "surface-dim": "#d0daef",
        "on-secondary-container": "#500050",
        "primary-fixed": "#73ff70"
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      spacing: {
        unit: "8px",
        gutter: "24px",
        "margin-sm": "16px",
        "margin-md": "32px",
        "margin-lg": "48px",
        "container-max": "1280px"
      },
      fontFamily: {
        "display-lg": ["Bricolage Grotesque", "system-ui", "sans-serif"],
        "headline-lg": ["Bricolage Grotesque", "system-ui", "sans-serif"],
        "headline-lg-mobile": ["Bricolage Grotesque", "system-ui", "sans-serif"],
        "headline-md": ["Bricolage Grotesque", "system-ui", "sans-serif"],
        "body-lg": ["Rubik", "Arial", "sans-serif"],
        "body-md": ["Rubik", "Arial", "sans-serif"],
        "label-md": ["Space Mono", "Consolas", "monospace"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "0", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "500" }]
      },
      boxShadow: {
        brutal: "6px 6px 0px 0px #121c2b",
        "brutal-lg": "10px 10px 0px 0px #121c2b",
        "brutal-sm": "4px 4px 0px 0px #121c2b"
      }
    }
  },
  plugins: []
};

export default config;
