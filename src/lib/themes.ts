/**
 * Theme definitions for the application
 */

export type ThemeId = "legacy" | "cult-of-the-lamb" | "dark" | "light" | "ocean" | "forest" | "oled-dark";

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
 * Legacy theme - the original KnuckleTrainer theme
 */
export const legacyTheme: Theme = {
  id: "legacy",
  name: "Legacy",
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

/**
 * Dark theme - modern dark mode with cool tones
 */
export const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  description: "Modern dark mode with cool blue tones",
  colors: {
    background: "220 20% 8%",
    foreground: "220 10% 95%",
    card: "220 15% 12%",
    cardForeground: "220 10% 95%",
    muted: "220 10% 20%",
    mutedForeground: "220 5% 65%",
    accent: "220 90% 60%",
    accentForeground: "220 20% 8%",
    primary: "210 90% 55%",
    primaryForeground: "220 10% 98%",
    secondary: "240 50% 45%",
    secondaryForeground: "220 10% 95%",
    destructive: "0 85% 60%",
    destructiveForeground: "220 10% 98%",
    border: "220 15% 25%",
    input: "220 15% 15%",
    ring: "220 90% 60%",
    dice1: "0 80% 55%",
    dice2: "30 85% 55%",
    dice3: "50 90% 55%",
    dice4: "150 60% 45%",
    dice5: "200 75% 55%",
    dice6: "270 70% 60%",
  },
};

/**
 * Light theme - clean and bright
 */
export const lightTheme: Theme = {
  id: "light",
  name: "Light",
  description: "Clean and bright light mode",
  colors: {
    background: "0 0% 98%",
    foreground: "220 20% 10%",
    card: "0 0% 100%",
    cardForeground: "220 20% 10%",
    muted: "220 10% 95%",
    mutedForeground: "220 10% 40%",
    accent: "220 90% 50%",
    accentForeground: "0 0% 98%",
    primary: "210 90% 50%",
    primaryForeground: "0 0% 98%",
    secondary: "240 30% 85%",
    secondaryForeground: "220 20% 10%",
    destructive: "0 85% 55%",
    destructiveForeground: "0 0% 98%",
    border: "220 10% 85%",
    input: "220 10% 90%",
    ring: "220 90% 50%",
    dice1: "0 80% 50%",
    dice2: "30 85% 50%",
    dice3: "50 90% 50%",
    dice4: "150 60% 40%",
    dice5: "200 75% 50%",
    dice6: "270 70% 55%",
  },
};

/**
 * Ocean theme - deep blues and teals
 */
export const oceanTheme: Theme = {
  id: "ocean",
  name: "Ocean",
  description: "Deep blues and teals like the ocean depths",
  colors: {
    background: "200 40% 8%",
    foreground: "200 20% 95%",
    card: "200 35% 12%",
    cardForeground: "200 20% 95%",
    muted: "200 25% 20%",
    mutedForeground: "200 15% 65%",
    accent: "190 90% 60%",
    accentForeground: "200 40% 8%",
    primary: "200 85% 55%",
    primaryForeground: "200 20% 98%",
    secondary: "180 60% 45%",
    secondaryForeground: "200 20% 95%",
    destructive: "0 85% 60%",
    destructiveForeground: "200 20% 98%",
    border: "200 30% 25%",
    input: "200 30% 15%",
    ring: "190 90% 60%",
    dice1: "0 80% 55%",
    dice2: "30 85% 55%",
    dice3: "50 90% 55%",
    dice4: "160 70% 50%",
    dice5: "200 80% 60%",
    dice6: "220 75% 55%",
  },
};

/**
 * Forest theme - greens and earth tones
 */
export const forestTheme: Theme = {
  id: "forest",
  name: "Forest",
  description: "Natural greens and warm earth tones",
  colors: {
    background: "140 30% 8%",
    foreground: "140 20% 95%",
    card: "140 25% 12%",
    cardForeground: "140 20% 95%",
    muted: "140 20% 20%",
    mutedForeground: "140 15% 65%",
    accent: "140 80% 50%",
    accentForeground: "140 30% 8%",
    primary: "120 70% 45%",
    primaryForeground: "140 20% 98%",
    secondary: "30 60% 45%",
    secondaryForeground: "140 20% 95%",
    destructive: "0 85% 60%",
    destructiveForeground: "140 20% 98%",
    border: "140 25% 25%",
    input: "140 25% 15%",
    ring: "140 80% 50%",
    dice1: "0 80% 55%",
    dice2: "30 85% 55%",
    dice3: "50 90% 55%",
    dice4: "140 70% 50%",
    dice5: "160 70% 50%",
    dice6: "180 70% 50%",
  },
};

/**
 * OLED Dark theme - true black backgrounds optimized for OLED displays
 * Uses pure black (#000000) to allow OLED pixels to turn off completely,
 * saving battery and providing perfect contrast with vibrant accent colors
 */
export const oledDarkTheme: Theme = {
  id: "oled-dark",
  name: "OLED Dark",
  description: "True black theme optimized for OLED displays",
  colors: {
    background: "0 0% 0%", // Pure black - OLED pixels turn off
    foreground: "0 0% 98%", // Near-white for maximum contrast
    card: "0 0% 3%", // Very dark gray, almost black
    cardForeground: "0 0% 98%",
    muted: "0 0% 8%", // Dark gray for subtle elements
    mutedForeground: "0 0% 65%",
    accent: "220 90% 65%", // Bright cyan-blue for accents
    accentForeground: "0 0% 0%",
    primary: "210 100% 60%", // Vibrant blue
    primaryForeground: "0 0% 98%",
    secondary: "280 70% 60%", // Bright purple
    secondaryForeground: "0 0% 98%",
    destructive: "0 90% 65%", // Bright red
    destructiveForeground: "0 0% 98%",
    border: "0 0% 12%", // Subtle border that's barely visible
    input: "0 0% 5%", // Very dark input background
    ring: "220 90% 65%",
    dice1: "0 90% 60%", // Bright red
    dice2: "30 95% 60%", // Bright orange
    dice3: "50 95% 60%", // Bright yellow
    dice4: "150 80% 55%", // Bright green
    dice5: "200 90% 65%", // Bright cyan
    dice6: "280 80% 65%", // Bright purple
  },
};

export const themes: Record<ThemeId, Theme> = {
  legacy: legacyTheme,
  "cult-of-the-lamb": cultOfTheLambTheme,
  dark: darkTheme,
  light: lightTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  "oled-dark": oledDarkTheme,
};

export const themeIds: ThemeId[] = Object.keys(themes) as ThemeId[];
