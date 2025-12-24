"use client";

import { ArrowLeft, Eye, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { InstallPrompt } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnlineStatus } from "@/hooks/usePWA";

interface PublicRoom {
  roomId: string;
  state: {
    phase: string;
    turnNumber: number;
    currentPlayer: string;
    player1Score: number;
    player2Score: number;
  };
  player1: { name: string } | null;
  player2: { name: string } | null;
  gameType: "multiplayer" | "ai";
  watcherCount: number;
  lastActivity: number;
}

export default function WatchPage() {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(undefined);
  const isOnline = useOnlineStatus();

  const fetchRooms = useCallback(async () => {
    if (!isOnline) {
      setError("Requires internet connection");
      setLoading(false);
      return;
    }

    try {
      setError(undefined);
      const response = await fetch("/api/rooms/public");
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError(data.error || "Failed to load rooms");
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchRooms();
    // Refresh every 5 seconds
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
      return "just now";
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case "rolling": {
        return "Rolling";
      }
      case "placing": {
        return "Placing";
      }
      case "ended": {
        return "Ended";
      }
      default: {
        return phase;
      }
    }
  };

  return (
    <main className="min-h-[100dvh] flex flex-col p-4 sm:p-8 overflow-auto pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <InstallPrompt />
      <Link href="/" className="absolute top-2 sm:top-4 left-2 sm:left-4">
        <Button variant="ghost" size="sm" className="px-2 sm:px-3">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Back</span>
        </Button>
      </Link>

      {/* Connection status & Theme */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex items-center gap-2 sm:gap-3">
        <ThemeSwitcher />
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-500">Disconnected</span>
            </>
          )}
        </div>
      </div>

      <div className="text-center mb-4 sm:mb-8 mt-8 sm:mt-0">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2">
          <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          Watch Live Matches
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Spectate public multiplayer and AI matches
        </p>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={fetchRooms} disabled={loading || !isOnline}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rooms.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-8">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No public matches available right now.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create a public room to start watching!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room list */}
      {!loading && !error && rooms.length > 0 && (
        <div className="grid gap-4 max-w-4xl mx-auto w-full">
          {rooms.map((room) => (
            <Card
              key={room.roomId}
              className="hover:border-accent/50 transition-all cursor-pointer"
              onClick={() => {
                window.location.href = `/watch/${room.roomId}`;
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="font-mono text-accent">{room.roomId}</span>
                      <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded bg-muted">
                        {room.gameType === "ai" ? "AI Match" : "Multiplayer"}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {room.player1?.name ?? "Player 1"} vs {room.player2?.name ?? "Player 2"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Eye className="w-4 h-4" />
                    <span>{room.watcherCount}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-muted-foreground">Turn: </span>
                      <span className="font-medium">{room.state.turnNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Score: </span>
                      <span className="font-medium">
                        {room.state.player1Score} - {room.state.player2Score}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <span className="font-medium">{getPhaseLabel(room.state.phase)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(room.lastActivity)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
