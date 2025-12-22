"use client";

import { Info, Target, Trash2, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnIndex, MoveAnalysis } from "@/engine/types";
import { cn } from "@/lib/utils";

interface WinProbabilityProps {
  analysis: MoveAnalysis[];
  onSelectColumn?: (column: ColumnIndex) => void;
  isAnalyzing?: boolean;
}

export function WinProbability({
  analysis,
  onSelectColumn,
  isAnalyzing = false,
}: WinProbabilityProps) {
  if (isAnalyzing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border/50">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">
          Analyzing moves...
        </span>
      </div>
    );
  }

  if (analysis.length === 0) {
    return null;
  }

  const bestMove = analysis.reduce((best, move) =>
    move.winProbability > best.winProbability ? move : best,
  );

  return (
    <div className="space-y-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Info className="w-4 h-4" />
        Move Analysis
      </div>

      <div className="space-y-2">
        {analysis.map((move) => {
          const isBest = move.column === bestMove.column;
          const probPercent = (move.winProbability * 100).toFixed(0);

          return (
            <Tooltip key={move.column}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectColumn?.(move.column)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer",
                    isBest
                      ? "bg-accent/20 border border-accent/50"
                      : "bg-muted/30 hover:bg-muted/50",
                  )}
                >
                  {/* Column indicator */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold",
                      isBest ? "bg-accent text-accent-foreground" : "bg-muted",
                    )}
                  >
                    {move.column + 1}
                  </div>

                  {/* Stats */}
                  <div className="flex-1 flex items-center gap-4 text-sm">
                    {/* Win probability */}
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={cn(
                          "font-mono font-medium",
                          move.winProbability > 0.5
                            ? "text-green-400"
                            : move.winProbability > 0.3
                              ? "text-yellow-400"
                              : "text-red-400",
                        )}
                      >
                        {probPercent}%
                      </span>
                    </div>

                    {/* Score gain */}
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        +{move.immediateScoreGain}
                      </span>
                    </div>

                    {/* Dice removed */}
                    {move.opponentDiceRemoved > 0 && (
                      <div className="flex items-center gap-1">
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span className="text-destructive">
                          -{move.opponentDiceRemoved}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Best indicator */}
                  {isBest && (
                    <span className="text-xs font-medium text-accent px-2 py-0.5 bg-accent/20 rounded-full">
                      BEST
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p>
                    <strong>Column {move.column + 1}</strong>
                  </p>
                  <p>Win probability: {probPercent}%</p>
                  <p>Immediate score: +{move.immediateScoreGain}</p>
                  <p>Expected score diff: {move.expectedScore.toFixed(1)}</p>
                  {move.opponentDiceRemoved > 0 && (
                    <p>Removes {move.opponentDiceRemoved} opponent dice</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
