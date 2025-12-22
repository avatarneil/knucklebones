"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { GameBoard } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ColumnIndex, GameState } from "@/engine/types";
import type { SimulationResult } from "@/engine/simulation";

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
    setCurrentMoveIndex((prev) =>
      Math.min(result.moves.length - 1, prev + 1),
    );
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

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setCurrentMoveIndex(newIndex);
    setIsPlaying(false); // Pause when manually adjusting slider
  }, []);

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
  const isShowingFinalState = currentMoveIndex >= result.moves.length - 1 && result.finalState;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div>
          <h3 className="font-semibold">Game #{result.id}</h3>
          <p className="text-sm text-muted-foreground">
            {result.player1Strategy} vs {result.player2Strategy}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Game Board */}
      {currentState && (
        <div className="flex-1 min-h-0 mb-4">
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
      )}

      {/* Controls */}
      <div className="space-y-4 pt-4 border-t">
        {/* Move Info */}
        {isShowingFinalState ? (
          <div className="text-center text-sm">
            <div className="text-muted-foreground">
              Game Complete
            </div>
            <div className="font-medium mt-1">
              Final Score: {result.finalScore.player1} - {result.finalScore.player2}
            </div>
          </div>
        ) : currentMove ? (
          <div className="text-center text-sm">
            <div className="text-muted-foreground">
              Turn {currentMove.turn} - {currentMove.player === "player1" ? "Player 1" : "Player 2"}
            </div>
            <div className="font-medium mt-1">
              Rolled {currentMove.dieValue}, placed in column {currentMove.column + 1}
            </div>
          </div>
        ) : null}

        {/* Turn-by-Turn Slider */}
        {result.moves.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Move {currentMoveIndex + 1} of {result.moves.length}</span>
              <span>
                {result.winner === "player1"
                  ? "Player 1 Wins"
                  : result.winner === "player2"
                    ? "Player 2 Wins"
                    : "Draw"}
                {" - "}
                {result.finalScore.player1} - {result.finalScore.player2}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleFirstMove}
                disabled={isFirstMove}
                title="First move"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Input
                ref={sliderRef}
                type="range"
                min="0"
                max={Math.max(0, result.moves.length - 1)}
                value={currentMoveIndex}
                onChange={handleSliderChange}
                className="flex-1 h-2 cursor-pointer"
                style={{
                  background: result.moves.length > 1
                    ? `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${(currentMoveIndex / (result.moves.length - 1)) * 100}%, hsl(var(--muted)) ${(currentMoveIndex / (result.moves.length - 1)) * 100}%, hsl(var(--muted)) 100%)`
                    : undefined
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleLastMove}
                disabled={isLastMove}
                title="Last move"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={isFirstMove}
            title="Previous move"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="icon"
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={isLastMove}
            title="Next move"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-2">
          <Label className="text-xs text-muted-foreground">Speed:</Label>
          <div className="flex gap-1">
            {[200, 500, 1000, 2000].map((speed) => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
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
