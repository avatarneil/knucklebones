/**
 * Knucklebones Game Engine - Scoring System
 *
 * Handles score calculation with multipliers for matching dice.
 *
 * Scoring Rules:
 * - Single die: face value
 * - 2 matching dice: value × 2 × 2 = value × 4
 * - 3 matching dice: value × 3 × 3 = value × 9
 */

import type {
  Column,
  ColumnIndex,
  ColumnScore,
  DieValue,
  Grid,
  PlayerScore,
} from "./types";
import { ALL_COLUMNS } from "./types";
import { addDieToColumn, removeDieFromColumn } from "@/lib/type-guards";

/**
 * Count occurrences of each die value in a column
 */
function countDiceInColumn(column: Column): Map<DieValue, number> {
  const counts = new Map<DieValue, number>();

  for (const die of column) {
    if (die !== null) {
      counts.set(die, (counts.get(die) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Calculate the score for a single column
 */
export function calculateColumnScore(
  column: Column,
  columnIndex: ColumnIndex,
): ColumnScore {
  const dice = column.filter((d): d is DieValue => d !== null);
  const counts = countDiceInColumn(column);

  let total = 0;

  for (const [value, count] of counts) {
    // Each matching die is multiplied by the count
    // So 2 dice of value 4 = 4*2 + 4*2 = 16 = 4 * 2 * 2
    // And 3 dice of value 4 = 4*3 + 4*3 + 4*3 = 36 = 4 * 3 * 3
    total += value * count * count;
  }

  // Calculate effective multiplier for display
  // (This is approximate - actual scoring is per-group)
  const baseValue = dice.reduce((sum, d) => sum + d, 0);
  const multiplier = baseValue > 0 ? total / baseValue : 1;

  return {
    column: columnIndex,
    dice,
    baseValue,
    multiplier,
    total,
  };
}

/**
 * Calculate the total score for a player's grid
 */
export function calculateGridScore(grid: Grid): PlayerScore {
  const columns: [ColumnScore, ColumnScore, ColumnScore] = [
    calculateColumnScore(grid[0], 0),
    calculateColumnScore(grid[1], 1),
    calculateColumnScore(grid[2], 2),
  ];

  const total = columns.reduce((sum, col) => sum + col.total, 0);

  return { columns, total };
}

/**
 * Calculate the score difference between placing a die and not
 * (used for AI evaluation)
 */
export function calculateMoveScoreGain(
  grid: Grid,
  column: ColumnIndex,
  dieValue: DieValue,
): number {
  const currentScore = calculateColumnScore(grid[column], column).total;

  // Create a copy of the column with the new die
  const newColumn = addDieToColumn(grid[column], dieValue);

  if (newColumn === null) {
    return 0; // Column is full
  }

  const newScore = calculateColumnScore(newColumn, column).total;

  return newScore - currentScore;
}

/**
 * Calculate how many dice would be removed from opponent
 */
export function calculateDiceRemoved(
  opponentColumn: Column,
  dieValue: DieValue,
): number {
  return opponentColumn.filter((d) => d === dieValue).length;
}

/**
 * Calculate the score loss for opponent from removing their dice
 */
export function calculateOpponentScoreLoss(
  opponentGrid: Grid,
  column: ColumnIndex,
  dieValue: DieValue,
): number {
  const currentScore = calculateColumnScore(opponentGrid[column], column).total;

  // Create a copy of the column without the matching dice
  const newColumn = removeDieFromColumn(opponentGrid[column], dieValue);
  const newScore = calculateColumnScore(newColumn, column).total;

  return currentScore - newScore;
}

/**
 * Check if a column is full
 */
export function isColumnFull(column: Column): boolean {
  return column.every((d) => d !== null);
}

/**
 * Check if a grid is full (game over condition)
 */
export function isGridFull(grid: Grid): boolean {
  return grid.every(isColumnFull);
}

/**
 * Get the number of empty slots in a column
 */
export function getEmptySlots(column: Column): number {
  return column.filter((d) => d === null).length;
}

/**
 * Get the number of empty slots in a grid
 */
export function getTotalEmptySlots(grid: Grid): number {
  return grid.reduce((sum, col) => sum + getEmptySlots(col), 0);
}
