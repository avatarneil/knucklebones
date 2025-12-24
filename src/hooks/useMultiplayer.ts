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
  createRoom: (playerName: string, isPublic?: boolean) => Promise<string>;
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
  const [roomId, setRoomId] = useState<string | null>(undefined);
  const [role, setRole] = useState<Player | null>(undefined);
  const [gameState, setGameState] = useState<GameState | null>(undefined);
  const [player1Name, setPlayer1Name] = useState<string | null>(undefined);
  const [player2Name, setPlayer2Name] = useState<string | null>(undefined);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [error, setError] = useState<string | null>(undefined);

  const playerTokenRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get stored player token
  const getPlayerToken = useCallback(() => {
    if (playerTokenRef.current) {
      return playerTokenRef.current;
    }
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
    return;
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

    if (!currentRoomId) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${currentRoomId}/state`, {
        headers: token ? { "x-player-token": token } : {},
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Room no longer exists
          setRoomId(undefined);
          setStoredRoomId(undefined);
          setPlayerToken(undefined);
          setGameState(undefined);
          setError("Room no longer exists");
          return;
        }
        throw new Error("Failed to fetch room state");
      }

      const data = (await response.json()) as RoomState & { success: boolean };

      if (data.success) {
        setGameState(data.state);
        setPlayer1Name(data.player1?.name ?? undefined);
        setPlayer2Name(data.player2?.name ?? undefined);
        setRoomId(data.roomId);
        setRole(data.role);
        setIsMyTurn(data.isMyTurn);
        setIsWaitingForOpponent(data.isWaitingForOpponent);
        setOpponentDisconnected(data.opponentDisconnected);

        // Check if opponent requested rematch
        const opponent = data.role === "player1" ? "player2" : "player1";
        setRematchRequested(data.rematchRequested === opponent);

        setError(undefined);
      }
    } catch (error) {
      console.error("Error polling room state:", error);
      // Don't set error on transient network issues
    }
  }, [roomId, getPlayerToken, getStoredRoomId, setStoredRoomId, setPlayerToken]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      return;
    }

    // Initial poll
    pollRoomState();

    // Set up interval
    pollingRef.current = setInterval(pollRoomState, POLL_INTERVAL);
  }, [pollRoomState]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = undefined;
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
    async (playerName: string, isPublic = false): Promise<string> => {
      try {
        const response = await fetch("/api/rooms/create", {
          body: JSON.stringify({ playerName, isPublic }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
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
      } catch (error) {
        console.error("Error creating room:", error);
        throw error;
      }
    },
    [setPlayerToken, setStoredRoomId, startPolling]
  );

  // Join room
  const joinRoom = useCallback(
    async (roomIdToJoin: string, playerName: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/rooms/join", {
          body: JSON.stringify({ roomId: roomIdToJoin, playerName }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
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
        setError(undefined);

        // Start polling
        startPolling();

        return true;
      } catch (error) {
        console.error("Error joining room:", error);
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
          headers: { "x-player-token": token },
          method: "POST",
        });
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    }

    stopPolling();
    setPlayerToken(undefined);
    setStoredRoomId(undefined);
    setRoomId(undefined);
    setRole(undefined);
    setGameState(undefined);
    setPlayer1Name(undefined);
    setPlayer2Name(undefined);
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
      return;
    }

    try {
      const response = await fetch("/api/game/roll", {
        headers: { "x-player-token": token },
        method: "POST",
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to roll dice");
        return;
      }

      // Poll immediately to get updated state
      await pollRoomState();

      return data.dieValue;
    } catch (error) {
      console.error("Error rolling dice:", error);
      setError("Failed to roll dice");
      return;
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
          body: JSON.stringify({ column }),
          headers: {
            "Content-Type": "application/json",
            "x-player-token": token,
          },
          method: "POST",
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to place die");
          return false;
        }

        // Poll immediately to get updated state
        await pollRoomState();

        return true;
      } catch (error) {
        console.error("Error placing die:", error);
        setError("Failed to place die");
        return false;
      }
    },
    [getPlayerToken, pollRoomState]
  );

  // Request rematch
  const requestRematch = useCallback(async () => {
    const token = getPlayerToken();

    if (!token) {
      return;
    }

    try {
      await fetch("/api/game/rematch", {
        headers: { "x-player-token": token },
        method: "POST",
      });

      // Poll immediately to get updated state
      await pollRoomState();
    } catch (error) {
      console.error("Error requesting rematch:", error);
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
  useEffect(
    () => () => {
      stopPolling();
    },
    [stopPolling]
  );

  return {
    acceptRematch,
    connect,
    createRoom,
    disconnect,
    error,
    gameState,
    isConnected,
    isMyTurn,
    isWaitingForOpponent,
    joinRoom,
    leaveRoom,
    opponentDisconnected,
    placeDie,
    player1Name,
    player2Name,
    rematchRequested,
    requestRematch,
    role,
    rollDice,
    roomId,
  };
}
