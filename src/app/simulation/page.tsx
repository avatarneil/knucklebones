"use client";

import { ArrowLeft, Brain, Play, RotateCcw, Square, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { InstallPrompt } from "@/components/pwa";
import { GameViewer } from "@/components/simulation/GameViewer";
import { ResultsGraph } from "@/components/simulation/ResultsGraph";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  DIFFICULTY_CONFIGS,
  getMasterProfileStats,
  resetMasterProfile,
  runSimulation,
  SimulationController,
} from "@/engine";
import type {
  DifficultyLevel,
  MasterProfileStats,
  SimulationResult,
  SimulationStats,
} from "@/engine";

function SimulationContent() {
  const [player1Strategy, setPlayer1Strategy] = useState<DifficultyLevel>("greedy");
  const [player2Strategy, setPlayer2Strategy] = useState<DifficultyLevel>("medium");
  const [numGames, setNumGames] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({
    averageRuntimePerGame: 0,
    averageScoreDiff: 0,
    averageTurnCount: 0,
    completedGames: 0,
    draws: 0,
    player1WinRate: 0,
    player1Wins: 0,
    player2WinRate: 0,
    player2Wins: 0,
    totalGames: 0,
  });
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SimulationResult | null>(undefined);
  const [showViewer, setShowViewer] = useState(false);
  const [masterStats, setMasterStats] = useState<MasterProfileStats | null>(undefined);
  const controllerRef = useRef<SimulationController | null>(null);

  // Check if Master AI is selected
  const hasMasterAI = player1Strategy === "master" || player2Strategy === "master";

  // Update Master AI stats periodically when Master is selected
  useEffect(() => {
    if (!hasMasterAI) {
      setMasterStats(undefined);
      return;
    }

    // Initial fetch with error handling
    try {
      setMasterStats(getMasterProfileStats());
    } catch (error) {
      console.error("Failed to load Master AI stats:", error);
      setMasterStats(undefined);
    }

    // Update every second while simulation is running
    if (isRunning) {
      const interval = setInterval(() => {
        try {
          setMasterStats(getMasterProfileStats());
        } catch (error) {
          console.error("Failed to refresh Master AI stats:", error);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasMasterAI, isRunning, stats.completedGames]);

  const handleResetMaster = useCallback(() => {
    resetMasterProfile();
    setMasterStats(getMasterProfileStats());
  }, []);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setStats({
      averageRuntimePerGame: 0,
      averageScoreDiff: 0,
      averageTurnCount: 0,
      completedGames: 0,
      draws: 0,
      player1WinRate: 0,
      player1Wins: 0,
      player2WinRate: 0,
      player2Wins: 0,
      totalGames: numGames,
    });

    const controller = new SimulationController();
    controllerRef.current = controller;

    try {
      await runSimulation({
        controller,
        numGames,
        onGameComplete: (_result) => {
          if (controller.isCancelled()) return;
          // Results are already added in onProgress
        },
        onProgress: (newStats, latestResult) => {
          if (controller.isCancelled()) return;
          setStats(newStats);
          if (latestResult) {
            setResults((prev) => [...prev, latestResult]);
          }
        },
        player1Strategy,
        player2Strategy,
      });
    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsRunning(false);
      controllerRef.current = undefined;
    }
  }, [player1Strategy, player2Strategy, numGames]);

  const handleStop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.cancel();
      controllerRef.current = undefined;
    }
    setIsRunning(false);
  }, []);

  const handleViewGame = useCallback((result: SimulationResult) => {
    setSelectedGame(result);
    setShowViewer(true);
  }, []);

  return (
    <main className="min-h-[100dvh] flex flex-col p-[clamp(0.5rem,2vw,1.5rem)] overflow-auto pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <InstallPrompt />

      {/* Header */}
      <header className="flex items-center justify-between mb-[clamp(0.5rem,1.5vw,1rem)] flex-shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm" className="px-[clamp(0.5rem,1.5vw,0.75rem)]">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline ml-2">Back</span>
          </Button>
        </Link>
        <h1 className="text-[clamp(1.25rem,4vw,1.75rem)] font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Mass Simulation
        </h1>
        <ThemeSwitcher />
      </header>

      <div className="flex-1 grid lg:grid-cols-3 gap-4 max-w-[min(96rem,95vw)] mx-auto w-full">
        {/* Left Column: Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your simulation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player 1 Strategy */}
            <div className="space-y-2">
              <Label>Player 1 Strategy</Label>
              <Select
                value={player1Strategy}
                onValueChange={(v) => setPlayer1Strategy(v as DifficultyLevel)}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy">
                    {DIFFICULTY_CONFIGS[player1Strategy]?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{config.name}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Player 2 Strategy */}
            <div className="space-y-2">
              <Label>Player 2 Strategy</Label>
              <Select
                value={player2Strategy}
                onValueChange={(v) => setPlayer2Strategy(v as DifficultyLevel)}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy">
                    {DIFFICULTY_CONFIGS[player2Strategy]?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{config.name}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Number of Games */}
            <div className="space-y-2">
              <Label>Number of Games</Label>
              <Select
                value={numGames.toString()}
                onValueChange={(v) => setNumGames(parseInt(v, 10))}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 50, 100, 250, 500, 1000].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} games
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 pt-2">
              {!isRunning ? (
                <Button onClick={handleStart} className="flex-1" size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  Start Simulation
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="flex-1" size="lg">
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              )}
            </div>

            {/* Master AI Status */}
            {hasMasterAI && masterStats && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-sm">Master AI Learning</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetMaster}
                    disabled={isRunning}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Games Learned</div>
                    <div className="font-medium text-lg">{masterStats.gamesCompleted}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Moves Analyzed</div>
                    <div className="font-medium text-lg">{masterStats.totalMoves}</div>
                  </div>
                </div>

                {masterStats.hasLearned ? (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opponent Attack Rate:</span>
                      <span className="font-medium">
                        {(masterStats.attackRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Column Bias:</span>
                      <span className="font-mono text-[10px]">
                        [
                        {masterStats.columnFrequencies.map((f) => (f * 100).toFixed(0)).join("%, ")}
                        %]
                      </span>
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-medium mt-2">
                      Adaptive strategy active
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Needs 3+ games and 10+ moves to activate adaptive strategy
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle Column: Results Graph */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Results
            </CardTitle>
            <CardDescription>Real-time statistics and win rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResultsGraph stats={stats} maxGames={numGames} />
          </CardContent>
        </Card>

        {/* Right Column: Recent Games */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>Click to view game replay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isRunning
                    ? "Running simulations..."
                    : "No games completed yet. Start a simulation to see results."}
                </div>
              ) : (
                [...results]
                  .toReversed()
                  .slice(0, 50)
                  .map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleViewGame(result)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              result.winner === "player1"
                                ? "bg-green-500"
                                : result.winner === "player2"
                                  ? "bg-red-500"
                                  : "bg-muted-foreground"
                            }`}
                          />
                          <span className="font-medium">Game #{result.id}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.finalScore.player1} - {result.finalScore.player2}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.turnCount} turns ·{" "}
                        {result.winner === "player1"
                          ? `${DIFFICULTY_CONFIGS[result.player1Strategy].name} wins`
                          : result.winner === "player2"
                            ? `${DIFFICULTY_CONFIGS[result.player2Strategy].name} wins`
                            : "Draw"}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl h-[90vh] sm:h-[85vh] max-h-[90vh] flex flex-col p-3 sm:p-6 m-2 sm:m-0 w-[calc(100vw-1rem)] sm:w-full top-[50%] sm:top-[50%] left-[50%] sm:left-[50%] translate-x-[-50%] translate-y-[-50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg">Game Replay</DialogTitle>
            <DialogDescription className="hidden sm:block text-sm">
              Watch the game unfold move by move
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {selectedGame && (
              <GameViewer result={selectedGame} onClose={() => setShowViewer(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
