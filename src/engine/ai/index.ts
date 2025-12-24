/**
 * Knucklebones AI Player
 *
 * Provides an AI opponent with configurable difficulty levels.
 * Uses WASM for high-performance computation when available.
 */

import { isColumnFull } from "../scorer";
import type { ColumnIndex, DifficultyLevel, GameState } from "../types";
import { ALL_COLUMNS } from "../types";
import {
  DIFFICULTY_CONFIGS,
  getAllDifficultyLevels,
  getDifficultyConfig,
} from "./difficulty";
import { evaluate, evaluateMoveQuick, getGreedyMove } from "./evaluation";
import { clearTranspositionTable, getBestMove } from "./expectimax";
import {
  endMasterGame,
  getMasterMove,
  getMasterProfileStats,
  isMasterReady,
  type MasterProfileStats,
  recordOpponentMoveForLearning,
  resetMasterProfile,
} from "./master";
import {
  clearWasmCache,
  getBestMoveWasm,
  initWasm,
  isWasmInitialized,
} from "./wasm-bindings";

export { DIFFICULTY_CONFIGS, getDifficultyConfig, getAllDifficultyLevels };
export { clearTranspositionTable };
export { getGreedyMove };

// Master AI exports
export {
  getMasterMove,
  getMasterProfileStats,
  resetMasterProfile,
  recordOpponentMoveForLearning,
  endMasterGame,
  isMasterReady,
  type MasterProfileStats,
};

// Initialize WASM on module load (non-blocking, background, client-side only)
// Only initialize on client side to avoid SSR issues
if (typeof window !== "undefined") {
  initWasm().catch(() => {
    // Already handled in wasm-bindings
  });
}

/**
 * AI Player class for convenient usage
 */
export class AIPlayer {
  private difficulty: DifficultyLevel;

  constructor(difficulty: DifficultyLevel = "medium") {
    this.difficulty = difficulty;
  }

  /**
   * Set the difficulty level
   */
  setDifficulty(level: DifficultyLevel): void {
    this.difficulty = level;
  }

  /**
   * Get the current difficulty level
   */
  getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  /**
   * Get the difficulty configuration
   */
  getConfig() {
    return getDifficultyConfig(this.difficulty);
  }

  /**
   * Choose a move for the current game state
   */
  chooseMove(
    state: GameState,
    opponentDifficulty?: DifficultyLevel,
  ): ColumnIndex | null {
    try {
      // Handle Master AI specially - uses adaptive learning
      if (this.difficulty === "master") {
        const masterMove = getMasterMove(state);
        if (masterMove !== null) {
          return masterMove;
        }
        // Fall through to expert-level play if Master AI not ready
      }

      const config = getDifficultyConfig(this.difficulty);
      const opponentConfig = opponentDifficulty
        ? getDifficultyConfig(opponentDifficulty)
        : undefined;

      // Try WASM first if available (synchronous, non-blocking)
      if (state.phase === "placing" && state.currentDie !== null) {
        const wasmMove = getBestMoveWasm(
          state.grids.player1,
          state.grids.player2,
          state.currentPlayer,
          state.currentDie,
          config.depth,
          config.randomness,
          config.offenseWeight,
          config.defenseWeight,
          config.advancedEval,
          opponentConfig?.depth,
          opponentConfig?.randomness,
          opponentConfig?.offenseWeight,
          opponentConfig?.defenseWeight,
          opponentConfig?.advancedEval,
        );
        if (wasmMove !== null) {
          return wasmMove as ColumnIndex;
        }
      }

      // Fallback to TypeScript implementation
      const move = getBestMove(state, config, opponentConfig);

      // Fallback: if expectimax fails, use a simple heuristic
      if (
        move === null &&
        state.phase === "placing" &&
        state.currentDie !== null
      ) {
        const grid = state.grids[state.currentPlayer];
        const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
        if (legalColumns.length > 0) {
          // Use quick evaluation to pick best column
          const scored = legalColumns.map((col) => ({
            col,
            score: evaluateMoveQuick(
              state,
              col,
              state.currentDie!,
              state.currentPlayer,
            ),
          }));
          scored.sort((a, b) => b.score - a.score);
          return scored[0]?.col ?? legalColumns[0];
        }
      }

      return move;
    } catch (error) {
      console.error("Error computing AI move:", error);
      // Fallback to first legal move
      if (state.phase === "placing" && state.currentDie !== null) {
        const grid = state.grids[state.currentPlayer];
        const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
        return legalColumns[0] ?? null;
      }
      return null;
    }
  }

  /**
   * Evaluate a game state from AI's perspective
   */
  evaluateState(state: GameState): number {
    const config = getDifficultyConfig(this.difficulty);
    return evaluate(state, state.currentPlayer, config);
  }

  /**
   * Get a quick evaluation of a specific move
   */
  evaluateMove(state: GameState, column: ColumnIndex): number {
    if (state.currentDie === null) return 0;
    return evaluateMoveQuick(
      state,
      column,
      state.currentDie,
      state.currentPlayer,
    );
  }

  /**
   * Reset AI state (clear caches)
   */
  reset(): void {
    clearTranspositionTable();
    if (isWasmInitialized()) {
      clearWasmCache();
    }
  }
}

/**
 * Create an AI player with the specified difficulty
 */
export function createAIPlayer(
  difficulty: DifficultyLevel = "medium",
): AIPlayer {
  return new AIPlayer(difficulty);
}

/**
 * Quick function to get AI's move choice
 */
export function getAIMove(
  state: GameState,
  difficulty: DifficultyLevel = "medium",
  opponentDifficulty?: DifficultyLevel,
): ColumnIndex | null {
  try {
    // Handle Master AI specially - uses adaptive learning
    if (difficulty === "master") {
      const masterMove = getMasterMove(state);
      if (masterMove !== null) {
        return masterMove;
      }
      // Fall through to expert-level play if Master AI not ready
    }

    const config = getDifficultyConfig(difficulty);
    const opponentConfig = opponentDifficulty
      ? getDifficultyConfig(opponentDifficulty)
      : undefined;

    // Try WASM first if available (synchronous, non-blocking)
    if (state.phase === "placing" && state.currentDie !== null) {
      const wasmMove = getBestMoveWasm(
        state.grids.player1,
        state.grids.player2,
        state.currentPlayer,
        state.currentDie,
        config.depth,
        config.randomness,
        config.offenseWeight,
        config.defenseWeight,
        config.advancedEval,
        opponentConfig?.depth,
        opponentConfig?.randomness,
        opponentConfig?.offenseWeight,
        opponentConfig?.defenseWeight,
        opponentConfig?.advancedEval,
      );
      if (wasmMove !== null) {
        return wasmMove as ColumnIndex;
      }
    }

    // Fallback to TypeScript implementation
    const move = getBestMove(state, config, opponentConfig);

    // Fallback: if expectimax fails, use a simple heuristic
    if (
      move === null &&
      state.phase === "placing" &&
      state.currentDie !== null
    ) {
      const grid = state.grids[state.currentPlayer];
      const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
      if (legalColumns.length > 0) {
        // Use quick evaluation to pick best column
        const scored = legalColumns.map((col) => ({
          col,
          score: evaluateMoveQuick(
            state,
            col,
            state.currentDie!,
            state.currentPlayer,
          ),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.col ?? legalColumns[0];
      }
    }

    return move;
  } catch (error) {
    console.error("Error computing AI move:", error);
    // Fallback to first legal move
    if (state.phase === "placing" && state.currentDie !== null) {
      const grid = state.grids[state.currentPlayer];
      const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
      return legalColumns[0] ?? null;
    }
    return null;
  }
}
