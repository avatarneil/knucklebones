/**
 * POST /api/game/rematch
 *
 * Requests or accepts a rematch.
 */

import { NextResponse } from "next/server";
import { createInitialState } from "@/engine";
import { getPlayerRole, getPlayerSession, getRoom, setRoom } from "@/lib/kv";

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

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    // Verify player role
    const role = getPlayerRole(room, playerToken);

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Not a player in this room" },
        { status: 403 }
      );
    }

    // Check if opponent already requested rematch
    const opponent = role === "player1" ? "player2" : "player1";

    if (room.rematchRequested === opponent) {
      // Both players want rematch - start new game
      room.state = createInitialState();
      room.rematchRequested = null;

      await setRoom(room);

      return NextResponse.json({
        success: true,
        rematchStarted: true,
      });
    }

    // Request rematch
    room.rematchRequested = role;
    await setRoom(room);

    return NextResponse.json({
      success: true,
      rematchRequested: true,
    });
  } catch (error) {
    console.error("Error requesting rematch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to request rematch" },
      { status: 500 }
    );
  }
}

