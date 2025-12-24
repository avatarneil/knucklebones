"use client";

import {
  ArrowLeft,
  Eye,
  Heart,
  Loader2,
  LogOut,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GameBoard } from "@/components/game";
import { InstallPrompt } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import type { GameState } from "@/engine/types";
import { useOnlineStatus } from "@/hooks/usePWA";

interface RoomState {
  roomId: string;
  state: GameState;
  player1: { name: string } | null;
  player2: { name: string } | null;
  gameType: "multiplayer" | "ai";
  watcherCount: number;
}

export default function WatchRoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [watcherToken, setWatcherToken] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Get or create watcher token
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`watcher_token_${roomId}`);
      if (stored) {
        setWatcherToken(stored);
      } else {
        const token = `watcher_${Date.now()}_${Math.random()}`;
        sessionStorage.setItem(`watcher_token_${roomId}`, token);
        setWatcherToken(token);
      }
    }
  }, [roomId]);

  const fetchRoomState = async () => {
    if (!isOnline || !roomId) {
      setError("Requires internet connection");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/rooms/${roomId}/state`);
      const data = await response.json();

      if (data.success) {
        setRoomState({
          roomId: data.roomId,
          state: data.state,
          player1: data.player1,
          player2: data.player2,
          gameType: data.gameType,
          watcherCount: data.watcherCount ?? 0,
        });

        // Check if we're following (would need to be stored in room or checked separately)
        // For now, we'll check localStorage
        if (typeof window !== "undefined") {
          const following = localStorage.getItem(`following_${roomId}`);
          setIsFollowing(following === "true");
        }
      } else {
        setError(data.error || "Room not found");
      }
    } catch (err) {
      console.error("Error fetching room state:", err);
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!watcherToken || !roomId) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isFollowing ? "unfollow" : "follow",
          watcherToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `following_${roomId}`,
            (!isFollowing).toString(),
          );
        }
      }
    } catch (err) {
      console.error("Error following room:", err);
    }
  };

  useEffect(() => {
    fetchRoomState();
    // Poll every second for updates
    const interval = setInterval(fetchRoomState, 1000);
    return () => clearInterval(interval);
  }, [roomId, isOnline]);

  // Check for new room if following (when game ends)
  useEffect(() => {
    if (!isFollowing || !roomState || roomState.state.phase !== "ended") return;

    // When game ends and we're following, check for a new room after a delay
    // In a full implementation, you'd poll for new rooms from the same player
    const checkForNewRoom = setTimeout(() => {
      // This would check for a new room - for now, we'll just show a message
      // In production, you'd query for rooms with the same player1 name and newer timestamp
    }, 3000);

    return () => clearTimeout(checkForNewRoom);
  }, [isFollowing, roomState]);

  if (loading) {
    return (
      <main className="h-[100dvh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </main>
    );
  }

  if (error || !roomState) {
    return (
      <main className="h-[100dvh] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error || "Room not found"}</p>
          <Link href="/watch">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Watch List
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <InstallPrompt />
      {/* Header */}
      <header className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
        <Link href="/watch">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Back</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant={isFollowing ? "default" : "outline"}
            size="sm"
            onClick={handleFollow}
            className="flex items-center gap-1"
          >
            <Heart className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">
              {isFollowing ? "Following" : "Follow"}
            </span>
          </Button>
          <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{roomState.watcherCount} watching</span>
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Room: </span>
            <span className="font-mono text-accent">{roomState.roomId}</span>
          </div>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </header>

      {/* Turn indicator */}
      <div className="text-center mb-1 sm:mb-2 flex-shrink-0">
        <span className="text-sm sm:text-lg font-medium text-muted-foreground">
          {roomState.state.phase === "ended"
            ? "Game Over"
            : roomState.state.phase === "rolling"
              ? "Rolling dice..."
              : "Placing die..."}
        </span>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex flex-col min-h-0">
        <GameBoard
          state={roomState.state}
          isRolling={roomState.state.phase === "rolling"}
          onRoll={() => {}} // Watchers can't interact
          onColumnClick={() => {}} // Watchers can't interact
          player1Name={roomState.player1?.name ?? "Player 1"}
          player2Name={roomState.player2?.name ?? "Player 2"}
          isPlayer1Human={roomState.gameType === "multiplayer"}
          isPlayer2Human={
            roomState.gameType === "multiplayer" && roomState.player2 !== null
          }
        />
      </div>
    </main>
  );
}
