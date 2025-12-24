"use client";

import { Download, Smartphone, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/usePWA";

export function InstallPrompt() {
  const { showPrompt, install, dismissPrompt, canInstall, isIOSDevice } = useInstallPrompt();

  if (!showPrompt || !canInstall) {
    return;
  }

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg z-50 animate-fade-in-up">
      <div className="relative overflow-hidden bg-gradient-to-r from-accent/20 via-primary/10 to-secondary/20 border-2 border-accent/50 rounded-xl shadow-2xl p-5 sm:p-6 backdrop-blur-sm animate-pulse-glow">
        {/* Decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="p-3 rounded-xl bg-accent/20 border border-accent/30 shrink-0">
            <Smartphone className="w-8 h-8 text-accent" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              Install KnuckleTrainer
            </h3>
            {isIOSDevice ? (
              <>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Install this app on your iPhone for the best experience! Tap the share button
                  below, then select &quot;Add to Home Screen&quot;.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="font-medium mb-1">Steps:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Tap the Share button</li>
                      <li>Scroll and tap &quot;Add to Home Screen&quot;</li>
                      <li>Tap &quot;Add&quot; to confirm</li>
                    </ol>
                  </div>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={dismissPrompt}
                    className="text-muted-foreground hover:text-foreground px-3 shrink-0"
                  >
                    <X className="w-5 h-5" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Get the full app experience! Play offline, faster loading, and instant access from
                  your home screen.
                </p>
                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    size="lg"
                    onClick={install}
                    className="flex-1 sm:flex-none bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg shadow-accent/25"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Now
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={dismissPrompt}
                    className="text-muted-foreground hover:text-foreground px-3"
                  >
                    <X className="w-5 h-5" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
