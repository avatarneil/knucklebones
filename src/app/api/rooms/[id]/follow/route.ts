/**
 * POST /api/rooms/[id]/follow
 *
 * Follows a player/match to automatically watch their next game.
 */

import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/kv";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const { action } = body; // "follow" or "unfollow"
    const watcherToken = body.watcherToken || `watcher_${Date.now()}_${Math.random()}`;

    // Get the room
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found", success: false }, { status: 404 });
    }

    if (!room.isPublic) {
      return NextResponse.json({ error: "Room is not public", success: false }, { status: 400 });
    }

    // Initialize arrays if needed
    if (!room.watchers) {
      room.watchers = [];
    }
    if (!room.followedBy) {
      room.followedBy = [];
    }

    if (action === "follow") {
      // Add to followers if not already following
      if (!room.followedBy.includes(watcherToken)) {
        room.followedBy.push(watcherToken);
      }
      // Add to watchers if not already watching
      if (!room.watchers.includes(watcherToken)) {
        room.watchers.push(watcherToken);
      }
    } else if (action === "unfollow") {
      // Remove from followers
      room.followedBy = room.followedBy.filter((t) => t !== watcherToken);
    }

    // Save room
    await setRoom(room);

    return NextResponse.json({
      followerCount: room.followedBy.length,
      success: true,
      watcherToken,
    });
  } catch (error) {
    console.error("Error following room:", error);
    return NextResponse.json({ error: "Failed to follow room", success: false }, { status: 500 });
  }
}
