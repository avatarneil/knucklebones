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
  /** Whether to use true adversarial search (min over all opponent moves) vs modeled opponent */
  adversarial: boolean;
  /** Time budget in ms for iterative deepening (0 = use fixed depth) */
  timeBudgetMs: number;
}

// prettier-ignore
// biome-ignore format: semantic ordering by difficulty progression
// oxfmt-ignore
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
    adversarial: false,
    timeBudgetMs: 0,
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
    adversarial: false,
    timeBudgetMs: 0,
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
    adversarial: false,
    timeBudgetMs: 0,
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
    adversarial: false,
    timeBudgetMs: 0,
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
    adversarial: true,
    timeBudgetMs: 0,
  },
  expert: {
    name: "Expert",
    description: "Maximum depth, adversarial search with time budget",
    depth: 6,
    randomness: 0,
    considerOpponent: true,
    offenseWeight: 0.5,
    defenseWeight: 0.5,
    advancedEval: true,
    adversarial: true,
    timeBudgetMs: 100, // 100ms time budget with iterative deepening
  },
  master: {
    name: "Master",
    description: "Learns opponent patterns and adapts strategy",
    depth: 6,
    randomness: 0,
    considerOpponent: true,
    offenseWeight: 0.5, // Base weight, adapted at runtime
    defenseWeight: 0.5, // Base weight, adapted at runtime
    advancedEval: true,
    adversarial: true,
    timeBudgetMs: 100, // 100ms time budget with iterative deepening
  },
  grandmaster: {
    name: "Grandmaster",
    description: "Hybrid MCTS + neural network for strongest play",
    depth: 6, // Fallback depth if MCTS unavailable
    randomness: 0,
    considerOpponent: true,
    offenseWeight: 0.5,
    defenseWeight: 0.5,
    advancedEval: true,
    adversarial: true,
    timeBudgetMs: 100, // 100ms time budget for MCTS
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
  return ["greedy", "beginner", "easy", "medium", "hard", "expert", "master", "grandmaster"];
}
