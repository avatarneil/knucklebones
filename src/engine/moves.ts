/**
 * Knucklebones Game Engine - Move System
 *
 * Handles move generation, validation, and application.
 */

import { isColumnFull, isGridFull } from "./scorer";
import type {
  Column,
  ColumnIndex,
  DieValue,
  GameState,
  Grid,
  LegalMoves,
  Move,
  MoveResult,
  Player,
} from "./types";
import { ALL_COLUMNS, getOpponent } from "./types";

/**
 * Get all legal column choices for the current state
 */
export function getLegalMoves(state: GameState): LegalMoves | null {
  if (state.phase !== "placing" || state.currentDie === null) {
    return null;
  }

  const grid = state.grids[state.currentPlayer];
  const columns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  return {
    columns,
    dieValue: state.currentDie,
  };
}

/**
 * Check if a move is legal
 */
export function isLegalMove(state: GameState, column: ColumnIndex): boolean {
  const legalMoves = getLegalMoves(state);
  if (!legalMoves) {
    return false;
  }
  return legalMoves.columns.includes(column);
}

/**
 * Place a die in a column (helper function)
 */
function placeDieInColumn(column: Column, dieValue: DieValue): Column {
  const newColumn = [...column] as Column;
  const emptyIndex = newColumn.indexOf(null);

  if (emptyIndex !== -1) {
    newColumn[emptyIndex] = dieValue;
  }

  return newColumn;
}

/**
 * Compact a column by pushing dice down to fill gaps
 * (removes nulls and shifts remaining dice to the bottom)
 */
function compactColumn(column: Column): Column {
  // Filter out both null and undefined for safety
  const nonNullDice = column.filter((d) => d != null) as DieValue[];
  const result: Column = [null, null, null];

  // Fill from bottom (index 0) up
  for (let i = 0; i < nonNullDice.length; i++) {
    result[i] = nonNullDice[i];
  }

  return result;
}

/**
 * Remove matching dice from opponent's column and compact
 */
function removeMatchingDice(column: Column, dieValue: DieValue): Column {
  const afterRemoval = column.map((d) => (d === dieValue ? null : d)) as Column;
  return compactColumn(afterRemoval);
}

/**
 * Count how many dice will be removed
 */
function countRemovedDice(column: Column, dieValue: DieValue): number {
  return column.filter((d) => d === dieValue).length;
}

/**
 * Apply a move to the game state
 * Returns a new immutable game state
 */
export function applyMove(state: GameState, column: ColumnIndex): MoveResult | null {
  // Validate the move
  if (!isLegalMove(state, column) || state.currentDie === null) {
    return null;
  }

  const dieValue = state.currentDie;
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);

  // Clone the grids
  const newGrids = {
    player1: state.grids.player1.map((col) => [...col]) as Grid,
    player2: state.grids.player2.map((col) => [...col]) as Grid,
  };

  // Place the die in the current player's column
  newGrids[currentPlayer][column] = placeDieInColumn(newGrids[currentPlayer][column], dieValue);

  // Remove matching dice from opponent's corresponding column
  const removedCount = countRemovedDice(newGrids[opponent][column], dieValue);
  newGrids[opponent][column] = removeMatchingDice(newGrids[opponent][column], dieValue);

  // Check for game end (current player's grid is full)
  const gameEnded = isGridFull(newGrids[currentPlayer]);

  // Determine winner if game ended
  let winner: Player | "draw" | null = null;
  if (gameEnded) {
    const { calculateGridScore } = require("./scorer");
    const score1 = calculateGridScore(newGrids.player1).total;
    const score2 = calculateGridScore(newGrids.player2).total;

    if (score1 > score2) {
      winner = "player1";
    } else if (score2 > score1) {
      winner = "player2";
    } else {
      winner = "draw";
    }
  }

  // Create the move record
  const move: Move = { column, dieValue };

  // Create new state
  const newState: GameState = {
    currentDie: null,
    currentPlayer: gameEnded ? currentPlayer : opponent,
    grids: newGrids,
    moveHistory: [...state.moveHistory, move],
    phase: gameEnded ? "ended" : "rolling",
    turnNumber: state.turnNumber + 1,
    winner,
  };

  return {
    newState,
    removedDice: removedCount > 0 ? { column, count: removedCount, value: dieValue } : null,
  };
}

/**
 * Roll a die (sets the current die value)
 */
export function rollDie(state: GameState): GameState {
  if (state.phase !== "rolling") {
    return state;
  }

  const dieValue = (Math.floor(Math.random() * 6) + 1) as DieValue;

  return {
    ...state,
    currentDie: dieValue,
    phase: "placing",
  };
}

/**
 * Roll a specific die value (for testing/replay)
 */
export function rollSpecificDie(state: GameState, value: DieValue): GameState {
  if (state.phase !== "rolling") {
    return state;
  }

  return {
    ...state,
    currentDie: value,
    phase: "placing",
  };
}

/**
 * Check if the game has any legal moves available
 */
export function hasLegalMoves(state: GameState): boolean {
  if (state.phase === "ended") {
    return false;
  }
  if (state.phase === "rolling") {
    return true;
  }

  const legalMoves = getLegalMoves(state);
  return legalMoves !== null && legalMoves.columns.length > 0;
}

/**
 * Get all possible resulting states from the current state
 * (used for AI lookahead with dice probability)
 */
export function getAllPossibleMoves(
  state: GameState
): { column: ColumnIndex; result: MoveResult }[] {
  const legalMoves = getLegalMoves(state);
  if (!legalMoves) {
    return [];
  }

  const results: { column: ColumnIndex; result: MoveResult }[] = [];

  for (const column of legalMoves.columns) {
    const result = applyMove(state, column);
    if (result) {
      results.push({ column, result });
    }
  }

  return results;
}
