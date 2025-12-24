/**
 * POST /api/rooms/create-ai
 *
 * Creates a new public AI match room.
 */

import { NextResponse } from "next/server";
import { createInitialState } from "@/engine";
import { type GameRoom, generateRoomCode, setRoom } from "@/lib/kv";

interface CreateAIRoomRequest {
  playerName: string;
  difficulty: string;
  initialState?: any; // GameState
  followedBy?: string[]; // Array of watcher tokens to migrate from previous match
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateAIRoomRequest;
    const playerName = body.playerName?.trim() || "Player";
    const difficulty = body.difficulty || "medium";

    // Generate room code
    const roomId = generateRoomCode();

    // Check if there's a previous room with followers to migrate
    // For now, we'll create a fresh room. In a full implementation,
    // you'd look up the previous room and migrate followers.

    // Create the room (AI matches are always public)
    const room: GameRoom = {
      id: roomId,
      player1: {
        token: "", // No token needed for AI matches
        name: playerName,
      },
      player2: {
        token: "",
        name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} AI`,
      },
      state: body.initialState || createInitialState(),
      rematchRequested: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isPublic: true,
      gameType: "ai",
      watchers: [],
      followedBy: body.followedBy || [], // Migrate followers from previous match
    };

    // Save room
    await setRoom(room);

    return NextResponse.json({
      success: true,
      roomId,
    });
  } catch (error) {
    console.error("Error creating AI room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create AI room" },
      { status: 500 },
    );
  }
}
