/**
 * Optimized Expectimax Search Algorithm with Progressive Computation
 *
 * Optimized for iOS devices with:
 * - Progressive computation (yields control periodically)
 * - Memory-efficient state representation
 * - Better caching strategies
 * - Platform-specific optimizations
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

/** Progressive computation control */
export interface ProgressiveControl {
  /** Check if computation should yield */
  shouldYield: () => boolean;
  /** Yield control to browser */
  yield: () => Promise<void>;
  /** Check if computation should stop */
  shouldStop: () => boolean;
}

/** Cache for transposition table - using WeakMap for better memory management */
const transpositionTable = new Map<string, { depth: number; value: number }>();

/** Maximum nodes to explore before timing out */
const MAX_NODES = 500000;

/** Chunk size for progressive computation */
let CHUNK_SIZE = 1000;
let YIELD_INTERVAL = 5; // milliseconds

/**
 * Initialize optimization parameters (call from platform detection)
 */
export function setOptimizationParams(chunkSize: number, yieldInterval: number): void {
  CHUNK_SIZE = chunkSize;
  YIELD_INTERVAL = yieldInterval;
}

/**
 * Clear the transposition table
 */
export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

/**
 * Optimized state key generation using TypedArray-like encoding
 */
function getStateKey(state: GameState, depth: number): string {
  // Use a more efficient encoding
  let key = `${state.currentPlayer}|${state.currentDie}|${depth}|`;
  
  // Encode grids more efficiently
  for (const player of ["player1", "player2"] as const) {
    const grid = state.grids[player];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        const val = grid[col][row];
        key += val ?? 0;
      }
    }
  }
  
  return key;
}

/**
 * Order moves for better pruning (best moves first)
 * Optimized to reuse arrays
 */
function orderMoves(
  state: GameState,
  columns: ColumnIndex[],
  player: Player,
): ColumnIndex[] {
  const currentDie = state.currentDie;
  if (currentDie === null) return columns;

  // Pre-allocate array for better performance
  const scored = new Array(columns.length);
  for (let i = 0; i < columns.length; i++) {
    scored[i] = {
      col: columns[i],
      score: evaluateMoveQuick(state, columns[i], currentDie, player),
    };
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.col);
}

/**
 * Progressive computation tracker
 */
class ProgressiveTracker {
  private nodesSinceYield = 0;
  private lastYieldTime = performance.now();
  private cancelled = false;
  public totalNodes = 0;

  constructor(
    private chunkSize: number,
    private yieldInterval: number,
  ) {}

  shouldYield(): boolean {
    this.nodesSinceYield++;
    this.totalNodes++;
    const timeSinceYield = performance.now() - this.lastYieldTime;
    
    return (
      this.nodesSinceYield >= this.chunkSize ||
      timeSinceYield >= this.yieldInterval
    );
  }

  async yield(): Promise<void> {
    this.nodesSinceYield = 0;
    this.lastYieldTime = performance.now();
    
    // Use scheduler.postTask if available, otherwise setTimeout
    if (typeof globalThis !== 'undefined' && 
        'scheduler' in globalThis && 
        'postTask' in (globalThis as any).scheduler) {
      return new Promise((resolve) => {
        try {
          (globalThis as any).scheduler.postTask(() => resolve(), {
            priority: 'background',
          });
        } catch {
          setTimeout(() => resolve(), 0);
        }
      });
    }
    
    return new Promise((resolve) => setTimeout(() => resolve(), 0));
  }

  shouldStop(): boolean {
    return this.cancelled;
  }

  cancel(): void {
    this.cancelled = true;
  }
}

/**
 * MAX node with progressive computation
 */
async function maxNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  tracker: ProgressiveTracker,
): Promise<number> {
  // Check transposition table
  const key = getStateKey(state, depth);
  const cached = transpositionTable.get(key);
  if (cached && cached.depth >= depth) {
    return cached.value;
  }

  // Progressive yield check
  if (tracker.shouldYield()) {
    await tracker.yield();
  }

  if (tracker.shouldStop()) {
    return evaluate(state, player, config);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    const value = evaluate(state, player, config);
    transpositionTable.set(key, { depth, value });
    return value;
  }

  // If we're in rolling phase, this is actually a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, config, tracker);
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns: ColumnIndex[] = [];
  for (let i = 0; i < 3; i++) {
    if (!isColumnFull(grid[i])) {
      legalColumns.push(i as ColumnIndex);
    }
  }

  if (legalColumns.length === 0) {
    const value = evaluate(state, player, config);
    transpositionTable.set(key, { depth, value });
    return value;
  }

  // Order moves for better search
  const orderedColumns = orderMoves(state, legalColumns, state.currentPlayer);

  let maxValue = Number.NEGATIVE_INFINITY;

  for (const column of orderedColumns) {
    const result = applyMove(state, column);
    if (!result) continue;

    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, config);
    } else if (result.newState.currentPlayer === player) {
      value = await chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        tracker,
      );
    } else {
      value = await minNode(
        result.newState,
        depth - 1,
        player,
        config,
        tracker,
      );
    }

    maxValue = Math.max(maxValue, value);
    
    // Early exit if we've found a winning move (optimization)
    if (maxValue > 10000) break;
  }

  transpositionTable.set(key, { depth, value: maxValue });
  return maxValue;
}

