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
      return NextResponse.json(
        { success: false, error: "Player token required" },
        { status: 401 },
      );
    }

    // Get player session
    const session = await getPlayerSession(playerToken);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not in a room" },
        { status: 400 },
      );
    }

    // Get the room
    const room = await getRoom(session.roomId);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 },
      );
    }

    // Verify player role
    const role = getPlayerRole(room, playerToken);

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Not a player in this room" },
        { status: 403 },
      );
    }

    // Check if it's this player's turn
    if (room.state.currentPlayer !== role) {
      return NextResponse.json(
        { success: false, error: "Not your turn" },
        { status: 400 },
      );
    }

    // Check if we're in rolling phase
    if (room.state.phase !== "rolling") {
      return NextResponse.json(
        { success: false, error: "Cannot roll now" },
        { status: 400 },
      );
    }

    // Roll the die
    const dieValue = (Math.floor(Math.random() * 6) + 1) as DieValue;
    room.state = rollSpecificDie(room.state, dieValue);

    // Save room
    await setRoom(room);

    return NextResponse.json({
      success: true,
      dieValue,
    });
  } catch (error) {
    console.error("Error rolling dice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to roll dice" },
      { status: 500 },
    );
  }
}
