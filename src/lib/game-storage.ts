/**
 * Game Storage Service
 *
 * Provides device-local persistence for game sessions and history.
 * Abstracted to allow future migration to server-side storage.
 */

import type { DifficultyLevel, GameState, Player } from "@/engine/types";

// ============================================================================
// Types
// ============================================================================

/** Metadata for an in-progress game session */
export interface GameSession {
  /** Unique session identifier */
  id: string;
  /** Current game state */
  state: GameState;
  /** Game mode */
  mode: "ai" | "pvp";
  /** AI difficulty (if mode is "ai") */
  difficulty: DifficultyLevel;
  /** Whether training mode is enabled */
  trainingMode: boolean;
  /** When the game was started */
  startedAt: number;
  /** Last activity timestamp */
  lastPlayedAt: number;
}

/** A completed game entry in history */
export interface GameHistoryEntry {
  /** Session ID from the original game */
  id: string;
  /** Who won */
  winner: Player | "draw";
  /** Final scores */
  finalScore: {
    player1: number;
    player2: number;
  };
  /** Game mode */
  mode: "ai" | "pvp";
  /** AI difficulty (if mode is "ai") */
  difficulty: DifficultyLevel;
  /** Whether training mode was enabled */
  trainingMode: boolean;
  /** When the game was started */
  startedAt: number;
  /** When the game ended */
  endedAt: number;
  /** Total number of turns */
  turnCount: number;
}

/** Storage adapter interface for future extensibility */
export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

// ============================================================================
// LocalStorage Adapter
// ============================================================================

const STORAGE_PREFIX = "knucklebones:";

class LocalStorageAdapter implements StorageAdapter {
  private getFullKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  get<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const item = localStorage.getItem(this.getFullKey(key));
      return item ? (JSON.parse(item) as T) : undefined;
    } catch {
      return;
    }
  }

  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      localStorage.setItem(this.getFullKey(key), JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  remove(key: string): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      localStorage.removeItem(this.getFullKey(key));
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================================
// Game Storage Service
// ============================================================================

const SESSION_KEY = "current-session";
const HISTORY_KEY = "game-history";
const MAX_HISTORY_ENTRIES = 50;

class GameStorageServiceImpl {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  // --------------------------------------------------------------------------
  // Session Management (in-progress games)
  // --------------------------------------------------------------------------

  /** Save the current game session */
  saveSession(session: GameSession): void {
    this.adapter.set(SESSION_KEY, {
      ...session,
      lastPlayedAt: Date.now(),
    });
  }

  /** Load the saved game session (if any) */
  loadSession(): GameSession | null {
    return this.adapter.get<GameSession>(SESSION_KEY);
  }

  /** Clear the saved session */
  clearSession(): void {
    this.adapter.remove(SESSION_KEY);
  }

  /** Check if there's a saved session */
  hasSession(): boolean {
    return this.loadSession() !== null;
  }

  // --------------------------------------------------------------------------
  // History Management (completed games)
  // --------------------------------------------------------------------------

  /** Add a completed game to history */
  addToHistory(entry: GameHistoryEntry): void {
    const history = this.getHistory();
    // Add to front (most recent first)
    history.unshift(entry);
    // Limit history size
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.pop();
    }
    this.adapter.set(HISTORY_KEY, history);
  }

  /** Get all game history entries */
  getHistory(): GameHistoryEntry[] {
    return this.adapter.get<GameHistoryEntry[]>(HISTORY_KEY) ?? [];
  }

  /** Clear all history */
  clearHistory(): void {
    this.adapter.remove(HISTORY_KEY);
  }

  /** Get aggregated stats from history */
  getStats(): {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } {
    const history = this.getHistory();
    const aiGames = history.filter((h) => h.mode === "ai");

    const wins = aiGames.filter((h) => h.winner === "player1").length;
    const losses = aiGames.filter((h) => h.winner === "player2").length;
    const draws = aiGames.filter((h) => h.winner === "draw").length;

    return {
      draws,
      losses,
      totalGames: aiGames.length,
      winRate: aiGames.length > 0 ? wins / aiGames.length : 0,
      wins,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Generate a unique session ID */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const gameStorage = new GameStorageServiceImpl(new LocalStorageAdapter());
