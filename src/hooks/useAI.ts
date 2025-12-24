"use client";

import { useCallback, useMemo, useState } from "react";
import { createAIPlayer, getAllDifficultyLevels, getDifficultyConfig } from "@/engine";
import type { ColumnIndex, DifficultyLevel, GameState } from "@/engine/types";

interface UseAIReturn {
  difficulty: DifficultyLevel;
  setDifficulty: (level: DifficultyLevel) => void;
  getMove: (state: GameState) => ColumnIndex | null;
  evaluateState: (state: GameState) => number;
  difficultyConfig: ReturnType<typeof getDifficultyConfig>;
  allDifficulties: DifficultyLevel[];
}

export function useAI(initialDifficulty: DifficultyLevel = "medium"): UseAIReturn {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);

  const aiPlayer = useMemo(() => createAIPlayer(difficulty), [difficulty]);

  const getMove = useCallback(
    (state: GameState): ColumnIndex | null => aiPlayer.chooseMove(state),
    [aiPlayer]
  );

  const evaluateState = useCallback(
    (state: GameState): number => aiPlayer.evaluateState(state),
    [aiPlayer]
  );

  const difficultyConfig = useMemo(() => getDifficultyConfig(difficulty), [difficulty]);

  const allDifficulties = useMemo(() => getAllDifficultyLevels(), []);

  return {
    allDifficulties,
    difficulty,
    difficultyConfig,
    evaluateState,
    getMove,
    setDifficulty,
  };
}
