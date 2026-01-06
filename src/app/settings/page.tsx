"use client";

import { ArrowLeft, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings, type LandscapeLayout } from "@/contexts/SettingsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { themes, themeIds } from "@/lib/themes";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();

  return (
    <main className="min-h-[100dvh] flex flex-col p-4 sm:p-8 safe-area-inset">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themeIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{themes[id].name}</span>
                        <span className="text-xs text-muted-foreground">
                          {themes[id].description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Gameplay Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Gameplay Layout
            </CardTitle>
            <CardDescription>
              Customize how the game is displayed on different devices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Landscape Layout */}
            <div className="space-y-2">
              <Label>Landscape Dice Position</Label>
              <Select
                value={settings.landscapeLayout}
                onValueChange={(v) => updateSettings({ landscapeLayout: v as LandscapeLayout })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Center (Default)</span>
                      <span className="text-xs text-muted-foreground">
                        Dice roller stays in the center between grids
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="right">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Right Side</span>
                      <span className="text-xs text-muted-foreground">
                        Dice roller floats to the right (mobile landscape)
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The "Right Side" option is useful for mobile landscape mode, keeping the roll button
                accessible with your right thumb while viewing both player grids.
              </p>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground mb-3 block">Layout Preview</Label>
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                {settings.landscapeLayout === "center" ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-16 h-12 bg-accent/20 rounded border border-accent/30 flex items-center justify-center text-[10px] text-muted-foreground">
                      You
                    </div>
                    <div className="w-10 h-10 bg-primary/20 rounded-full border border-primary/30 flex items-center justify-center text-[10px]">
                      🎲
                    </div>
                    <div className="w-16 h-12 bg-secondary/20 rounded border border-secondary/30 flex items-center justify-center text-[10px] text-muted-foreground">
                      AI
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-16 h-12 bg-accent/20 rounded border border-accent/30 flex items-center justify-center text-[10px] text-muted-foreground">
                        You
                      </div>
                      <div className="w-16 h-12 bg-secondary/20 rounded border border-secondary/30 flex items-center justify-center text-[10px] text-muted-foreground">
                        AI
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-primary/20 rounded-full border border-primary/30 flex items-center justify-center text-[10px]">
                      🎲
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {settings.landscapeLayout === "center"
                    ? "Center: Dice between grids"
                    : "Right: Dice on the right edge"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
