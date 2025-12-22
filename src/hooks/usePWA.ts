"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const INSTALL_DISMISSED_KEY = "pwa-install-dismissed";
const SHOW_DELAY_MS = 2000; // 2 second delay before showing
const AUTO_DISMISS_MS = 30000; // Auto-dismiss after 30 seconds

// Detect iOS devices
function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Detect if running in standalone mode (already installed)
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    const ios = isIOS();
    setIsIOSDevice(ios);

    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed the prompt
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    const shouldShowPrompt = !dismissed;

    let showTimeout: ReturnType<typeof setTimeout>;
    let autoDismissTimeout: ReturnType<typeof setTimeout>;

    // For iOS, show instructions after delay (no beforeinstallprompt event)
    if (ios && shouldShowPrompt) {
      showTimeout = setTimeout(() => {
        setShowPrompt(true);
        setCanInstall(true); // Show iOS instructions
        
        // Auto-dismiss after 30 seconds if not interacted with
        autoDismissTimeout = setTimeout(() => {
          setShowPrompt(false);
        }, AUTO_DISMISS_MS);
      }, SHOW_DELAY_MS);
    }

    // For Android/Chrome, listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      
      if (shouldShowPrompt) {
        // Show after a delay to let users see the page first
        showTimeout = setTimeout(() => {
          setShowPrompt(true);
          
          // Auto-dismiss after 30 seconds if not interacted with
          autoDismissTimeout = setTimeout(() => {
            setShowPrompt(false);
          }, AUTO_DISMISS_MS);
        }, SHOW_DELAY_MS);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
      clearTimeout(showTimeout);
      clearTimeout(autoDismissTimeout);
    };

    if (!ios) {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (!ios) {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      }
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(showTimeout);
      clearTimeout(autoDismissTimeout);
    };
  }, []);

  const install = useCallback(async () => {
    // For iOS, we can't programmatically trigger install
    // The user needs to use the share menu
    if (isIOSDevice) {
      return false;
    }

    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setCanInstall(false);
    setShowPrompt(false);

    return outcome === "accepted";
  }, [deferredPrompt, isIOSDevice]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShowPrompt(false);
  }, []);

  return {
    canInstall,
    isInstalled,
    showPrompt,
    install,
    dismissPrompt,
    isIOSDevice,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
