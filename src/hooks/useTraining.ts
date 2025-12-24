"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deepAnalysis, quickAnalysis } from "@/engine";
import type { GameState, MoveAnalysis } from "@/engine/types";

interface UseTrainingReturn {
  isEnabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  analysis: MoveAnalysis[] | null;
  isAnalyzing: boolean;
  runAnalysis: (state: GameState, deep?: boolean) => void;
  clearAnalysis: () => void;
}

export function useTraining(initialEnabled = false): UseTrainingReturn {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [analysis, setAnalysis] = useState<MoveAnalysis[] | null>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analysisWorkerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (analysisWorkerRef.current) {
        clearTimeout(analysisWorkerRef.current);
      }
    },
    []
  );

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    setAnalysis(undefined);
  }, []);

  const runAnalysis = useCallback(
    (state: GameState, deep = false) => {
      if (!isEnabled) {
        return;
      }

      // Cancel any pending analysis
      if (analysisWorkerRef.current) {
        clearTimeout(analysisWorkerRef.current);
      }

      if (state.phase !== "placing") {
        setAnalysis(undefined);
        return;
      }

      setIsAnalyzing(true);

      // Run analysis in next tick to not block UI
      analysisWorkerRef.current = setTimeout(() => {
        const result = deep ? deepAnalysis(state, 1500) : quickAnalysis(state, 400);

        setAnalysis(result.moves);
        setIsAnalyzing(false);
      }, 0);
    },
    [isEnabled]
  );

  const clearAnalysis = useCallback(() => {
    setAnalysis(undefined);
    if (analysisWorkerRef.current) {
      clearTimeout(analysisWorkerRef.current);
    }
  }, []);

  return {
    analysis,
    clearAnalysis,
    disable,
    enable,
    isAnalyzing,
    isEnabled,
    runAnalysis,
    toggle,
  };
}
