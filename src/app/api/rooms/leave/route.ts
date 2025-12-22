/**
 * POST /api/rooms/leave
 *
 * Leaves the current room.
 */

import { NextResponse } from "next/server";
import {
  deletePlayerSession,
  deleteRoom,
  getPlayerRole,
  getPlayerSession,
  getRoom,
  setRoom,
} from "@/lib/kv";

export async function POST(request: Request) {
  try {
    // Get player token from header
    const playerToken = request.headers.get("x-player-token");

    if (!playerToken) {
      return NextResponse.json(
        { success: false, error: "Player token required" },
        { status: 401 }
      );
    }

    // Get player session
    const session = await getPlayerSession(playerToken);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not in a room" },
        { status: 400 }
      );
    }

    // Get the room
    const room = await getRoom(session.roomId);

    if (room) {
      const role = getPlayerRole(room, playerToken);

      // Remove player from room
      if (role === "player1") {
        room.player1 = null;
      } else if (role === "player2") {
        room.player2 = null;
      }

      // Delete room if empty, otherwise save
      if (!room.player1 && !room.player2) {
        await deleteRoom(room.id);
      } else {
        await setRoom(room);
      }
    }

    // Delete player session
    await deletePlayerSession(playerToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave room" },
      { status: 500 }
    );
  }
}

