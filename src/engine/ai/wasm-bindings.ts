/**
 * WASM bindings for high-performance AI engine
 */

let wasmModule: typeof import("../../../wasm/pkg/knucklebones_ai") | null;
let aiEngine: any;
let hybridEngine: any;
let policyValueNetwork: any;
// Separate opponent profiles for each player's perspective
// player1Profile: tracks player2's behavior (used when player1 is Master AI)
// player2Profile: tracks player1's behavior (used when player2 is Master AI)
let player1Profile: any;
let player2Profile: any;
let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null;
let hybridWeightsLoaded = false;

export type ProfileOwner = "player1" | "player2";

/**
 * Initialize the WASM module (called automatically on first use)
 */
async function initWasmInternal(): Promise<void> {
  // Only initialize WASM on the client side (not during SSR)
  if (typeof window === "undefined") {
    return;
  }

  if (wasmInitialized) {
    return;
  }

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
      hybridEngine = new wasmModule.HybridAIEngine();
      wasmInitialized = true;
    } catch (error) {
      console.warn("WASM AI engine failed to initialize, will use JS fallback:", error);
      wasmModule = null;
      aiEngine = null;
      hybridEngine = null;
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
  if (wasmInitialized && aiEngine) {
    return true;
  }

  // If initialization is in progress, return false (will use JS fallback)
  if (wasmInitPromise) {
    return false;
  }

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
  adversarial?: boolean,
  timeBudgetMs?: number,
  opponentAdversarial?: boolean,
  opponentTimeBudgetMs?: number
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
    const useAdversarial = adversarial ?? false;
    const useTimeBudget = timeBudgetMs ?? 0;
    const oppAdversarial = opponentAdversarial ?? false;
    const oppTimeBudget = opponentTimeBudgetMs ?? 0;

    // Use extended API if we have adversarial/time budget params, otherwise use legacy API
    if (useAdversarial || useTimeBudget > 0) {
      const result = aiEngine.get_best_move_extended(
        grid1Arr,
        grid2Arr,
        playerNum,
        dieValue,
        depth,
        randomness,
        offenseWeight,
        defenseWeight,
        advancedEval,
        useAdversarial,
        useTimeBudget,
        oppDepth,
        oppRandomness,
        oppOffenseWeight,
        oppDefenseWeight,
        oppAdvancedEval,
        oppAdversarial,
        oppTimeBudget
      );
      return result === -1 ? null : result;
    }

    // Legacy API for backward compatibility
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
      oppAdvancedEval
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
 * Get or create the opponent profile for a specific player's perspective.
 * Each Master AI player has their own profile to track their opponent's behavior.
 *
 * @param owner The player whose perspective this profile represents.
 *              "player1" = profile that tracks player2's behavior (for player1's Master AI)
 *              "player2" = profile that tracks player1's behavior (for player2's Master AI)
 */
export function getOpponentProfile(owner: ProfileOwner): any {
  if (!ensureWasmReady() || !wasmModule) {
    return null;
  }

  if (owner === "player1") {
    if (!player1Profile) {
      try {
        player1Profile = new wasmModule.OpponentProfile();
      } catch (error) {
        console.warn("Failed to create player1 opponent profile:", error);
        return null;
      }
    }
    return player1Profile;
  }

  // owner === "player2"
  if (!player2Profile) {
    try {
      player2Profile = new wasmModule.OpponentProfile();
    } catch (error) {
      console.warn("Failed to create player2 opponent profile:", error);
      return null;
    }
  }
  return player2Profile;
}

/**
 * Record an opponent move for learning
 * @param owner The player whose profile should record this move (the Master AI player)
 * @param col Column index (0-2)
 * @param dieValue Die value placed (1-6)
 * @param removedCount Number of dice removed from our grid
 * @param scoreLost Points we lost from removed dice
 */
export function recordOpponentMove(
  owner: ProfileOwner,
  col: 0 | 1 | 2,
  dieValue: 1 | 2 | 3 | 4 | 5 | 6,
  removedCount: number,
  scoreLost: number
): void {
  const profile = getOpponentProfile(owner);
  if (!profile) {
    return;
  }

  try {
    profile.record_move(col, dieValue, removedCount, scoreLost);
  } catch (error) {
    console.warn("Failed to record opponent move:", error);
  }
}

/**
 * Mark end of game for stability tracking
 * @param owner The player whose profile should be updated (or undefined to update both)
 */
export function endProfileGame(owner?: ProfileOwner): void {
  if (owner) {
    const profile = getOpponentProfile(owner);
    if (!profile) {
      return;
    }

    try {
      profile.end_game();
    } catch (error) {
      console.warn(`Failed to end profile game for ${owner}:`, error);
    }
  } else {
    // End game for both profiles (for backwards compatibility and when both are Master AI)
    for (const p of ["player1", "player2"] as ProfileOwner[]) {
      const profile = getOpponentProfile(p);
      if (profile) {
        try {
          profile.end_game();
        } catch (error) {
          console.warn(`Failed to end profile game for ${p}:`, error);
        }
      }
    }
  }
}

/**
 * Reset all learned data in the opponent profile
 * @param owner The player whose profile should be reset (or undefined to reset both)
 */
export function resetOpponentProfile(owner?: ProfileOwner): void {
  if (owner) {
    const profile = getOpponentProfile(owner);
    if (!profile) {
      return;
    }

    try {
      profile.reset();
    } catch (error) {
      console.warn(`Failed to reset opponent profile for ${owner}:`, error);
    }
  } else {
    // Reset both profiles (for backwards compatibility)
    for (const p of ["player1", "player2"] as ProfileOwner[]) {
      const profile = getOpponentProfile(p);
      if (profile) {
        try {
          profile.reset();
        } catch (error) {
          console.warn(`Failed to reset opponent profile for ${p}:`, error);
        }
      }
    }
  }
}

