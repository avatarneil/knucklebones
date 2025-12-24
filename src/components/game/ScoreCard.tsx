"use client";

import { Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { PlayerScore } from "@/engine/types";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  player1Score: PlayerScore;
  player2Score: PlayerScore;
  player1Name?: string;
  player2Name?: string;
  currentPlayer?: "player1" | "player2";
  winner?: "player1" | "player2" | "draw" | null;
}

export function ScoreCard({
  player1Score,
  player2Score,
  player1Name = "You",
  player2Name = "Opponent",
  currentPlayer,
  winner,
}: ScoreCardProps) {
  const diff = player1Score.total - player2Score.total;

  return (
    <div className="flex items-center justify-center gap-[clamp(1rem,3vw,2rem)] p-[clamp(0.5rem,2vw,1rem)] rounded-lg sm:rounded-xl bg-card/50 backdrop-blur border border-border/50">
      {/* Player 1 */}
      <div
        className={cn(
          "flex flex-col items-center gap-[clamp(0.125rem,0.5vw,0.25rem)] transition-all",
          currentPlayer === "player1" && "scale-105",
          winner === "player1" && "text-accent"
        )}
      >
        <span className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
          {player1Name}
        </span>
        <span className="font-mono font-bold text-[clamp(1.25rem,4vw,1.875rem)] tabular-nums">
          {player1Score.total}
        </span>
        {winner === "player1" && (
          <Trophy className="w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)] text-accent animate-bounce" />
        )}
      </div>

      {/* Divider with diff */}
      <div className="flex flex-col items-center gap-[clamp(0.125rem,0.5vw,0.25rem)]">
        <div
          className={cn(
            "flex items-center gap-[clamp(0.125rem,0.5vw,0.25rem)] px-[clamp(0.5rem,1.5vw,0.75rem)] py-[clamp(0.125rem,0.5vw,0.25rem)] rounded-full text-[clamp(0.75rem,2vw,0.875rem)] font-medium",
            diff > 0
              ? "bg-green-500/20 text-green-400"
              : diff < 0
                ? "bg-red-500/20 text-red-400"
                : "bg-muted text-muted-foreground"
          )}
        >
          {diff > 0 ? (
            <>
              <TrendingUp className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />+
              {diff}
            </>
          ) : diff < 0 ? (
            <>
              <TrendingDown className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />
              {diff}
            </>
          ) : (
            <>
              <Minus className="w-[clamp(0.75rem,2vw,1rem)] h-[clamp(0.75rem,2vw,1rem)]" />0
            </>
          )}
        </div>
        <span className="text-[clamp(0.625rem,1.5vw,0.75rem)] text-muted-foreground">vs</span>
      </div>

      {/* Player 2 */}
      <div
        className={cn(
          "flex flex-col items-center gap-[clamp(0.125rem,0.5vw,0.25rem)] transition-all",
          currentPlayer === "player2" && "scale-105",
          winner === "player2" && "text-accent"
        )}
      >
        <span className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
          {player2Name}
        </span>
        <span className="font-mono font-bold text-[clamp(1.25rem,4vw,1.875rem)] tabular-nums">
          {player2Score.total}
        </span>
        {winner === "player2" && (
          <Trophy className="w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)] text-accent animate-bounce" />
        )}
      </div>

      {/* Draw indicator */}
      {winner === "draw" && (
        <div className="absolute -bottom-[clamp(1.25rem,3vw,1.5rem)] text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
          Draw!
        </div>
      )}
    </div>
  );
}
