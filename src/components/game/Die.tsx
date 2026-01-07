"use client";

import type { DieValue } from "@/engine/types";
import { cn } from "@/lib/utils";

interface DieProps {
  value: DieValue;
  size?: "sm" | "md" | "lg";
  isRolling?: boolean;
  isNew?: boolean;
  isRemoving?: boolean;
  className?: string;
}

const sizeClasses = {
  lg: "w-[clamp(2.5rem,8vmin,5rem)] h-[clamp(2.5rem,8vmin,5rem)]",
  md: "w-[clamp(2rem,6vmin,4rem)] h-[clamp(2rem,6vmin,4rem)]",
  sm: "w-[clamp(1.5rem,4vmin,2.25rem)] h-[clamp(1.5rem,4vmin,2.25rem)]",
};

const dieColors: Record<DieValue, string> = {
  1: "from-red-500 to-red-700 shadow-red-500/30",
  2: "from-orange-500 to-orange-700 shadow-orange-500/30",
  3: "from-yellow-500 to-yellow-700 shadow-yellow-500/30",
  4: "from-green-500 to-green-700 shadow-green-500/30",
  5: "from-blue-500 to-blue-700 shadow-blue-500/30",
  6: "from-purple-500 to-purple-700 shadow-purple-500/30",
};

const dotPositions: Record<DieValue, number[][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

export function Die({
  value,
  size = "md",
  isRolling = false,
  isNew = false,
  isRemoving = false,
  className,
}: DieProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg bg-gradient-to-br flex items-center justify-center font-bold shadow-lg transition-all duration-300",
        sizeClasses[size],
        dieColors[value],
        isRolling && "animate-dice-roll",
        isNew && "animate-dice-bounce",
        isRemoving && "opacity-0 scale-0",
        className
      )}
    >
      {/* Dice dots */}
      <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-0.5">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const hasDot = dotPositions[value].some(([r, c]) => r === row && c === col);
            return (
              <div
                key={`${row}-${col}`}
                className={cn(
                  "rounded-full transition-all",
                  hasDot ? "bg-white shadow-inner" : "bg-transparent"
                )}
              />
            );
          })
        )}
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
    </div>
  );
}

interface DieSlotProps {
  value: DieValue | null;
  size?: "sm" | "md" | "lg";
  isNew?: boolean;
  isRemoving?: boolean;
}

export function DieSlot({ value, size = "md", isNew, isRemoving }: DieSlotProps) {
  // Use loose equality to catch both null and undefined
  if (value == null) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30",
          sizeClasses[size]
        )}
      />
    );
  }

  return <Die value={value} size={size} isNew={isNew} isRemoving={isRemoving} />;
}
