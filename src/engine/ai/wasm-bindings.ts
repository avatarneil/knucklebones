/**
 * WASM bindings for high-performance AI engine
 */

let wasmModule: typeof import("../../../wasm/pkg/knucklebones_ai") | null = null;
let aiEngine: any = null;
let opponentProfile: any = null;
let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module (called automatically on first use)
 */
async function initWasmInternal(): Promise<void> {
  // Only initialize WASM on the client side (not during SSR)
  if (typeof window === "undefined") {
    return;
  }
  
  if (wasmInitialized) return;
  
  if (wasmInitPromise) {
    await wasmInitPromise;
    return;
  }
  
  wasmInitPromise = (async () => {
    try {
      // Dynamic import to avoid blocking if WASM fails to load
      wasmModule = await import("../../../wasm/pkg/knucklebones_ai");
      await wasmModule.default();
      aiEngine = new wasmModule.AIEngine();
      wasmInitialized = true;
    } catch (error) {
      console.warn("WASM AI engine failed to initialize, will use JS fallback:", error);
      wasmModule = null;
      aiEngine = null;
      wasmInitialized = false;
    }
  })();
  
  await wasmInitPromise;
}

/**
 * Initialize the WASM module (public API)
 */
export async function initWasm(): Promise<void> {
  await initWasmInternal();
}

/**
 * Ensure WASM is initialized (non-blocking, returns immediately if not ready)
 */
function ensureWasmReady(): boolean {
  // Only initialize WASM on the client side (not during SSR)
  if (typeof window === "undefined") {
    return false;
  }
  
  // If already initialized, return true
  if (wasmInitialized && aiEngine) return true;
  
  // If initialization is in progress, return false (will use JS fallback)
  if (wasmInitPromise) return false;
  
  // Start initialization in background (non-blocking)
  initWasmInternal().catch(() => {
    // Already handled in initWasmInternal
  });
  
  return false;
}

/**
 * Convert TypeScript Grid to flat array for WASM
 */
function gridToArray(grid: (1 | 2 | 3 | 4 | 5 | 6 | null)[][]): Uint8Array {
  const arr = new Uint8Array(9);
  // Grid is [Column, Column, Column] where Column is [DieValue | null, DieValue | null, DieValue | null]
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      const value = grid[col][row];
      arr[col * 3 + row] = value === null ? 0 : value;
    }
  }
  return arr;
}

/**
 * Get the best move using WASM engine (synchronous, falls back to null if not ready)
 */
export function getBestMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6 | null,
  depth: number,
  randomness: number,
  offenseWeight: number,
  defenseWeight: number,
  advancedEval: boolean,
  opponentDepth?: number,
  opponentRandomness?: number,
  opponentOffenseWeight?: number,
  opponentDefenseWeight?: number,
  opponentAdvancedEval?: boolean,
): number | null {
  // Check if WASM is ready (non-blocking)
  if (!ensureWasmReady() || !aiEngine) {
    return null; // Not ready yet, caller should use JS fallback
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;
    const dieValue = currentDie === null ? 0 : currentDie;

    // Use opponent config if provided, otherwise use same as player config (backward compatibility)
    const oppDepth = opponentDepth ?? depth;
    const oppRandomness = opponentRandomness ?? randomness;
    const oppOffenseWeight = opponentOffenseWeight ?? offenseWeight;
    const oppDefenseWeight = opponentDefenseWeight ?? defenseWeight;
    const oppAdvancedEval = opponentAdvancedEval ?? advancedEval;

    const result = aiEngine.get_best_move(
      grid1Arr,
      grid2Arr,
      playerNum,
      dieValue,
      depth,
      randomness,
      offenseWeight,
      defenseWeight,
      advancedEval,
      oppDepth,
      oppRandomness,
      oppOffenseWeight,
      oppDefenseWeight,
      oppAdvancedEval,
    );

    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM move calculation failed:", error);
    return null; // Fallback to JS
  }
}

/**
 * Clear the WASM engine cache
 */
export function clearWasmCache(): void {
  if (aiEngine) {
    aiEngine.clear_cache();
  }
}

/**
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

// ============================================================================
// Master AI - Opponent Profile Functions
// ============================================================================

/**
 * Get or create the global opponent profile (singleton pattern)
 */
export function getOpponentProfile(): any {
  if (!ensureWasmReady() || !wasmModule) {
    return null;
  }
  
  if (!opponentProfile) {
    try {
      opponentProfile = new wasmModule.OpponentProfile();
    } catch (error) {
      console.warn("Failed to create opponent profile:", error);
      return null;
    }
  }
  
  return opponentProfile;
}

/**
 * Record an opponent move for learning
 * @param col Column index (0-2)
 * @param dieValue Die value placed (1-6)
 * @param removedCount Number of dice removed from our grid
 * @param scoreLost Points we lost from removed dice
 */
export function recordOpponentMove(
  col: 0 | 1 | 2,
  dieValue: 1 | 2 | 3 | 4 | 5 | 6,
  removedCount: number,
  scoreLost: number,
): void {
  const profile = getOpponentProfile();
  if (!profile) return;
  
  try {
    profile.record_move(col, dieValue, removedCount, scoreLost);
  } catch (error) {
    console.warn("Failed to record opponent move:", error);
  }
}

/**
 * Mark end of game for stability tracking
 */
export function endProfileGame(): void {
  const profile = getOpponentProfile();
  if (!profile) return;
  
  try {
    profile.end_game();
  } catch (error) {
    console.warn("Failed to end profile game:", error);
  }
}

/**
 * Reset all learned data in the opponent profile
 */
export function resetOpponentProfile(): void {
  const profile = getOpponentProfile();
  if (!profile) return;
  
  try {
    profile.reset();
  } catch (error) {
    console.warn("Failed to reset opponent profile:", error);
  }
}

/**
 * Get profile statistics for UI display
 */
export function getProfileStats(): {
  gamesCompleted: number;
  totalMoves: number;
  attackRate: number;
  columnFrequencies: [number, number, number];
} | null {
  const profile = getOpponentProfile();
  if (!profile) return null;
  
  try {
    return {
      gamesCompleted: profile.get_games_completed(),
      totalMoves: profile.get_total_moves(),
      attackRate: profile.get_attack_rate(),
      columnFrequencies: [
        profile.get_column_frequency(0),
        profile.get_column_frequency(1),
        profile.get_column_frequency(2),
      ],
    };
  } catch (error) {
    console.warn("Failed to get profile stats:", error);
    return null;
  }
}

/**
 * Get the best move using Master AI with adaptive opponent modeling
 */
export function getMasterMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6,
): number | null {
  if (!ensureWasmReady() || !aiEngine) {
    return null;
  }
  
  const profile = getOpponentProfile();
  if (!profile) {
    return null;
  }
  
  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;
    
    const result = aiEngine.get_master_move(
      grid1Arr,
      grid2Arr,
      playerNum,
      currentDie,
      profile,
    );
    
    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM master move calculation failed:", error);
    return null;
  }
}
