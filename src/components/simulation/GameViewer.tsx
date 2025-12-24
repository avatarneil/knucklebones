"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameBoard } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SimulationResult } from "@/engine/simulation";
import type { ColumnIndex, GameState } from "@/engine/types";

interface GameViewerProps {
  result: SimulationResult;
  onClose?: () => void;
}

export function GameViewer({ result, onClose }: GameViewerProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500); // ms per move
  const sliderRef = useRef<HTMLInputElement>(null);

  // Reset to first move when result changes
  useEffect(() => {
    setCurrentMoveIndex(0);
    setIsPlaying(false);
  }, [result.id]);

  // Determine which state to show
  // moves[i].state is the state BEFORE move i is applied
  // So we show: initial state at index 0, state after move i at index i+1
  // At the last index, show the final state
  const currentState =
    result.moves.length > 0
      ? currentMoveIndex >= result.moves.length - 1
        ? result.finalState || result.moves[result.moves.length - 1]?.state
        : result.moves[currentMoveIndex]?.state
      : result.finalState || null;

  const handlePrevious = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex((prev) => Math.min(result.moves.length - 1, prev + 1));
  }, [result.moves.length]);

  const handlePlayPause = useCallback(() => {
    if (currentMoveIndex >= result.moves.length - 1) {
      // If at the end, restart from beginning
      setCurrentMoveIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentMoveIndex, result.moves.length]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newIndex = parseInt(e.target.value, 10);
      setCurrentMoveIndex(newIndex);
      setIsPlaying(false); // Pause when manually adjusting slider
    },
    [],
  );

  const handleFirstMove = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(0);
  }, []);

  const handleLastMove = useCallback(() => {
    setIsPlaying(false);
    setCurrentMoveIndex(result.moves.length - 1);
  }, [result.moves.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentMoveIndex >= result.moves.length - 1) {
      if (currentMoveIndex >= result.moves.length - 1) {
        setIsPlaying(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentMoveIndex((prev) => {
        if (prev >= result.moves.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentMoveIndex, result.moves.length, playbackSpeed]);

  const currentMove = result.moves[currentMoveIndex];
  const isFirstMove = currentMoveIndex === 0;
  const isLastMove = currentMoveIndex >= result.moves.length - 1;
  const isShowingFinalState =
    currentMoveIndex >= result.moves.length - 1 && result.finalState;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4 pb-2 sm:pb-4 border-b flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm sm:text-base truncate">
            Game #{result.id}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {result.player1Strategy} vs {result.player2Strategy}
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-2 flex-shrink-0"
          >
            <span className="hidden sm:inline">Close</span>
            <span className="sm:hidden">✕</span>
          </Button>
        )}
      </div>

      {/* Game Board - Scrollable */}
      {currentState && (
        <div className="flex-1 min-h-0 mb-2 sm:mb-4 overflow-auto">
          <div className="min-w-0">
            <GameBoard
              state={currentState}
              player1Name={`Player 1 (${result.player1Strategy})`}
              player2Name={`Player 2 (${result.player2Strategy})`}
              isPlayer1Human={false}
              isPlayer2Human={false}
              highlightedColumn={
                currentMove ? (currentMove.column as ColumnIndex) : null
              }
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 border-t flex-shrink-0 overflow-y-auto max-h-[40vh] sm:max-h-none">
        {/* Move Info */}
        {isShowingFinalState ? (
          <div className="text-center text-xs sm:text-sm">
            <div className="text-muted-foreground">Game Complete</div>
            <div className="font-medium mt-1">
              Final Score: {result.finalScore.player1} -{" "}
              {result.finalScore.player2}
            </div>
          </div>
        ) : currentMove ? (
          <div className="text-center text-xs sm:text-sm">
            <div className="text-muted-foreground">
              Turn {currentMove.turn} -{" "}
              {currentMove.player === "player1" ? "Player 1" : "Player 2"}
            </div>
            <div className="font-medium mt-1">
              Rolled {currentMove.dieValue}, placed in column{" "}
              {currentMove.column + 1}
            </div>
          </div>
        ) : null}

        {/* Turn-by-Turn Slider */}
        {result.moves.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-muted-foreground">
              <span>
                Move {currentMoveIndex + 1} of {result.moves.length}
              </span>
              <span className="text-[10px] sm:text-xs">
                {result.winner === "player1"
                  ? "Player 1 Wins"
                  : result.winner === "player2"
                    ? "Player 2 Wins"
                    : "Draw"}
                {" - "}
                {result.finalScore.player1} - {result.finalScore.player2}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={handleFirstMove}
                disabled={isFirstMove}
                title="First move"
              >
                <SkipBack className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
              <Input
                ref={sliderRef}
                type="range"
                min="0"
                max={Math.max(0, result.moves.length - 1)}
                value={currentMoveIndex}
                onChange={handleSliderChange}
                className="flex-1 h-2 cursor-pointer touch-none"
                style={{
                  background:
                    result.moves.length > 1
                      ? `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${(currentMoveIndex / (result.moves.length - 1)) * 100}%, hsl(var(--muted)) ${(currentMoveIndex / (result.moves.length - 1)) * 100}%, hsl(var(--muted)) 100%)`
                      : undefined,
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={handleLastMove}
                disabled={isLastMove}
                title="Last move"
              >
                <SkipForward className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handlePrevious}
            disabled={isFirstMove}
            title="Previous move"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handleNext}
            disabled={isLastMove}
            title="Next move"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
          <Label className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
            Speed:
          </Label>
          <div className="flex gap-1 flex-wrap justify-center">
            {[200, 500, 1000, 2000].map((speed) => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "outline"}
                size="sm"
                className="h-6 px-1.5 sm:h-7 sm:px-2 text-[10px] sm:text-xs"
                onClick={() => {
                  setPlaybackSpeed(speed);
                  setIsPlaying(false);
                }}
              >
                {speed < 1000 ? `${speed}ms` : `${speed / 1000}s`}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
