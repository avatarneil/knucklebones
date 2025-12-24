/**
 * POST /api/rooms/join
 *
 * Joins an existing room as player 2.
 */

import { NextResponse } from "next/server";
import { generatePlayerToken, getRoom, setPlayerSession, setRoom } from "@/lib/kv";

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
      return NextResponse.json({ error: "Room code required", success: false }, { status: 400 });
    }

    // Get the room
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found", success: false }, { status: 404 });
    }

    if (room.player2) {
      return NextResponse.json({ error: "Room is full", success: false }, { status: 400 });
    }

    // Generate player token and join
    const playerToken = generatePlayerToken();

    room.player2 = {
      name: playerName,
      token: playerToken,
    };

    // Save room and player session
    await setRoom(room);
    await setPlayerSession(playerToken, { role: "player2", roomId });

    return NextResponse.json({
      playerToken,
      role: "player2",
      roomId: room.id,
      success: true,
    });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json({ error: "Failed to join room", success: false }, { status: 500 });
  }
}
