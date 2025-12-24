import type {
  Column,
  ColumnIndex,
  DieValue,
  DifficultyLevel,
  GameState,
  Grid,
} from "@/engine/types";

// Die value type guard and parser
const DIE_VALUES = [1, 2, 3, 4, 5, 6] as const;

export function isDieValue(value: unknown): value is DieValue {
  return (
    typeof value === "number" && DIE_VALUES.includes(value as (typeof DIE_VALUES)[number])
  );
}

export function parseDieValue(value: number): DieValue {
  if (!isDieValue(value)) {
    throw new Error(`Invalid die value: ${value}`);
  }
  return value;
}

export function randomDieValue(): DieValue {
  const roll = Math.floor(Math.random() * 6) + 1;
  // Safe because we know the math produces 1-6
  return roll as DieValue;
}

// Column index type guard and parser
const COLUMN_INDICES = [0, 1, 2] as const;

export function isColumnIndex(value: unknown): value is ColumnIndex {
  return (
    typeof value === "number" &&
    COLUMN_INDICES.includes(value as (typeof COLUMN_INDICES)[number])
  );
}

export function parseColumnIndex(value: number): ColumnIndex {
  if (!isColumnIndex(value)) {
    throw new Error(`Invalid column index: ${value}`);
  }
  return value;
}

// Difficulty level type guard and parser
const DIFFICULTY_LEVELS = [
  "greedy",
  "beginner",
  "easy",
  "medium",
  "hard",
  "expert",
  "master",
] as const;

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    typeof value === "string" &&
    DIFFICULTY_LEVELS.includes(value as (typeof DIFFICULTY_LEVELS)[number])
  );
}

export function parseDifficultyLevel(
  value: string | null | undefined,
  defaultValue: DifficultyLevel = "medium",
): DifficultyLevel {
  if (isDifficultyLevel(value)) {
    return value;
  }
  return defaultValue;
}

// Grid cloning helper (replaces unsafe casts)
export function cloneColumn(column: Column): Column {
  return [column[0], column[1], column[2]];
}

export function cloneGrid(grid: Grid): Grid {
  return [cloneColumn(grid[0]), cloneColumn(grid[1]), cloneColumn(grid[2])];
}

// GameState validation and parsing
export function isValidGameState(obj: unknown): obj is GameState {
  if (typeof obj !== "object" || obj === null) return false;
  const state = obj as Record<string, unknown>;
  return (
    typeof state.currentPlayer === "string" &&
    (state.currentPlayer === "player1" || state.currentPlayer === "player2") &&
    typeof state.phase === "string" &&
    (state.phase === "rolling" || state.phase === "placing" || state.phase === "ended") &&
    typeof state.turnNumber === "number" &&
    typeof state.grids === "object" &&
    state.grids !== null
  );
}

export function parseGameState(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isValidGameState(parsed)) {
    throw new Error("Invalid game state JSON");
  }
  return parsed;
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    grids: {
      player1: cloneGrid(state.grids.player1),
      player2: cloneGrid(state.grids.player2),
    },
  };
}

// Column with die value removal
export function removeDieFromColumn(column: Column, dieValue: DieValue): Column {
  return [
    column[0] === dieValue ? null : column[0],
    column[1] === dieValue ? null : column[1],
    column[2] === dieValue ? null : column[2],
  ];
}

// Get non-null dice from column
export function getNonNullDice(column: Column): DieValue[] {
  const result: DieValue[] = [];
  for (const die of column) {
    if (die !== null) {
      result.push(die);
    }
  }
  return result;
}

// Add die to column
export function addDieToColumn(column: Column, dieValue: DieValue): Column | null {
  const newColumn = cloneColumn(column);
  for (let i = 0; i < 3; i++) {
    if (newColumn[i] === null) {
      newColumn[i] = dieValue;
      return newColumn;
    }
  }
  return null; // Column is full
}

