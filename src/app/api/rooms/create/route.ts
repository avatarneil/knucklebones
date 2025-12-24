/**
 * POST /api/rooms/create
 *
 * Creates a new game room and returns the room code + player token.
 */

import { NextResponse } from "next/server";
import { createInitialState } from "@/engine";
import { generatePlayerToken, generateRoomCode, setPlayerSession, setRoom } from "@/lib/kv";
import type { GameRoom } from "@/lib/kv";

interface CreateRoomRequest {
  playerName: string;
  isPublic?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateRoomRequest;
    const playerName = body.playerName?.trim() || "Player 1";

    // Generate room code and player token
    const roomId = generateRoomCode();
    const playerToken = generatePlayerToken();

    // Create the room
    const room: GameRoom = {
      createdAt: Date.now(),
      followedBy: [],
      gameType: "multiplayer",
      id: roomId,
      isPublic: body.isPublic ?? false,
      lastActivity: Date.now(),
      player1: {
        token: playerToken,
        name: playerName,
      },
      player2: null,
      rematchRequested: null,
      state: createInitialState(),
      watchers: [],
    };

    // Save room and player session
    await setRoom(room);
    await setPlayerSession(playerToken, { role: "player1", roomId });

    return NextResponse.json({
      playerToken,
      role: "player1",
      roomId,
      success: true,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json({ error: "Failed to create room", success: false }, { status: 500 });
  }
}
