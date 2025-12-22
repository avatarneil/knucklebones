"use client";

import { calculateGridScore, isColumnFull } from "@/engine/scorer";
import type { ColumnIndex, GameState, MoveAnalysis } from "@/engine/types";
import { ALL_COLUMNS } from "@/engine/types";
import { DiceRoller } from "./DiceRoller";
import { PlayerGrid } from "./PlayerGrid";
import { ScoreCard } from "./ScoreCard";

interface GameBoardProps {
  state: GameState;
  isRolling?: boolean;
  onRoll?: () => void;
  onColumnClick?: (column: ColumnIndex) => void;
  player1Name?: string;
  player2Name?: string;
  isPlayer1Human?: boolean;
  isPlayer2Human?: boolean;
  moveAnalysis?: MoveAnalysis[];
  showProbabilities?: boolean;
  highlightedColumn?: ColumnIndex | null;
}

export function GameBoard({
  state,
  isRolling = false,
  onRoll,
  onColumnClick,
  player1Name = "You",
  player2Name = "Opponent",
  isPlayer1Human = true,
  isPlayer2Human = false,
  moveAnalysis,
  showProbabilities = false,
  highlightedColumn,
}: GameBoardProps) {
  const isPlayer1Turn = state.currentPlayer === "player1";
  const isPlacingPhase = state.phase === "placing";
  const isRollingPhase = state.phase === "rolling";
  const isEnded = state.phase === "ended";

  // Get legal columns for current player
  const currentGrid = state.grids[state.currentPlayer];
  const legalColumns = ALL_COLUMNS.filter((i) => !isColumnFull(currentGrid[i]));

  // Check if current player is human
  const isCurrentPlayerHuman = isPlayer1Turn ? isPlayer1Human : isPlayer2Human;

  // Can roll if it's rolling phase and current player is human
  const canRoll = isRollingPhase && isCurrentPlayerHuman && !isEnded;

  // Can place if it's placing phase and current player is human
  const canPlace = isPlacingPhase && isCurrentPlayerHuman && !isEnded;

  const player1Score = calculateGridScore(state.grids.player1);
  const player2Score = calculateGridScore(state.grids.player2);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      {/* Opponent grid (player2 shown at top) */}
      <PlayerGrid
        grid={state.grids.player2}
        playerName={player2Name}
        isCurrentPlayer={!isPlayer1Turn}
        isOpponent={true}
        canPlaceDie={canPlace && !isPlayer1Turn}
        onColumnClick={onColumnClick}
        legalColumns={!isPlayer1Turn ? legalColumns : []}
        moveAnalysis={!isPlayer1Turn ? moveAnalysis : undefined}
        showProbabilities={showProbabilities && !isPlayer1Turn}
        highlightedColumn={!isPlayer1Turn ? highlightedColumn : null}
      />

      {/* Center section: Score + Dice */}
      <div className="flex flex-col items-center gap-4">
        <ScoreCard
          player1Score={player1Score}
          player2Score={player2Score}
          player1Name={player1Name}
          player2Name={player2Name}
          currentPlayer={state.currentPlayer}
          winner={
            state.winner === "player1" ||
            state.winner === "player2" ||
            state.winner === "draw"
              ? state.winner
              : null
          }
        />

        {!isEnded && (
          <DiceRoller
            currentDie={state.currentDie}
            isRolling={isRolling}
            canRoll={canRoll}
            onRoll={onRoll ?? (() => {})}
            playerName={isPlayer1Turn ? player1Name : player2Name}
          />
        )}

        {isEnded && (
          <div className="text-center p-6">
            <h2 className="text-2xl font-bold mb-2">
              {state.winner === "draw"
                ? "It's a Draw!"
                : state.winner === "player1"
                  ? `${player1Name} Wins!`
                  : `${player2Name} Wins!`}
            </h2>
            <p className="text-muted-foreground">
              Final Score: {player1Score.total} - {player2Score.total}
            </p>
          </div>
        )}
      </div>

      {/* Player grid (player1 shown at bottom) */}
      <PlayerGrid
        grid={state.grids.player1}
        playerName={player1Name}
        isCurrentPlayer={isPlayer1Turn}
        isOpponent={false}
        canPlaceDie={canPlace && isPlayer1Turn}
        onColumnClick={onColumnClick}
        legalColumns={isPlayer1Turn ? legalColumns : []}
        moveAnalysis={isPlayer1Turn ? moveAnalysis : undefined}
        showProbabilities={showProbabilities && isPlayer1Turn}
        highlightedColumn={isPlayer1Turn ? highlightedColumn : null}
      />
    </div>
  );
}
