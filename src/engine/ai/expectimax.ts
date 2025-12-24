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
import { evaluate, evaluateMoveQuick, getGreedyMove } from "./evaluation";

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
const MAX_NODES = 500_000; // Reasonable limit for expert mode depth 6

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
function orderMoves(state: GameState, columns: ColumnIndex[], player: Player): ColumnIndex[] {
  const currentDie = state.currentDie;
  if (currentDie === null) {
    return columns;
  }

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
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig,
  nodesExplored: { count: number }
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, playerConfig);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, playerConfig);
  }

  // If we're in rolling phase, this is actually a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, playerConfig, opponentConfig, nodesExplored);
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return evaluate(state, player, playerConfig);
  }

  // Order moves for better search
  const orderedColumns = orderMoves(state, legalColumns, state.currentPlayer);

  let maxValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    const result = applyMove(state, column);
    if (!result) {
      continue;
    }

    // After placing, the next player needs to roll (chance node for them)
    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, playerConfig);
    } else if (result.newState.currentPlayer === player) {
      // It's our turn again (shouldn't happen in normal play, but handle it)
      value = chanceNode(
        result.newState,
        depth - 1,
        player,
        playerConfig,
        opponentConfig,
        nodesExplored
      );
    } else {
      // Opponent's turn - min node
      value = minNode(
        result.newState,
        depth - 1,
        player,
        playerConfig,
        opponentConfig,
        nodesExplored
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
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig,
  nodesExplored: { count: number }
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, playerConfig);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, playerConfig);
  }

  // If we're in rolling phase, this is a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, playerConfig, opponentConfig, nodesExplored);
  }

  // Get legal moves for opponent
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return evaluate(state, player, playerConfig);
  }

  // Use opponent's config to determine their move selection
  const opponent = state.currentPlayer;
  let opponentMove: ColumnIndex | null;

  // If opponent uses greedy (depth 0), use greedy move selection
  if (opponentConfig.depth === 0) {
    opponentMove = getGreedyMove(state);
  } else if (opponentConfig.randomness > 0 && Math.random() < opponentConfig.randomness) {
    // Random move based on opponent's randomness
    const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
    opponentMove = legalColumns[Math.floor(Math.random() * legalColumns.length)];
  } else {
    // Opponent uses expectimax - find their best move from their perspective
    // Limit the opponent's search depth to the minimum of their config depth and remaining depth
    const opponentSearchDepth = Math.min(opponentConfig.depth, depth);

    // Create a limited config for the opponent's search
    const limitedOpponentConfig = {
      ...opponentConfig,
      depth: opponentSearchDepth,
    };

    // Call expectimax from opponent's perspective to find their best move
    // Swap configs: from opponent's perspective, they are the player and we are the opponent
    // Note: expectimax creates its own nodesExplored counter, but depth limit prevents infinite recursion
    const opponentResult = expectimax(state, opponent, limitedOpponentConfig, playerConfig);
    opponentMove = opponentResult.bestMove;

    // Account for nodes explored in opponent's search (approximate, since we can't share the counter)
    // The depth limit ensures recursion terminates, and MAX_NODES check in each node prevents runaway searches
    nodesExplored.count += opponentResult.nodesExplored;
  }

  // If we couldn't determine opponent's move, fall back to evaluating all moves
  if (opponentMove === null) {
    // Fallback: evaluate all moves and take minimum (worst for us)
    let minValue = Number.POSITIVE_INFINITY;
    for (const column of legalColumns) {
      const result = applyMove(state, column);
      if (!result) {
        continue;
      }

      let value: number;
      if (result.newState.phase === "ended") {
        value = evaluate(result.newState, player, playerConfig);
      } else if (result.newState.currentPlayer === player) {
        value = chanceNode(
          result.newState,
          depth - 1,
          player,
          playerConfig,
          opponentConfig,
          nodesExplored
        );
      } else {
        value = chanceNode(
          result.newState,
          depth - 1,
          player,
          playerConfig,
          opponentConfig,
          nodesExplored
        );
      }
      minValue = Math.min(minValue, value);
    }
    return minValue;
  }

  // Evaluate the opponent's chosen move from our perspective
  const result = applyMove(state, opponentMove);
  if (!result) {
    return evaluate(state, player, playerConfig);
  }

  let value: number;
  if (result.newState.phase === "ended") {
    value = evaluate(result.newState, player, playerConfig);
  } else if (result.newState.currentPlayer === player) {
    // Back to our turn - max node via chance
    value = chanceNode(
      result.newState,
      depth - 1,
      player,
      playerConfig,
      opponentConfig,
      nodesExplored
    );
  } else {
    // Still opponent's turn
    value = chanceNode(
      result.newState,
      depth - 1,
      player,
      playerConfig,
      opponentConfig,
      nodesExplored
    );
  }

  return value;
}

