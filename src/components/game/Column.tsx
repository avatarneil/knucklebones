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
  const displayColumn = isOpponent ? [...column].toReversed() : column;
  const displayIndices = isOpponent ? [2, 1, 0] : [0, 1, 2];

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "flex flex-col gap-[clamp(0.25rem,1vmin,0.75rem)] p-[clamp(0.25rem,1.5vmin,0.75rem)] rounded-lg sm:rounded-xl transition-colors duration-200",
        isClickable && "cursor-pointer hover:bg-muted/50 hover:scale-105 hover:transition-transform",
        isHighlighted && "ring-2 ring-accent animate-pulse-glow",
        !isClickable && "cursor-default"
      )}
    >
      {/* Column score */}
      <div
        className={cn(
          "text-center font-mono font-bold text-[clamp(0.875rem,2.5vw,1.125rem)] transition-colors",
          score.total > 0 ? "text-accent" : "text-muted-foreground"
        )}
      >
        {score.total}
      </div>

      {/* Dice slots */}
      <div className="flex flex-col gap-[clamp(0.25rem,1vmin,0.75rem)]">
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
            "text-center text-[clamp(0.625rem,1.5vw,0.75rem)] font-medium rounded-full px-[clamp(0.375rem,1vw,0.5rem)] py-[clamp(0.125rem,0.5vw,0.25rem)] transition-colors",
            winProbability > 0.5
              ? "bg-green-500/20 text-green-400"
              : winProbability > 0.3
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
          )}
        >
          {(winProbability * 100).toFixed(0)}%
        </div>
      )}
    </button>
  );
}
