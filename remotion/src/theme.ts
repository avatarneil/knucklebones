// KnuckleTrainer color theme - mystical dark aesthetic
export const theme = {
  // Background colors
  background: "hsl(30, 20%, 6%)",
  backgroundLight: "hsl(30, 15%, 12%)",

  // Primary colors
  primary: "hsl(0, 75%, 55%)", // Crimson red
  primaryLight: "hsl(0, 75%, 65%)",

  // Accent colors
  accent: "hsl(38, 90%, 55%)", // Gold/amber
  accentLight: "hsl(38, 90%, 65%)",

  // Secondary
  secondary: "hsl(280, 50%, 40%)", // Mystical purple
  secondaryLight: "hsl(280, 50%, 55%)",

  // Text colors
  textPrimary: "hsl(40, 20%, 95%)",
  textSecondary: "hsl(40, 15%, 70%)",
  textMuted: "hsl(40, 10%, 50%)",

  // Dice colors - each value 1-6 has unique gradient
  dice: {
    1: { from: "#ef4444", to: "#dc2626" }, // Red
    2: { from: "#f97316", to: "#ea580c" }, // Orange
    3: { from: "#eab308", to: "#ca8a04" }, // Yellow
    4: { from: "#22c55e", to: "#16a34a" }, // Green
    5: { from: "#3b82f6", to: "#2563eb" }, // Blue
    6: { from: "#a855f7", to: "#9333ea" }, // Purple
  },
};

// Common styles
export const absoluteFill: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export const flexCenter: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const flexColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};
