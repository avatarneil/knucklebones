"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RotateCcw,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GameBoard } from "@/components/game";
import { InstallPrompt } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMultiplayer } from "@/hooks/useMultiplayer";

type LobbyState = "menu" | "creating" | "waiting" | "joining" | "playing";

export default function MultiplayerPage() {
  const [lobbyState, setLobbyState] = useState<LobbyState>("menu");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const multiplayer = useMultiplayer();
  const { connect } = multiplayer;

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Handle game state changes
  useEffect(() => {
    if (multiplayer.gameState?.phase === "ended") {
      setShowGameOver(true);
    }
  }, [multiplayer.gameState?.phase]);

  // Update lobby state based on multiplayer state
  useEffect(() => {
    if (multiplayer.roomId && !multiplayer.isWaitingForOpponent && multiplayer.gameState) {
      setLobbyState("playing");
    } else if (multiplayer.roomId && multiplayer.isWaitingForOpponent) {
      setLobbyState("waiting");
    }
  }, [multiplayer.roomId, multiplayer.isWaitingForOpponent, multiplayer.gameState]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      return;
    }
    setLobbyState("creating");
    try {
      await multiplayer.createRoom(playerName, isPublic);
      setLobbyState("waiting");
    } catch (error) {
      console.error(error);
      setLobbyState("menu");
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !joinCode.trim()) {
      return;
    }
    setLobbyState("joining");
    const success = await multiplayer.joinRoom(joinCode.toUpperCase(), playerName);
    if (!success) {
      setLobbyState("menu");
    }
  };

  const handleCopyCode = () => {
    if (multiplayer.roomId) {
      navigator.clipboard.writeText(multiplayer.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRoll = useCallback(async () => {
    if (!multiplayer.isMyTurn || multiplayer.gameState?.phase !== "rolling") {
      return;
    }
    setIsRolling(true);
    await multiplayer.rollDice();
    setTimeout(() => setIsRolling(false), 500);
  }, [multiplayer]);

  const handlePlaceDie = useCallback(
    async (column: 0 | 1 | 2) => {
      if (!multiplayer.isMyTurn || multiplayer.gameState?.phase !== "placing") {
        return;
      }
      await multiplayer.placeDie(column);
    },
    [multiplayer]
  );

  const handleLeaveRoom = () => {
    multiplayer.leaveRoom();
    setLobbyState("menu");
    setShowGameOver(false);
  };

  const handleRematch = () => {
    if (multiplayer.rematchRequested) {
      multiplayer.acceptRematch();
    } else {
      multiplayer.requestRematch();
    }
    setShowGameOver(false);
  };

  // Render based on lobby state
  if (lobbyState === "menu") {
    return (
      <main className="h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
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
            {multiplayer.isConnected ? (
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

        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Multiplayer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Play against a friend online</p>
        </div>

        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          {/* Player name */}
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="player-name" className="text-sm">
              Your Name
            </Label>
            <Input
              id="player-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div className="grid gap-3 sm:gap-4">
            {/* Create room */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 pt-4 sm:pt-6">
                <CardTitle className="text-base sm:text-lg">Create Room</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Start a new game and invite a friend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pb-4 sm:pb-6">
                {/* Public/Private Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {isPublic ? (
                      <Eye className="w-4 h-4 text-accent" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <Label htmlFor="public-room" className="text-sm font-medium cursor-pointer">
                        {isPublic ? "Public Room" : "Private Room"}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {isPublic ? "Anyone can watch this match" : "Only players can access"}
                      </span>
                    </div>
                  </div>
                  <Switch id="public-room" checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || !multiplayer.isConnected}
                  className="w-full"
                  size="default"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Create Room
                </Button>
              </CardContent>
            </Card>

            {/* Join room */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 pt-4 sm:pt-6">
                <CardTitle className="text-base sm:text-lg">Join Room</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Enter a room code to join a game
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  maxLength={6}
                  className="font-mono text-center text-base sm:text-lg tracking-widest"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || joinCode.length < 4 || !multiplayer.isConnected}
                  className="w-full"
                  variant="secondary"
                  size="default"
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </div>

          {multiplayer.error && (
            <p className="text-center text-sm text-destructive">{multiplayer.error}</p>
          )}
        </div>
      </main>
    );
  }

  if (lobbyState === "waiting" || lobbyState === "creating") {
    return (
      <main className="h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <InstallPrompt />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Waiting for Opponent</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Share this code with a friend to start the game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
            {/* Room code */}
            <div className="flex items-center justify-center gap-2">
              <div className="font-mono text-2xl sm:text-4xl font-bold tracking-[0.2em] sm:tracking-[0.3em] text-accent">
                {multiplayer.roomId}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              <span>Waiting for player to join...</span>
            </div>

            <Button variant="outline" className="w-full" size="default" onClick={handleLeaveRoom}>
              <LogOut className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (lobbyState === "joining") {
    return (
      <main className="h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Joining room...</span>
        </div>
      </main>
    );
  }

  // Playing state
  if (!multiplayer.gameState) {
    return (
      <main className="h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <InstallPrompt />
      {/* Header */}
      <header className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
        <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={handleLeaveRoom}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Leave</span>
        </Button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Room: </span>
            <span className="font-mono text-accent">{multiplayer.roomId}</span>
          </div>
          {multiplayer.isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </header>

      {/* Turn indicator */}
      <div className="text-center mb-1 sm:mb-2 flex-shrink-0">
        <span
          className={`text-sm sm:text-lg font-medium ${
            multiplayer.isMyTurn ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {multiplayer.isMyTurn ? "Your turn!" : "Opponent's turn..."}
        </span>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex flex-col min-h-0">
        <GameBoard
          state={multiplayer.gameState}
          isRolling={isRolling}
          onRoll={handleRoll}
          onColumnClick={handlePlaceDie}
          player1Name={multiplayer.player1Name ?? "Player 1"}
          player2Name={multiplayer.player2Name ?? "Player 2"}
          isPlayer1Human={multiplayer.role === "player1"}
          isPlayer2Human={multiplayer.role === "player2"}
        />
      </div>

      {/* Opponent disconnected notice */}
      {multiplayer.opponentDisconnected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg">
          Opponent disconnected
        </div>
      )}

      {/* Rematch requested notice */}
      {multiplayer.rematchRequested && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rematch Requested</DialogTitle>
              <DialogDescription>Your opponent wants to play again!</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave
              </Button>
              <Button onClick={handleRematch}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Accept
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Game Over Dialog */}
      <Dialog open={showGameOver && !multiplayer.rematchRequested} onOpenChange={setShowGameOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Game Over
            </DialogTitle>
            <DialogDescription>
              {multiplayer.gameState.winner === multiplayer.role
                ? "Congratulations! You won!"
                : multiplayer.gameState.winner === "draw"
                  ? "It's a draw!"
                  : "You lost. Better luck next time!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGameOver(false)}>
              View Board
            </Button>
            <Button onClick={handleRematch}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Request Rematch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
