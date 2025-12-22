/**
 * Expectimax Search Algorithm
 *
 * A variant of minimax that handles chance nodes (dice rolls).
 *
 * Node types:
 * - MAX: Current player chooses the best move
 * - CHANCE: Average over all possible dice rolls (1-6, each 1/6 probability)
 */

import { applyMove, rollSpecificDie } from "../moves";
import { isColumnFull } from "../scorer";
import type { ColumnIndex, DieValue, GameState, Player } from "../types";
import { ALL_COLUMNS, ALL_DIE_VALUES } from "../types";
import type { DifficultyConfig } from "./difficulty";
import { evaluate, evaluateMoveQuick } from "./evaluation";

/** Result of expectimax search */
export interface ExpectimaxResult {
  /** Best column to place the die */
  bestMove: ColumnIndex | null;
  /** Expected value of the best move */
  value: number;
  /** Number of nodes explored */
  nodesExplored: number;
}

/** Cache for transposition table */
const transpositionTable = new Map<string, { depth: number; value: number }>();

/** Maximum nodes to explore before timing out (prevents freezing) */
const MAX_NODES = 500000; // Reasonable limit for expert mode depth 6

/**
 * Clear the transposition table (call between games)
 */
export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

/**
 * Get a simple hash for caching
 */
function _getStateKey(state: GameState, depth: number): string {
  const gridStr = (grid: (DieValue | null)[][]): string =>
    grid.map((col) => col.map((d) => d ?? 0).join("")).join("");

  return `${gridStr(state.grids.player1)}|${gridStr(state.grids.player2)}|${state.currentPlayer}|${state.currentDie}|${depth}`;
}

/**
 * Order moves for better pruning (best moves first)
 */
function orderMoves(
  state: GameState,
  columns: ColumnIndex[],
  player: Player,
): ColumnIndex[] {
  const currentDie = state.currentDie;
  if (currentDie === null) return columns;

  const scored = columns.map((col) => ({
    col,
    score: evaluateMoveQuick(state, col, currentDie, player),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.col);
}

/**
 * MAX node: Current player chooses the best move
 */
function maxNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  nodesExplored: { count: number },
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, config);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, config);
  }

  // If we're in rolling phase, this is actually a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, config, nodesExplored);
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return evaluate(state, player, config);
  }

  // Order moves for better search
  const orderedColumns = orderMoves(state, legalColumns, state.currentPlayer);

  let maxValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    const result = applyMove(state, column);
    if (!result) continue;

    // After placing, the next player needs to roll (chance node for them)
    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, config);
    } else if (result.newState.currentPlayer === player) {
      // It's our turn again (shouldn't happen in normal play, but handle it)
      value = chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        nodesExplored,
      );
    } else {
      // Opponent's turn - min node
      value = minNode(
        result.newState,
        depth - 1,
        player,
        config,
        nodesExplored,
      );
    }

    maxValue = Math.max(maxValue, value);
  }

  return maxValue;
}

/**
 * MIN node: Opponent chooses the worst move for us
 */
function minNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  nodesExplored: { count: number },
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, config);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, config);
  }

  // If we're in rolling phase, this is a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, config, nodesExplored);
  }

  // Get legal moves for opponent
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return evaluate(state, player, config);
  }

  let minValue = Number.POSITIVE_INFINITY;

  for (const column of legalColumns) {
    const result = applyMove(state, column);
    if (!result) continue;

    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, config);
    } else if (result.newState.currentPlayer === player) {
      // Back to our turn - max node via chance
      value = chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        nodesExplored,
      );
    } else {
      // Still opponent's turn
      value = chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        nodesExplored,
      );
    }

    minValue = Math.min(minValue, value);
  }

  return minValue;
}

/**
 * CHANCE node: Average over all possible dice rolls
 */
function chanceNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  nodesExplored: { count: number },
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, config);
  }

  if (state.phase !== "rolling") {
    // Not a chance node
    if (state.currentPlayer === player) {
      return maxNode(state, depth, player, config, nodesExplored);
    } else {
      return minNode(state, depth, player, config, nodesExplored);
    }
  }

  // Average over all dice values
  let totalValue = 0;

  for (const dieValue of ALL_DIE_VALUES) {
    const rolledState = rollSpecificDie(state, dieValue);

    let value: number;
    if (rolledState.currentPlayer === player) {
      value = maxNode(rolledState, depth, player, config, nodesExplored);
    } else {
      value = minNode(rolledState, depth, player, config, nodesExplored);
    }

    totalValue += value / 6; // Equal probability for each die value
  }

  return totalValue;
}

/**
 * Main expectimax search function
 */
export function expectimax(
  state: GameState,
  player: Player,
  config: DifficultyConfig,
): ExpectimaxResult {
  const nodesExplored = { count: 0 };

  // Must be in placing phase with a die
  if (state.phase !== "placing" || state.currentDie === null) {
    return { bestMove: null, value: 0, nodesExplored: nodesExplored.count };
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return { bestMove: null, value: 0, nodesExplored: nodesExplored.count };
  }

  if (legalColumns.length === 1) {
    // Only one legal move
    return {
      bestMove: legalColumns[0],
      value: 0,
      nodesExplored: 1,
    };
  }

  // Order moves
  const orderedColumns = orderMoves(state, legalColumns, player);

  let bestMove: ColumnIndex | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    const result = applyMove(state, column);
    if (!result) continue;

    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, config);
    } else {
      // Next player's turn (chance node)
      value = chanceNode(
        result.newState,
        config.depth - 1,
        player,
        config,
        nodesExplored,
      );
    }

    if (value > bestValue) {
      bestValue = value;
      bestMove = column;
    }
  }

  return {
    bestMove,
    value: bestValue,
    nodesExplored: nodesExplored.count,
  };
}

/**
 * Get the best move for the current player
 * Includes randomness based on difficulty
 */
export function getBestMove(
  state: GameState,
  config: DifficultyConfig,
): ColumnIndex | null {
  if (state.phase !== "placing" || state.currentDie === null) {
    return null;
  }

  const player = state.currentPlayer;
  const grid = state.grids[player];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) return null;
  if (legalColumns.length === 1) return legalColumns[0];

  // Random move based on difficulty
  if (config.randomness > 0 && Math.random() < config.randomness) {
    return legalColumns[Math.floor(Math.random() * legalColumns.length)];
  }

  // Use expectimax to find best move
  const result = expectimax(state, player, config);
  return result.bestMove ?? legalColumns[0];
}
