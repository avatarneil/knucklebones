/**
 * GET /api/rooms/[id]/state
 *
 * Returns the current state of a room (polled by clients).
 */

import { NextResponse } from "next/server";
import {
  getPlayerRole,
  getPlayerSession,
  getPublicRoomState,
  getRoom,
} from "@/lib/kv";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // Get player token from header
    const playerToken = request.headers.get("x-player-token");

    // Get the room
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    // Get public state
    const publicState = getPublicRoomState(room);

    // If player token provided, include their role
    let role = null;
    let isMyTurn = false;

    if (playerToken) {
      role = getPlayerRole(room, playerToken);
      isMyTurn = room.state.currentPlayer === role;
    }

    // Check if opponent disconnected (left the room)
    let opponentDisconnected = false;
    if (role === "player1" && room.player2 === null && room.state.turnNumber > 1) {
      opponentDisconnected = true;
    } else if (role === "player2" && room.player1 === null) {
      opponentDisconnected = true;
    }

    return NextResponse.json({
      success: true,
      ...publicState,
      role,
      isMyTurn,
      opponentDisconnected,
      isWaitingForOpponent: room.player1 === null || room.player2 === null,
    });
  } catch (error) {
    console.error("Error getting room state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get room state" },
      { status: 500 }
    );
  }
}

