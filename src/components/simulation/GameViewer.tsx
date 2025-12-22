"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { GameBoard } from "@/components/game";
import { Button } from "@/components/ui/button";
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

  const currentState =
    result.moves.length > 0
      ? currentMoveIndex < result.moves.length
        ? result.moves[currentMoveIndex].state
        : result.moves[result.moves.length - 1]?.state
      : null;

  const handlePrevious = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentMoveIndex((prev) =>
      Math.min(result.moves.length - 1, prev + 1),
    );
  }, [result.moves.length]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentMoveIndex >= result.moves.length - 1) {
      setIsPlaying(false);
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
        {currentMove && (
          <div className="text-center text-sm">
            <div className="text-muted-foreground">
              Turn {currentMove.turn} - {currentMove.player === "player1" ? "Player 1" : "Player 2"}
            </div>
            <div className="font-medium mt-1">
              Rolled {currentMove.dieValue}, placed in column {currentMove.column + 1}
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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPause}
            disabled={isLastMove}
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
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
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{
                width: `${((currentMoveIndex + 1) / result.moves.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
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
