/**
 * POST /api/game/place
 *
 * Places a die in a column.
 */

import { NextResponse } from "next/server";
import { applyMove, getLegalMoves } from "@/engine";
import type { ColumnIndex } from "@/engine/types";
import { getPlayerRole, getPlayerSession, getRoom, setRoom } from "@/lib/kv";

interface PlaceRequest {
  column: ColumnIndex;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlaceRequest;
    const column = body.column;

    // Validate column
    if (column !== 0 && column !== 1 && column !== 2) {
      return NextResponse.json({ error: "Invalid column", success: false }, { status: 400 });
    }

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

    // Check if we're in placing phase
    if (room.state.phase !== "placing") {
      return NextResponse.json({ error: "Cannot place now", success: false }, { status: 400 });
    }

    // Validate column is legal
    const legalMoves = getLegalMoves(room.state);
    if (!legalMoves || !legalMoves.columns.includes(column)) {
      return NextResponse.json({ error: "Invalid column", success: false }, { status: 400 });
    }

    // Apply the move
    const result = applyMove(room.state, column);
    if (!result) {
      return NextResponse.json({ error: "Move failed", success: false }, { status: 400 });
    }

    room.state = result.newState;

    // Save room
    await setRoom(room);

    return NextResponse.json({
      gameEnded: room.state.phase === "ended",
      removedDice: result.removedDice,
      success: true,
      winner: room.state.winner,
    });
  } catch (error) {
    console.error("Error placing die:", error);
    return NextResponse.json({ error: "Failed to place die", success: false }, { status: 500 });
  }
}
