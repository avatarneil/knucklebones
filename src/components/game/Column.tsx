"use client";

import { calculateColumnScore } from "@/engine/scorer";
import type { ColumnIndex, Column as ColumnType } from "@/engine/types";
import { cn } from "@/lib/utils";
import { DieSlot } from "./Die";

interface ColumnProps {
  column: ColumnType;
  columnIndex: ColumnIndex;
  isClickable?: boolean;
  isHighlighted?: boolean;
  winProbability?: number;
  showProbability?: boolean;
  onClick?: () => void;
  isOpponent?: boolean;
  newDieIndex?: number;
  removingIndices?: number[];
}

export function Column({
  column,
  columnIndex,
  isClickable = false,
  isHighlighted = false,
  winProbability,
  showProbability = false,
  onClick,
  isOpponent = false,
  newDieIndex,
  removingIndices = [],
}: ColumnProps) {
  const score = calculateColumnScore(column, columnIndex);

  // For opponent, reverse the visual order (their row 0 is at bottom from our view)
  const displayColumn = isOpponent ? [...column].reverse() : column;
  const displayIndices = isOpponent ? [2, 1, 0] : [0, 1, 2];

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "flex flex-col gap-[clamp(0.375rem,1.5vmin,1rem)] p-[clamp(0.375rem,2vmin,1rem)] rounded-lg sm:rounded-xl transition-all duration-200",
        isClickable && "cursor-pointer hover:bg-muted/50 hover:scale-105",
        isHighlighted && "ring-2 ring-accent animate-pulse-glow",
        !isClickable && "cursor-default",
      )}
    >
      {/* Column score */}
      <div
        className={cn(
          "text-center font-mono font-bold text-sm sm:text-lg transition-all",
          score.total > 0 ? "text-accent" : "text-muted-foreground",
        )}
      >
        {score.total}
      </div>

      {/* Dice slots */}
      <div className="flex flex-col gap-[clamp(0.375rem,1.5vmin,1rem)]">
        {displayColumn.map((die, displayIdx) => {
          const actualIndex = displayIndices[displayIdx];
          return (
            <DieSlot
              key={actualIndex}
              value={die}
              size="md"
              isNew={actualIndex === newDieIndex}
              isRemoving={removingIndices.includes(actualIndex)}
            />
          );
        })}
      </div>

      {/* Win probability indicator (training mode) */}
      {showProbability && winProbability !== undefined && (
        <div
          className={cn(
            "text-center text-[10px] sm:text-xs font-medium rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 transition-all",
            winProbability > 0.5
              ? "bg-green-500/20 text-green-400"
              : winProbability > 0.3
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400",
          )}
        >
          {(winProbability * 100).toFixed(0)}%
        </div>
      )}
    </button>
  );
}
