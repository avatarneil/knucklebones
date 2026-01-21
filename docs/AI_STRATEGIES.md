# AI/ML Strategies Documentation

This document provides comprehensive documentation of all AI and machine learning strategies implemented in the Knucklebones Trainer project.

## Table of Contents

1. [Overview](#overview)
2. [Neural Network Architecture](#neural-network-architecture)
3. [Training Process](#training-process)
4. [Expectimax Search Algorithm](#expectimax-search-algorithm)
5. [Monte Carlo Tree Search (MCTS)](#monte-carlo-tree-search-mcts)
6. [Master AI - Adaptive Learning](#master-ai---adaptive-learning)
7. [Hybrid Neural MCTS](#hybrid-neural-mcts)
8. [Evaluation Functions](#evaluation-functions)
9. [Difficulty Levels](#difficulty-levels)
10. [WASM/Rust Implementation](#wasmrust-implementation)
11. [Training Your Own Model](#training-your-own-model)

---

## Overview

The Knucklebones Trainer implements a **multi-strategy hybrid AI system** that combines several approaches:

| Strategy | Technology | Use Case |
|----------|------------|----------|
| **Neural Network** | PyTorch | Policy-value predictions for move selection |
| **Expectimax Search** | TypeScript/Rust | Minimax with chance nodes for dice games |
| **MCTS** | Rust/WASM | Monte Carlo simulations for move evaluation |
| **Master AI** | Rust/WASM | Adaptive learning from opponent behavior |
| **Greedy Heuristics** | TypeScript | Fast baseline evaluations |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   React/TypeScript Frontend                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TypeScript Game Engine                     │
│                    (src/engine/ai/)                          │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │ JavaScript │   │ WASM/Rust  │   │   Hybrid   │
     │  Fallback  │   │   Engine   │   │Neural+MCTS │
     └────────────┘   └────────────┘   └────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Trained Weights │
                    │  (PyTorch .pt)  │
                    └─────────────────┘
```

---

## Neural Network Architecture

### Model Structure

**Location:** `training/network.py`

The neural network is a **Policy-Value Network** (similar to AlphaZero's architecture) with the following structure:

```
Input Layer (43 features)
         │
         ▼
    Linear(43, 128)
         │
         ▼
       ReLU
         │
    ┌────┴────┐
    ▼         ▼
 Policy     Value
  Head       Head
    │         │
    ▼         ▼
Linear    Linear
(128,3)   (128,1)
    │         │
    ▼         ▼
Softmax    Tanh
    │         │
    ▼         ▼
 [p0,p1,p2]  v∈[-1,1]
```

### Input Features (43 total)

The game state is encoded as a 43-dimensional feature vector:

| Features | Count | Description |
|----------|-------|-------------|
| Grid 1 | 18 | Count of each die value (1-6) in each column (3 columns × 6 values) |
| Grid 2 | 18 | Same encoding for opponent's grid |
| Current Player | 1 | Binary indicator (0 or 1) |
| Current Die | 6 | One-hot encoding of the die to be placed (1-6) |

**Encoding Example:**
```python
# Grid column encoding (for one column with dice [3, 3, 5]):
# die_1_count=0, die_2_count=0, die_3_count=2,
# die_4_count=0, die_5_count=1, die_6_count=0
```

### Output Heads

1. **Policy Head**: Outputs probability distribution over 3 columns
   - Uses softmax activation
   - Represents the recommended move distribution

2. **Value Head**: Outputs expected game outcome
   - Uses tanh activation (output range: -1 to +1)
   - -1 = certain loss, +1 = certain win, 0 = even game

### Network Parameters

- **Total Parameters:** ~6,000 weights
- **Hidden Units:** 128
- **Initialization:** Xavier uniform
- **Checkpoint Size:** ~82KB per checkpoint

---

## Training Process

### Self-Play Data Generation

**Location:** `training/mcts.py`, `training/train.py`

Training data is generated through self-play using Monte Carlo Tree Search:

```
┌─────────────────────────────────────────────────────┐
│                  Self-Play Loop                      │
├─────────────────────────────────────────────────────┤
│  1. Start new game with empty boards                │
│  2. For each move:                                  │
│     a. Run MCTS (200 simulations)                   │
│     b. Select move using temperature-based sampling │
│     c. Record (state, policy, _) tuple              │
│  3. Game ends → assign outcome to all recorded data │
│  4. Store (state, policy, outcome) for training     │
└─────────────────────────────────────────────────────┘
```

### Training Algorithm

**Loss Function:**
```
Total Loss = Policy Loss + Value Loss

Policy Loss = -Σ(target_policy × log(predicted_policy))  [Cross-entropy]
Value Loss  = MSE(predicted_value, actual_outcome)
```

**Optimization:**
- **Optimizer:** Adam (β₁=0.9, β₂=0.999, ε=1e-8)
- **Learning Rate:** 0.001 (initial), decays by 5% per iteration
- **Batch Size:** 128

### Training Configuration

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `iterations` | 10 | Number of training iterations |
| `games_per_iteration` | 100 | Self-play games per iteration |
| `mcts_simulations` | 200 | MCTS simulations per move |
| `epochs` | 5 | Training epochs per iteration |
| `batch_size` | 128 | Mini-batch size |
| `learning_rate` | 0.001 | Initial learning rate |
| `lr_decay` | 0.95 | LR multiplier per iteration |
| `temperature` | 1.0 → 0.5 | Exploration temperature (decreases) |
| `replay_window` | 3 | Iterations of data to keep |

### Temperature Schedule

Temperature controls exploration vs. exploitation during self-play:

```
High temperature (1.0): More exploration, diverse moves
Low temperature (0.5):  More exploitation, stronger moves
Temperature = 0:        Deterministic (best move only)

Schedule:
- Iterations 1-5:  temperature = 1.0
- Iterations 6+:   temperature decreases toward 0.5
- Move 15+:        temperature = 0 (always play best)
```

### Hardware Acceleration

The training system supports multiple backends:

1. **Apple Silicon (MPS):** Preferred on Mac with M-series chips
   - Uses `torch.compile()` for optimization
   - Best batch size: 128

2. **NVIDIA CUDA:** For GPU training on Linux/Windows

3. **CPU Fallback:** Works on any system

### Parallel Training Modes

1. **Heuristic MCTS (Fast):**
   - Uses `ProcessPoolExecutor` with 8 workers
   - MCTS rollouts use heuristic evaluation
   - No network inference during self-play

2. **Network-Guided MCTS (Accurate):**
   - Uses `ThreadPoolExecutor` with `InferenceServer`
   - MCTS uses network policy priors
   - Slower but produces better training data

---

## Expectimax Search Algorithm

### Overview

**Location:** `src/engine/ai/expectimax.ts`

Expectimax is a variant of minimax designed for games with chance elements (dice rolls). It handles three types of nodes:

```
        MAX (our turn - maximize)
       / | \
      /  |  \
   CHANCE nodes (dice roll - average over outcomes)
    /|\  /|\  /|\
   ... MIN nodes (opponent - minimize)
       /|\
      ...
```

### Node Types

1. **MAX Node:** Current player chooses the move that maximizes evaluation
2. **MIN Node:** Opponent chooses the move that minimizes our evaluation
3. **CHANCE Node:** Averages over all possible dice values (1-6, each with probability 1/6)

### Search Features

| Feature | Description |
|---------|-------------|
| **Transposition Table** | Caches 100,000 evaluated positions |
| **Move Ordering** | Evaluates promising moves first for better pruning |
| **Iterative Deepening** | Progressive deepening within time budget |
| **Node Limit** | Maximum 500,000 nodes per search |
| **Time Budget** | Configurable per-move time limit |

### Adversarial vs. Modeled Opponent

**Adversarial Mode (Hard+ difficulties):**
- Assumes opponent plays optimally
- True minimax at MIN nodes

**Modeled Opponent (Easy-Medium):**
- Uses weighted evaluation based on likely opponent behavior
- More forgiving, allows sub-optimal plays

---

## Monte Carlo Tree Search (MCTS)

### Algorithm

**Location:** `training/mcts.py` (Python), `wasm/src/lib.rs` (Rust)

MCTS builds a search tree through repeated simulations:

```
┌─────────────────────────────────────────────────────┐
│                    MCTS Iteration                    │
├─────────────────────────────────────────────────────┤
│  1. SELECTION: Traverse tree using UCB1             │
│     UCB1 = Q(s,a)/N(s,a) + c×√(ln(N(s))/N(s,a))   │
│                                                     │
│  2. EXPANSION: Add new node for unexplored move     │
│                                                     │
│  3. SIMULATION: Random/heuristic playout to end     │
│                                                     │
│  4. BACKPROPAGATION: Update Q-values along path     │
└─────────────────────────────────────────────────────┘
```

### Simulation Policies

1. **Random Policy:** Uniform random moves (fast, noisy)
2. **Heuristic Policy:** Use evaluation function (slower, more accurate)
3. **Mixed Policy:** Combination based on `heuristicRatio` parameter

### Configuration Presets

```typescript
// Quick analysis for UI hints
quickAnalysis: {
  simulations: 200,
  policy: "mixed",
  heuristicRatio: 0.3
}

// Deep analysis for training
deepAnalysis: {
  simulations: 2000,
  policy: "mixed",
  heuristicRatio: 0.7
}
```

---

## Master AI - Adaptive Learning

### Overview

**Location:** `src/engine/ai/master.ts`

The Master AI learns opponent patterns during gameplay and adapts its strategy accordingly.

### Tracked Statistics

```rust
struct OpponentProfile {
    games_completed: u32,      // Games played against this profile
    total_moves: u32,          // Total moves recorded
    attack_rate: f64,          // Frequency of attacking moves
    column_frequencies: [f64; 3],  // Preferred column usage
    die_preferences: [f64; 6], // High vs low die placement
}
```

### Learning Process

1. **Data Collection:**
   - Records every opponent move
   - Tracks column choices, attack patterns, die placement

2. **Profile Building:**
   - Requires minimum 3 games and 10 moves before adaptation
   - Continuously updates probabilities

3. **Strategy Adaptation:**
   - Exploits detected patterns
   - Adjusts offensive/defensive balance
   - Predicts likely opponent moves

### API Functions

```typescript
// Get move using learned profile
getMasterMove(gameState: GameState): number

// Record opponent action for learning
recordOpponentMoveForLearning(move: Move): void

// Get current profile statistics
getMasterProfileStats(): ProfileStats

// Reset learned data
resetMasterProfile(): void
```

---

## Hybrid Neural MCTS

### Overview

**Location:** `src/engine/ai/wasm-bindings.ts`

Combines neural network predictions with MCTS search (similar to AlphaZero):

```
┌─────────────────────────────────────────────────────┐
│               Hybrid Neural MCTS                     │
├─────────────────────────────────────────────────────┤
│  1. Get policy prior P(s,a) from neural network     │
│  2. Use P(s,a) to guide MCTS exploration            │
│  3. PUCT formula for selection:                     │
│     Q(s,a) + c×P(s,a)×√(N(s))/(1+N(s,a))          │
│  4. Network value V(s) used for leaf evaluation     │
└─────────────────────────────────────────────────────┘
```

### Weight Loading

```typescript
// Load trained weights into WASM engine
await loadHybridWeights(weightsArray);

// Check if network is ready
const ready = isHybridNetworkReady();

// Get move with neural guidance
const move = getNeuralMctsMoveWasm(gameState, timeBudget);
```

### Weight Format

Weights are exported from PyTorch as a flat array:
- **Size:** ~6,000 float64 values
- **Order:** [W1, b1, W_policy, b_policy, W_value, b_value]
- **File:** `training/weights.json`

---

## Evaluation Functions

### Basic Evaluation

**Location:** `src/engine/ai/evaluation.ts`

```typescript
basicScore = myGridScore - opponentGridScore
```

### Advanced Evaluation

Used for Medium+ difficulties, includes positional factors:

| Component | Weight | Description |
|-----------|--------|-------------|
| **Base Score** | 1.0 | Raw score difference |
| **Combo Potential** | varies | Matching dice that could form triples |
| **Column Vulnerability** | varies | Dice at risk of being removed |
| **Column Control** | 0.3 | Secure dice opponent can't attack |
| **Attack Potential** | varies | Damage from possible future rolls |

**Game Progress Factor:**
```typescript
progress = totalMoves / estimatedMaxMoves
// Early game: more weight on positioning
// Late game: more weight on raw score
```

---

## Difficulty Levels

**Location:** `src/engine/ai/difficulty.ts`

| Level | Depth | Randomness | Adversarial | Features |
|-------|-------|------------|-------------|----------|
| **Greedy** | 0 | 0% | No | Immediate score only |
| **Beginner** | 1 | 40% | No | Random with occasional good plays |
| **Easy** | 2 | 25% | No | Basic strategy, frequent mistakes |
| **Medium** | 3 | 10% | No | Solid play, rare mistakes |
| **Hard** | 4 | 0% | Yes | Deep search, optimal evaluation |
| **Expert** | 6 | 0% | Yes | Max depth + 100ms time budget |
| **Master** | 6 | 0% | Yes | Adaptive learning from opponent |
| **Grandmaster** | 6 | 0% | Yes | Hybrid neural network + MCTS |

### Configuration Properties

```typescript
interface DifficultyConfig {
  depth: number;           // Search depth (0-6)
  randomness: number;      // Random move probability (0-1)
  considerOpponent: boolean;
  offenseWeight: number;   // Offensive strategy weight
  defenseWeight: number;   // Defensive strategy weight
  advancedEval: boolean;   // Use positional heuristics
  adversarial: boolean;    // True minimax vs modeled
  timeBudgetMs: number;    // Time limit per move
}
```

---

## WASM/Rust Implementation

### Overview

**Location:** `wasm/src/lib.rs`

The Rust WASM module provides 10-100x speedup over JavaScript for intensive calculations.

### Core Data Structures

```rust
// 3x3 grid representation
struct Grid {
    data: [u8; 9]  // Flattened 3x3 array
}

// Complete game state
struct GameState {
    grid1: Grid,
    grid2: Grid,
    current_player: Player,
    current_die: Option<u8>,
    phase: GamePhase,
    turn_number: u32,
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `get_best_move()` | Standard expectimax search |
| `get_best_move_extended()` | With adversarial + time budget |
| `get_mcts_move()` | Pure MCTS search |
| `get_hybrid_move()` | MCTS with neural policy |
| `get_master_move()` | Adaptive learning variant |
| `clear_cache()` | Reset transposition table |

### Performance Optimizations

- **wee_alloc:** Smaller allocator for reduced binary size
- **Transposition Table:** 100,000 entry cache
- **Bitwise Operations:** Fast grid manipulation
- **Zero-Copy:** Efficient data passing to JavaScript

---

## Training Your Own Model

### Prerequisites

```bash
# Install Python dependencies
cd training
pip install torch numpy wandb  # wandb is optional
```

### Basic Training

```bash
# Run training with default settings
python train.py

# Resume from checkpoint
python train.py --resume

# Custom configuration
python train.py --iterations 20 --games 200 --simulations 500
```

### Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--iterations` | 10 | Number of training iterations |
| `--games` | 100 | Self-play games per iteration |
| `--simulations` | 200 | MCTS simulations per move |
| `--epochs` | 5 | Training epochs per iteration |
| `--batch-size` | 128 | Mini-batch size |
| `--lr` | 0.001 | Initial learning rate |
| `--resume` | False | Resume from latest checkpoint |
| `--wandb` | False | Enable Weights & Biases logging |

### Export Weights for WASM

After training, export weights for use in the game:

```bash
# Weights are automatically saved to weights.json
# Located at: training/weights.json
```

### Monitoring Training

**With Weights & Biases:**
```bash
python train.py --wandb
# View at: https://wandb.ai/your-project/knucklebones
```

**Metrics Tracked:**
- `loss/total` - Combined loss
- `loss/policy` - Policy head loss
- `loss/value` - Value head loss
- `learning_rate` - Current learning rate
- `games_per_sec` - Self-play speed

### Running Tournaments

**Location:** `training/tournament.py`

Evaluate trained agents against baselines:

```bash
python tournament.py
```

**Agent Types:**
- Random (uniform random)
- Greedy (immediate score)
- MCTS-Heuristic (MCTS with heuristic rollouts)
- MCTS-Neural (MCTS with network guidance)

---

## File Reference

| File | Description |
|------|-------------|
| `training/train.py` | Main training script |
| `training/network.py` | Neural network architecture |
| `training/mcts.py` | MCTS for self-play |
| `training/game.py` | Game logic and state encoding |
| `training/inference_server.py` | Batched network inference |
| `training/tournament.py` | Agent evaluation |
| `src/engine/ai/expectimax.ts` | Expectimax search |
| `src/engine/ai/evaluation.ts` | Position evaluation |
| `src/engine/ai/difficulty.ts` | Difficulty configurations |
| `src/engine/ai/master.ts` | Adaptive learning |
| `src/engine/training/monte-carlo.ts` | MCTS for UI analysis |
| `wasm/src/lib.rs` | Rust WASM implementation |

---

## References

- [AlphaZero Paper](https://arxiv.org/abs/1712.01815) - Inspiration for policy-value architecture
- [Monte Carlo Tree Search](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search) - MCTS algorithm overview
- [Expectimax](https://en.wikipedia.org/wiki/Expectiminimax) - Minimax for chance games
