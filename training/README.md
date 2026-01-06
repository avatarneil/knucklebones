# Knucklebones AI Training Pipeline

This directory contains the Python-based training pipeline for the hybrid MCTS + neural network AI.

## Setup

Using [uv](https://github.com/astral-sh/uv) (recommended):

```bash
cd training
uv pip install -r requirements.txt
```

Or with standard pip:

```bash
cd training
pip install -r requirements.txt
```

## Files

- `game.py` - Core game logic (matches the TypeScript/WASM implementation)
- `network.py` - Policy-value network definition (matches WASM architecture)
- `mcts.py` - MCTS implementation for self-play data generation
- `train.py` - Main training script
- `tournament.py` - Tournament evaluation script

## Training

Run the training pipeline:

```bash
# Basic training (10 iterations, 100 games each)
uv run python train.py

# Custom settings
uv run python train.py --iterations 20 --games 200 --simulations 400

# Resume from checkpoint
uv run python train.py --resume checkpoints/checkpoint_5.pt --iterations 10
```

Or without uv:

```bash
python train.py --iterations 20 --games 200 --simulations 400
```

### Performance Options

The training automatically uses hardware acceleration:
- **Apple Silicon (M1/M2/M3/M4)**: Uses MPS (Metal Performance Shaders) for GPU training
- **NVIDIA GPU**: Uses CUDA if available
- **Parallel self-play**: Uses multiple CPU cores for game generation

```bash
# Control parallelism
uv run python train.py --workers 4          # Limit to 4 workers
uv run python train.py --no-parallel        # Sequential (uses network guidance)

# Faster training with fewer simulations (less accurate but quicker)
uv run python train.py --simulations 100 --games 500
```

**Tip**: On M series Macs, training is significantly faster than CPU-only. The script will show `(Apple Silicon GPU acceleration enabled)` when MPS is active.

### Training Parameters

- `--iterations` - Number of training iterations (default: 10)
- `--games` - Self-play games per iteration (default: 100)
- `--simulations` - MCTS simulations per move (default: 200)
- `--epochs` - Training epochs per iteration (default: 5)
- `--batch-size` - Training batch size (default: 64)
- `--lr` - Learning rate (default: 0.001)
- `--output-dir` - Output directory (default: checkpoints)
- `--export` - Export weights filename (default: weights.json)

## Evaluation

Run tournaments to evaluate agent strength:

```bash
# Basic tournament (Random, Greedy, MCTS-Heuristic)
uv run python tournament.py --games 100

# Include neural network agent
uv run python tournament.py --games 100 --weights checkpoints/weights.json

# Save results to JSON
uv run python tournament.py --games 200 --weights checkpoints/weights.json --output results.json
```

## Using Trained Weights in the App

After training, copy the weights file to the app's public directory:

```bash
cp checkpoints/weights.json ../public/ai-weights.json
```

The app will automatically load and use these weights when the "Grandmaster" difficulty is selected.

## Architecture

The policy-value network has the following architecture:

- **Input**: 43 features
  - 18 features for each grid (6 die values × 3 columns count encoding)
  - 1 feature for current player
  - 6 features for current die (one-hot)

- **Hidden**: 64 neurons with ReLU activation

- **Output**:
  - Policy head: 3 neurons (one per column), softmax activation
  - Value head: 1 neuron, tanh activation

Total parameters: ~3,000 weights
