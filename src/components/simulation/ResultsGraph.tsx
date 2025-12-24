"use client";

import { useMemo } from "react";
import type { SimulationStats } from "@/engine/simulation";

interface ResultsGraphProps {
  stats: SimulationStats;
  maxGames: number;
  height?: number;
}

export function ResultsGraph({ stats, maxGames, height: _height = 200 }: ResultsGraphProps) {
  const { completedGames, player1Wins, player2Wins, draws } = stats;

  const percentages = useMemo(() => {
    if (completedGames === 0) {
      return { draws: 0, player1: 0, player2: 0 };
    }
    return {
      draws: (draws / completedGames) * 100,
      player1: (player1Wins / completedGames) * 100,
      player2: (player2Wins / completedGames) * 100,
    };
  }, [completedGames, player1Wins, player2Wins, draws]);

  const progress = maxGames > 0 ? (completedGames / maxGames) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {completedGames} / {maxGames} games
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Win Rate Bars */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Win Rates</span>
          <span className="font-medium">
            {completedGames > 0
              ? `${Math.round(percentages.player1)}% / ${Math.round(percentages.player2)}%`
              : "0% / 0%"}
          </span>
        </div>
        <div className="space-y-1.5">
          {/* Player 1 Wins */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Player 1:</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
              <div
                className="h-full bg-green-500 transition-all duration-300 ease-out"
                style={{ width: `${percentages.player1}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                {player1Wins} wins
              </span>
            </div>
          </div>

          {/* Player 2 Wins */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Player 2:</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
              <div
                className="h-full bg-red-500 transition-all duration-300 ease-out"
                style={{ width: `${percentages.player2}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                {player2Wins} wins
              </span>
            </div>
          </div>

          {/* Draws */}
          {draws > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20">Draws:</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                <div
                  className="h-full bg-muted-foreground transition-all duration-300 ease-out"
                  style={{ width: `${percentages.draws}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                  {draws} draws
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <div className="text-xs text-muted-foreground">Avg Turns</div>
          <div className="text-lg font-semibold">
            {stats.averageTurnCount > 0 ? stats.averageTurnCount.toFixed(1) : "-"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Score Diff</div>
          <div className="text-lg font-semibold">
            {stats.averageScoreDiff !== 0
              ? stats.averageScoreDiff > 0
                ? `+${stats.averageScoreDiff.toFixed(1)}`
                : stats.averageScoreDiff.toFixed(1)
              : "0"}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-muted-foreground">Avg Runtime per Game</div>
          <div className="text-lg font-semibold">
            {stats.averageRuntimePerGame > 0
              ? stats.averageRuntimePerGame < 1000
                ? `${stats.averageRuntimePerGame.toFixed(1)}ms`
                : `${(stats.averageRuntimePerGame / 1000).toFixed(2)}s`
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
