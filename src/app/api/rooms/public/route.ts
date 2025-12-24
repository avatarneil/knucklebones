/**
 * GET /api/rooms/public
 *
 * Returns a list of all public rooms that can be watched.
 */

import { NextResponse } from "next/server";
import { getPublicRoomState, getPublicRooms } from "@/lib/kv";

export async function GET() {
  try {
    const rooms = await getPublicRooms();

    // Return public state for each room (without sensitive data)
    const publicRooms = rooms.map((room) => getPublicRoomState(room));

    return NextResponse.json({
      rooms: publicRooms,
      success: true,
    });
  } catch (error) {
    console.error("Error getting public rooms:", error);
    return NextResponse.json(
      { error: "Failed to get public rooms", success: false },
      { status: 500 }
    );
  }
}
