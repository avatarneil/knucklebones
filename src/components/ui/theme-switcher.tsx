"use client";

import { Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeId } from "@/lib/themes";
import { themes } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        title="Select theme"
        aria-label="Select theme"
        aria-expanded={open}
      >
        <Palette className="w-4 h-4" />
        <span className="sr-only">Select theme</span>
      </Button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          <div className="p-1">
            {Object.values(themes).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-muted focus:bg-muted focus:outline-none",
                  theme === t.id && "bg-muted font-medium",
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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
