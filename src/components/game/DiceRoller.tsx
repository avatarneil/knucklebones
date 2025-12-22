"use client";

import { Dices } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DieValue } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Die } from "./Die";

interface DiceRollerProps {
  currentDie: DieValue | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerName?: string;
}

export function DiceRoller({
  currentDie,
  isRolling,
  canRoll,
  onRoll,
  playerName = "Player",
}: DiceRollerProps) {
  const [displayValue, setDisplayValue] = useState<DieValue>(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setIsAnimating(true);
      // Animate through random values
      const interval = setInterval(() => {
        setDisplayValue((Math.floor(Math.random() * 6) + 1) as DieValue);
      }, 50);

      // Stop after animation
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (currentDie) {
          setDisplayValue(currentDie);
        }
        setIsAnimating(false);
      }, 500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else if (currentDie) {
      setDisplayValue(currentDie);
    }
  }, [isRolling, currentDie]);

  return (
    <div className="flex flex-col items-center gap-[clamp(0.5rem,1.5vmin,1rem)] p-[clamp(0.75rem,2vmin,1.5rem)] rounded-xl sm:rounded-2xl bg-card/30 backdrop-blur border border-border/50">
      {/* Current die display */}
      <div className="relative">
        {currentDie || isRolling ? (
          <Die
            value={displayValue}
            size="lg"
            isRolling={isAnimating}
            className={cn(
              "transition-transform",
              isAnimating && "animate-shake",
            )}
          />
        ) : (
          <div className="w-[clamp(3.5rem,12vmin,7rem)] h-[clamp(3.5rem,12vmin,7rem)] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Dices className="w-[clamp(1.75rem,6vmin,3.5rem)] h-[clamp(1.75rem,6vmin,3.5rem)] text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Roll button or status */}
      {canRoll ? (
        <Button
          onClick={onRoll}
          disabled={isRolling}
          variant="accent"
          size="default"
          className="font-bold text-sm sm:text-base"
        >
          <Dices className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {isRolling ? "Rolling..." : "Roll Dice"}
        </Button>
      ) : currentDie ? (
        <div className="text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {playerName}&apos;s turn
          </p>
          <p className="text-sm sm:text-lg font-semibold text-accent">
            Choose a column
          </p>
        </div>
      ) : (
        <div className="text-xs sm:text-sm text-muted-foreground">
          Waiting...
        </div>
      )}
    </div>
  );
}
