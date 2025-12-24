"use client";

import {
  Bot,
  Dices,
  Eye,
  GraduationCap,
  Sparkles,
  Swords,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DIFFICULTY_CONFIGS } from "@/engine";
import { parseDifficultyLevel } from "@/lib/type-guards";

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [trainingMode, setTrainingMode] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      {/* Theme Switcher */}
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      {/* Title */}
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Dices className="w-12 h-12 text-accent" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            KnuckleTrainer
          </h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Master Knucklebones - the dice game from Cult of the Lamb
        </p>
      </div>

      {/* Game Mode Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* VS AI */}
        <Card className="relative overflow-hidden group hover:border-accent/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Play vs AI
            </CardTitle>
            <CardDescription>
              Challenge the computer at 5 difficulty levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Difficulty Select */}
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(parseDifficultyLevel(v))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {DIFFICULTY_CONFIGS[difficulty].name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="py-2">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{config.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DIFFICULTY_CONFIGS[difficulty].description}
              </p>
            </div>

            {/* Training Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-accent" />
                <Label htmlFor="training-mode">Training Mode</Label>
              </div>
              <Switch
                id="training-mode"
                checked={trainingMode}
                onCheckedChange={setTrainingMode}
              />
            </div>
            {trainingMode && (
              <p className="text-xs text-muted-foreground">
                Shows win probability for each move
              </p>
            )}

            <Link
              href={`/play?difficulty=${difficulty}&training=${trainingMode}`}
              className="block"
            >
              <Button className="w-full" size="lg">
                <Sparkles className="mr-2 h-4 w-4" />
                Start Game
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Multiplayer */}
        <Card className="relative overflow-hidden group hover:border-secondary/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Multiplayer
            </CardTitle>
            <CardDescription>Play against another human online</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a room and share the code with a friend, or join an
              existing room.
            </p>

            <Link href="/multiplayer" className="block">
              <Button variant="secondary" className="w-full" size="lg">
                <Users className="mr-2 h-4 w-4" />
                Enter Lobby
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* AI vs AI */}
        <Card className="relative overflow-hidden group hover:border-accent/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              AI vs AI
            </CardTitle>
            <CardDescription>
              Watch two AI strategies compete against each other
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pit different AI difficulty levels against each other and observe
              their strategies in real-time.
            </p>

            <Link href="/ai-vs-ai" className="block">
              <Button variant="outline" className="w-full" size="lg">
                <Bot className="mr-2 h-4 w-4" />
                Watch AIs Battle
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Watch Live */}
        <Card className="relative overflow-hidden group hover:border-secondary/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-secondary" />
              Spectate
            </CardTitle>
            <CardDescription>
              Watch live multiplayer and AI matches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Join as a spectator to watch public games in progress and learn
              from other players.
            </p>

            <Link href="/watch" className="block">
              <Button variant="outline" className="w-full" size="lg">
                <Eye className="mr-2 h-4 w-4" />
                Watch Games
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Simulation */}
        <Card className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300 md:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Mass Simulation
            </CardTitle>
            <CardDescription>
              Run hundreds of AI games to analyze strategy performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compare different AI strategies by running mass simulations. View
              win rates, score distributions, and replay individual games.
            </p>

            <Link href="/simulation" className="block">
              <Button variant="outline" className="w-full" size="lg">
                <TrendingUp className="mr-2 h-4 w-4" />
                Run Simulations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Rules Summary */}
      <Card className="mt-8 max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="text-lg">How to Play</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">1.</span>
              Roll the die and place it in one of your 3 columns
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">2.</span>
              Matching dice in a column multiply their score (2×2 or 3×3)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">3.</span>
              Placing a die removes matching dice from opponent&apos;s column
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">4.</span>
              First to fill their grid ends the game - highest score wins!
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          <span className="font-medium">KnuckleTrainer</span> - Master the game
          of Knucklebones
        </p>
        <p className="mt-1">Inspired by Cult of the Lamb by Massive Monster</p>
      </footer>
    </main>
  );
}
