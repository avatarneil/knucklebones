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
  isHuman?: boolean;
}

export function DiceRoller({
  currentDie,
  isRolling,
  canRoll,
  onRoll,
  playerName = "Player",
  isHuman = true,
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
    <div className="flex flex-col items-center gap-[clamp(0.25rem,1vmin,0.75rem)] p-[clamp(0.5rem,1.5vmin,1rem)] rounded-xl sm:rounded-2xl bg-card/70 border border-border/50">
      {/* Current die display */}
      <div className="relative">
        {currentDie || isRolling ? (
          <Die
            value={displayValue}
            size="lg"
            isRolling={isAnimating}
            className={cn("transition-transform", isAnimating && "animate-shake")}
          />
        ) : (
          <div className="w-[clamp(2.5rem,8vmin,5rem)] h-[clamp(2.5rem,8vmin,5rem)] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Dices className="w-[clamp(1.25rem,4vmin,2.5rem)] h-[clamp(1.25rem,4vmin,2.5rem)] text-muted-foreground/50" />
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
          className="font-bold text-[clamp(0.875rem,2.5vw,1rem)]"
        >
          <Dices className="mr-[clamp(0.375rem,1vw,0.5rem)] h-[clamp(1rem,3vw,1.25rem)] w-[clamp(1rem,3vw,1.25rem)]" />
          {isRolling ? "Rolling..." : "Roll Dice"}
        </Button>
      ) : currentDie ? (
        <div className="text-center">
          <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">
            {playerName === "You" ? "Your turn" : `${playerName}'s turn`}
          </p>
          {isHuman && (
            <p className="text-[clamp(0.875rem,2.5vw,1.125rem)] font-semibold text-accent">
              Choose a column
            </p>
          )}
        </div>
      ) : (
        <div className="text-[clamp(0.75rem,2vw,0.875rem)] text-muted-foreground">Waiting...</div>
      )}
    </div>
  );
}
