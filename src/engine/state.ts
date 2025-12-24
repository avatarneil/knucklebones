/**
 * Knucklebones Game Engine - State Management
 *
 * Immutable game state creation and management.
 */

import { calculateGridScore } from "./scorer";
import type { DieValue, GameConfig, GameState, Grid, Player } from "./types";
import { cloneGrid, parseGameState } from "@/lib/type-guards";

/**
 * Create an empty column
 */
export function createEmptyColumn(): Column {
  return [null, null, null];
}

/**
 * Create an empty grid
 */
export function createEmptyGrid(): Grid {
  return [createEmptyColumn(), createEmptyColumn(), createEmptyColumn()];
}

/**
 * Create the initial game state
 */
export function createInitialState(_config?: GameConfig): GameState {
  return {
    grids: {
      player1: createEmptyGrid(),
      player2: createEmptyGrid(),
    },
    currentPlayer: "player1",
    currentDie: null,
    phase: "rolling",
    winner: null,
    turnNumber: 1,
    moveHistory: [],
  };
}

/**
 * Clone a game state (deep copy)
 */
export function cloneState(state: GameState): GameState {
  return {
    grids: {
      player1: cloneGrid(state.grids.player1),
      player2: cloneGrid(state.grids.player2),
    },
    currentPlayer: state.currentPlayer,
    currentDie: state.currentDie,
    phase: state.phase,
    winner: state.winner,
    turnNumber: state.turnNumber,
    moveHistory: [...state.moveHistory],
  };
}

/**
 * Get the current scores for both players
 */
export function getScores(state: GameState): {
  player1: number;
  player2: number;
} {
  return {
    player1: calculateGridScore(state.grids.player1).total,
    player2: calculateGridScore(state.grids.player2).total,
  };
}

/**
 * Get detailed score breakdown for both players
 */
export function getDetailedScores(state: GameState) {
  return {
    player1: calculateGridScore(state.grids.player1),
    player2: calculateGridScore(state.grids.player2),
  };
}

/**
 * Count total dice on a grid
 */
export function countDice(grid: Grid): number {
  return grid.reduce(
    (total, col) => total + col.filter((d) => d !== null).length,
    0,
  );
}

/**
 * Get game progress (0-1)
 */
export function getGameProgress(state: GameState): number {
  const p1Dice = countDice(state.grids.player1);
  const p2Dice = countDice(state.grids.player2);
  // Max 9 dice per player, but game ends when one fills
  return Math.max(p1Dice, p2Dice) / 9;
}

/**
 * Check if it's early, mid, or late game
 */
export function getGamePhaseDescription(
  state: GameState,
): "early" | "mid" | "late" {
  const progress = getGameProgress(state);
  if (progress < 0.33) return "early";
  if (progress < 0.67) return "mid";
  return "late";
}

/**
 * Serialize state to JSON string
 */
export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize state from JSON string
 */
export function deserializeState(json: string): GameState {
  return parseGameState(json);
}

/**
 * Create a state from a grid configuration (for testing)
 */
export function createStateFromGrids(
  player1Grid: Grid,
  player2Grid: Grid,
  currentPlayer: Player = "player1",
  currentDie: DieValue | null = null,
): GameState {
  return {
    grids: {
      player1: cloneGrid(player1Grid),
      player2: cloneGrid(player2Grid),
    },
    currentPlayer,
    currentDie,
    phase: currentDie ? "placing" : "rolling",
    winner: null,
    turnNumber: 1,
    moveHistory: [],
  };
}

/**
 * Get a hash of the current state (for caching/transposition tables)
 */
export function getStateHash(state: GameState): string {
  const gridToString = (grid: Grid): string =>
    grid.map((col) => col.map((d) => d ?? "-").join("")).join("|");

  return `${gridToString(state.grids.player1)}:${gridToString(state.grids.player2)}:${state.currentPlayer}:${state.currentDie ?? "x"}`;
}

/**
 * Check if two states are equivalent
 */
export function statesEqual(a: GameState, b: GameState): boolean {
  return getStateHash(a) === getStateHash(b);
}
