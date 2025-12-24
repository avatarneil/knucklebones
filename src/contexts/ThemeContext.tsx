"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ThemeId } from "@/lib/themes";
import { themes } from "@/lib/themes";

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "knuckletrainer-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "cult-of-the-lamb";
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return "cult-of-the-lamb";
    // Migrate old "default" theme to "legacy"
    if (stored === "default") {
      localStorage.setItem(THEME_STORAGE_KEY, "legacy");
      return "legacy";
    }
    return (stored as ThemeId) || "cult-of-the-lamb";
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyTheme(newTheme);
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function applyTheme(themeId: ThemeId) {
  if (typeof window === "undefined") return;

  const theme = themes[themeId];
  const root = document.documentElement;

  // Apply all CSS variables
  root.style.setProperty("--background", theme.colors.background);
  root.style.setProperty("--foreground", theme.colors.foreground);
  root.style.setProperty("--card", theme.colors.card);
  root.style.setProperty("--card-foreground", theme.colors.cardForeground);
  root.style.setProperty("--muted", theme.colors.muted);
  root.style.setProperty("--muted-foreground", theme.colors.mutedForeground);
  root.style.setProperty("--accent", theme.colors.accent);
  root.style.setProperty("--accent-foreground", theme.colors.accentForeground);
  root.style.setProperty("--primary", theme.colors.primary);
  root.style.setProperty(
    "--primary-foreground",
    theme.colors.primaryForeground,
  );
  root.style.setProperty("--secondary", theme.colors.secondary);
  root.style.setProperty(
    "--secondary-foreground",
    theme.colors.secondaryForeground,
  );
  root.style.setProperty("--destructive", theme.colors.destructive);
  root.style.setProperty(
    "--destructive-foreground",
    theme.colors.destructiveForeground,
  );
  root.style.setProperty("--border", theme.colors.border);
  root.style.setProperty("--input", theme.colors.input);
  root.style.setProperty("--ring", theme.colors.ring);
  root.style.setProperty("--dice-1", theme.colors.dice1);
  root.style.setProperty("--dice-2", theme.colors.dice2);
  root.style.setProperty("--dice-3", theme.colors.dice3);
  root.style.setProperty("--dice-4", theme.colors.dice4);
  root.style.setProperty("--dice-5", theme.colors.dice5);
  root.style.setProperty("--dice-6", theme.colors.dice6);

  // Update theme color meta tag for mobile browsers
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", `hsl(${theme.colors.background})`);
  }
}
