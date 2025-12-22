"use client";

import { useCallback, useRef, useState } from "react";
import {
  applyMove,
  createInitialState,
  getAIMove,
  getLegalMoves,
  quickAnalysis,
  rollDie,
} from "@/engine";
import type {
  ColumnIndex,
  DifficultyLevel,
  GameState,
  MoveAnalysis,
} from "@/engine/types";

interface UseGameOptions {
  mode: "ai" | "pvp" | "training";
  difficulty?: DifficultyLevel;
  trainingMode?: boolean;
  onGameEnd?: (winner: "player1" | "player2" | "draw") => void;
}

interface UseGameReturn {
  state: GameState;
  isRolling: boolean;
  moveAnalysis: MoveAnalysis[] | null;
  roll: () => void;
  placeDie: (column: ColumnIndex) => void;
  resetGame: () => void;
  setDifficulty: (level: DifficultyLevel) => void;
  toggleTrainingMode: () => void;
  isTrainingMode: boolean;
  difficulty: DifficultyLevel;
}

export function useGame(options: UseGameOptions): UseGameReturn {
  const [state, setState] = useState<GameState>(createInitialState);
  const [isRolling, setIsRolling] = useState(false);
  const [moveAnalysis, setMoveAnalysis] = useState<MoveAnalysis[] | null>(null);
  const [isTrainingMode, setIsTrainingMode] = useState(
    options.trainingMode ?? false,
  );
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(
    options.difficulty ?? "medium",
  );

  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const runMoveAnalysis = useCallback((gameState: GameState) => {
    if (
      gameState.phase === "placing" &&
      gameState.currentPlayer === "player1"
    ) {
      // Run analysis in a microtask to not block UI
      setTimeout(() => {
        const analysis = quickAnalysis(gameState, 300);
        setMoveAnalysis(analysis.moves);
      }, 0);
    } else {
      setMoveAnalysis(null);
    }
  }, []);

  const handleAITurn = useCallback(
    (gameState: GameState) => {
      if (
        options.mode !== "ai" ||
        gameState.currentPlayer !== "player2" ||
        gameState.phase === "ended"
      ) {
        return;
      }

      // Clear any pending AI timeout
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }

      // AI turn with delay for better UX
      aiTimeoutRef.current = setTimeout(() => {
        let currentState = gameState;

        // Roll if needed
        if (currentState.phase === "rolling") {
          setIsRolling(true);
          currentState = rollDie(currentState);
          setState(currentState);

          // Place after short delay
          setTimeout(() => {
            setIsRolling(false);
            const move = getAIMove(currentState, difficulty);
            if (move !== null) {
              const result = applyMove(currentState, move);
              if (result) {
                setState(result.newState);
                if (isTrainingMode) {
                  runMoveAnalysis(result.newState);
                }
                // Check for game end or continue
                if (result.newState.phase !== "ended") {
                  handleAITurn(result.newState);
                } else if (result.newState.winner) {
                  options.onGameEnd?.(result.newState.winner);
                }
              }
            }
          }, 400);
        } else if (currentState.phase === "placing") {
          const move = getAIMove(currentState, difficulty);
          if (move !== null) {
            const result = applyMove(currentState, move);
            if (result) {
              setState(result.newState);
              if (isTrainingMode) {
                runMoveAnalysis(result.newState);
              }
              if (result.newState.phase !== "ended") {
                handleAITurn(result.newState);
              } else if (result.newState.winner) {
                options.onGameEnd?.(result.newState.winner);
              }
            }
          }
        }
      }, 500);
    },
    [options, difficulty, isTrainingMode, runMoveAnalysis],
  );

  const roll = useCallback(() => {
    if (state.phase !== "rolling") return;
    if (options.mode === "ai" && state.currentPlayer === "player2") return;

    setIsRolling(true);

    // Simulate roll animation
    setTimeout(() => {
      const newState = rollDie(state);
      setState(newState);
      setIsRolling(false);

      if (isTrainingMode) {
        runMoveAnalysis(newState);
      }
    }, 500);
  }, [state, options.mode, isTrainingMode, runMoveAnalysis]);

  const placeDie = useCallback(
    (column: ColumnIndex) => {
      if (state.phase !== "placing") return;

      const legalMoves = getLegalMoves(state);
      if (!legalMoves || !legalMoves.columns.includes(column)) return;

      const result = applyMove(state, column);
      if (!result) return;

      setState(result.newState);
      setMoveAnalysis(null);

      if (result.newState.phase === "ended" && result.newState.winner) {
        options.onGameEnd?.(result.newState.winner);
      } else {
        // Trigger AI turn if applicable
        handleAITurn(result.newState);
      }
    },
    [state, options, handleAITurn],
  );

  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    const newState = createInitialState();
    setState(newState);
    setMoveAnalysis(null);
    setIsRolling(false);
  }, []);

  const setDifficulty = useCallback((level: DifficultyLevel) => {
    setDifficultyState(level);
  }, []);

  const toggleTrainingMode = useCallback(() => {
    setIsTrainingMode((prev) => {
      const newValue = !prev;
      if (
        newValue &&
        state.phase === "placing" &&
        state.currentPlayer === "player1"
      ) {
        runMoveAnalysis(state);
      } else {
        setMoveAnalysis(null);
      }
      return newValue;
    });
  }, [state, runMoveAnalysis]);

  return {
    state,
    isRolling,
    moveAnalysis,
    roll,
    placeDie,
    resetGame,
    setDifficulty,
    toggleTrainingMode,
    isTrainingMode,
    difficulty,
  };
}
