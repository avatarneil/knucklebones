/**
 * POST /api/game/roll
 *
 * Rolls the dice for the current player.
 */

import { NextResponse } from "next/server";
import { rollSpecificDie } from "@/engine";
import type { DieValue } from "@/engine/types";
import { getPlayerRole, getPlayerSession, getRoom, setRoom } from "@/lib/kv";

export async function POST(request: Request) {
  try {
    // Get player token from header
    const playerToken = request.headers.get("x-player-token");

    if (!playerToken) {
      return NextResponse.json({ error: "Player token required", success: false }, { status: 401 });
    }

    // Get player session
    const session = await getPlayerSession(playerToken);

    if (!session) {
      return NextResponse.json({ error: "Not in a room", success: false }, { status: 400 });
    }

    // Get the room
    const room = await getRoom(session.roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found", success: false }, { status: 404 });
    }

    // Verify player role
    const role = getPlayerRole(room, playerToken);

    if (!role) {
      return NextResponse.json(
        { error: "Not a player in this room", success: false },
        { status: 403 }
      );
    }

    // Check if it's this player's turn
    if (room.state.currentPlayer !== role) {
      return NextResponse.json({ error: "Not your turn", success: false }, { status: 400 });
    }

    // Check if we're in rolling phase
    if (room.state.phase !== "rolling") {
      return NextResponse.json({ error: "Cannot roll now", success: false }, { status: 400 });
    }

    // Roll the die
    const dieValue = (Math.floor(Math.random() * 6) + 1) as DieValue;
    room.state = rollSpecificDie(room.state, dieValue);

    // Save room
    await setRoom(room);

    return NextResponse.json({
      dieValue,
      success: true,
    });
  } catch (error) {
    console.error("Error rolling dice:", error);
    return NextResponse.json({ error: "Failed to roll dice", success: false }, { status: 500 });
  }
}
