"use client";

import { ChevronDown, ChevronUp, Keyboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function KeyboardShortcuts() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full shadow-lg transition-all",
              isExpanded && "bg-accent/10 border-accent",
            )}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-xs">Click to {isExpanded ? "hide" : "show"} keyboard shortcuts</p>
        </TooltipContent>
      </Tooltip>

        {isExpanded && (
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-xs animate-in slide-in-from-bottom-2 fade-in-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(false)}
                aria-label="Close shortcuts"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-muted-foreground">Roll dice:</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-[10px]">
                    Space
                  </kbd>
                  <span className="text-muted-foreground">or</span>
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-[10px]">
                    Enter
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-muted-foreground">Place in column:</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-[10px]">
                    1
                  </kbd>
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-[10px]">
                    2
                  </kbd>
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-[10px]">
                    3
                  </kbd>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  Shortcuts only work when it's your turn and you're not typing in a text field.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
