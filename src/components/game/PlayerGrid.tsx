"use client";

import { Loader2 } from "lucide-react";
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
  removingDice?: { column: ColumnIndex; indices: number[] }[];
  isThinking?: boolean;
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
  isThinking = false,
}: PlayerGridProps) {
  const score = calculateGridScore(grid);

  const getWinProbability = (column: ColumnIndex): number | undefined => {
    if (!moveAnalysis) {
      return undefined;
    }
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
        "flex flex-col items-center gap-[clamp(0.25rem,1.5vmin,1rem)] p-[clamp(0.5rem,2vmin,1.25rem)] rounded-xl sm:rounded-2xl transition-all duration-300",
        isCurrentPlayer && !isOpponent && "ring-2 ring-accent/50 bg-accent/5"
      )}
    >
      {/* Player info */}
      <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)]">
        <div
          className={cn(
            "w-[clamp(0.5rem,1.5vw,0.75rem)] h-[clamp(0.5rem,1.5vw,0.75rem)] rounded-full transition-all",
            isCurrentPlayer ? "bg-accent animate-pulse" : "bg-muted-foreground/30"
          )}
        />
        <span className="font-semibold text-[clamp(0.875rem,2.5vw,1.125rem)]">{playerName}</span>
        {isThinking && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
        <div
          className={cn(
            "font-mono font-bold text-[clamp(1.125rem,3.5vw,1.5rem)] tabular-nums transition-all",
            isCurrentPlayer ? "text-accent" : "text-foreground"
          )}
        >
          {score.total}
        </div>
      </div>

      {/* Grid */}
      <div
        className={cn(
          "flex gap-[clamp(0.375rem,2vmin,1.25rem)] p-[clamp(0.5rem,2.5vmin,1.25rem)] rounded-lg sm:rounded-xl bg-card/50 backdrop-blur border border-border/50"
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
            showProbability={showProbabilities && legalColumns.includes(colIndex)}
            newDieIndex={newDieColumn === colIndex ? (newDieRow ?? undefined) : undefined}
            removingIndices={getRemovingIndices(colIndex)}
          />
        ))}
      </div>

      {/* Column scores breakdown - hidden on very small screens */}
      <div className="hidden xs:flex gap-[clamp(0.75rem,2.5vw,1rem)] text-[clamp(0.625rem,1.5vw,0.75rem)] text-muted-foreground">
        {score.columns.map((col) => (
          <div key={`col-score-${col.column}`} className="text-center">
            <span className="font-mono">{col.total}</span>
            {col.multiplier > 1 && (
              <span className="text-accent ml-1">×{col.multiplier.toFixed(0)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
