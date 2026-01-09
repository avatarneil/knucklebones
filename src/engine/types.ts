/**
 * Knucklebones Game Engine - Core Types
 *
 * A complete type system for the Cult of the Lamb Knucklebones game.
 */

/** A die value from 1 to 6 */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** A column in a player's grid - can hold up to 3 dice */
export type Column = [DieValue | null, DieValue | null, DieValue | null];

/** A player's 3x3 grid - 3 columns */
export type Grid = [Column, Column, Column];

/** Column index (0-2) */
export type ColumnIndex = 0 | 1 | 2;

/** Row index (0-2) */
export type RowIndex = 0 | 1 | 2;

/** Player identifier */
export type Player = "player1" | "player2";

/** Game phase */
export type GamePhase = "rolling" | "placing" | "ended";

/** A move: placing a die in a column */
export interface Move {
  column: ColumnIndex;
  dieValue: DieValue;
}

/** Score breakdown for a single column */
export interface ColumnScore {
  column: ColumnIndex;
  dice: DieValue[];
  baseValue: number;
  multiplier: number;
  total: number;
}

/** Score breakdown for a player */
export interface PlayerScore {
  columns: [ColumnScore, ColumnScore, ColumnScore];
  total: number;
}

/** Complete game state - immutable */
export interface GameState {
  /** Both players' grids */
  grids: {
    player1: Grid;
    player2: Grid;
  };
  /** Current player's turn */
  currentPlayer: Player;
  /** Current die value (if rolled) */
  currentDie: DieValue | null;
  /** Current game phase */
  phase: GamePhase;
  /** Winner (if game ended) */
  winner: Player | "draw" | null;
  /** Turn number (starts at 1) */
  turnNumber: number;
  /** Move history for replay/undo */
  moveHistory: Move[];
}

// prettier-ignore
// biome-ignore format: semantic ordering by difficulty progression
// oxfmt-ignore
/** AI difficulty level */
export type DifficultyLevel =
  | "greedy"
  | "beginner"
  | "easy"
  | "medium"
  | "hard"
  | "expert"
  | "master"
  | "grandmaster";

/** Game mode */
export type GameMode = "ai" | "pvp" | "training" | "ai-vs-ai";

/** Configuration for a game */
export interface GameConfig {
  mode: GameMode;
  difficulty?: DifficultyLevel;
  trainingMode?: boolean;
  playerNames?: {
    player1: string;
    player2: string;
  };
}

/** Result of applying a move */
export interface MoveResult {
  newState: GameState;
  removedDice: {
    column: ColumnIndex;
    count: number;
    value: DieValue;
  } | null;
}

/** Legal moves available */
export interface LegalMoves {
  columns: ColumnIndex[];
  dieValue: DieValue;
}

/** Training mode - move analysis */
export interface MoveAnalysis {
  column: ColumnIndex;
  winProbability: number;
  expectedScore: number;
  immediateScoreGain: number;
  opponentDiceRemoved: number;
}

/** All die values for iteration */
export const ALL_DIE_VALUES: readonly DieValue[] = [1, 2, 3, 4, 5, 6] as const;

/** All column indices for iteration */
export const ALL_COLUMNS: readonly ColumnIndex[] = [0, 1, 2] as const;

/** All row indices for iteration */
export const ALL_ROWS: readonly RowIndex[] = [0, 1, 2] as const;

/** Get the opponent player */
export function getOpponent(player: Player): Player {
  return player === "player1" ? "player2" : "player1";
}
