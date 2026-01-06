"use client";

import { calculateGridScore, isColumnFull } from "@/engine/scorer";
import type { ColumnIndex, GameState, MoveAnalysis } from "@/engine/types";
import { ALL_COLUMNS } from "@/engine/types";
import type { LandscapeLayout } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { DiceRoller } from "./DiceRoller";
import { PlayerGrid } from "./PlayerGrid";
import { ScoreCard } from "./ScoreCard";

interface GameBoardProps {
  state: GameState;
  isRolling?: boolean;
  isThinking?: boolean;
  onRoll?: () => void;
  onColumnClick?: (column: ColumnIndex) => void;
  player1Name?: string;
  player2Name?: string;
  isPlayer1Human?: boolean;
  isPlayer2Human?: boolean;
  moveAnalysis?: MoveAnalysis[];
  showProbabilities?: boolean;
  highlightedColumn?: ColumnIndex | null;
  landscapeLayout?: LandscapeLayout;
}

export function GameBoard({
  state,
  isRolling = false,
  isThinking = false,
  onRoll,
  onColumnClick,
  player1Name = "You",
  player2Name = "Opponent",
  isPlayer1Human = true,
  isPlayer2Human = false,
  moveAnalysis,
  showProbabilities = false,
  highlightedColumn,
  landscapeLayout = "center",
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
  const isPlayer2Turn = !isPlayer1Turn;

  // Can roll if it's rolling phase and current player is human
  const canRoll = isRollingPhase && isCurrentPlayerHuman && !isEnded;

  // Can place if it's placing phase and current player is human
  const canPlace = isPlacingPhase && isCurrentPlayerHuman && !isEnded;

  const player1Score = calculateGridScore(state.grids.player1);
  const player2Score = calculateGridScore(state.grids.player2);

  // Use landscape-right class when setting is "right"
  const useLandscapeRight = landscapeLayout === "right";

  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row items-center justify-between flex-1 w-full mx-auto pt-[clamp(0.5rem,2vw,1rem)] pb-[clamp(0.25rem,1vw,0.5rem)] gap-2 lg:gap-8",
        // Use different max-widths for portrait vs landscape-right mode
        useLandscapeRight 
          ? "landscape-horizontal-right max-w-full" 
          : "landscape-horizontal max-w-[min(95vw,clamp(20rem,80vw,56rem))] lg:max-w-[min(95vw,90rem)]"
      )}
    >
      {/* Mobile portrait: Opponent at top */}
      <div className={cn("contents lg:hidden", useLandscapeRight ? "landscape-right-hide" : "landscape-hide")}>
        <PlayerGrid
          grid={state.grids.player2}
          playerName={player2Name}
          isCurrentPlayer={!isPlayer1Turn}
          isOpponent
          canPlaceDie={canPlace && !isPlayer1Turn}
          onColumnClick={onColumnClick}
          legalColumns={!isPlayer1Turn ? legalColumns : []}
          moveAnalysis={!isPlayer1Turn ? moveAnalysis : undefined}
          showProbabilities={showProbabilities && !isPlayer1Turn}
          highlightedColumn={!isPlayer1Turn ? highlightedColumn : undefined}
          isThinking={isThinking && isPlayer2Turn && !isPlayer2Human}
        />
      </div>

      {/* Desktop + Landscape: Player grid on left */}
      <div className={cn(
        "hidden lg:flex lg:flex-1 lg:justify-end landscape-grid-container landscape-grid-left",
        useLandscapeRight ? "landscape-right-show" : "landscape-show"
      )}>
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
          highlightedColumn={isPlayer1Turn ? highlightedColumn : undefined}
          isThinking={isThinking && isPlayer1Turn && !isPlayer1Human}
        />
      </div>

      {/* Center section: Score + Dice (for center layout) */}
      <div className={cn(
        "flex flex-col items-center gap-[clamp(0.5rem,1.5vmin,1rem)] lg:flex-shrink-0",
        useLandscapeRight ? "landscape-right-center" : "landscape-compact-center"
      )}>
        <ScoreCard
          player1Score={player1Score}
          player2Score={player2Score}
          player1Name={player1Name}
          player2Name={player2Name}
          currentPlayer={state.currentPlayer}
          winner={
            state.winner === "player1" || state.winner === "player2" || state.winner === "draw"
              ? state.winner
              : undefined
          }
        />

        {/* Dice roller - shown here in center mode or portrait mode */}
        {!isEnded && (
          <div className={cn(useLandscapeRight && "landscape-right-dice-hide")}>
            <DiceRoller
              currentDie={state.currentDie}
              isRolling={isRolling}
              canRoll={canRoll}
              onRoll={onRoll ?? (() => {})}
              playerName={isPlayer1Turn ? player1Name : player2Name}
              isHuman={isCurrentPlayerHuman}
            />
          </div>
        )}

        {isEnded && (
          <div className="text-center p-[clamp(0.75rem,3vw,1.5rem)]">
            <h2 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold mb-[clamp(0.25rem,1vw,0.5rem)]">
              {state.winner === "draw"
                ? "It's a Draw!"
                : state.winner === "player1"
                  ? `${player1Name} Wins!`
                  : `${player2Name} Wins!`}
            </h2>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Final Score: {player1Score.total} - {player2Score.total}
            </p>
          </div>
        )}
      </div>

      {/* Desktop + Landscape: Opponent grid on right (or middle in right-layout) */}
      <div className={cn(
        "hidden lg:flex lg:flex-1 lg:justify-start landscape-grid-container landscape-grid-right",
        useLandscapeRight ? "landscape-right-show" : "landscape-show"
      )}>
        <PlayerGrid
          grid={state.grids.player2}
          playerName={player2Name}
          isCurrentPlayer={!isPlayer1Turn}
          isOpponent
          canPlaceDie={canPlace && !isPlayer1Turn}
          onColumnClick={onColumnClick}
          legalColumns={!isPlayer1Turn ? legalColumns : []}
          moveAnalysis={!isPlayer1Turn ? moveAnalysis : undefined}
          showProbabilities={showProbabilities && !isPlayer1Turn}
          highlightedColumn={!isPlayer1Turn ? highlightedColumn : undefined}
          isThinking={isThinking && isPlayer2Turn && !isPlayer2Human}
        />
      </div>

      {/* Dice roller on the right side (landscape right mode only) */}
      {!isEnded && useLandscapeRight && (
        <div className="hidden landscape-right-dice-show flex-shrink-0">
          <DiceRoller
            currentDie={state.currentDie}
            isRolling={isRolling}
            canRoll={canRoll}
            onRoll={onRoll ?? (() => {})}
            playerName={isPlayer1Turn ? player1Name : player2Name}
            isHuman={isCurrentPlayerHuman}
          />
        </div>
      )}

      {/* Mobile portrait: Player grid at bottom */}
      <div className={cn("contents lg:hidden", useLandscapeRight ? "landscape-right-hide" : "landscape-hide")}>
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
          highlightedColumn={isPlayer1Turn ? highlightedColumn : undefined}
          isThinking={isThinking && isPlayer1Turn && !isPlayer1Human}
        />
      </div>
    </div>
  );
}
