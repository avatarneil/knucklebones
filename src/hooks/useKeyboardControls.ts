"use client";

import { useEffect, useCallback, useRef } from "react";
import type { ColumnIndex, GameState } from "@/engine/types";

interface UseKeyboardControlsOptions {
  gameState: GameState;
  canRoll: boolean;
  canPlace: boolean;
  legalColumns: ColumnIndex[];
  onRoll: () => void;
  onPlaceDie: (column: ColumnIndex) => void;
  enabled?: boolean;
}

/**
 * Hook to handle keyboard controls for the game
 * - Space/Enter: Roll dice (when in rolling phase)
 * - 1, 2, 3: Place die in columns 0, 1, 2 (when in placing phase)
 */
export function useKeyboardControls({
  gameState,
  canRoll,
  canPlace,
  legalColumns,
  onRoll,
  onPlaceDie,
  enabled = true,
}: UseKeyboardControlsOptions) {
  const optionsRef = useRef({
    canRoll,
    canPlace,
    legalColumns,
    onRoll,
    onPlaceDie,
  });

  // Keep refs up to date
  useEffect(() => {
    optionsRef.current = {
      canRoll,
      canPlace,
      legalColumns,
      onRoll,
      onPlaceDie,
    };
  }, [canRoll, canPlace, legalColumns, onRoll, onPlaceDie]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const { canRoll, canPlace, legalColumns, onRoll, onPlaceDie } =
        optionsRef.current;

      // Roll dice: Space or Enter
      if ((event.key === " " || event.key === "Enter") && canRoll) {
        event.preventDefault();
        onRoll();
        return;
      }

      // Place die: 1, 2, 3 keys map to columns 0, 1, 2
      if (canPlace && legalColumns.length > 0) {
        const keyToColumn: Record<string, ColumnIndex> = {
          "1": 0,
          "2": 1,
          "3": 2,
        };

        const column = keyToColumn[event.key];
        if (column !== undefined && legalColumns.includes(column)) {
          event.preventDefault();
          onPlaceDie(column);
          return;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
