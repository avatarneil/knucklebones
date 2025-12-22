"use client";

import {
  Dices,
  GraduationCap,
  History,
  Play,
  Sparkles,
  Swords,
  Trophy,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InstallPrompt, OfflineIndicator } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { DifficultyLevel } from "@/engine/types";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useOnlineStatus } from "@/hooks/usePWA";

export default function Home() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [trainingMode, setTrainingMode] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const isOnline = useOnlineStatus();
  const gameHistory = useGameHistory();

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-[clamp(1rem,3vw,2rem)] overflow-auto pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <OfflineIndicator />
      <InstallPrompt />
      {/* Title */}
      <div className="text-center mb-[clamp(1.5rem,4vw,3rem)] animate-fade-in-up">
        <div className="flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)] mb-[clamp(0.5rem,2vw,1rem)]">
          <Dices className="w-[clamp(2rem,5vw,3rem)] h-[clamp(2rem,5vw,3rem)] text-accent" />
          <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            KnuckleTrainer
          </h1>
        </div>
        <p className="text-[clamp(0.875rem,2.5vw,1.25rem)] text-muted-foreground">
          Master Knucklebones - the dice game from Cult of the Lamb
        </p>
      </div>

      {/* Stats Bar - Only show if there's history */}
      {gameHistory.stats.totalGames > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/50 border border-border/50">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">
              <span className="font-medium text-green-500">
                {gameHistory.stats.wins}W
              </span>
              {" / "}
              <span className="font-medium text-red-500">
                {gameHistory.stats.losses}L
              </span>
              {gameHistory.stats.draws > 0 && (
                <>
                  {" / "}
                  <span className="font-medium text-muted-foreground">
                    {gameHistory.stats.draws}D
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium">
              {Math.round(gameHistory.stats.winRate * 100)}%
            </span>{" "}
            win rate
          </div>
        </div>
      )}

      {/* Resume Game Card - Show if there's a saved game */}
      {gameHistory.hasSavedGame && gameHistory.savedSession && (
        <Card className="mb-4 max-w-[min(48rem,90vw)] w-full border-accent/50 bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent/10">
                  <History className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Game in Progress</p>
                  <p className="text-sm text-muted-foreground">
                    vs {DIFFICULTY_CONFIGS[gameHistory.savedSession.difficulty].name} AI
                    {" · "}
                    Turn {gameHistory.savedSession.state.turnNumber}
                    {" · "}
                    {formatTimeAgo(gameHistory.savedSession.lastPlayedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => gameHistory.discardGame()}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Link href="/play">
                  <Button size="sm">
                    <Play className="mr-1.5 h-4 w-4" />
                    Resume
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Mode Cards */}
      <div className="grid md:grid-cols-2 gap-[clamp(1rem,3vw,1.5rem)] max-w-[min(48rem,90vw)] w-full">
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
                onValueChange={(v) => setDifficulty(v as DifficultyLevel)}
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
                {gameHistory.hasSavedGame ? "New Game" : "Start Game"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Multiplayer */}
        <Card
          className={`relative overflow-hidden group transition-all duration-300 ${
            isOnline
              ? "hover:border-secondary/50"
              : "opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Multiplayer
              {!isOnline && (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription>
              {isOnline
                ? "Play against another human online"
                : "Requires internet connection"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isOnline
                ? "Create a room and share the code with a friend, or join an existing room."
                : "Connect to the internet to play multiplayer."}
            </p>

            {isOnline ? (
              <Link href="/multiplayer" className="block">
                <Button variant="secondary" className="w-full" size="lg">
                  <Users className="mr-2 h-4 w-4" />
                  Enter Lobby
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" className="w-full" size="lg" disabled>
                <WifiOff className="mr-2 h-4 w-4" />
                Offline
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Games History */}
      {gameHistory.history.length > 0 && (
        <details className="mt-[clamp(1rem,3vw,2rem)] max-w-[min(48rem,90vw)] w-full group">
          <summary className="cursor-pointer list-none">
            <Card className="transition-all group-open:rounded-b-none">
              <CardHeader className="py-[clamp(0.75rem,2vw,1.5rem)]">
                <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Games
                    <span className="text-sm font-normal text-muted-foreground">
                      ({gameHistory.history.length})
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowClearHistoryDialog(true);
                      }}
                      title="Clear History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-muted-foreground text-sm group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          </summary>
          <Card className="rounded-t-none border-t-0">
            <CardContent className="pt-0 pb-[clamp(1rem,2vw,1.5rem)]">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameHistory.history.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          entry.winner === "player1"
                            ? "bg-green-500"
                            : entry.winner === "player2"
                              ? "bg-red-500"
                              : "bg-muted-foreground"
                        }`}
                      />
                      <span
                        className={`font-medium ${
                          entry.winner === "player1"
                            ? "text-green-500"
                            : entry.winner === "player2"
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {entry.winner === "player1"
                          ? "Won"
                          : entry.winner === "player2"
                            ? "Lost"
                            : "Draw"}
                      </span>
                      <span className="text-muted-foreground">
                        vs {DIFFICULTY_CONFIGS[entry.difficulty].name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        {entry.finalScore.player1} - {entry.finalScore.player2}
                      </span>
                      <span className="text-xs">
                        {formatTimeAgo(entry.endedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {gameHistory.history.length > 10 && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Showing 10 of {gameHistory.history.length} games
                </p>
              )}
            </CardContent>
          </Card>
        </details>
      )}

      {/* Rules Summary - collapsible on mobile */}
      <details className="mt-[clamp(1rem,3vw,2rem)] max-w-[min(48rem,90vw)] w-full group">
        <summary className="cursor-pointer list-none">
          <Card className="transition-all group-open:rounded-b-none">
            <CardHeader className="py-[clamp(0.75rem,2vw,1.5rem)]">
              <CardTitle className="text-[clamp(1rem,2.5vw,1.125rem)] flex items-center justify-between">
                How to Play
                <span className="text-muted-foreground text-sm group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
        </summary>
        <Card className="rounded-t-none border-t-0">
          <CardContent className="pt-0 pb-[clamp(1rem,2vw,1.5rem)]">
            <ul className="space-y-[clamp(0.375rem,1vw,0.5rem)] text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
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
      </details>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Clear Game History?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {gameHistory.history.length} game{gameHistory.history.length !== 1 ? "s" : ""} from your history and reset your statistics. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                gameHistory.clearHistory();
                setShowClearHistoryDialog(false);
              }}
              className="flex-1"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-[clamp(1.5rem,4vw,3rem)] text-center text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
        <p>
          <span className="font-medium">KnuckleTrainer</span> - Master the game
          of Knucklebones
        </p>
        <p className="mt-1">Inspired by Cult of the Lamb by Massive Monster</p>
      </footer>
    </main>
  );
}