/**
 * MIN node with progressive computation
 */
async function minNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  tracker: ProgressiveTracker,
): Promise<number> {
  // Progressive yield check
  if (tracker.shouldYield()) {
    await tracker.yield();
  }

  if (tracker.shouldStop()) {
    return evaluate(state, player, config);
  }

  // Terminal check
  if (state.phase === "ended" || depth === 0) {
    return evaluate(state, player, config);
  }

  // If we're in rolling phase, this is a chance node
  if (state.phase === "rolling") {
    return chanceNode(state, depth, player, config, tracker);
  }

  // Get legal moves for opponent
  const grid = state.grids[state.currentPlayer];
  const legalColumns: ColumnIndex[] = [];
  for (let i = 0; i < 3; i++) {
    if (!isColumnFull(grid[i])) {
      legalColumns.push(i as ColumnIndex);
    }
  }

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
      value = await chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        tracker,
      );
    } else {
      value = await chanceNode(
        result.newState,
        depth - 1,
        player,
        config,
        tracker,
      );
    }

    minValue = Math.min(minValue, value);
    
    // Early exit optimization
    if (minValue < -10000) break;
  }

  return minValue;
}

/**
 * CHANCE node with progressive computation
 */
async function chanceNode(
  state: GameState,
  depth: number,
  player: Player,
  config: DifficultyConfig,
  tracker: ProgressiveTracker,
): Promise<number> {
  // Progressive yield check
  if (tracker.shouldYield()) {
    await tracker.yield();
  }

  if (tracker.shouldStop()) {
    return evaluate(state, player, config);
  }

  if (state.phase !== "rolling") {
    if (state.currentPlayer === player) {
      return maxNode(state, depth, player, config, tracker);
    } else {
      return minNode(state, depth, player, config, tracker);
    }
  }

  // Average over all dice values
  let totalValue = 0;

  for (const dieValue of ALL_DIE_VALUES) {
    const rolledState = rollSpecificDie(state, dieValue);

    let value: number;
    if (rolledState.currentPlayer === player) {
      value = await maxNode(rolledState, depth, player, config, tracker);
    } else {
      value = await minNode(rolledState, depth, player, config, tracker);
    }

    totalValue += value / 6; // Equal probability for each die value
  }

  return totalValue;
}

/**
 * Main expectimax search function with progressive computation
 */
export async function expectimaxProgressive(
  state: GameState,
  player: Player,
  config: DifficultyConfig,
  chunkSize?: number,
  yieldInterval?: number,
): Promise<ExpectimaxResult> {
  const tracker = new ProgressiveTracker(
    chunkSize ?? CHUNK_SIZE,
    yieldInterval ?? YIELD_INTERVAL,
  );

  // Must be in placing phase with a die
  if (state.phase !== "placing" || state.currentDie === null) {
    return { bestMove: null, value: 0, nodesExplored: 0 };
  }

  // Get legal moves
  const grid = state.grids[state.currentPlayer];
  const legalColumns: ColumnIndex[] = [];
  for (let i = 0; i < 3; i++) {
    if (!isColumnFull(grid[i])) {
      legalColumns.push(i as ColumnIndex);
    }
  }

  if (legalColumns.length === 0) {
    return { bestMove: null, value: 0, nodesExplored: 0 };
  }

  if (legalColumns.length === 1) {
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
    if (tracker.shouldStop()) break;

    const result = applyMove(state, column);
    if (!result) continue;

    let value: number;

    if (result.newState.phase === "ended") {
      value = evaluate(result.newState, player, config);
    } else {
      value = await chanceNode(
        result.newState,
        config.depth - 1,
        player,
        config,
        tracker,
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
    nodesExplored: tracker.totalNodes,
  };
}

/**
 * Get the best move with progressive computation
 */
export async function getBestMoveProgressive(
  state: GameState,
  config: DifficultyConfig,
  chunkSize?: number,
  yieldInterval?: number,
): Promise<ColumnIndex | null> {
  if (state.phase !== "placing" || state.currentDie === null) {
    return null;
  }

  const player = state.currentPlayer;
  const grid = state.grids[player];
  const legalColumns: ColumnIndex[] = [];
  for (let i = 0; i < 3; i++) {
    if (!isColumnFull(grid[i])) {
      legalColumns.push(i as ColumnIndex);
    }
  }

  if (legalColumns.length === 0) return null;
  if (legalColumns.length === 1) return legalColumns[0];

  // Greedy strategy: depth 0 means use greedy
  if (config.depth === 0) {
    return getGreedyMove(state);
  }

  // Random move based on difficulty
  if (config.randomness > 0 && Math.random() < config.randomness) {
    return legalColumns[Math.floor(Math.random() * legalColumns.length)];
  }

  // Use progressive expectimax
  const result = await expectimaxProgressive(
    state,
    player,
    config,
    chunkSize,
    yieldInterval,
  );
  return result.bestMove ?? legalColumns[0];
}
