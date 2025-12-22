/**
 * AI Computation Web Worker
 * 
 * Runs AI computation in a separate thread to prevent UI blocking,
 * especially important for iOS devices.
 */

import type { ColumnIndex, DifficultyLevel, GameState } from "../engine/types";
import { getDifficultyConfig } from "../engine/ai/difficulty";
import { expectimaxProgressive, getBestMoveProgressive, setOptimizationParams } from "../engine/ai/expectimax-optimized";

// Initialize optimization params for worker context
// Use conservative values for worker (can be more aggressive)
setOptimizationParams(2000, 10);

export interface AIMessage {
  type: "computeMove" | "setParams";
  id: string;
  state?: GameState;
  difficulty?: DifficultyLevel;
  chunkSize?: number;
  yieldInterval?: number;
}

export interface AIResponse {
  type: "moveResult" | "error";
  id: string;
  move?: ColumnIndex | null;
  error?: string;
}

self.onmessage = async (event: MessageEvent<AIMessage>) => {
  const { type, id, state, difficulty, chunkSize, yieldInterval } = event.data;

  try {
    if (type === "setParams") {
      if (chunkSize !== undefined && yieldInterval !== undefined) {
        setOptimizationParams(chunkSize, yieldInterval);
      }
      self.postMessage({ type: "moveResult", id, move: null } as AIResponse);
      return;
    }

    if (type === "computeMove" && state && difficulty) {
      const config = getDifficultyConfig(difficulty);
      
      const move = await getBestMoveProgressive(
        state,
        config,
        chunkSize,
        yieldInterval,
      );

      self.postMessage({
        type: "moveResult",
        id,
        move,
      } as AIResponse);
    } else {
      throw new Error("Invalid message: missing state or difficulty");
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error instanceof Error ? error.message : String(error),
    } as AIResponse);
  }
};
