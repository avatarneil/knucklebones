/**
 * Knucklebones Game Engine
 *
 * A complete, encapsulated game engine for the Cult of the Lamb Knucklebones game.
 *
 * @example
 * ```typescript
 * import { createInitialState, rollDie, applyMove, getScores } from '@/engine';
 *
 * let state = createInitialState();
 * state = rollDie(state);
 * const result = applyMove(state, 0); // Place in first column
 * if (result) {
 *   state = result.newState;
 * }
 * console.log(getScores(state));
 * ```
 */

// AI
export {
  AIPlayer,
  clearTranspositionTable,
  createAIPlayer,
  DIFFICULTY_CONFIGS,
  getAIMove,
  getGreedyMove,
  getAllDifficultyLevels,
  getDifficultyConfig,
} from "./ai";
// Moves
export {
  applyMove,
  getAllPossibleMoves,
  getLegalMoves,
  hasLegalMoves,
  isLegalMove,
  rollDie,
  rollSpecificDie,
} from "./moves";

// Scoring
export {
  calculateColumnScore,
  calculateDiceRemoved,
  calculateGridScore,
  calculateMoveScoreGain,
  calculateOpponentScoreLoss,
  getEmptySlots,
  getTotalEmptySlots,
  isColumnFull,
  isGridFull,
} from "./scorer";
// State management
export {
  cloneState,
  countDice,
  createEmptyColumn,
  createEmptyGrid,
  createInitialState,
  createStateFromGrids,
  deserializeState,
  getDetailedScores,
  getGamePhaseDescription,
  getGameProgress,
  getScores,
  getStateHash,
  serializeState,
  statesEqual,
} from "./state";
// Training
export {
  analyzeAllMoves,
  deepAnalysis,
  quickAnalysis,
  simulateMove,
} from "./training";
// Simulation
export {
  runSimulation,
  SimulationController,
  type SimulationConfig,
  type SimulationResult,
  type SimulationStats,
} from "./simulation";
// Types
export * from "./types";
