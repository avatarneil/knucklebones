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
        { success: false, error: "Room ID and state required" },
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

    if (room.gameType !== "ai") {
      return NextResponse.json(
        { success: false, error: "Not an AI room" },
        { status: 400 },
      );
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
      { success: false, error: "Failed to update AI room" },
      { status: 500 },
    );
  }
}
