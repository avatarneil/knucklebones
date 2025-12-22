/**
 * Knucklebones AI Player
 *
 * Provides an AI opponent with configurable difficulty levels.
 */

import type { ColumnIndex, DifficultyLevel, GameState } from "../types";
import {
  DIFFICULTY_CONFIGS,
  getAllDifficultyLevels,
  getDifficultyConfig,
} from "./difficulty";
import { evaluate, evaluateMoveQuick } from "./evaluation";
import { clearTranspositionTable, getBestMove } from "./expectimax";
import { ALL_COLUMNS } from "../types";
import { isColumnFull } from "../scorer";

export { DIFFICULTY_CONFIGS, getDifficultyConfig, getAllDifficultyLevels };
export { clearTranspositionTable };

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
  chooseMove(state: GameState): ColumnIndex | null {
    try {
      const config = getDifficultyConfig(this.difficulty);
      const move = getBestMove(state, config);
      
      // Fallback: if expectimax fails, use a simple heuristic
      if (move === null && state.phase === "placing" && state.currentDie !== null) {
        const grid = state.grids[state.currentPlayer];
        const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
        if (legalColumns.length > 0) {
          // Use quick evaluation to pick best column
          const scored = legalColumns.map((col) => ({
            col,
            score: evaluateMoveQuick(state, col, state.currentDie!, state.currentPlayer),
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
): ColumnIndex | null {
  try {
    const config = getDifficultyConfig(difficulty);
    const move = getBestMove(state, config);
    
    // Fallback: if expectimax fails, use a simple heuristic
    if (move === null && state.phase === "placing" && state.currentDie !== null) {
      const grid = state.grids[state.currentPlayer];
      const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
      if (legalColumns.length > 0) {
        // Use quick evaluation to pick best column
        const scored = legalColumns.map((col) => ({
          col,
          score: evaluateMoveQuick(state, col, state.currentDie!, state.currentPlayer),
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
