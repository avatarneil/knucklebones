/**
 * Expectimax Search Algorithm (Strengthened)
 *
 * A variant of minimax that handles chance nodes (dice rolls).
 * Now with:
 * - Working transposition table
 * - True adversarial search for top difficulties
 * - Iterative deepening with time budget
 *
 * Node types:
 * - MAX: Current player chooses the best move
 * - MIN: Opponent chooses the worst move for us (true adversarial)
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
  /** Depth reached (for iterative deepening) */
  depthReached: number;
}

/** Transposition table entry */
interface TTEntry {
  depth: number;
  value: number;
  nodeType: "exact" | "lower" | "upper";
}

/** Cache for transposition table */
const transpositionTable = new Map<string, TTEntry>();

/** Maximum table size to prevent memory issues */
const MAX_TT_SIZE = 100_000;

/** Maximum nodes to explore before timing out (prevents freezing) */
const MAX_NODES = 500_000;

/** Search context passed through the tree */
interface SearchContext {
  nodesExplored: number;
  startTime: number;
  timeBudgetMs: number;
  aborted: boolean;
  useAdversarial: boolean;
  useTT: boolean;
}

/**
 * Clear the transposition table (call between games)
 */
export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

/**
 * Get a compact hash key for the game state
 */
function getStateKey(state: GameState, depth: number, isMax: boolean): string {
  const gridStr = (grid: (DieValue | null)[][]): string =>
    grid.map((col) => col.map((d) => d ?? 0).join("")).join("");

  return `${gridStr(state.grids.player1)}|${gridStr(state.grids.player2)}|${state.currentPlayer}|${state.currentDie ?? 0}|${depth}|${isMax ? 1 : 0}`;
}

/**
 * Check if we should abort due to time budget
 */
function shouldAbort(ctx: SearchContext): boolean {
  if (ctx.aborted) return true;
  if (ctx.timeBudgetMs <= 0) return false;
  if (ctx.nodesExplored % 1000 === 0) {
    const elapsed = performance.now() - ctx.startTime;
    if (elapsed >= ctx.timeBudgetMs) {
      ctx.aborted = true;
      return true;
    }
  }
  return false;
}

/**
 * Order moves for better pruning (best moves first)
 */
function orderMoves(
  state: GameState,
  columns: ColumnIndex[],
  player: Player
): ColumnIndex[] {
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
  ctx: SearchContext
): number {
  ctx.nodesExplored++;

  // Safety checks
  if (ctx.nodesExplored > MAX_NODES || shouldAbort(ctx)) {
    return evaluate(state, player, playerConfig);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, playerConfig);
  }

  // If we're in rolling phase, this is actually a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, playerConfig, opponentConfig, ctx);
  }

  // Check transposition table
  const ttKey = ctx.useTT ? getStateKey(state, depth, true) : "";
  if (ctx.useTT) {
    const cached = transpositionTable.get(ttKey);
    if (cached && cached.depth >= depth && cached.nodeType === "exact") {
      return cached.value;
    }
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
        ctx
      );
    } else {
      // Opponent's turn - min node
      value = minNode(
        result.newState,
        depth - 1,
        player,
        playerConfig,
        opponentConfig,
        ctx
      );
    }

    maxValue = Math.max(maxValue, value);
  }

  // Store in transposition table
  if (ctx.useTT && transpositionTable.size < MAX_TT_SIZE) {
    transpositionTable.set(ttKey, {
      depth,
      value: maxValue,
      nodeType: "exact",
    });
  }

  return maxValue;
}

/**
 * MIN node: Opponent chooses the worst move for us
 * Uses true adversarial search when ctx.useAdversarial is true
 */
