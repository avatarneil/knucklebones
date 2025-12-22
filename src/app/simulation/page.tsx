"use client";

import {
  ArrowLeft,
  Play,
  Square,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GameViewer } from "@/components/simulation/GameViewer";
import { ResultsGraph } from "@/components/simulation/ResultsGraph";
import { InstallPrompt } from "@/components/pwa";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DIFFICULTY_CONFIGS,
  runSimulation,
  SimulationController,
  type DifficultyLevel,
  type SimulationResult,
  type SimulationStats,
} from "@/engine";

function SimulationContent() {
  const [player1Strategy, setPlayer1Strategy] = useState<DifficultyLevel>("greedy");
  const [player2Strategy, setPlayer2Strategy] = useState<DifficultyLevel>("medium");
  const [numGames, setNumGames] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({
    totalGames: 0,
    completedGames: 0,
    player1Wins: 0,
    player2Wins: 0,
    draws: 0,
    player1WinRate: 0,
    player2WinRate: 0,
    averageTurnCount: 0,
    averageScoreDiff: 0,
    averageRuntimePerGame: 0,
  });
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SimulationResult | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const controllerRef = useRef<SimulationController | null>(null);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setStats({
      totalGames: numGames,
      completedGames: 0,
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
      player1WinRate: 0,
      player2WinRate: 0,
      averageTurnCount: 0,
      averageScoreDiff: 0,
      averageRuntimePerGame: 0,
    });

    const controller = new SimulationController();
    controllerRef.current = controller;

    try {
      const simulationResults = await runSimulation({
        player1Strategy,
        player2Strategy,
        numGames,
        controller,
        onProgress: (newStats, latestResult) => {
          if (controller.isCancelled()) return;
          setStats(newStats);
          if (latestResult) {
            setResults((prev) => [...prev, latestResult]);
          }
        },
        onGameComplete: (result) => {
          if (controller.isCancelled()) return;
          // Results are already added in onProgress
        },
      });
    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsRunning(false);
      controllerRef.current = null;
    }
  }, [player1Strategy, player2Strategy, numGames]);

  const handleStop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.cancel();
      controllerRef.current = null;
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

        <div className="w-[clamp(4rem,10vw,6rem)]" /> {/* Spacer */}
      </header>

      <div className="flex-1 grid lg:grid-cols-3 gap-4 max-w-[min(96rem,95vw)] mx-auto w-full">
        {/* Left Column: Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Set up your simulation parameters
            </CardDescription>
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
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
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
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
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
                <Button
                  onClick={handleStart}
                  className="flex-1"
                  size="lg"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Simulation
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Middle Column: Results Graph */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Results
            </CardTitle>
            <CardDescription>
              Real-time statistics and win rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResultsGraph stats={stats} maxGames={numGames} />
          </CardContent>
        </Card>

        {/* Right Column: Recent Games */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>
              Click to view game replay
            </CardDescription>
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
                results
                  .slice()
                  .reverse()
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
              <GameViewer
                result={selectedGame}
                onClose={() => setShowViewer(false)}
              />
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
