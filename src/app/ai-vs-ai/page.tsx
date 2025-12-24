"use client";

import { ArrowLeft, RotateCcw, Settings, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GameBoard } from "@/components/game";
import { InstallPrompt } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
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
import { createInitialState, DIFFICULTY_CONFIGS } from "@/engine";
import type { GameState } from "@/engine/types";
import { useGame } from "@/hooks/useGame";
import { parseDifficultyLevel } from "@/lib/type-guards";

function AIVsAIContent() {
  const [showSettings, setShowSettings] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [player1Difficulty, setPlayer1Difficulty] =
    useState<DifficultyLevel>("greedy");
  const [player2Difficulty, setPlayer2Difficulty] =
    useState<DifficultyLevel>("medium");
  const [lastWinner, setLastWinner] = useState<
    "player1" | "player2" | "draw" | null
  >(null);

  const [gameInitialState, setGameInitialState] = useState<
    GameState | undefined
  >(() => createInitialState());

  const handleGameEnd = useCallback(
    (winner: "player1" | "player2" | "draw") => {
      setLastWinner(winner);
      setShowGameOver(true);
    },
    [],
  );

  const game = useGame({
    mode: "ai-vs-ai",
    player1Difficulty,
    player2Difficulty,
    initialState: gameInitialState,
    onGameEnd: handleGameEnd,
  });

  const handleNewGame = useCallback(() => {
    const newState = createInitialState();
    setGameInitialState(newState);
    setShowGameOver(false);
    setLastWinner(null);
    game.resetGame();
  }, [game]);

  return (
    <main className="h-[100dvh] flex flex-col p-[clamp(0.5rem,2vw,1.5rem)] overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <InstallPrompt />
      {/* Header */}
      <header className="flex items-center justify-between mb-[clamp(0.5rem,1.5vw,1rem)] flex-shrink-0">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="px-[clamp(0.5rem,1.5vw,0.75rem)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline ml-2">Back</span>
          </Button>
        </Link>

        <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]">
          <ThemeSwitcher />

          <Button
            variant="ghost"
            size="icon"
            className="h-[clamp(2rem,5vw,2.25rem)] w-[clamp(2rem,5vw,2.25rem)]"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="px-[clamp(0.5rem,1.5vw,0.75rem)]"
            onClick={handleNewGame}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden xs:inline ml-2">New Game</span>
          </Button>
        </div>
      </header>

      {/* Strategy indicators with inline controls */}
      <div className="text-center mb-[clamp(0.25rem,1vw,0.5rem)] flex-shrink-0">
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap text-[clamp(0.75rem,2vw,0.875rem)]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Player 1:</span>
            <Select
              value={player1Difficulty}
              onValueChange={(v) => setPlayer1Difficulty(parseDifficultyLevel(v))}
            >
              <SelectTrigger className="h-7 w-[120px] md:w-[140px] text-xs">
                <SelectValue />
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
          <span className="text-muted-foreground">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Player 2:</span>
            <Select
              value={player2Difficulty}
              onValueChange={(v) => setPlayer2Difficulty(parseDifficultyLevel(v))}
            >
              <SelectTrigger className="h-7 w-[120px] md:w-[140px] text-xs">
                <SelectValue />
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
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex flex-col min-h-0">
        <GameBoard
          state={game.state}
          isRolling={game.isRolling}
          isThinking={game.isThinking}
          onRoll={() => {}} // No manual roll in AI vs AI mode
          onColumnClick={() => {}} // No manual placement in AI vs AI mode
          player1Name={`Player 1 (${DIFFICULTY_CONFIGS[player1Difficulty].name})`}
          player2Name={`Player 2 (${DIFFICULTY_CONFIGS[player2Difficulty].name})`}
          isPlayer1Human={false}
          isPlayer2Human={false}
        />
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI vs AI Settings</DialogTitle>
            <DialogDescription>
              Choose strategies for both AI players
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Player 1 Strategy</Label>
              <Select
                value={player1Difficulty}
                onValueChange={(v) => setPlayer1Difficulty(parseDifficultyLevel(v))}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <p className="text-xs text-muted-foreground">
                {DIFFICULTY_CONFIGS[player1Difficulty].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Player 2 Strategy</Label>
              <Select
                value={player2Difficulty}
                onValueChange={(v) => setPlayer2Difficulty(parseDifficultyLevel(v))}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <p className="text-xs text-muted-foreground">
                {DIFFICULTY_CONFIGS[player2Difficulty].description}
              </p>
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              Changes apply immediately to future moves in the current game
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game Over Dialog */}
      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Game Over
            </DialogTitle>
            <DialogDescription>
              {lastWinner === "player1"
                ? `${DIFFICULTY_CONFIGS[player1Difficulty].name} (Player 1) won!`
                : lastWinner === "player2"
                  ? `${DIFFICULTY_CONFIGS[player2Difficulty].name} (Player 2) won!`
                  : "It's a draw!"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGameOver(false)}>
              View Board
            </Button>
            <Button onClick={handleNewGame}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function AIVsAIPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <AIVsAIContent />
    </Suspense>
  );
}