function minNode(
  state: GameState,
  depth: number,
  player: Player,
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig,
  ctx: SearchContext
): number {
  ctx.nodesExplored++;

  // Safety checks
  if (ctx.nodesExplored > MAX_NODES || shouldAbort(ctx)) {
    return evaluate(state, player, playerConfig);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, playerConfig);
  }

  // If we're in rolling phase, this is a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, playerConfig, opponentConfig, ctx);
  }

  // Get legal moves for opponent
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return evaluate(state, player, playerConfig);
  }

  // Check transposition table
  const ttKey = ctx.useTT ? getStateKey(state, depth, false) : "";
  if (ctx.useTT) {
    const cached = transpositionTable.get(ttKey);
    if (cached && cached.depth >= depth && cached.nodeType === "exact") {
      return cached.value;
    }
  }

  // TRUE ADVERSARIAL SEARCH: Opponent plays optimally against us
  if (ctx.useAdversarial) {
    // Order moves from opponent's perspective (best for them = worst for us)
    const orderedColumns = orderMoves(state, legalColumns, state.currentPlayer);

    let minValue = Number.POSITIVE_INFINITY;

    for (const column of orderedColumns) {
      const result = applyMove(state, column);
      if (!result) {
        continue;
      }

      let value: number;

      if (result.newState.phase === "ended") {
        value = evaluate(result.newState, player, playerConfig);
      } else if (result.newState.currentPlayer === player) {
        // Back to our turn
        value = chanceNode(
          result.newState,
          depth - 1,
          player,
          playerConfig,
          opponentConfig,
          ctx
        );
      } else {
        // Still opponent's turn (shouldn't happen normally)
        value = chanceNode(
          result.newState,
          depth - 1,
          player,
          playerConfig,
          opponentConfig,
          ctx
        );
      }

      minValue = Math.min(minValue, value);
    }

    // Store in transposition table
    if (ctx.useTT && transpositionTable.size < MAX_TT_SIZE) {
      transpositionTable.set(ttKey, {
        depth,
        value: minValue,
        nodeType: "exact",
      });
    }

    return minValue;
  }

  // MODELED OPPONENT: Use opponent's config to determine their move
  const opponent = state.currentPlayer;
  let opponentMove: ColumnIndex | null;

  // If opponent uses greedy (depth 0), use greedy move selection
  if (opponentConfig.depth === 0) {
    opponentMove = getGreedyMove(state);
  } else if (
    opponentConfig.randomness > 0 &&
    Math.random() < opponentConfig.randomness
  ) {
    // Random move based on opponent's randomness
    opponentMove =
      legalColumns[Math.floor(Math.random() * legalColumns.length)];
  } else {
    // Opponent uses expectimax - find their best move from their perspective
    const opponentSearchDepth = Math.min(opponentConfig.depth, depth);

    const limitedOpponentConfig = {
      ...opponentConfig,
      depth: opponentSearchDepth,
    };

    // Create a separate context for opponent search to avoid polluting our TT
    const oppCtx: SearchContext = {
      nodesExplored: 0,
      startTime: ctx.startTime,
      timeBudgetMs: ctx.timeBudgetMs,
      aborted: ctx.aborted,
      useAdversarial: false,
      useTT: false, // Don't use TT for modeled opponent to avoid confusion
    };

    const opponentResult = expectimaxInternal(
      state,
      opponent,
      limitedOpponentConfig,
      playerConfig,
      oppCtx
    );
    opponentMove = opponentResult.bestMove;
    ctx.nodesExplored += oppCtx.nodesExplored;
    ctx.aborted = oppCtx.aborted;
  }

  // If we couldn't determine opponent's move, fall back to true adversarial
  if (opponentMove === null) {
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
          ctx
        );
      } else {
        value = chanceNode(
          result.newState,
          depth - 1,
          player,
          playerConfig,
          opponentConfig,
          ctx
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
    value = chanceNode(
      result.newState,
      depth - 1,
      player,
      playerConfig,
      opponentConfig,
      ctx
    );
  } else {
    value = chanceNode(
      result.newState,
      depth - 1,
      player,
      playerConfig,
      opponentConfig,
      ctx
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
  ctx: SearchContext
): number {
  ctx.nodesExplored++;

  // Safety checks
  if (ctx.nodesExplored > MAX_NODES || shouldAbort(ctx)) {
    return evaluate(state, player, playerConfig);
  }

  if (state.phase !== "rolling") {
    // Not a chance node
    if (state.currentPlayer === player) {
      return maxNode(state, depth, player, playerConfig, opponentConfig, ctx);
    } else {
      return minNode(state, depth, player, playerConfig, opponentConfig, ctx);
    }
  }

  // Average over all dice values
  let totalValue = 0;

  for (const dieValue of ALL_DIE_VALUES) {
    const rolledState = rollSpecificDie(state, dieValue);

    let value: number;
    if (rolledState.currentPlayer === player) {
      value = maxNode(
        rolledState,
        depth,
        player,
        playerConfig,
        opponentConfig,
        ctx
      );
    } else {
      value = minNode(
        rolledState,
        depth,
        player,
        playerConfig,
        opponentConfig,
        ctx
      );
    }

    totalValue += value / 6; // Equal probability for each die value
  }

  return totalValue;
}

/**
 * Internal expectimax search function (used by both main search and opponent modeling)
 */
function expectimaxInternal(
  state: GameState,
  player: Player,
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig,
  ctx: SearchContext
): ExpectimaxResult {
  // Must be in placing phase with a die
  if (state.phase !== "placing" || state.currentDie === null) {
    return {
      bestMove: null,
      nodesExplored: ctx.nodesExplored,
      value: 0,
      depthReached: 0,
    };
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return {
      bestMove: null,
      nodesExplored: ctx.nodesExplored,
      value: 0,
      depthReached: 0,
    };
  }

  if (legalColumns.length === 1) {
    // Only one legal move
    return {
      bestMove: legalColumns[0],
      nodesExplored: 1,
      value: 0,
      depthReached: playerConfig.depth,
    };
  }

  // Order moves
  const orderedColumns = orderMoves(state, legalColumns, player);

  let bestMove: ColumnIndex | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    if (shouldAbort(ctx)) break;

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
        ctx
      );
    }

    if (value > bestValue) {
      bestValue = value;
      bestMove = column;
    }
  }

  return {
    bestMove,
    nodesExplored: ctx.nodesExplored,
    value: bestValue,
    depthReached: playerConfig.depth,
  };
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
  const ctx: SearchContext = {
    nodesExplored: 0,
    startTime: performance.now(),
    timeBudgetMs: playerConfig.timeBudgetMs,
    aborted: false,
    useAdversarial: playerConfig.adversarial,
    useTT: true,
  };

  return expectimaxInternal(state, player, playerConfig, opponentConfig, ctx);
}