/**
 * CHANCE node: Average over all possible dice rolls
 */
function chanceNode(
  state: GameState,
  depth: number,
  player: Player,
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig,
  nodesExplored: { count: number }
): number {
  nodesExplored.count++;

  // Safety check: prevent runaway searches
  if (nodesExplored.count > MAX_NODES) {
    return evaluate(state, player, playerConfig);
  }

  if (state.phase !== "rolling") {
    // Not a chance node
    if (state.currentPlayer === player) {
      return maxNode(state, depth, player, playerConfig, opponentConfig, nodesExplored);
    } else {
      return minNode(state, depth, player, playerConfig, opponentConfig, nodesExplored);
    }
  }

  // Average over all dice values
  let totalValue = 0;

  for (const dieValue of ALL_DIE_VALUES) {
    const rolledState = rollSpecificDie(state, dieValue);

    let value: number;
    if (rolledState.currentPlayer === player) {
      value = maxNode(rolledState, depth, player, playerConfig, opponentConfig, nodesExplored);
    } else {
      value = minNode(rolledState, depth, player, playerConfig, opponentConfig, nodesExplored);
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
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig
): ExpectimaxResult {
  const nodesExplored = { count: 0 };

  // Must be in placing phase with a die
  if (state.phase !== "placing" || state.currentDie === null) {
    return { bestMove: null, nodesExplored: nodesExplored.count, value: 0 };
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return { bestMove: null, nodesExplored: nodesExplored.count, value: 0 };
  }

  if (legalColumns.length === 1) {
    // Only one legal move
    return {
      bestMove: legalColumns[0],
      nodesExplored: 1,
      value: 0,
    };
  }

  // Order moves
  const orderedColumns = orderMoves(state, legalColumns, player);

  let bestMove: ColumnIndex | null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    const result = applyMove(state, column);
    if (!result) {
      continue;
    }

    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, playerConfig);
    } else {
      // Next player's turn (chance node)
      value = chanceNode(
        result.newState,
        playerConfig.depth - 1,
        player,
        playerConfig,
        opponentConfig,
        nodesExplored
      );
    }

    if (value > bestValue) {
      bestValue = value;
      bestMove = column;
    }
  }

  return {
    bestMove,
    nodesExplored: nodesExplored.count,
    value: bestValue,
  };
}

/**
 * Get the best move for the current player
 * Includes randomness based on difficulty
 */
export function getBestMove(
  state: GameState,
  config: DifficultyConfig,
  opponentConfig?: DifficultyConfig
): ColumnIndex | null {
  if (state.phase !== "placing" || state.currentDie === null) {
    return;
  }

  const player = state.currentPlayer;
  const grid = state.grids[player];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return null;
  }
  if (legalColumns.length === 1) {
    return legalColumns[0];
  }

  // Greedy strategy: depth 0 means use greedy
  if (config.depth === 0) {
    return getGreedyMove(state);
  }

  // Random move based on difficulty
  if (config.randomness > 0 && Math.random() < config.randomness) {
    return legalColumns[Math.floor(Math.random() * legalColumns.length)];
  }

  // Use expectimax to find best move
  // If opponentConfig is provided, use it; otherwise use same config for both (backward compatibility)
  const oppConfig = opponentConfig ?? config;
  const result = expectimax(state, player, config, oppConfig);
  return result.bestMove ?? legalColumns[0];
}
