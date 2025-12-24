"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  History,
  Play,
  RotateCcw,
  Settings,
  Trash2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GameBoard, KeyboardShortcuts } from "@/components/game";
import { InstallPrompt } from "@/components/pwa";
import { WinProbability } from "@/components/training";
import { Button } from "@/components/ui/button";
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
import { createInitialState, DIFFICULTY_CONFIGS } from "@/engine";
import { isColumnFull } from "@/engine/scorer";
import type { ColumnIndex, DifficultyLevel, GameState } from "@/engine/types";
import { ALL_COLUMNS } from "@/engine/types";
import { useGame } from "@/hooks/useGame";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { gameStorage } from "@/lib/game-storage";

function PlayContent() {
  const searchParams = useSearchParams();
  const initialDifficulty =
    (searchParams.get("difficulty") as DifficultyLevel) || "medium";
  const initialTraining = searchParams.get("training") === "true";

  const [showSettings, setShowSettings] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [pendingSavedSession, setPendingSavedSession] =
    useState<ReturnType<typeof gameStorage.loadSession>>(null);
  const [lastWinner, setLastWinner] = useState<
    "player1" | "player2" | "draw" | null
  >(null);
  const [isPublicMatch, setIsPublicMatch] = useState(false);
  const publicRoomIdRef = useRef<string | null>(null);

  // Game history hook for persistence
  const gameHistory = useGameHistory();

  // Track current session ID
  const sessionIdRef = useRef<string | null>(null);
  const hasCheckedResume = useRef(false);
  // Track current state for callbacks
  const latestStateRef = useRef<GameState | null>(null);

  // Game state - may be initialized from saved session
  const [gameInitialState, setGameInitialState] = useState<
    GameState | undefined
  >(undefined);
  const [gameDifficulty, setGameDifficulty] =
    useState<DifficultyLevel>(initialDifficulty);
  const [gameTrainingMode, setGameTrainingMode] = useState(initialTraining);
  const [isReady, setIsReady] = useState(false);
  // Key to force remount of game hook when starting fresh or resuming
  const [gameKey, setGameKey] = useState(0);

  // Get followers from previous room
  const getPreviousRoomFollowers = useCallback(async (): Promise<string[]> => {
    if (!publicRoomIdRef.current) return [];
    try {
      const response = await fetch(
        `/api/rooms/${publicRoomIdRef.current}/state`,
      );
      const data = await response.json();
      if (data.success && data.followedBy) {
        return data.followedBy;
      }
    } catch (err) {
      console.error("Error getting previous room followers:", err);
    }
    return [];
  }, []);

  // Create or update public room
  const updatePublicRoom = useCallback(
    async (state: GameState) => {
      if (!isPublicMatch) return;

      try {
        if (publicRoomIdRef.current) {
          // Update existing room
          await fetch("/api/rooms/update-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: publicRoomIdRef.current,
              state,
            }),
          });
        } else {
          // Get followers from previous room if it exists
          const followedBy = await getPreviousRoomFollowers();

          // Create new room
          const response = await fetch("/api/rooms/create-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerName: "You",
              difficulty: gameDifficulty,
              initialState: state,
              followedBy, // Migrate followers
            }),
          });
          const data = await response.json();
          if (data.success) {
            publicRoomIdRef.current = data.roomId;

            // Notify followers (in a real implementation, you'd use websockets or server-sent events)
            // For now, followers will need to poll or check the watch page
          }
        }
      } catch (err) {
        console.error("Error updating public room:", err);
      }
    },
    [isPublicMatch, gameDifficulty, getPreviousRoomFollowers],
  );

  const startNewSession = useCallback(async () => {
    const newState = createInitialState();
    const sessionId = gameHistory.startSession({
      mode: "ai",
      difficulty: gameDifficulty,
      trainingMode: gameTrainingMode,
      initialState: newState,
    });
    sessionIdRef.current = sessionId;
    latestStateRef.current = newState;

    // If public match is enabled, create a new room
    if (isPublicMatch) {
      publicRoomIdRef.current = null; // Reset to create new room
      await updatePublicRoom(newState);
    }

    setGameInitialState(newState);
    setGameKey((k) => k + 1); // Force remount of game hook
    setIsReady(true);
  }, [
    gameHistory,
    gameDifficulty,
    gameTrainingMode,
    isPublicMatch,
    updatePublicRoom,
  ]);

  // Check for saved game on mount - directly check storage to avoid race condition
  useEffect(() => {
    if (hasCheckedResume.current) return;
    hasCheckedResume.current = true;

    // Directly check storage instead of relying on state (which loads async)
    const saved = gameStorage.loadSession();
    if (saved && saved.state.phase !== "ended") {
      // There's a saved game - ask user if they want to resume
      setPendingSavedSession(saved);
      setShowResumeDialog(true);
    } else {
      // No saved game - start fresh
      startNewSession();
    }
  }, [startNewSession]);

  const handleResume = useCallback(() => {
    // Use the pending saved session
    if (pendingSavedSession) {
      sessionIdRef.current = pendingSavedSession.id;
      latestStateRef.current = pendingSavedSession.state;
      setGameInitialState(pendingSavedSession.state);
      setGameDifficulty(pendingSavedSession.difficulty);
      setGameTrainingMode(pendingSavedSession.trainingMode);
      setGameKey((k) => k + 1); // Force remount of game hook
    }
    setShowResumeDialog(false);
    setPendingSavedSession(null);
    setIsReady(true);
  }, [pendingSavedSession]);

  const handleDiscardAndNew = useCallback(() => {
    gameHistory.discardGame();
    setShowResumeDialog(false);
    setPendingSavedSession(null);
    startNewSession();
  }, [gameHistory, startNewSession]);

  const handleStateChange = useCallback(
    (state: GameState) => {
      // Track latest state for callbacks
      latestStateRef.current = state;
      // Auto-save on every state change
      if (sessionIdRef.current && state.phase !== "ended") {
        gameHistory.saveGame(sessionIdRef.current, state);
      }
      // Update public room if enabled
      updatePublicRoom(state);
    },
    [gameHistory, updatePublicRoom],
  );

  const handleGameEnd = useCallback(
    (winner: "player1" | "player2" | "draw") => {
      setLastWinner(winner);
      setShowGameOver(true);

      // Record to history using the latest state ref
      if (sessionIdRef.current && latestStateRef.current) {
        gameHistory.recordGameEnd(
          sessionIdRef.current,
          latestStateRef.current,
          winner,
        );
      }
    },
    [gameHistory],
  );

  const game = useGame({
    mode: "ai",
    difficulty: gameDifficulty,
    trainingMode: gameTrainingMode,
    initialState: gameInitialState,
    onGameEnd: handleGameEnd,
    onStateChange: handleStateChange,
  });

  // Calculate legal columns and game state for keyboard controls
  const isPlayer1Turn = game.state.currentPlayer === "player1";
  const isRollingPhase = game.state.phase === "rolling";
  const isPlacingPhase = game.state.phase === "placing";
  const isEnded = game.state.phase === "ended";
  const currentGrid = game.state.grids[game.state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(currentGrid[i]));
  const canRoll = isRollingPhase && isPlayer1Turn && !isEnded;
  const canPlace = isPlacingPhase && isPlayer1Turn && !isEnded;

  // Set up keyboard controls
  useKeyboardControls({
    gameState: game.state,
    canRoll,
    canPlace,
    legalColumns,
    onRoll: game.roll,
    onPlaceDie: game.placeDie,
    enabled: isReady,
  });

  const handleNewGame = useCallback(async () => {
    // Clear old session if it exists and wasn't recorded
    if (sessionIdRef.current) {
      gameHistory.discardGame();
    }

    // Reset game
    game.resetGame();
    setShowGameOver(false);
    setLastWinner(null);

    // Start new session
    const newState = createInitialState();
    const sessionId = gameHistory.startSession({
      mode: "ai",
      difficulty: game.difficulty,
      trainingMode: game.isTrainingMode,
      initialState: newState,
    });
    sessionIdRef.current = sessionId;

    // If public match is enabled, create a new room (followers will auto-join)
    if (isPublicMatch) {
      publicRoomIdRef.current = null; // Reset to create new room
      await updatePublicRoom(newState);
    }
  }, [game, gameHistory, isPublicMatch, updatePublicRoom]);

  // Format time for display
  const formatTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Show loading until we've checked for resume
  if (!isReady) {
    return (
      <main className="h-[100dvh] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>

        {/* Resume Dialog */}
        <Dialog open={showResumeDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-accent" />
                Resume Game?
              </DialogTitle>
              <DialogDescription>
                You have an unfinished game from{" "}
                {pendingSavedSession
                  ? formatTimeSince(pendingSavedSession.lastPlayedAt)
                  : "earlier"}
                . Would you like to continue where you left off?
              </DialogDescription>
            </DialogHeader>

            {pendingSavedSession && (
              <div className="py-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-medium">
                    {DIFFICULTY_CONFIGS[pendingSavedSession.difficulty].name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turn:</span>
                  <span className="font-medium">
                    {pendingSavedSession.state.turnNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Training Mode:</span>
                  <span className="font-medium">
                    {pendingSavedSession.trainingMode ? "On" : "Off"}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={handleDiscardAndNew}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                New Game
              </Button>
              <Button onClick={handleResume} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

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
          {/* Public Match Toggle - compact on mobile */}
          <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] px-[clamp(0.5rem,1.5vw,0.75rem)] py-[clamp(0.25rem,0.75vw,0.375rem)] rounded-lg bg-card/50 border border-border/50">
            {isPublicMatch ? (
              <Eye className="w-[clamp(0.875rem,2.5vw,1rem)] h-[clamp(0.875rem,2.5vw,1rem)] text-accent" />
            ) : (
              <EyeOff className="w-[clamp(0.875rem,2.5vw,1rem)] h-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground" />
            )}
            <Label
              htmlFor="public-match-toggle"
              className="text-[clamp(0.75rem,2vw,0.875rem)] cursor-pointer hidden xs:inline"
            >
              Public
            </Label>
            <Switch
              id="public-match-toggle"
              checked={isPublicMatch}
              onCheckedChange={async (checked) => {
                setIsPublicMatch(checked);
                if (checked && latestStateRef.current) {
                  // Create room immediately when toggled on
                  await updatePublicRoom(latestStateRef.current);
                } else {
                  // Clear room reference when toggled off
                  publicRoomIdRef.current = null;
                }
              }}
            />
          </div>

          {/* Training Mode Toggle - compact on mobile */}
          <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] px-[clamp(0.5rem,1.5vw,0.75rem)] py-[clamp(0.25rem,0.75vw,0.375rem)] rounded-lg bg-card/50 border border-border/50">
            <GraduationCap className="w-[clamp(0.875rem,2.5vw,1rem)] h-[clamp(0.875rem,2.5vw,1rem)] text-accent" />
            <Label
              htmlFor="training-toggle"
              className="text-[clamp(0.75rem,2vw,0.875rem)] cursor-pointer hidden xs:inline"
            >
              Training
            </Label>
            <Switch
              id="training-toggle"
              checked={game.isTrainingMode}
              onCheckedChange={game.toggleTrainingMode}
            />
          </div>

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

      {/* Difficulty indicator */}
      <div className="text-center mb-[clamp(0.25rem,1vw,0.5rem)] flex-shrink-0">
        <span className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
          Playing against{" "}
          <span className="text-accent font-medium">
            {DIFFICULTY_CONFIGS[game.difficulty].name}
          </span>{" "}
          AI
        </span>
      </div>

      {/* Game Board with Training Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <GameBoard
          state={game.state}
          isRolling={game.isRolling}
          isThinking={game.isThinking}
          onRoll={game.roll}
          onColumnClick={game.placeDie}
          player1Name="You"
          player2Name="AI"
          isPlayer1Human={true}
          isPlayer2Human={false}
          moveAnalysis={game.moveAnalysis ?? undefined}
          showProbabilities={game.isTrainingMode}
        />

        {/* Keyboard Shortcuts Widget */}
        <KeyboardShortcuts />

        {/* Training Mode Panel - shown below on mobile, would need different layout for desktop */}
        {game.isTrainingMode &&
          game.state.phase === "placing" &&
          game.state.currentPlayer === "player1" && (
            <div className="hidden lg:absolute lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:block w-72">
              <WinProbability
                analysis={game.moveAnalysis ?? []}
                onSelectColumn={(col: ColumnIndex) => game.placeDie(col)}
              />
            </div>
          )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Settings</DialogTitle>
            <DialogDescription>
              Adjust difficulty and game options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>AI Difficulty</Label>
              <Select
                value={game.difficulty}
                onValueChange={(v) => game.setDifficulty(v as DifficultyLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DIFFICULTY_CONFIGS[game.difficulty].description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="settings-public">Public Match</Label>
                <span className="text-xs text-muted-foreground">
                  Allow others to watch your matches
                </span>
              </div>
              <Switch
                id="settings-public"
                checked={isPublicMatch}
                onCheckedChange={async (checked) => {
                  setIsPublicMatch(checked);
                  if (checked && latestStateRef.current) {
                    await updatePublicRoom(latestStateRef.current);
                  } else {
                    publicRoomIdRef.current = null;
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="settings-training">Training Mode</Label>
              <Switch
                id="settings-training"
                checked={game.isTrainingMode}
                onCheckedChange={game.toggleTrainingMode}
              />
            </div>

            {/* Clear History Section */}
            {gameHistory.history.length > 0 && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-destructive">Danger Zone</Label>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setShowSettings(false);
                      setShowClearHistoryDialog(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Game History ({gameHistory.history.length} games)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will permanently delete all game history and reset
                    statistics.
                  </p>
                </div>
              </div>
            )}
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
                ? "Congratulations! You won!"
                : lastWinner === "player2"
                  ? "The AI won this time. Try again!"
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

      {/* Clear History Confirmation Dialog */}
      <Dialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Clear Game History?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {gameHistory.history.length} game
              {gameHistory.history.length !== 1 ? "s" : ""} from your history
              and reset your statistics. This action cannot be undone.
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
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
