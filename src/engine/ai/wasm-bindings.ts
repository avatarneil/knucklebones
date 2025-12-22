/**
 * WASM bindings for high-performance AI engine
 */

let wasmModule: typeof import("../../../wasm/pkg/knucklebones_ai") | null = null;
let aiEngine: any = null;
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
