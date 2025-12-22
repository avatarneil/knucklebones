/**
 * Vercel KV Storage Helpers for Multiplayer Rooms
 *
 * Manages game room state in Vercel KV (Redis).
 * Works locally with Upstash or any Redis-compatible KV store.
 */

import { kv } from "@vercel/kv";
import type { GameState, Player } from "@/engine/types";

/** Room data structure stored in KV */
export interface GameRoom {
  id: string;
  player1: {
    token: string;
    name: string;
  } | null;
  player2: {
    token: string;
    name: string;
  } | null;
  state: GameState;
  rematchRequested: Player | null;
  createdAt: number;
  lastActivity: number;
}

/** Player session stored in KV (maps token to room) */
export interface PlayerSession {
  roomId: string;
  role: Player;
}

// Key prefixes
const ROOM_PREFIX = "room:";
const PLAYER_PREFIX = "player:";

// TTL for rooms (2 hours in seconds)
const ROOM_TTL = 2 * 60 * 60;

/**
 * Generate a random room code (6 characters)
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a player token (used for authentication)
 */
export function generatePlayerToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Get a room by ID
 */
export async function getRoom(roomId: string): Promise<GameRoom | null> {
  return kv.get<GameRoom>(`${ROOM_PREFIX}${roomId.toUpperCase()}`);
}

/**
 * Save a room (with TTL)
 */
export async function setRoom(room: GameRoom): Promise<void> {
  room.lastActivity = Date.now();
  await kv.set(`${ROOM_PREFIX}${room.id}`, room, { ex: ROOM_TTL });
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  await kv.del(`${ROOM_PREFIX}${roomId.toUpperCase()}`);
}

/**
 * Get player session by token
 */
export async function getPlayerSession(
  token: string
): Promise<PlayerSession | null> {
  return kv.get<PlayerSession>(`${PLAYER_PREFIX}${token}`);
}

/**
 * Save player session (with TTL matching room)
 */
export async function setPlayerSession(
  token: string,
  session: PlayerSession
): Promise<void> {
  await kv.set(`${PLAYER_PREFIX}${token}`, session, { ex: ROOM_TTL });
}

/**
 * Delete player session
 */
export async function deletePlayerSession(token: string): Promise<void> {
  await kv.del(`${PLAYER_PREFIX}${token}`);
}

/**
 * Get player's role in a room by their token
 */
export function getPlayerRole(room: GameRoom, token: string): Player | null {
  if (room.player1?.token === token) return "player1";
  if (room.player2?.token === token) return "player2";
  return null;
}

/**
 * Check if a room is ready to play (both players joined)
 */
export function isRoomReady(room: GameRoom): boolean {
  return room.player1 !== null && room.player2 !== null;
}

/**
 * Get public room state (without player tokens)
 */
export function getPublicRoomState(room: GameRoom) {
  return {
    roomId: room.id,
    state: room.state,
    player1: room.player1 ? { name: room.player1.name } : null,
    player2: room.player2 ? { name: room.player2.name } : null,
    rematchRequested: room.rematchRequested,
    lastActivity: room.lastActivity,
  };
}

