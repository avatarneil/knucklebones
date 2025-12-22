"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  mode: "ai" | "pvp" | "training" | "ai-vs-ai";
  difficulty?: DifficultyLevel;
  player1Difficulty?: DifficultyLevel; // For AI vs AI mode
  player2Difficulty?: DifficultyLevel; // For AI vs AI mode
  trainingMode?: boolean;
  /** Initial state to resume from */
  initialState?: GameState;
  /** Callback when game ends */
  onGameEnd?: (winner: "player1" | "player2" | "draw") => void;
  /** Callback when state changes (for auto-save) */
  onStateChange?: (state: GameState) => void;
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
  const [state, setState] = useState<GameState>(
    () => options.initialState ?? createInitialState(),
  );

  // Reset state when initialState changes (for resume functionality)
  const prevInitialStateRef = useRef(options.initialState);
  useEffect(() => {
    if (options.initialState && options.initialState !== prevInitialStateRef.current) {
      setState(options.initialState);
      prevInitialStateRef.current = options.initialState;
    }
  }, [options.initialState]);
  const [isRolling, setIsRolling] = useState(false);
  const [moveAnalysis, setMoveAnalysis] = useState<MoveAnalysis[] | null>(null);
  const [isTrainingMode, setIsTrainingMode] = useState(
    options.trainingMode ?? false,
  );
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(
    options.difficulty ?? "medium",
  );

  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const isProcessingAITurn = useRef(false);
  // Store callbacks in refs to avoid infinite loops
  const onStateChangeRef = useRef(options.onStateChange);
  const onGameEndRef = useRef(options.onGameEnd);

  // Keep refs up to date
  useEffect(() => {
    onStateChangeRef.current = options.onStateChange;
    onGameEndRef.current = options.onGameEnd;
  });

  // Call onStateChange when state updates (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onStateChangeRef.current?.(state);
  }, [state]);

  const runMoveAnalysis = useCallback((gameState: GameState) => {
    // Only run analysis for human player in AI mode
    if (
      gameState.phase === "placing" &&
      gameState.currentPlayer === "player1" &&
      options.mode === "ai"
    ) {
      // Run analysis in a microtask to not block UI
      setTimeout(() => {
        const analysis = quickAnalysis(gameState, 300);
        setMoveAnalysis(analysis.moves);
      }, 0);
    } else {
      setMoveAnalysis(null);
    }
  }, [options.mode]);

  const handleAITurn = useCallback(
    (gameState: GameState) => {
      const isAIMode = options.mode === "ai" || options.mode === "ai-vs-ai";
      const isPlayer2AI = options.mode === "ai" && gameState.currentPlayer === "player2";
      const isPlayer1AI = options.mode === "ai-vs-ai" && gameState.currentPlayer === "player1";
      const isPlayer2AIVsAI = options.mode === "ai-vs-ai" && gameState.currentPlayer === "player2";

      if (!isAIMode || gameState.phase === "ended") {
        return;
      }

      if (!isPlayer2AI && !isPlayer1AI && !isPlayer2AIVsAI) {
        return;
      }

      // Prevent multiple simultaneous AI turns
      if (isProcessingAITurn.current) {
        return;
      }

      isProcessingAITurn.current = true;

      // Clear any pending AI timeout
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }

      // Determine which difficulty to use
      const currentDifficulty = 
        (isPlayer1AI && (options.player1Difficulty ?? difficulty)) || 
        ((isPlayer2AI || isPlayer2AIVsAI) && (options.player2Difficulty ?? difficulty)) ||
        difficulty;

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
            const move = getAIMove(currentState, currentDifficulty);
            if (move !== null) {
              const result = applyMove(currentState, move);
              if (result) {
                setState(result.newState);
                isProcessingAITurn.current = false;
                if (isTrainingMode) {
                  runMoveAnalysis(result.newState);
                }
                // Check for game end or continue
                if (result.newState.phase !== "ended") {
                  handleAITurn(result.newState);
                } else if (result.newState.winner) {
                  onGameEndRef.current?.(result.newState.winner);
                }
              } else {
                isProcessingAITurn.current = false;
              }
            } else {
              isProcessingAITurn.current = false;
            }
          }, 400);
        } else if (currentState.phase === "placing") {
          const move = getAIMove(currentState, currentDifficulty);
          if (move !== null) {
            const result = applyMove(currentState, move);
            if (result) {
              setState(result.newState);
              isProcessingAITurn.current = false;
              if (isTrainingMode) {
                runMoveAnalysis(result.newState);
              }
              if (result.newState.phase !== "ended") {
                handleAITurn(result.newState);
              } else if (result.newState.winner) {
                onGameEndRef.current?.(result.newState.winner);
              }
            } else {
              isProcessingAITurn.current = false;
            }
          } else {
            isProcessingAITurn.current = false;
          }
        } else {
          isProcessingAITurn.current = false;
        }
      }, 500);
    },
    [options.mode, options.player1Difficulty, options.player2Difficulty, difficulty, isTrainingMode, runMoveAnalysis],
  );

  // Trigger AI moves when it's an AI player's turn
  useEffect(() => {
    const isAIMode = options.mode === "ai" || options.mode === "ai-vs-ai";
    if (!isAIMode || state.phase === "ended" || isProcessingAITurn.current) {
      return;
    }

    const isPlayer2AI = options.mode === "ai" && state.currentPlayer === "player2";
    const isPlayer1AI = options.mode === "ai-vs-ai" && state.currentPlayer === "player1";
    const isPlayer2AIVsAI = options.mode === "ai-vs-ai" && state.currentPlayer === "player2";

    if (isPlayer2AI || isPlayer1AI || isPlayer2AIVsAI) {
      // Only trigger if we're not already rolling (to avoid double triggers)
      if (state.phase !== "rolling" || !isRolling) {
        handleAITurn(state);
      }
    }
  }, [state, options.mode, handleAITurn, isRolling]);

  const roll = useCallback(() => {
    if (state.phase !== "rolling") return;
    // Don't allow manual roll if current player is AI
    if (options.mode === "ai" && state.currentPlayer === "player2") return;
    if (options.mode === "ai-vs-ai") return; // Both players are AI

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
        onGameEndRef.current?.(result.newState.winner);
      } else {
        // Trigger AI turn if applicable (for AI mode or AI vs AI mode)
        handleAITurn(result.newState);
      }
    },
    [state, options, handleAITurn],
  );

  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    isProcessingAITurn.current = false;
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
