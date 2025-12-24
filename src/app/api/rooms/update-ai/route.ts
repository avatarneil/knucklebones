/**
 * POST /api/rooms/update-ai
 *
 * Updates an AI match room state.
 */

import { NextResponse } from "next/server";
import type { GameState } from "@/engine/types";
import { getRoom, setRoom } from "@/lib/kv";

interface UpdateAIRoomRequest {
  roomId: string;
  state: GameState;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateAIRoomRequest;
    const { roomId, state } = body;

    if (!roomId || !state) {
      return NextResponse.json(
        { error: "Room ID and state required", success: false },
        { status: 400 }
      );
    }

    // Get the room
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found", success: false }, { status: 404 });
    }

    if (room.gameType !== "ai") {
      return NextResponse.json({ error: "Not an AI room", success: false }, { status: 400 });
    }

    // Update state
    room.state = state;
    room.lastActivity = Date.now();

    // Save room
    await setRoom(room);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error updating AI room:", error);
    return NextResponse.json(
      { error: "Failed to update AI room", success: false },
      { status: 500 }
    );
  }
}
