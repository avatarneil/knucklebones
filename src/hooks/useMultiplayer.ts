"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ColumnIndex, DieValue, GameState, Player } from "@/engine/types";

interface RoomState {
  state: GameState;
  player1: { name: string } | null;
  player2: { name: string } | null;
  roomId: string;
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

export function useMultiplayer(): UseMultiplayerReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [player1Name, setPlayer1Name] = useState<string | null>(null);
  const [player2Name, setPlayer2Name] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWaitingForOpponent =
    roomId !== null && (player1Name === null || player2Name === null);
  const isMyTurn = gameState?.currentPlayer === role && !isWaitingForOpponent;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Failed to connect to server");
    });

    socket.on("game-state", (data: RoomState) => {
      setGameState(data.state);
      setPlayer1Name(data.player1?.name ?? null);
      setPlayer2Name(data.player2?.name ?? null);
      setRoomId(data.roomId);
    });

    socket.on("player-joined", (data: { playerName: string; role: string }) => {
      console.log(`${data.playerName} joined as ${data.role}`);
    });

    socket.on("player-disconnected", (_data: { role: Player }) => {
      setOpponentDisconnected(true);
    });

    socket.on("player-left", (data: { role: Player }) => {
      if (data.role === "player1") {
        setPlayer1Name(null);
      } else {
        setPlayer2Name(null);
      }
    });

    socket.on("rematch-requested", (_data: { from: Player }) => {
      setRematchRequested(true);
    });

    socket.on("rematch-started", () => {
      setRematchRequested(false);
      setOpponentDisconnected(false);
    });

    socket.on(
      "game-over",
      (data: { winner: "player1" | "player2" | "draw" }) => {
        console.log("Game over:", data.winner);
      },
    );

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setRoomId(null);
      setRole(null);
      setGameState(null);
      setPlayer1Name(null);
      setPlayer2Name(null);
    }
  }, []);

  const createRoom = useCallback((playerName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error("Not connected"));
        return;
      }

      socketRef.current.emit(
        "create-room",
        { playerName },
        (response: {
          success: boolean;
          roomId?: string;
          role?: Player;
          error?: string;
        }) => {
          if (response.success && response.roomId) {
            setRoomId(response.roomId);
            setRole(response.role ?? null);
            resolve(response.roomId);
          } else {
            reject(new Error(response.error || "Failed to create room"));
          }
        },
      );
    });
  }, []);

  const joinRoom = useCallback(
    (roomIdToJoin: string, playerName: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error("Not connected"));
          return;
        }

        socketRef.current.emit(
          "join-room",
          { roomId: roomIdToJoin, playerName },
          (response: {
            success: boolean;
            roomId?: string;
            role?: Player;
            error?: string;
          }) => {
            if (response.success) {
              setRoomId(response.roomId ?? null);
              setRole(response.role ?? null);
              resolve(true);
            } else {
              setError(response.error || "Failed to join room");
              resolve(false);
            }
          },
        );
      });
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit("leave-room");
      setRoomId(null);
      setRole(null);
      setGameState(null);
      setPlayer1Name(null);
      setPlayer2Name(null);
      setOpponentDisconnected(false);
      setRematchRequested(false);
    }
  }, [roomId]);

  const rollDice = useCallback((): Promise<DieValue | null> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve(null);
        return;
      }

      socketRef.current.emit(
        "roll-dice",
        (response: {
          success: boolean;
          dieValue?: DieValue;
          error?: string;
        }) => {
          if (response.success && response.dieValue) {
            resolve(response.dieValue);
          } else {
            setError(response.error || "Failed to roll dice");
            resolve(null);
          }
        },
      );
    });
  }, []);

  const placeDie = useCallback((column: ColumnIndex): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve(false);
        return;
      }

      socketRef.current.emit(
        "place-die",
        { column },
        (response: { success: boolean; error?: string }) => {
          if (response.success) {
            resolve(true);
          } else {
            setError(response.error || "Failed to place die");
            resolve(false);
          }
        },
      );
    });
  }, []);

  const requestRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("request-rematch");
    }
  }, []);

  const acceptRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("accept-rematch");
      setRematchRequested(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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
