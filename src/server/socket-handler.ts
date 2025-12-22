/**
 * Socket.io Game Room Handler
 *
 * Manages multiplayer game rooms and state synchronization.
 */

import type { Server, Socket } from "socket.io";
import {
  applyMove,
  createInitialState,
  getLegalMoves,
  rollSpecificDie,
} from "@/engine";
import type { ColumnIndex, DieValue, GameState, Player } from "@/engine/types";

// Room data structure
interface GameRoom {
  id: string;
  player1?: {
    id: string;
    name: string;
  };
  player2?: {
    id: string;
    name: string;
  };
  state: GameState;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory room storage
const rooms = new Map<string, GameRoom>();

// Player to room mapping
const playerRooms = new Map<string, string>();

/**
 * Generate a random room code
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get player role in room
 */
function getPlayerRole(room: GameRoom, socketId: string): Player | null {
  if (room.player1?.id === socketId) return "player1";
  if (room.player2?.id === socketId) return "player2";
  return null;
}

/**
 * Emit room state to all players
 */
function emitRoomState(io: Server, room: GameRoom) {
  io.to(room.id).emit("game-state", {
    state: room.state,
    player1: room.player1 ? { name: room.player1.name } : null,
    player2: room.player2 ? { name: room.player2.name } : null,
    roomId: room.id,
  });
}

/**
 * Clean up old rooms (call periodically)
 */
function cleanupOldRooms() {
  const now = new Date();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  for (const [id, room] of rooms) {
    if (now.getTime() - room.lastActivity.getTime() > maxAge) {
      rooms.delete(id);
    }
  }
}

/**
 * Initialize socket handlers
 */
export function initializeSocketHandlers(io: Server) {
  // Cleanup old rooms every 30 minutes
  setInterval(cleanupOldRooms, 30 * 60 * 1000);

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create a new room
    socket.on("create-room", (data: { playerName: string }, callback) => {
      const roomId = generateRoomCode();
      const room: GameRoom = {
        id: roomId,
        player1: {
          id: socket.id,
          name: data.playerName || "Player 1",
        },
        state: createInitialState(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      callback({
        success: true,
        roomId,
        role: "player1",
      });

      emitRoomState(io, room);
    });

    // Join an existing room
    socket.on(
      "join-room",
      (data: { roomId: string; playerName: string }, callback) => {
        const room = rooms.get(data.roomId.toUpperCase());

        if (!room) {
          callback({ success: false, error: "Room not found" });
          return;
        }

        if (room.player2) {
          callback({ success: false, error: "Room is full" });
          return;
        }

        room.player2 = {
          id: socket.id,
          name: data.playerName || "Player 2",
        };
        room.lastActivity = new Date();

        playerRooms.set(socket.id, room.id);
        socket.join(room.id);

        callback({
          success: true,
          roomId: room.id,
          role: "player2",
        });

        // Notify both players
        emitRoomState(io, room);
        io.to(room.id).emit("player-joined", {
          playerName: data.playerName,
          role: "player2",
        });
      },
    );

    // Roll dice
    socket.on("roll-dice", (callback) => {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) {
        callback({ success: false, error: "Not in a room" });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }

      const role = getPlayerRole(room, socket.id);
      if (!role) {
        callback({ success: false, error: "Not a player in this room" });
        return;
      }

      if (room.state.currentPlayer !== role) {
        callback({ success: false, error: "Not your turn" });
        return;
      }

      if (room.state.phase !== "rolling") {
        callback({ success: false, error: "Cannot roll now" });
        return;
      }

      // Roll the die
      const dieValue = (Math.floor(Math.random() * 6) + 1) as DieValue;
      room.state = rollSpecificDie(room.state, dieValue);
      room.lastActivity = new Date();

      callback({ success: true, dieValue });
      emitRoomState(io, room);
    });

    // Place die
    socket.on("place-die", (data: { column: ColumnIndex }, callback) => {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) {
        callback({ success: false, error: "Not in a room" });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }

      const role = getPlayerRole(room, socket.id);
      if (!role) {
        callback({ success: false, error: "Not a player in this room" });
        return;
      }

      if (room.state.currentPlayer !== role) {
        callback({ success: false, error: "Not your turn" });
        return;
      }

      if (room.state.phase !== "placing") {
        callback({ success: false, error: "Cannot place now" });
        return;
      }

      // Validate column
      const legalMoves = getLegalMoves(room.state);
      if (!legalMoves || !legalMoves.columns.includes(data.column)) {
        callback({ success: false, error: "Invalid column" });
        return;
      }

      // Apply the move
      const result = applyMove(room.state, data.column);
      if (!result) {
        callback({ success: false, error: "Move failed" });
        return;
      }

      room.state = result.newState;
      room.lastActivity = new Date();

      callback({ success: true });
      emitRoomState(io, room);

      // Notify about removed dice if any
      if (result.removedDice) {
        io.to(room.id).emit("dice-removed", {
          column: result.removedDice.column,
          count: result.removedDice.count,
          value: result.removedDice.value,
        });
      }

      // Check for game end
      if (room.state.phase === "ended") {
        io.to(room.id).emit("game-over", {
          winner: room.state.winner,
        });
      }
    });

    // Request rematch
    socket.on("request-rematch", () => {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const role = getPlayerRole(room, socket.id);
      if (!role) return;

      // Notify opponent
      socket.to(roomId).emit("rematch-requested", { from: role });
    });

    // Accept rematch
    socket.on("accept-rematch", () => {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      // Reset game state
      room.state = createInitialState();
      room.lastActivity = new Date();

      io.to(roomId).emit("rematch-started");
      emitRoomState(io, room);
    });

    // Leave room
    socket.on("leave-room", () => {
      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const role = getPlayerRole(room, socket.id);
      if (role === "player1") {
        room.player1 = undefined;
      } else if (role === "player2") {
        room.player2 = undefined;
      }

      playerRooms.delete(socket.id);
      socket.leave(roomId);

      // Notify remaining player
      io.to(roomId).emit("player-left", { role });

      // Delete room if empty
      if (!room.player1 && !room.player2) {
        rooms.delete(roomId);
      }
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      const roomId = playerRooms.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const role = getPlayerRole(room, socket.id);
      if (role === "player1") {
        room.player1 = undefined;
      } else if (role === "player2") {
        room.player2 = undefined;
      }

      playerRooms.delete(socket.id);

      // Notify remaining player
      io.to(roomId).emit("player-disconnected", { role });

      // Delete room if empty
      if (!room.player1 && !room.player2) {
        rooms.delete(roomId);
      }
    });
  });
}
