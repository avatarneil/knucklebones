/**
 * AI Position Evaluation
 *
 * Evaluates game positions for the AI to make decisions.
 */

import {
  calculateGridScore,
  calculateMoveScoreGain,
  calculateOpponentScoreLoss,
  getEmptySlots,
  isColumnFull,
} from "../scorer";
import { getGameProgress } from "../state";
import type { ColumnIndex, DieValue, GameState, Player } from "../types";
import { ALL_COLUMNS, ALL_DIE_VALUES, getOpponent } from "../types";
import type { DifficultyConfig } from "./difficulty";

/**
 * Evaluation result with breakdown
 */
export interface EvaluationResult {
  /** Total evaluation score (positive = good for evaluated player) */
  score: number;
  /** Score component from own grid */
  ownScore: number;
  /** Score component from opponent's grid */
  opponentScore: number;
  /** Positional advantages */
  positionalScore: number;
}

/**
 * Count potential combos in a column
 */
function countColumnComboPotential(
  column: (DieValue | null)[],
  emptySlots: number,
): number {
  const dice = column.filter((d): d is DieValue => d !== null);
  if (dice.length === 0) return 0;

  // Count matching dice
  const counts = new Map<DieValue, number>();
  for (const die of dice) {
    counts.set(die, (counts.get(die) || 0) + 1);
  }

  let potential = 0;
  for (const [value, count] of counts) {
    // Higher value dice and more matches = more potential
    if (count === 2 && emptySlots >= 1) {
      // Could become a triple
      potential += value * 3;
    } else if (count === 1 && emptySlots >= 2) {
      // Could become a double or triple
      potential += value * 1.5;
    }
  }

  return potential;
}

/**
 * Evaluate how vulnerable a column is to attack
 */
function evaluateColumnVulnerability(
  column: (DieValue | null)[],
  opponentColumn: (DieValue | null)[],
): number {
  const myDice = column.filter((d): d is DieValue => d !== null);
  const opponentEmpty = opponentColumn.filter((d) => d === null).length;

  if (opponentEmpty === 0) return 0; // Opponent can't attack this column

  let vulnerability = 0;
  for (const die of myDice) {
    // Each die could potentially be removed
    vulnerability += die * 0.5;
  }

  return vulnerability;
}

/**
 * Evaluate control of a column (having unique dice opponent can't remove)
 */
function evaluateColumnControl(
  column: (DieValue | null)[],
  opponentColumn: (DieValue | null)[],
): number {
  const myDice = column.filter((d): d is DieValue => d !== null);
  const opponentDice = new Set(
    opponentColumn.filter((d): d is DieValue => d !== null),
  );

  let control = 0;
  for (const die of myDice) {
    if (!opponentDice.has(die)) {
      // This die can't be removed by opponent playing matching dice
      control += die * 0.3;
    }
  }

  return control;
}

/**
 * Basic evaluation - just score difference
 */
export function evaluateBasic(state: GameState, player: Player): number {
  const myScore = calculateGridScore(state.grids[player]).total;
  const oppScore = calculateGridScore(state.grids[getOpponent(player)]).total;
  return myScore - oppScore;
}

/**
 * Advanced evaluation with positional heuristics
 */
export function evaluateAdvanced(
  state: GameState,
  player: Player,
  config: DifficultyConfig,
): EvaluationResult {
  const opponent = getOpponent(player);
  const myGrid = state.grids[player];
  const oppGrid = state.grids[opponent];

  // Base scores
  const ownScore = calculateGridScore(myGrid).total;
  const opponentScore = calculateGridScore(oppGrid).total;

  // Positional evaluation
  let positionalScore = 0;
  const gameProgress = getGameProgress(state);

  for (const col of ALL_COLUMNS) {
    const myColumn = myGrid[col];
    const oppColumn = oppGrid[col];
    const myEmpty = getEmptySlots(myColumn);
    const _oppEmpty = getEmptySlots(oppColumn);

    // Combo potential (more valuable early game)
    const comboPotential = countColumnComboPotential(myColumn, myEmpty);
    positionalScore += comboPotential * (1 - gameProgress * 0.5);

    // Vulnerability (more important mid-late game)
    const vulnerability = evaluateColumnVulnerability(myColumn, oppColumn);
    positionalScore -= vulnerability * gameProgress * config.defenseWeight;

    // Column control
    const control = evaluateColumnControl(myColumn, oppColumn);
    positionalScore += control;

    // Attack potential (more valuable early-mid game)
    if (!isColumnFull(oppColumn)) {
      for (const value of ALL_DIE_VALUES) {
        const potentialDamage = calculateOpponentScoreLoss(oppGrid, col, value);
        if (potentialDamage > 0) {
          // Weighted by probability (1/6) and game phase
          positionalScore +=
            (potentialDamage / 6) *
            (1 - gameProgress * 0.3) *
            config.offenseWeight;
        }
      }
    }
  }

  // Game end bonus
  if (state.phase === "ended") {
    if (state.winner === player) {
      return {
        score: 10000,
        ownScore,
        opponentScore,
        positionalScore: 0,
      };
    } else if (state.winner === getOpponent(player)) {
      return {
        score: -10000,
        ownScore,
        opponentScore,
        positionalScore: 0,
      };
    }
  }

  const score =
    (ownScore - opponentScore) * config.offenseWeight + positionalScore;

  return {
    score,
    ownScore,
    opponentScore,
    positionalScore,
  };
}

/**
 * Evaluate a state based on difficulty config
 */
export function evaluate(
  state: GameState,
  player: Player,
  config: DifficultyConfig,
): number {
  if (config.advancedEval) {
    return evaluateAdvanced(state, player, config).score;
  }
  return evaluateBasic(state, player);
}

/**
 * Evaluate a specific move without applying it
 * (for quick move ordering)
 */
export function evaluateMoveQuick(
  state: GameState,
  column: ColumnIndex,
  dieValue: DieValue,
  player: Player,
): number {
  const opponent = getOpponent(player);

  // Score gain from placing
  const scoreGain = calculateMoveScoreGain(
    state.grids[player],
    column,
    dieValue,
  );

  // Opponent score loss from removing their dice
  const opponentLoss = calculateOpponentScoreLoss(
    state.grids[opponent],
    column,
    dieValue,
  );

  return scoreGain + opponentLoss;
}
