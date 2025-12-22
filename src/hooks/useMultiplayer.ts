"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ColumnIndex, DieValue, GameState, Player } from "@/engine/types";

interface RoomState {
  state: GameState;
  player1: { name: string } | null;
  player2: { name: string } | null;
  roomId: string;
  role: Player | null;
  isMyTurn: boolean;
  opponentDisconnected: boolean;
  isWaitingForOpponent: boolean;
  rematchRequested: Player | null;
}

interface UseMultiplayerReturn {
  // Connection
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;

  // Room
  roomId: string | null;
  role: Player | null;
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  leaveRoom: () => void;

  // Game state
  gameState: GameState | null;
  player1Name: string | null;
  player2Name: string | null;
  isWaitingForOpponent: boolean;
  isMyTurn: boolean;

  // Actions
  rollDice: () => Promise<DieValue | null>;
  placeDie: (column: ColumnIndex) => Promise<boolean>;
  requestRematch: () => void;
  acceptRematch: () => void;

  // Events
  opponentDisconnected: boolean;
  rematchRequested: boolean;
  error: string | null;
}

// Polling interval in milliseconds
const POLL_INTERVAL = 1000;

// Storage key for player token
const PLAYER_TOKEN_KEY = "knucklebones_player_token";
const ROOM_ID_KEY = "knucklebones_room_id";

