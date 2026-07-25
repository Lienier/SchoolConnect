export const colors = {
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
    hover: "#233a66",
    active: "#152238",
  },
  secondary: {
    DEFAULT: "#ffffff",
    foreground: "#152238",
    hover: "#f8fafc",
    active: "#f1f5f9",
  },
  accent: {
    DEFAULT: "#6b7280",
    foreground: "#ffffff",
    hover: "#4b5563",
    muted: "#9ca3af",
  },
  status: {
    success: {
      DEFAULT: "#059669",
      light: "#d1fae5",
      dark: "#065f46",
      foreground: "#ffffff",
    },
    warning: {
      DEFAULT: "#d97706",
      light: "#fef3c7",
      dark: "#92400e",
      foreground: "#ffffff",
    },
    danger: {
      DEFAULT: "#dc2626",
      light: "#fee2e2",
      dark: "#991b1b",
      foreground: "#ffffff",
    },
    info: {
      DEFAULT: "#2563eb",
      light: "#dbeafe",
      dark: "#1e40af",
      foreground: "#ffffff",
    },
  },
  background: {
    primary: "#f8fafc",
    secondary: "#ffffff",
    tertiary: "#f1f5f9",
    overlay: "rgba(21, 34, 56, 0.4)",
  },
  border: {
    DEFAULT: "#e2e8f0",
    strong: "#cbd5e1",
    focus: "#1b2d4f",
  },
  text: {
    primary: "#152238",
    secondary: "#475569",
    tertiary: "#94a3b8",
    inverse: "#ffffff",
    link: "#2563eb",
  },
} as const;

export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
    mono: ["JetBrains Mono", "Fira Code", "monospace"],
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1" }],
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

export const borderRadius = {
  none: "0",
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgba(21, 34, 56, 0.05)",
  sm: "0 1px 3px 0 rgba(21, 34, 56, 0.1), 0 1px 2px -1px rgba(21, 34, 56, 0.1)",
  DEFAULT: "0 4px 6px -1px rgba(21, 34, 56, 0.1), 0 2px 4px -2px rgba(21, 34, 56, 0.1)",
  md: "0 10px 15px -3px rgba(21, 34, 56, 0.1), 0 4px 6px -4px rgba(21, 34, 56, 0.1)",
  lg: "0 20px 25px -5px rgba(21, 34, 56, 0.1), 0 8px 10px -6px rgba(21, 34, 56, 0.1)",
  xl: "0 25px 50px -12px rgba(21, 34, 56, 0.15)",
  "2xl": "0 25px 50px -12px rgba(21, 34, 56, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(21, 34, 56, 0.05)",
  soft: "0 4px 20px -4px rgba(21, 34, 56, 0.12)",
  card: "0 2px 12px -2px rgba(21, 34, 56, 0.08)",
  focus: "0 0 0 3px rgba(27, 45, 79, 0.2)",
} as const;

export const transitions = {
  fast: "150ms ease",
  DEFAULT: "200ms ease",
  slow: "300ms ease",
} as const;

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

export const breakpoints = {
  xs: "320px",
  sm: "375px",
  md: "425px",
  lg: "768px",
  xl: "1024px",
  "2xl": "1280px",
  "3xl": "1536px",
} as const;

export const container = {
  maxWidth: "1440px",
  padding: "1.5rem",
} as const;

export const iconSizes = {
  xs: "14px",
  sm: "16px",
  md: "20px",
  lg: "24px",
  xl: "28px",
  "2xl": "32px",
} as const;

export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  container,
  iconSizes,
} as const;

export type DesignTokens = typeof designTokens;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Transitions = typeof transitions;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type IconSizes = typeof iconSizes;