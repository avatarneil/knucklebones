/**
 * Mass Simulation Engine
 *
 * Runs multiple games in parallel and tracks results.
 * Supports Master AI learning mode for adaptive opponent modeling.
 */

import { endMasterGame, getAIMove, recordOpponentMoveForLearning } from "./ai";
import { applyMove, rollDie } from "./moves";
import { calculateGridScore } from "./scorer";
import { createInitialState } from "./state";
import type { ColumnIndex, DieValue, DifficultyLevel, GameState, Player } from "./types";

export interface SimulationResult {
  id: number;
  winner: Player | "draw";
  finalScore: { player1: number; player2: number };
  turnCount: number;
  moves: {
    turn: number;
    player: Player;
    dieValue: number;
    column: number;
    state: GameState;
  }[];
  finalState: GameState; // Final state after all moves
  player1Strategy: DifficultyLevel;
  player2Strategy: DifficultyLevel;
  completedAt: number;
  runtime: number; // Runtime in milliseconds
}

export interface SimulationStats {
  totalGames: number;
  completedGames: number;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  player1WinRate: number;
  player2WinRate: number;
  averageTurnCount: number;
  averageScoreDiff: number;
  averageRuntimePerGame: number; // Average runtime per game in milliseconds
}

export interface SimulationConfig {
  player1Strategy: DifficultyLevel;
  player2Strategy: DifficultyLevel;
  numGames: number;
  onProgress?: (stats: SimulationStats, latestResult?: SimulationResult) => void;
  onGameComplete?: (result: SimulationResult) => void;
  controller?: SimulationController;
}

/**
 * Determine if Master AI is involved in the simulation.
 * Returns which player (if any) is using Master AI.
 */
function detectMasterAI(
  player1Strategy: DifficultyLevel,
  player2Strategy: DifficultyLevel
): {
  isMasterPlayer1: boolean;
  isMasterPlayer2: boolean;
  hasMasterPlayer: boolean;
} {
  const isMasterPlayer1 = player1Strategy === "master";
  const isMasterPlayer2 = player2Strategy === "master";
  return {
    hasMasterPlayer: isMasterPlayer1 || isMasterPlayer2,
    isMasterPlayer1,
    isMasterPlayer2,
  };
}

/**
 * Simulate a single game between two AI players
 * Supports Master AI learning - records opponent moves for the Master to learn from
 */