export function useMultiplayer(): UseMultiplayerReturn {
  const [isConnected, setIsConnected] = useState(true); // Always "connected" with polling
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [player1Name, setPlayer1Name] = useState<string | null>(null);
  const [player2Name, setPlayer2Name] = useState<string | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerTokenRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get stored player token
  const getPlayerToken = useCallback(() => {
    if (playerTokenRef.current) return playerTokenRef.current;
    if (typeof window !== "undefined") {
      playerTokenRef.current = sessionStorage.getItem(PLAYER_TOKEN_KEY);
    }
    return playerTokenRef.current;
  }, []);

  // Set player token
  const setPlayerToken = useCallback((token: string | null) => {
    playerTokenRef.current = token;
    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem(PLAYER_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(PLAYER_TOKEN_KEY);
      }
    }
  }, []);

  // Get stored room ID
  const getStoredRoomId = useCallback(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(ROOM_ID_KEY);
    }
    return null;
  }, []);

  // Set stored room ID
  const setStoredRoomId = useCallback((id: string | null) => {
    if (typeof window !== "undefined") {
      if (id) {
        sessionStorage.setItem(ROOM_ID_KEY, id);
      } else {
        sessionStorage.removeItem(ROOM_ID_KEY);
      }
    }
  }, []);

  // Poll for room state
  const pollRoomState = useCallback(async () => {
    const currentRoomId = roomId || getStoredRoomId();
    const token = getPlayerToken();

    if (!currentRoomId) return;

    try {
      const response = await fetch(`/api/rooms/${currentRoomId}/state`, {
        headers: token ? { "x-player-token": token } : {},
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Room no longer exists
          setRoomId(null);
          setStoredRoomId(null);
          setPlayerToken(null);
          setGameState(null);
          setError("Room no longer exists");
          return;
        }
        throw new Error("Failed to fetch room state");
      }

      const data = (await response.json()) as RoomState & { success: boolean };

      if (data.success) {
        setGameState(data.state);
        setPlayer1Name(data.player1?.name ?? null);
        setPlayer2Name(data.player2?.name ?? null);
        setRoomId(data.roomId);
        setRole(data.role);
        setIsMyTurn(data.isMyTurn);
        setIsWaitingForOpponent(data.isWaitingForOpponent);
        setOpponentDisconnected(data.opponentDisconnected);
        
        // Check if opponent requested rematch
        const opponent = data.role === "player1" ? "player2" : "player1";
        setRematchRequested(data.rematchRequested === opponent);
        
        setError(null);
      }
    } catch (err) {
      console.error("Error polling room state:", err);
      // Don't set error on transient network issues
    }
  }, [roomId, getPlayerToken, getStoredRoomId, setStoredRoomId, setPlayerToken]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    // Initial poll
    pollRoomState();

    // Set up interval
    pollingRef.current = setInterval(pollRoomState, POLL_INTERVAL);
  }, [pollRoomState]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Connect (start polling if in a room)
  const connect = useCallback(() => {
    const storedRoomId = getStoredRoomId();
    if (storedRoomId) {
      setRoomId(storedRoomId);
      startPolling();
    }
    setIsConnected(true);
  }, [getStoredRoomId, startPolling]);

  // Disconnect (stop polling)
  const disconnect = useCallback(() => {
    stopPolling();
    setIsConnected(false);
  }, [stopPolling]);

  // Create room
  const createRoom = useCallback(
    async (playerName: string): Promise<string> => {
      try {
        const response = await fetch("/api/rooms/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerName }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to create room");
        }

        setPlayerToken(data.playerToken);
        setStoredRoomId(data.roomId);
        setRoomId(data.roomId);
        setRole(data.role);
        setIsWaitingForOpponent(true);

        // Start polling
        startPolling();

        return data.roomId;
      } catch (err) {
        console.error("Error creating room:", err);
        throw err;
      }
    },
    [setPlayerToken, setStoredRoomId, startPolling]
  );

  // Join room
  const joinRoom = useCallback(
    async (roomIdToJoin: string, playerName: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: roomIdToJoin, playerName }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to join room");
          return false;
        }

        setPlayerToken(data.playerToken);
        setStoredRoomId(data.roomId);
        setRoomId(data.roomId);
        setRole(data.role);
        setError(null);

        // Start polling
        startPolling();

        return true;
      } catch (err) {
        console.error("Error joining room:", err);
        setError("Failed to join room");
        return false;
      }
    },
    [setPlayerToken, setStoredRoomId, startPolling]
  );

  // Leave room
  const leaveRoom = useCallback(async () => {
    const token = getPlayerToken();

    if (token) {
      try {
        await fetch("/api/rooms/leave", {
          method: "POST",
          headers: { "x-player-token": token },
        });
      } catch (err) {
        console.error("Error leaving room:", err);
      }
    }

    stopPolling();
    setPlayerToken(null);
    setStoredRoomId(null);
    setRoomId(null);
    setRole(null);
    setGameState(null);
    setPlayer1Name(null);
    setPlayer2Name(null);
    setIsWaitingForOpponent(false);
    setIsMyTurn(false);
    setOpponentDisconnected(false);
    setRematchRequested(false);
  }, [getPlayerToken, stopPolling, setPlayerToken, setStoredRoomId]);

  // Roll dice
  const rollDice = useCallback(async (): Promise<DieValue | null> => {
    const token = getPlayerToken();

    if (!token) {
      setError("Not connected");
      return null;
    }

    try {
      const response = await fetch("/api/game/roll", {
        method: "POST",
        headers: { "x-player-token": token },
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to roll dice");
        return null;
      }

      // Poll immediately to get updated state
      await pollRoomState();

      return data.dieValue;
    } catch (err) {
      console.error("Error rolling dice:", err);
      setError("Failed to roll dice");
      return null;
    }
  }, [getPlayerToken, pollRoomState]);

  // Place die
  const placeDie = useCallback(
    async (column: ColumnIndex): Promise<boolean> => {
      const token = getPlayerToken();

      if (!token) {
        setError("Not connected");
        return false;
      }

      try {
        const response = await fetch("/api/game/place", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-player-token": token,
          },
          body: JSON.stringify({ column }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to place die");
          return false;
        }

        // Poll immediately to get updated state
        await pollRoomState();

        return true;
      } catch (err) {
        console.error("Error placing die:", err);
        setError("Failed to place die");
        return false;
      }
    },
    [getPlayerToken, pollRoomState]
  );

  // Request rematch
  const requestRematch = useCallback(async () => {
    const token = getPlayerToken();

    if (!token) return;

    try {
      await fetch("/api/game/rematch", {
        method: "POST",
        headers: { "x-player-token": token },
      });

      // Poll immediately to get updated state
      await pollRoomState();
    } catch (err) {
      console.error("Error requesting rematch:", err);
    }
  }, [getPlayerToken, pollRoomState]);

  // Accept rematch (same as request - server handles the logic)
  const acceptRematch = useCallback(async () => {
    await requestRematch();
    setRematchRequested(false);
  }, [requestRematch]);

  // Start polling when roomId changes
  useEffect(() => {
    if (roomId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [roomId, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isConnected,
    connect,
    disconnect,
    roomId,
    role,
    createRoom,
    joinRoom,
    leaveRoom,
    gameState,
    player1Name,
    player2Name,
    isWaitingForOpponent,
    isMyTurn,
    rollDice,
    placeDie,
    requestRematch,
    acceptRematch,
    opponentDisconnected,
    rematchRequested,
    error,
  };
}
