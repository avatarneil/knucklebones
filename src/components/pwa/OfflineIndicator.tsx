"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/usePWA";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground py-1.5 px-4 text-center text-sm flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>You're offline - Multiplayer unavailable</span>
    </div>
  );
}
