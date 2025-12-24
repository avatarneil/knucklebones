/**
 * Master AI - Adaptive Learning System
 *
 * The Master AI learns opponent patterns across simulation games and adapts
 * its strategy to exploit weaknesses. It tracks:
 * - Column usage preferences
 * - Attack frequency (how often opponent removes dice)
 * - Die value placement patterns (high vs low dice)
 *
 * This module provides a TypeScript interface to the WASM opponent profile.
 */

import type { ColumnIndex, DieValue, GameState, Player } from "../types";
import {
  endProfileGame,
  getMasterMoveWasm,
  getOpponentProfile,
  getProfileStats,
  isWasmInitialized,
  recordOpponentMove,
  resetOpponentProfile as resetWasmProfile,
} from "./wasm-bindings";
import type { ProfileOwner } from "./wasm-bindings";

// Re-export ProfileOwner for use by other modules
export type { ProfileOwner };

export interface MasterProfileStats {
  gamesCompleted: number;
  totalMoves: number;
  attackRate: number;
  columnFrequencies: [number, number, number];
  hasLearned: boolean;
}

/**
 * Get statistics from the opponent profile for a specific player's perspective.
 * @param owner The player whose profile stats to get (defaults to "player1" for backward compatibility)
 */
export function getMasterProfileStats(owner: ProfileOwner = "player1"): MasterProfileStats {
  const stats = getProfileStats(owner);

  if (!stats) {
    return {
      attackRate: 0,
      columnFrequencies: [0.333, 0.333, 0.333],
      gamesCompleted: 0,
      hasLearned: false,
      totalMoves: 0,
    };
  }

  return {
    ...stats,
    hasLearned: stats.gamesCompleted >= 3 && stats.totalMoves >= 10,
  };
}

/**
 * Reset the opponent profile (clear all learned data)
 * @param owner The player whose profile to reset (or undefined to reset both)
 */
export function resetMasterProfile(owner?: ProfileOwner): void {
  resetWasmProfile(owner);
}

/**
 * Record an opponent move for the Master AI to learn from.
 *
 * @param state The game state BEFORE the move was applied
 * @param column The column where the opponent placed their die
 * @param dieValue The die value that was placed
 * @param opponentPlayer Which player made the move (the opponent of the Master AI)
 * @param masterPlayer Which player is the Master AI that should learn from this move
 *                     (defaults to the opposite of opponentPlayer for backward compatibility)
 */
export function recordOpponentMoveForLearning(
  state: GameState,
  column: ColumnIndex,
  dieValue: DieValue,
  opponentPlayer: Player,
  masterPlayer?: Player
): void {
  // Determine which Master AI should learn from this move
  const learningPlayer: Player =
    masterPlayer ?? (opponentPlayer === "player1" ? "player2" : "player1");

  // Calculate how many dice were removed and score lost from the Master's perspective
  const masterGrid = state.grids[learningPlayer];
  const masterColumn = masterGrid[column];

  // Count matching dice that will be removed
  let removedCount = 0;
  let scoreLost = 0;

  // Calculate score before removal
  const columnDice = masterColumn.filter((d): d is DieValue => d !== null);
  const scoreBefore = calculateColumnScoreSimple(columnDice);

  // Calculate score after removal (remove matching dice)
  const diceAfterRemoval = columnDice.filter((d) => d !== dieValue);
  removedCount = columnDice.length - diceAfterRemoval.length;
  const scoreAfter = calculateColumnScoreSimple(diceAfterRemoval);
  scoreLost = scoreBefore - scoreAfter;

  // Record the move to the Master AI's profile
  recordOpponentMove(learningPlayer, column, dieValue, removedCount, scoreLost);
}

/**
 * Mark end of game for the Master AI profile
 * @param owner The player whose profile to update (or undefined to update both)
 */
export function endMasterGame(owner?: ProfileOwner): void {
  endProfileGame(owner);
}

/**
 * Get the Master AI's best move using adaptive learning
 */
export function getMasterMove(state: GameState): ColumnIndex | null {
  if (state.phase !== "placing" || state.currentDie === null) {
    return;
  }

  const result = getMasterMoveWasm(
    state.grids.player1,
    state.grids.player2,
    state.currentPlayer,
    state.currentDie
  );

  return result as ColumnIndex | null;
}

/**
 * Check if the Master AI is ready to use
 * @param owner The player whose profile to check (defaults to "player1")
 */
export function isMasterReady(owner: ProfileOwner = "player1"): boolean {
  return isWasmInitialized() && getOpponentProfile(owner) !== null;
}

// Helper function to calculate column score
function calculateColumnScoreSimple(dice: DieValue[]): number {
  if (dice.length === 0) {
    return 0;
  }

  const counts: Record<number, number> = {};
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }

  let total = 0;
  for (const [value, count] of Object.entries(counts)) {
    total += Number(value) * count * count;
  }

  return total;
}