/**
 * Iterative deepening search with time budget
 */
function iterativeDeepening(
  state: GameState,
  player: Player,
  playerConfig: DifficultyConfig,
  opponentConfig: DifficultyConfig
): ExpectimaxResult {
  const startTime = performance.now();
  const timeBudgetMs = playerConfig.timeBudgetMs;

  let bestResult: ExpectimaxResult = {
    bestMove: null,
    nodesExplored: 0,
    value: 0,
    depthReached: 0,
  };

  // Start from depth 1 and increase
  for (let depth = 1; depth <= playerConfig.depth; depth++) {
    const elapsed = performance.now() - startTime;
    if (elapsed >= timeBudgetMs * 0.8) {
      // Leave some time buffer
      break;
    }

    const depthConfig = { ...playerConfig, depth };

    const ctx: SearchContext = {
      nodesExplored: 0,
      startTime,
      timeBudgetMs,
      aborted: false,
      useAdversarial: playerConfig.adversarial,
      useTT: true,
    };

    const result = expectimaxInternal(
      state,
      player,
      depthConfig,
      opponentConfig,
      ctx
    );

    if (!ctx.aborted && result.bestMove !== null) {
      bestResult = {
        ...result,
        depthReached: depth,
        nodesExplored: bestResult.nodesExplored + result.nodesExplored,
      };
    }

    // If we completed this depth very quickly, continue to next depth
    // If we're running low on time, stop
    if (ctx.aborted) {
      break;
    }
  }

  return bestResult;
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
    return null;
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

  const oppConfig = opponentConfig ?? config;

  // Use iterative deepening if time budget is set
  if (config.timeBudgetMs > 0) {
    const result = iterativeDeepening(state, player, config, oppConfig);
    return result.bestMove ?? legalColumns[0];
  }

  // Use standard expectimax with fixed depth
  const result = expectimax(state, player, config, oppConfig);
  return result.bestMove ?? legalColumns[0];
}
