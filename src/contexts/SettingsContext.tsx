"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type LandscapeLayout = "center" | "right";

export interface Settings {
  landscapeLayout: LandscapeLayout;
}

const DEFAULT_SETTINGS: Settings = {
  landscapeLayout: "center",
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "knuckletrainer-settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SETTINGS;
    }
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to parse settings from localStorage:", e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      }
      return newSettings;
    });
  };

  // Persist settings on mount to ensure they're synced
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
