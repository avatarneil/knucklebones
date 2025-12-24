/**
 * Monte Carlo Simulation for Win Probability
 *
 * Simulates many random games to estimate win probability for each move.
 */

import { applyMove, rollSpecificDie } from "../moves";
import {
  calculateGridScore,
  calculateMoveScoreGain,
  calculateOpponentScoreLoss,
  isColumnFull,
} from "../scorer";
import { cloneState } from "../state";
import type { ColumnIndex, DieValue, GameState, MoveAnalysis, Player } from "../types";
import { ALL_COLUMNS, getOpponent } from "../types";

/**
 * Result of Monte Carlo simulation for a single move
 */
export interface SimulationResult {
  column: ColumnIndex;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winProbability: number;
  averageScoreDiff: number;
}

/**
 * Full analysis for all possible moves
 */
export interface MoveAnalysisResult {
  moves: MoveAnalysis[];
  bestMove: ColumnIndex | null;
  simulationsPerMove: number;
}

/**
 * Simulation policy for how to play random games
 */
export type SimulationPolicy = "random" | "heuristic" | "mixed";

/**
 * Configuration for Monte Carlo simulation
 */
export interface MonteCarloConfig {
  /** Number of simulations per move */
  simulations: number;
  /** Policy for simulated players */
  policy: SimulationPolicy;
  /** Mix ratio for "mixed" policy (0-1, where 1 = all heuristic) */
  heuristicRatio: number;
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  heuristicRatio: 0.5,
  policy: "mixed",
  simulations: 1000,
};

/**
 * Choose a random move
 */
function chooseRandomMove(state: GameState): ColumnIndex | null {
  const grid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return null;
  }
  return legalColumns[Math.floor(Math.random() * legalColumns.length)];
}

/**
 * Choose a move using simple heuristics
 */
function chooseHeuristicMove(state: GameState): ColumnIndex | null {
  if (state.currentDie === null) {
    return null;
  }

  const player = state.currentPlayer;
  const opponent = getOpponent(player);
  const grid = state.grids[player];
  const oppGrid = state.grids[opponent];
  const dieValue = state.currentDie;

  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));
  if (legalColumns.length === 0) {
    return null;
  }
  if (legalColumns.length === 1) {
    return legalColumns[0];
  }

  // Score each move
  const scored = legalColumns.map((col) => {
    const scoreGain = calculateMoveScoreGain(grid, col, dieValue);
    const opponentLoss = calculateOpponentScoreLoss(oppGrid, col, dieValue);

    // Bonus for creating combos
    const existingDice = grid[col].filter((d) => d === dieValue).length;
    const comboBonus = existingDice > 0 ? dieValue * existingDice * 2 : 0;

    return {
      col,
      score: scoreGain + opponentLoss * 1.2 + comboBonus,
    };
  });

  // Sort by score and return best
  scored.sort((a, b) => b.score - a.score);
  return scored[0].col;
}

/**
 * Choose a move based on the policy
 */
function chooseMove(
  state: GameState,
  policy: SimulationPolicy,
  heuristicRatio: number
): ColumnIndex | null {
  switch (policy) {
    case "random": {
      return chooseRandomMove(state);
    }
    case "heuristic": {
      return chooseHeuristicMove(state);
    }
    case "mixed": {
      if (Math.random() < heuristicRatio) {
        return chooseHeuristicMove(state);
      }
      return chooseRandomMove(state);
    }
  }
}

/**
 * Simulate a single game from the current state to completion
 */