/**
 * Get profile statistics for UI display
 * @param owner The player whose profile stats to get
 */
export function getProfileStats(owner: ProfileOwner): {
  gamesCompleted: number;
  totalMoves: number;
  attackRate: number;
  columnFrequencies: [number, number, number];
} | null {
  const profile = getOpponentProfile(owner);
  if (!profile) {
    return null;
  }

  try {
    return {
      attackRate: profile.get_attack_rate(),
      columnFrequencies: [
        profile.get_column_frequency(0),
        profile.get_column_frequency(1),
        profile.get_column_frequency(2),
      ],
      gamesCompleted: profile.get_games_completed(),
      totalMoves: profile.get_total_moves(),
    };
  } catch (error) {
    console.warn(`Failed to get profile stats for ${owner}:`, error);
    return null;
  }
}

/**
 * Get the best move using Master AI with adaptive opponent modeling.
 * Uses the profile for the current player's perspective (tracking their opponent).
 */
export function getMasterMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6
): number | null {
  if (!ensureWasmReady() || !aiEngine) {
    return null;
  }

  // Use the current player's profile (which tracks their opponent's behavior)
  const profile = getOpponentProfile(currentPlayer);
  if (!profile) {
    return null;
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;

    const result = aiEngine.get_master_move(grid1Arr, grid2Arr, playerNum, currentDie, profile);

    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM master move calculation failed:", error);
    return null;
  }
}

// ============================================================================
// MCTS (Monte Carlo Tree Search) Functions
// ============================================================================

/**
 * Get the best move using MCTS (Monte Carlo Tree Search)
 * @param grid1 Player 1's grid
 * @param grid2 Player 2's grid
 * @param currentPlayer Current player
 * @param currentDie Current die value
 * @param timeBudgetMs Time budget in milliseconds
 */
export function getMctsMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6,
  timeBudgetMs: number
): number | null {
  if (!ensureWasmReady() || !aiEngine) {
    return null;
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;

    const result = aiEngine.get_mcts_move(
      grid1Arr,
      grid2Arr,
      playerNum,
      currentDie,
      timeBudgetMs
    );

    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM MCTS move calculation failed:", error);
    return null;
  }
}

/**
 * Get the best move using hybrid MCTS + neural network approach
 * Currently uses uniform priors; will use policy network when trained
 */
export function getHybridMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6,
  timeBudgetMs: number,
  policyWeights?: number[]
): number | null {
  if (!ensureWasmReady() || !aiEngine) {
    return null;
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;

    const result = aiEngine.get_hybrid_move(
      grid1Arr,
      grid2Arr,
      playerNum,
      currentDie,
      timeBudgetMs,
      policyWeights ?? null
    );

    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM hybrid move calculation failed:", error);
    return null;
  }
}

// ============================================================================
// Neural Network-Guided Hybrid AI Functions
// ============================================================================

/**
 * Load neural network weights into the hybrid engine
 * @param weights Flat array of network weights
 * @returns true if weights were loaded successfully
 */
export function loadHybridWeights(weights: number[]): boolean {
  if (!ensureWasmReady() || !hybridEngine) {
    return false;
  }

  try {
    const success = hybridEngine.load_weights(new Float64Array(weights));
    hybridWeightsLoaded = success;
    return success;
  } catch (error) {
    console.warn("Failed to load hybrid weights:", error);
    return false;
  }
}

/**
 * Check if hybrid engine has loaded weights
 */
export function isHybridNetworkReady(): boolean {
  if (!ensureWasmReady() || !hybridEngine) {
    return false;
  }
  return hybridWeightsLoaded && hybridEngine.is_network_initialized();
}

/**
 * Get the expected weight count for the hybrid network
 */
export function getHybridWeightCount(): number | null {
  if (!ensureWasmReady() || !hybridEngine) {
    return null;
  }
  return hybridEngine.get_weight_count();
}

/**
 * Get the best move using neural network-guided MCTS
 * Falls back to standard MCTS if network not initialized
 */
export function getNeuralMctsMoveWasm(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6,
  timeBudgetMs: number
): number | null {
  if (!ensureWasmReady() || !hybridEngine) {
    return null;
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;

    const result = hybridEngine.get_move(
      grid1Arr,
      grid2Arr,
      playerNum,
      currentDie,
      timeBudgetMs
    );

    return result === -1 ? null : result;
  } catch (error) {
    console.warn("WASM neural MCTS move calculation failed:", error);
    return null;
  }
}

/**
 * Get policy and value outputs from the neural network for a state
 * Returns [policy_col0, policy_col1, policy_col2, value] or null if not available
 */
export function getNeuralPolicyValue(
  grid1: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  grid2: (1 | 2 | 3 | 4 | 5 | 6 | null)[][],
  currentPlayer: "player1" | "player2",
  currentDie: 1 | 2 | 3 | 4 | 5 | 6
): { policy: [number, number, number]; value: number } | null {
  if (!ensureWasmReady() || !hybridEngine) {
    return null;
  }

  try {
    const grid1Arr = gridToArray(grid1);
    const grid2Arr = gridToArray(grid2);
    const playerNum = currentPlayer === "player1" ? 0 : 1;

    const result = hybridEngine.get_policy_value(
      grid1Arr,
      grid2Arr,
      playerNum,
      currentDie
    );

    if (!result || result.length !== 4) {
      return null;
    }

    return {
      policy: [result[0], result[1], result[2]],
      value: result[3],
    };
  } catch (error) {
    console.warn("WASM neural policy/value calculation failed:", error);
    return null;
  }
}
