/**
 * AI Difficulty Level Configuration
 *
 * Each difficulty level has different parameters that affect AI behavior.
 */

import type { DifficultyLevel } from "../types";

export interface DifficultyConfig {
  /** Name of the difficulty */
  name: string;
  /** Description for UI */
  description: string;
  /** Search depth for expectimax */
  depth: number;
  /** Probability of making a random move (0-1) */
  randomness: number;
  /** Whether to consider opponent's potential moves */
  considerOpponent: boolean;
  /** Weight for offensive play (0-1) */
  offenseWeight: number;
  /** Weight for defensive play (0-1) */
  defenseWeight: number;
  /** Whether to use advanced evaluation heuristics */
  advancedEval: boolean;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  greedy: {
    name: "Greedy",
    description: "Always picks the move with highest immediate score gain",
    depth: 0,
    randomness: 0,
    considerOpponent: false,
    offenseWeight: 1.0,
    defenseWeight: 0.0,
    advancedEval: false,
  },
  beginner: {
    name: "Beginner",
    description: "Makes mostly random moves with occasional good plays",
    depth: 1,
    randomness: 0.4,
    considerOpponent: false,
    offenseWeight: 0.7,
    defenseWeight: 0.3,
    advancedEval: false,
  },
  easy: {
    name: "Easy",
    description: "Basic strategy with some mistakes",
    depth: 2,
    randomness: 0.25,
    considerOpponent: true,
    offenseWeight: 0.6,
    defenseWeight: 0.4,
    advancedEval: false,
  },
  medium: {
    name: "Medium",
    description: "Solid play with rare mistakes",
    depth: 3,
    randomness: 0.1,
    considerOpponent: true,
    offenseWeight: 0.5,
    defenseWeight: 0.5,
    advancedEval: true,
  },
  hard: {
    name: "Hard",
    description: "Strong evaluation and deep search",
    depth: 4,
    randomness: 0,
    considerOpponent: true,
    offenseWeight: 0.5,
    defenseWeight: 0.5,
    advancedEval: true,
  },
  expert: {
    name: "Expert",
    description: "Maximum depth, perfect evaluation",
    depth: 5,
    randomness: 0,
    considerOpponent: true,
    offenseWeight: 0.5,
    defenseWeight: 0.5,
    advancedEval: true,
  },
};

/**
 * Get the configuration for a difficulty level
 */
export function getDifficultyConfig(level: DifficultyLevel): DifficultyConfig {
  return DIFFICULTY_CONFIGS[level];
}

/**
 * Get all difficulty levels in order
 */
export function getAllDifficultyLevels(): DifficultyLevel[] {
  return ["greedy", "beginner", "easy", "medium", "hard", "expert"];
}
