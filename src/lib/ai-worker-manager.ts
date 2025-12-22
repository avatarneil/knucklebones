/**
 * AI Worker Manager
 * 
 * Manages Web Worker instances for AI computation with iOS-specific optimizations.
 * Falls back to main thread computation if workers are not available.
 */

import type { ColumnIndex, DifficultyLevel, GameState } from "@/engine/types";
import { getBestMoveProgressive, setOptimizationParams } from "@/engine/ai/expectimax-optimized";
import { getDifficultyConfig } from "@/engine/ai/difficulty";
import {
  isIOS,
  getOptimalChunkSize,
  getOptimalYieldInterval,
} from "./platform";

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

class AIWorkerManager {
  private worker: Worker | null = null;
  private workerSupported = false;
  private pendingRequests = new Map<string, {
    resolve: (move: ColumnIndex | null) => void;
    reject: (error: Error) => void;
  }>();
  private requestIdCounter = 0;
  private chunkSize: number;
  private yieldInterval: number;

  constructor() {
    this.chunkSize = getOptimalChunkSize();
    this.yieldInterval = getOptimalYieldInterval();
    this.initializeWorker();
  }

  private initializeWorker(): void {
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      this.workerSupported = false;
      return;
    }

    // For iOS and mobile devices, Web Workers can be problematic
    // and the main thread fallback with progressive computation works well
    // iOS Safari has good support for async/await and progressive computation
    // Main thread with yielding works better than workers on iOS
    if (isIOS()) {
      this.workerSupported = false;
      return;
    }

    try {
      // Create worker from inline code or external file
      // For Next.js, we need to use a blob URL or external file
      const workerCode = `
        import type { ColumnIndex, DifficultyLevel, GameState } from "../engine/types";
        import { getDifficultyConfig } from "../engine/ai/difficulty";
        import { expectimaxProgressive, getBestMoveProgressive, setOptimizationParams } from "../engine/ai/expectimax-optimized";

        setOptimizationParams(2000, 10);

        self.onmessage = async (event) => {
          const { type, id, state, difficulty, chunkSize, yieldInterval } = event.data;

          try {
            if (type === "setParams") {
              if (chunkSize !== undefined && yieldInterval !== undefined) {
                setOptimizationParams(chunkSize, yieldInterval);
              }
              self.postMessage({ type: "moveResult", id, move: null });
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
              });
            } else {
              throw new Error("Invalid message: missing state or difficulty");
            }
          } catch (error) {
            self.postMessage({
              type: "error",
              id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };
      `;

      // Try to create worker from external file first
      // In Next.js, we'll need to handle this differently
      // For now, use fallback to main thread
      this.workerSupported = false;
    } catch (error) {
      console.warn("Web Worker not available, using main thread:", error);
      this.workerSupported = false;
    }
  }

  /**
   * Compute AI move using worker or main thread fallback
   */
  async computeMove(
    state: GameState,
    difficulty: DifficultyLevel,
  ): Promise<ColumnIndex | null> {
    if (this.workerSupported && this.worker) {
      return this.computeMoveWithWorker(state, difficulty);
    } else {
      return this.computeMoveMainThread(state, difficulty);
    }
  }

  private async computeMoveWithWorker(
    state: GameState,
    difficulty: DifficultyLevel,
  ): Promise<ColumnIndex | null> {
    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestIdCounter}`;

      this.pendingRequests.set(id, { resolve, reject });

      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("AI computation timeout"));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
      };

      const messageHandler = (event: MessageEvent<AIResponse>) => {
        if (event.data.id !== id) return;

        this.worker?.removeEventListener("message", messageHandler);
        cleanup();

        if (event.data.type === "error") {
          reject(new Error(event.data.error || "Unknown error"));
        } else {
          resolve(event.data.move ?? null);
        }
      };

      this.worker.addEventListener("message", messageHandler);
      this.worker.postMessage({
        type: "computeMove",
        id,
        state,
        difficulty,
        chunkSize: this.chunkSize,
        yieldInterval: this.yieldInterval,
      } as AIMessage);
    });
  }

  private async computeMoveMainThread(
    state: GameState,
    difficulty: DifficultyLevel,
  ): Promise<ColumnIndex | null> {
    // Use optimized progressive computation on main thread
    const config = getDifficultyConfig(difficulty);
    
    // Set optimization params for this computation
    setOptimizationParams(this.chunkSize, this.yieldInterval);

    return getBestMoveProgressive(
      state,
      config,
      this.chunkSize,
      this.yieldInterval,
    );
  }

  /**
   * Update optimization parameters
   */
  setOptimizationParams(chunkSize: number, yieldInterval: number): void {
    this.chunkSize = chunkSize;
    this.yieldInterval = yieldInterval;

    if (this.workerSupported && this.worker) {
      this.worker.postMessage({
        type: "setParams",
        id: "params",
        chunkSize,
        yieldInterval,
      } as AIMessage);
    } else {
      setOptimizationParams(chunkSize, yieldInterval);
    }
  }

  /**
   * Cleanup worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let workerManager: AIWorkerManager | null = null;

/**
 * Get the AI worker manager instance
 */
export function getAIWorkerManager(): AIWorkerManager {
  if (!workerManager) {
    workerManager = new AIWorkerManager();
  }
  return workerManager;
}

/**
 * Cleanup worker manager (call on app unmount)
 */
export function cleanupAIWorkerManager(): void {
  if (workerManager) {
    workerManager.terminate();
    workerManager = null;
  }
}
