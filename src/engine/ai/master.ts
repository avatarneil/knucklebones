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

import { calculateColumnScore } from "../scorer";
import type { ColumnIndex, DieValue, GameState, Grid, Player } from "../types";
import {
  endProfileGame,
  getMasterMoveWasm,
  getOpponentProfile,
  getProfileStats,
  isWasmInitialized,
  recordOpponentMove,
  resetOpponentProfile as resetWasmProfile,
} from "./wasm-bindings";

export interface MasterProfileStats {
  gamesCompleted: number;
  totalMoves: number;
  attackRate: number;
  columnFrequencies: [number, number, number];
  hasLearned: boolean;
}

/**
 * Get statistics from the opponent profile
 */
export function getMasterProfileStats(): MasterProfileStats {
  const stats = getProfileStats();

  if (!stats) {
    return {
      gamesCompleted: 0,
      totalMoves: 0,
      attackRate: 0,
      columnFrequencies: [0.333, 0.333, 0.333],
      hasLearned: false,
    };
  }

  return {
    ...stats,
    hasLearned: stats.gamesCompleted >= 3 && stats.totalMoves >= 10,
  };
}

/**
 * Reset the opponent profile (clear all learned data)
 */
export function resetMasterProfile(): void {
  resetWasmProfile();
}

/**
 * Record an opponent move for the Master AI to learn from
 *
 * @param state The game state BEFORE the move was applied
 * @param column The column where the opponent placed their die
 * @param dieValue The die value that was placed
 * @param opponentPlayer Which player is the opponent
 */
export function recordOpponentMoveForLearning(
  state: GameState,
  column: ColumnIndex,
  dieValue: DieValue,
  opponentPlayer: Player,
): void {
  // Calculate how many dice were removed and score lost
  const masterPlayer = opponentPlayer === "player1" ? "player2" : "player1";
  const masterGrid = state.grids[masterPlayer];
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

  // Record the move
  recordOpponentMove(column, dieValue, removedCount, scoreLost);
}

/**
 * Mark end of game for the Master AI profile
 */
export function endMasterGame(): void {
  endProfileGame();
}

/**
 * Get the Master AI's best move using adaptive learning
 */
export function getMasterMove(state: GameState): ColumnIndex | null {
  if (state.phase !== "placing" || state.currentDie === null) {
    return null;
  }

  const result = getMasterMoveWasm(
    state.grids.player1,
    state.grids.player2,
    state.currentPlayer,
    state.currentDie,
  );

  return result as ColumnIndex | null;
}

/**
 * Check if the Master AI is ready to use
 */
export function isMasterReady(): boolean {
  return isWasmInitialized() && getOpponentProfile() !== null;
}

// Helper function to calculate column score
function calculateColumnScoreSimple(dice: DieValue[]): number {
  if (dice.length === 0) return 0;

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
