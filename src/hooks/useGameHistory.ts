"use client";

import { useCallback, useEffect, useState } from "react";
import { getScores } from "@/engine/state";
import type { DifficultyLevel, GameState, Player } from "@/engine/types";
import {
  gameStorage,
  generateSessionId,
  type GameHistoryEntry,
  type GameSession,
} from "@/lib/game-storage";

interface UseGameHistoryReturn {
  /** Whether there's a saved game that can be resumed */
  hasSavedGame: boolean;
  /** The saved session (if any) */
  savedSession: GameSession | null;
  /** Game history (completed games) */
  history: GameHistoryEntry[];
  /** Aggregated stats */
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
  /** Start a new game session */
  startSession: (options: {
    mode: "ai" | "pvp";
    difficulty: DifficultyLevel;
    trainingMode: boolean;
    initialState: GameState;
  }) => string;
  /** Save current game state to the session */
  saveGame: (sessionId: string, state: GameState) => void;
  /** Resume the saved game session */
  resumeGame: () => GameSession | null;
  /** Discard the saved game without recording */
  discardGame: () => void;
  /** Record a completed game to history and clear the session */
  recordGameEnd: (
    sessionId: string,
    state: GameState,
    winner: Player | "draw",
  ) => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Refresh state from storage */
  refresh: () => void;
}

export function useGameHistory(): UseGameHistoryReturn {
  const [savedSession, setSavedSession] = useState<GameSession | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  });

  // Load initial state from storage
  const refresh = useCallback(() => {
    setSavedSession(gameStorage.loadSession());
    setHistory(gameStorage.getHistory());
    setStats(gameStorage.getStats());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startSession = useCallback(
    (options: {
      mode: "ai" | "pvp";
      difficulty: DifficultyLevel;
      trainingMode: boolean;
      initialState: GameState;
    }): string => {
      const sessionId = generateSessionId();
      const session: GameSession = {
        id: sessionId,
        state: options.initialState,
        mode: options.mode,
        difficulty: options.difficulty,
        trainingMode: options.trainingMode,
        startedAt: Date.now(),
        lastPlayedAt: Date.now(),
      };
      gameStorage.saveSession(session);
      setSavedSession(session);
      return sessionId;
    },
    [],
  );

  const saveGame = useCallback(
    (sessionId: string, state: GameState) => {
      const current = gameStorage.loadSession();
      if (current && current.id === sessionId) {
        const updated: GameSession = {
          ...current,
          state,
          lastPlayedAt: Date.now(),
        };
        gameStorage.saveSession(updated);
        setSavedSession(updated);
      }
    },
    [],
  );

  const resumeGame = useCallback((): GameSession | null => {
    const session = gameStorage.loadSession();
    return session;
  }, []);

  const discardGame = useCallback(() => {
    gameStorage.clearSession();
    setSavedSession(null);
  }, []);

  const recordGameEnd = useCallback(
    (sessionId: string, state: GameState, winner: Player | "draw") => {
      const session = gameStorage.loadSession();
      if (!session || session.id !== sessionId) {
        // Session doesn't match, create entry from current info
        const scores = getScores(state);
        const entry: GameHistoryEntry = {
          id: sessionId,
          winner,
          finalScore: scores,
          mode: "ai",
          difficulty: "medium",
          trainingMode: false,
          startedAt: Date.now(),
          endedAt: Date.now(),
          turnCount: state.turnNumber,
        };
        gameStorage.addToHistory(entry);
      } else {
        const scores = getScores(state);
        const entry: GameHistoryEntry = {
          id: session.id,
          winner,
          finalScore: scores,
          mode: session.mode,
          difficulty: session.difficulty,
          trainingMode: session.trainingMode,
          startedAt: session.startedAt,
          endedAt: Date.now(),
          turnCount: state.turnNumber,
        };
        gameStorage.addToHistory(entry);
      }

      // Clear the session
      gameStorage.clearSession();
      setSavedSession(null);

      // Refresh history
      setHistory(gameStorage.getHistory());
      setStats(gameStorage.getStats());
    },
    [],
  );

  const clearHistory = useCallback(() => {
    gameStorage.clearHistory();
    setHistory([]);
    setStats(gameStorage.getStats());
  }, []);

  return {
    hasSavedGame: savedSession !== null && savedSession.state.phase !== "ended",
    savedSession,
    history,
    stats,
    startSession,
    saveGame,
    resumeGame,
    discardGame,
    recordGameEnd,
    clearHistory,
    refresh,
  };
}