function simulateGame(
  state: GameState,
  policy: SimulationPolicy,
  heuristicRatio: number
): { winner: Player | "draw" | null; scoreDiff: number } {
  let currentState = cloneState(state);
  let maxMoves = 50; // Safety limit

  while (currentState.phase !== "ended" && maxMoves > 0) {
    maxMoves--;

    // Roll phase
    if (currentState.phase === "rolling") {
      const dieValue = (Math.floor(Math.random() * 6) + 1) as DieValue;
      currentState = rollSpecificDie(currentState, dieValue);
    }

    // Placing phase
    if (currentState.phase === "placing") {
      const move = chooseMove(currentState, policy, heuristicRatio);
      if (move === null) {
        break;
      }

      const result = applyMove(currentState, move);
      if (!result) {
        break;
      }

      currentState = result.newState;
    }
  }

  const score1 = calculateGridScore(currentState.grids.player1).total;
  const score2 = calculateGridScore(currentState.grids.player2).total;

  return {
    scoreDiff: score1 - score2,
    winner: currentState.winner,
  };
}

/**
 * Run Monte Carlo simulation for a specific move
 */
export function simulateMove(
  state: GameState,
  column: ColumnIndex,
  config: MonteCarloConfig = DEFAULT_CONFIG
): SimulationResult {
  // Apply the move first
  const result = applyMove(state, column);
  if (!result) {
    return {
      averageScoreDiff: 0,
      column,
      draws: 0,
      losses: 0,
      totalGames: 0,
      winProbability: 0,
      wins: 0,
    };
  }

  const player = state.currentPlayer;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalScoreDiff = 0;

  for (let i = 0; i < config.simulations; i++) {
    const simResult = simulateGame(result.newState, config.policy, config.heuristicRatio);

    if (simResult.winner === player) {
      wins++;
    } else if (simResult.winner === "draw") {
      draws++;
    } else if (simResult.winner !== null) {
      losses++;
    }

    // Adjust score diff based on player perspective
    const scoreDiff = player === "player1" ? simResult.scoreDiff : -simResult.scoreDiff;
    totalScoreDiff += scoreDiff;
  }

  const totalGames = wins + losses + draws;

  return {
    averageScoreDiff: totalGames > 0 ? totalScoreDiff / totalGames : 0,
    column,
    draws,
    losses,
    totalGames,
    winProbability: totalGames > 0 ? wins / totalGames : 0,
    wins,
  };
}

/**
 * Analyze all possible moves from the current state
 */
export function analyzeAllMoves(
  state: GameState,
  config: MonteCarloConfig = DEFAULT_CONFIG
): MoveAnalysisResult {
  if (state.phase !== "placing" || state.currentDie === null) {
    return {
      bestMove: null,
      moves: [],
      simulationsPerMove: config.simulations,
    };
  }

  const player = state.currentPlayer;
  const opponent = getOpponent(player);
  const grid = state.grids[player];
  const oppGrid = state.grids[opponent];
  const dieValue = state.currentDie;

  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(grid[i]));

  if (legalColumns.length === 0) {
    return {
      bestMove: null,
      moves: [],
      simulationsPerMove: config.simulations,
    };
  }

  // Simulate each move
  const moves: MoveAnalysis[] = legalColumns.map((column) => {
    const simResult = simulateMove(state, column, config);

    // Calculate immediate gains
    const immediateScoreGain = calculateMoveScoreGain(grid, column, dieValue);
    const opponentDiceRemoved = oppGrid[column].filter((d) => d === dieValue).length;

    return {
      column,
      expectedScore: simResult.averageScoreDiff,
      immediateScoreGain,
      opponentDiceRemoved,
      winProbability: simResult.winProbability,
    };
  });

  // Sort by win probability
  moves.sort((a, b) => b.winProbability - a.winProbability);

  return {
    bestMove: moves.length > 0 ? moves[0].column : null,
    moves,
    simulationsPerMove: config.simulations,
  };
}

/**
 * Quick analysis with fewer simulations (for UI responsiveness)
 */
export function quickAnalysis(state: GameState, simulations = 200): MoveAnalysisResult {
  return analyzeAllMoves(state, {
    heuristicRatio: 0.3,
    policy: "mixed",
    simulations,
  });
}

/**
 * Deep analysis with more simulations (for accuracy)
 */
export function deepAnalysis(state: GameState, simulations = 2000): MoveAnalysisResult {
  return analyzeAllMoves(state, {
    heuristicRatio: 0.7,
    policy: "heuristic",
    simulations,
  });
}
