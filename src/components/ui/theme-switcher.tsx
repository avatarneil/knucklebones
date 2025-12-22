"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeId } from "@/lib/themes";
import { themes } from "@/lib/themes";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Palette className="w-4 h-4 text-muted-foreground" />
      <Select value={theme} onValueChange={(v) => setTheme(v as ThemeId)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            <span className="flex items-center gap-2">
              {themes[theme].name}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.values(themes).map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Compact theme switcher button that cycles through themes
 */
export function ThemeSwitcherButton() {
  const { theme, setTheme } = useTheme();
  const themeIds = Object.keys(themes) as ThemeId[];
  const currentIndex = themeIds.indexOf(theme);
  const nextTheme = themeIds[(currentIndex + 1) % themeIds.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      title={`Switch to ${themes[nextTheme].name} theme`}
      className="relative"
    >
      <Palette className="w-4 h-4" />
      <span className="sr-only">Switch theme</span>
    </Button>
  );
}
