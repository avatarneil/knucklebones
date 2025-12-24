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
      return NextResponse.json(
        { success: false, error: "Invalid column" },
        { status: 400 },
      );
    }

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

    // Check if we're in placing phase
    if (room.state.phase !== "placing") {
      return NextResponse.json(
        { success: false, error: "Cannot place now" },
        { status: 400 },
      );
    }

    // Validate column is legal
    const legalMoves = getLegalMoves(room.state);
    if (!legalMoves || !legalMoves.columns.includes(column)) {
      return NextResponse.json(
        { success: false, error: "Invalid column" },
        { status: 400 },
      );
    }

    // Apply the move
    const result = applyMove(room.state, column);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Move failed" },
        { status: 400 },
      );
    }

    room.state = result.newState;

    // Save room
    await setRoom(room);

    return NextResponse.json({
      success: true,
      removedDice: result.removedDice,
      gameEnded: room.state.phase === "ended",
      winner: room.state.winner,
    });
  } catch (error) {
    console.error("Error placing die:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place die" },
      { status: 500 },
    );
  }
}
