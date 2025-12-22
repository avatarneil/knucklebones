"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAIPlayer,
  getAllDifficultyLevels,
  getDifficultyConfig,
} from "@/engine";
import type { ColumnIndex, DifficultyLevel, GameState } from "@/engine/types";
import { getAIWorkerManager, cleanupAIWorkerManager } from "@/lib/ai-worker-manager";
import { getOptimalChunkSize, getOptimalYieldInterval } from "@/lib/platform";

interface UseAIReturn {
  difficulty: DifficultyLevel;
  setDifficulty: (level: DifficultyLevel) => void;
  getMove: (state: GameState) => Promise<ColumnIndex | null>;
  getMoveSync: (state: GameState) => ColumnIndex | null;
  evaluateState: (state: GameState) => number;
  difficultyConfig: ReturnType<typeof getDifficultyConfig>;
  allDifficulties: DifficultyLevel[];
  isComputing: boolean;
}

export function useAI(
  initialDifficulty: DifficultyLevel = "medium",
): UseAIReturn {
  const [difficulty, setDifficulty] =
    useState<DifficultyLevel>(initialDifficulty);
  const [isComputing, setIsComputing] = useState(false);

  const aiPlayer = useMemo(() => createAIPlayer(difficulty), [difficulty]);
  const workerManager = useMemo(() => getAIWorkerManager(), []);

  // Initialize optimization params based on platform
  useEffect(() => {
    const chunkSize = getOptimalChunkSize();
    const yieldInterval = getOptimalYieldInterval();
    workerManager.setOptimizationParams(chunkSize, yieldInterval);
  }, [workerManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAIWorkerManager();
    };
  }, []);

  const getMove = useCallback(
    async (state: GameState): Promise<ColumnIndex | null> => {
      setIsComputing(true);
      try {
        return await workerManager.computeMove(state, difficulty);
      } finally {
        setIsComputing(false);
      }
    },
    [workerManager, difficulty],
  );

  const getMoveSync = useCallback(
    (state: GameState): ColumnIndex | null => {
      // Fallback synchronous method for compatibility
      return aiPlayer.chooseMove(state);
    },
    [aiPlayer],
  );

  const evaluateState = useCallback(
    (state: GameState): number => {
      return aiPlayer.evaluateState(state);
    },
    [aiPlayer],
  );

  const difficultyConfig = useMemo(
    () => getDifficultyConfig(difficulty),
    [difficulty],
  );

  const allDifficulties = useMemo(() => getAllDifficultyLevels(), []);

  return {
    difficulty,
    setDifficulty,
    getMove,
    getMoveSync,
    evaluateState,
    difficultyConfig,
    allDifficulties,
    isComputing,
  };
}
