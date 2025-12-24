/**
 * POST /api/rooms/join
 *
 * Joins an existing room as player 2.
 */

import { NextResponse } from "next/server";
import {
  generatePlayerToken,
  getRoom,
  setPlayerSession,
  setRoom,
} from "@/lib/kv";

interface JoinRoomRequest {
  roomId: string;
  playerName: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JoinRoomRequest;
    const roomId = body.roomId?.toUpperCase().trim();
    const playerName = body.playerName?.trim() || "Player 2";

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room code required" },
        { status: 400 },
      );
    }

    // Get the room
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 },
      );
    }

    if (room.player2) {
      return NextResponse.json(
        { success: false, error: "Room is full" },
        { status: 400 },
      );
    }

    // Generate player token and join
    const playerToken = generatePlayerToken();

    room.player2 = {
      token: playerToken,
      name: playerName,
    };

    // Save room and player session
    await setRoom(room);
    await setPlayerSession(playerToken, { roomId, role: "player2" });

    return NextResponse.json({
      success: true,
      roomId: room.id,
      playerToken,
      role: "player2",
    });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join room" },
      { status: 500 },
    );
  }
}
