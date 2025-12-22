/**
 * Theme definitions for the application
 */

export type ThemeId = "default" | "cult-of-the-lamb";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    dice1: string;
    dice2: string;
    dice3: string;
    dice4: string;
    dice5: string;
    dice6: string;
  };
}

/**
 * Default theme - the original KnuckleTrainer theme
 */
export const defaultTheme: Theme = {
  id: "default",
  name: "Default",
  description: "The original KnuckleTrainer theme",
  colors: {
    background: "30 20% 6%",
    foreground: "40 30% 95%",
    card: "30 20% 10%",
    cardForeground: "40 30% 95%",
    muted: "30 15% 18%",
    mutedForeground: "40 15% 65%",
    accent: "38 90% 55%",
    accentForeground: "30 20% 6%",
    primary: "0 75% 55%",
    primaryForeground: "40 30% 98%",
    secondary: "280 50% 40%",
    secondaryForeground: "40 30% 95%",
    destructive: "0 85% 60%",
    destructiveForeground: "40 30% 98%",
    border: "30 20% 20%",
    input: "30 20% 15%",
    ring: "38 90% 55%",
    dice1: "0 70% 50%",
    dice2: "30 80% 50%",
    dice3: "50 85% 50%",
    dice4: "120 60% 40%",
    dice5: "200 70% 50%",
    dice6: "280 60% 50%",
  },
};

/**
 * Cult of the Lamb theme - inspired by the game's distinctive color palette
 * Features deep purples/blacks, bright magentas/pinks, warm oranges, and vibrant greens
 */
export const cultOfTheLambTheme: Theme = {
  id: "cult-of-the-lamb",
  name: "Cult of the Lamb",
  description: "Inspired by the game's distinctive art style",
  colors: {
    background: "280 30% 8%", // Deep purple-black
    foreground: "320 40% 95%", // Soft pink-white
    card: "280 25% 12%", // Slightly lighter purple-black
    cardForeground: "320 35% 95%",
    muted: "280 20% 20%",
    mutedForeground: "320 25% 65%",
    accent: "320 85% 65%", // Bright magenta/pink
    accentForeground: "280 30% 8%",
    primary: "340 90% 60%", // Vibrant pink-red
    primaryForeground: "320 40% 98%",
    secondary: "280 60% 50%", // Rich purple
    secondaryForeground: "320 40% 95%",
    destructive: "0 85% 60%", // Bright red
    destructiveForeground: "320 40% 98%",
    border: "280 25% 25%",
    input: "280 20% 15%",
    ring: "320 85% 65%",
    dice1: "340 90% 60%", // Pink-red
    dice2: "320 85% 65%", // Magenta
    dice3: "30 90% 60%", // Warm orange
    dice4: "140 60% 50%", // Vibrant green
    dice5: "200 70% 55%", // Cyan-blue
    dice6: "280 70% 60%", // Bright purple
  },
};

export const themes: Record<ThemeId, Theme> = {
  default: defaultTheme,
  "cult-of-the-lamb": cultOfTheLambTheme,
};

export const themeIds: ThemeId[] = Object.keys(themes) as ThemeId[];
