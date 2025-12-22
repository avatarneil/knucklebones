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
    <div className="flex items-center justify-center gap-8 p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50">
      {/* Player 1 */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          currentPlayer === "player1" && "scale-110",
          winner === "player1" && "text-accent",
        )}
      >
        <span className="text-sm text-muted-foreground">{player1Name}</span>
        <span className="font-mono font-bold text-3xl tabular-nums">
          {player1Score.total}
        </span>
        {winner === "player1" && (
          <Trophy className="w-5 h-5 text-accent animate-bounce" />
        )}
      </div>

      {/* Divider with diff */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
            diff > 0
              ? "bg-green-500/20 text-green-400"
              : diff < 0
                ? "bg-red-500/20 text-red-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {diff > 0 ? (
            <>
              <TrendingUp className="w-4 h-4" />+{diff}
            </>
          ) : diff < 0 ? (
            <>
              <TrendingDown className="w-4 h-4" />
              {diff}
            </>
          ) : (
            <>
              <Minus className="w-4 h-4" />0
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">vs</span>
      </div>

      {/* Player 2 */}
      <div
        className={cn(
          "flex flex-col items-center gap-1 transition-all",
          currentPlayer === "player2" && "scale-110",
          winner === "player2" && "text-accent",
        )}
      >
        <span className="text-sm text-muted-foreground">{player2Name}</span>
        <span className="font-mono font-bold text-3xl tabular-nums">
          {player2Score.total}
        </span>
        {winner === "player2" && (
          <Trophy className="w-5 h-5 text-accent animate-bounce" />
        )}
      </div>

      {/* Draw indicator */}
      {winner === "draw" && (
        <div className="absolute -bottom-6 text-sm text-muted-foreground">
          Draw!
        </div>
      )}
    </div>
  );
}
