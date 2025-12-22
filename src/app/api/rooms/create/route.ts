/**
 * POST /api/rooms/create
 *
 * Creates a new game room and returns the room code + player token.
 */

import { NextResponse } from "next/server";
import { createInitialState } from "@/engine";
import {
  generatePlayerToken,
  generateRoomCode,
  setPlayerSession,
  setRoom,
  type GameRoom,
} from "@/lib/kv";

interface CreateRoomRequest {
  playerName: string;
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
      id: roomId,
      player1: {
        token: playerToken,
        name: playerName,
      },
      player2: null,
      state: createInitialState(),
      rematchRequested: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Save room and player session
    await setRoom(room);
    await setPlayerSession(playerToken, { roomId, role: "player1" });

    return NextResponse.json({
      success: true,
      roomId,
      playerToken,
      role: "player1",
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create room" },
      { status: 500 }
    );
  }
}