async function simulateSingleGame(
  id: number,
  player1Strategy: DifficultyLevel,
  player2Strategy: DifficultyLevel
): Promise<SimulationResult> {
  const startTime = performance.now();
  let state = createInitialState();
  const moves: SimulationResult["moves"] = [];
  let turnCount = 0;
  let moveCount = 0;

  // Check if Master AI is involved for learning
  const { isMasterPlayer1, isMasterPlayer2, hasMasterPlayer } = detectMasterAI(
    player1Strategy,
    player2Strategy
  );

  // Run the game until completion
  while (state.phase !== "ended") {
    // Roll die
    if (state.phase === "rolling") {
      state = rollDie(state);
    }

    // Get AI move
    const currentStrategy = state.currentPlayer === "player1" ? player1Strategy : player2Strategy;
    const opponentStrategy = state.currentPlayer === "player1" ? player2Strategy : player1Strategy;
    const move = getAIMove(state, currentStrategy, opponentStrategy);

    if (move === null) {
      // No legal moves - should not happen, but handle gracefully
      break;
    }

    // For Master AI learning: record the OPPONENT's move to the correct profile
    // Each Master AI learns from their opponent's moves independently
    if (hasMasterPlayer && state.currentDie !== null) {
      // If player1 is Master AI and player2 is making a move, record it for player1's learning
      if (isMasterPlayer1 && state.currentPlayer === "player2") {
        recordOpponentMoveForLearning(
          state,
          move as ColumnIndex,
          state.currentDie as DieValue,
          "player2", // The opponent making the move
          "player1" // The Master AI learning from it
        );
      }

      // If player2 is Master AI and player1 is making a move, record it for player2's learning
      if (isMasterPlayer2 && state.currentPlayer === "player1") {
        recordOpponentMoveForLearning(
          state,
          move as ColumnIndex,
          state.currentDie as DieValue,
          "player1", // The opponent making the move
          "player2" // The Master AI learning from it
        );
      }
    }

    // Record move before applying
    moves.push({
      column: move,
      dieValue: state.currentDie!,
      player: state.currentPlayer,
      state: JSON.parse(JSON.stringify(state)) as GameState,
      turn: state.turnNumber, // Deep clone
    });

    // Apply move
    const result = applyMove(state, move);
    if (!result) {
      break;
    }

    state = result.newState;
    turnCount = state.turnNumber;
    moveCount++;

    // Yield control to UI thread every few moves to prevent blocking
    // For hard/expert/master difficulties, yield more frequently due to heavy computation
    const isHardDifficulty =
      currentStrategy === "hard" || currentStrategy === "expert" || currentStrategy === "master";
    const yieldInterval = isHardDifficulty ? 1 : 3;

    if (moveCount % yieldInterval === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Mark game end for Master AI profile stability tracking
  if (hasMasterPlayer) {
    endMasterGame();
  }

  const scores = {
    player1: calculateGridScore(state.grids.player1).total,
    player2: calculateGridScore(state.grids.player2).total,
  };

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return {
    id,
    winner: state.winner || "draw",
    finalScore: scores,
    turnCount,
    moves,
    finalState: JSON.parse(JSON.stringify(state)) as GameState, // Deep clone final state
    player1Strategy,
    player2Strategy,
    completedAt: Date.now(),
    runtime,
  };
}

/**
 * Calculate statistics from results
 */
function calculateStats(results: SimulationResult[], totalGames: number): SimulationStats {
  const completedGames = results.length;
  const player1Wins = results.filter((r) => r.winner === "player1").length;
  const player2Wins = results.filter((r) => r.winner === "player2").length;
  const draws = results.filter((r) => r.winner === "draw").length;

  const player1WinRate = completedGames > 0 ? player1Wins / completedGames : 0;
  const player2WinRate = completedGames > 0 ? player2Wins / completedGames : 0;

  const averageTurnCount =
    completedGames > 0 ? results.reduce((sum, r) => sum + r.turnCount, 0) / completedGames : 0;

  const averageScoreDiff =
    completedGames > 0
      ? results.reduce((sum, r) => sum + (r.finalScore.player1 - r.finalScore.player2), 0) /
        completedGames
      : 0;

  const averageRuntimePerGame =
    completedGames > 0 ? results.reduce((sum, r) => sum + r.runtime, 0) / completedGames : 0;

  return {
    averageRuntimePerGame,
    averageScoreDiff,
    averageTurnCount,
    completedGames,
    draws,
    player1WinRate,
    player1Wins,
    player2WinRate,
    player2Wins,
    totalGames,
  };
}

/**
 * Determine appropriate concurrency based on difficulty levels
 */
function getConcurrency(
  player1Strategy: DifficultyLevel,
  player2Strategy: DifficultyLevel
): number {
  const isExpert = (strategy: DifficultyLevel) => strategy === "expert";
  const isHard = (strategy: DifficultyLevel) => strategy === "hard";
  const isMaster = (strategy: DifficultyLevel) => strategy === "master";

  // Master AI must run sequentially to properly learn from each game
  // (profile updates need to happen in order)
  if (isMaster(player1Strategy) || isMaster(player2Strategy)) {
    return 1;
  }

  // Expert difficulty is extremely computationally intensive - run sequentially
  if (isExpert(player1Strategy) || isExpert(player2Strategy)) {
    return 1;
  }

  // Hard difficulty still needs reduced concurrency
  if (isHard(player1Strategy) || isHard(player2Strategy)) {
    return 2;
  }

  // For medium and below, use higher concurrency
  return 10;
}

/**
 * Run mass simulation with configurable concurrency
 */
export async function runSimulation(config: SimulationConfig): Promise<SimulationResult[]> {
  const { numGames, player1Strategy, player2Strategy, onProgress, onGameComplete } = config;
  const results: SimulationResult[] = [];
  const concurrency = getConcurrency(player1Strategy, player2Strategy);
  let nextId = 0;
  let cancelled = false;

  // Check for cancellation function
  const checkCancelled = () => {
    if (config.controller?.isCancelled()) {
      cancelled = true;
      return true;
    }
    return cancelled;
  };

  // Process games in batches
  for (let i = 0; i < numGames; i += concurrency) {
    if (checkCancelled()) {
      break;
    }

    const batchSize = Math.min(concurrency, numGames - i);
    const batch: Promise<SimulationResult>[] = [];

    // Start batch of games
    for (let j = 0; j < batchSize; j++) {
      if (checkCancelled()) {
        break;
      }
      const gameId = nextId++;
      batch.push(simulateSingleGame(gameId, player1Strategy, player2Strategy));
    }

    // Wait for batch to complete and process results
    // Use Promise.allSettled to handle any potential errors gracefully
    const batchResults = await Promise.allSettled(batch);

    for (const result of batchResults) {
      if (checkCancelled()) {
        break;
      }

      if (result.status === "fulfilled") {
        results.push(result.value);

        // Call onGameComplete callback
        onGameComplete?.(result.value);

        // Update stats and call progress callback
        const stats = calculateStats(results, numGames);
        onProgress?.(stats, result.value);
      } else {
        console.error("Simulation game failed:", result.reason);
      }
    }

    // Yield control to UI thread between batches
    // For hard/expert/master difficulties, add a small delay to give UI more breathing room
    const isHardDifficulty =
      player1Strategy === "hard" ||
      player1Strategy === "expert" ||
      player1Strategy === "master" ||
      player2Strategy === "hard" ||
      player2Strategy === "expert" ||
      player2Strategy === "master";
    const delay = isHardDifficulty ? 10 : 0; // 10ms delay for hard/expert/master
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return results;
}

/**
 * Cancel a running simulation
 */
export class SimulationController {
  private cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }
}
