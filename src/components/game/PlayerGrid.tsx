"use client";

import { calculateGridScore } from "@/engine/scorer";
import type { ColumnIndex, Grid, MoveAnalysis } from "@/engine/types";
import { ALL_COLUMNS } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Column } from "./Column";

interface PlayerGridProps {
  grid: Grid;
  playerName: string;
  isCurrentPlayer?: boolean;
  isOpponent?: boolean;
  canPlaceDie?: boolean;
  onColumnClick?: (column: ColumnIndex) => void;
  legalColumns?: ColumnIndex[];
  moveAnalysis?: MoveAnalysis[];
  showProbabilities?: boolean;
  highlightedColumn?: ColumnIndex | null;
  newDieColumn?: ColumnIndex | null;
  newDieRow?: number | null;
  removingDice?: Array<{ column: ColumnIndex; indices: number[] }>;
}

export function PlayerGrid({
  grid,
  playerName,
  isCurrentPlayer = false,
  isOpponent = false,
  canPlaceDie = false,
  onColumnClick,
  legalColumns = [],
  moveAnalysis,
  showProbabilities = false,
  highlightedColumn,
  newDieColumn,
  newDieRow,
  removingDice = [],
}: PlayerGridProps) {
  const score = calculateGridScore(grid);

  const getWinProbability = (column: ColumnIndex): number | undefined => {
    if (!moveAnalysis) return undefined;
    const analysis = moveAnalysis.find((m) => m.column === column);
    return analysis?.winProbability;
  };

  const getRemovingIndices = (column: ColumnIndex): number[] => {
    const removing = removingDice.find((r) => r.column === column);
    return removing?.indices ?? [];
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-4 rounded-2xl transition-all duration-300",
        isCurrentPlayer && !isOpponent && "ring-2 ring-accent/50 bg-accent/5",
      )}
    >
      {/* Player info */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-3 h-3 rounded-full transition-all",
            isCurrentPlayer
              ? "bg-accent animate-pulse"
              : "bg-muted-foreground/30",
          )}
        />
        <span className="font-semibold text-lg">{playerName}</span>
        <div
          className={cn(
            "font-mono font-bold text-2xl tabular-nums transition-all",
            isCurrentPlayer ? "text-accent" : "text-foreground",
          )}
        >
          {score.total}
        </div>
      </div>

      {/* Grid */}
      <div
        className={cn(
          "flex gap-2 p-3 rounded-xl bg-card/50 backdrop-blur border border-border/50",
        )}
      >
        {ALL_COLUMNS.map((colIndex) => (
          <Column
            key={colIndex}
            column={grid[colIndex]}
            columnIndex={colIndex}
            isClickable={canPlaceDie && legalColumns.includes(colIndex)}
            isHighlighted={highlightedColumn === colIndex}
            onClick={() => onColumnClick?.(colIndex)}
            isOpponent={isOpponent}
            winProbability={getWinProbability(colIndex)}
            showProbability={
              showProbabilities && legalColumns.includes(colIndex)
            }
            newDieIndex={
              newDieColumn === colIndex ? (newDieRow ?? undefined) : undefined
            }
            removingIndices={getRemovingIndices(colIndex)}
          />
        ))}
      </div>

      {/* Column scores breakdown */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {score.columns.map((col) => (
          <div key={`col-score-${col.column}`} className="text-center">
            <span className="font-mono">{col.total}</span>
            {col.multiplier > 1 && (
              <span className="text-accent ml-1">
                ×{col.multiplier.toFixed(0)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
