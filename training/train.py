#!/usr/bin/env python3
"""
Training Script for Knucklebones Policy-Value Network

This script:
1. Generates self-play games using MCTS
2. Trains the policy-value network on the generated data
3. Exports weights for use in the WASM engine

Supports Apple Silicon (MPS) acceleration and parallel self-play.
"""

import argparse
import json
import os
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from multiprocessing import cpu_count
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from tqdm import tqdm

try:
    import wandb
    WANDB_AVAILABLE = True
except ImportError:
    WANDB_AVAILABLE = False

from game import GameState, Player, get_game_result
from inference_server import InferenceServer
from mcts import self_play_game
from network import PolicyValueNetwork, create_network


def get_device() -> torch.device:
    """Get the best available device (MPS for Apple Silicon, CUDA, or CPU)."""
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    else:
        return torch.device("cpu")


def _play_single_game(args: Tuple[int, int, float]) -> List[Tuple[np.ndarray, np.ndarray, float]]:
    """Worker function for parallel self-play (no network, uses heuristic)."""
    simulations_per_move, temperature, _ = args
    return self_play_game(
        network=None,  # Use heuristic for parallel games
        simulations=simulations_per_move,
        temperature=temperature,
    )


def _play_single_game_with_server(
    args: Tuple[int, float, "InferenceServer"]
) -> List[Tuple[np.ndarray, np.ndarray, float]]:
    """Worker function for threaded parallel self-play with shared inference server."""
    simulations_per_move, temperature, inference_server = args
    return self_play_game(
        network=None,  # Network accessed via inference server
        simulations=simulations_per_move,
        temperature=temperature,
        inference_server=inference_server,
    )


def generate_training_data(
    network: PolicyValueNetwork,
    num_games: int,
    simulations_per_move: int = 200,
    temperature: float = 1.0,
    show_progress: bool = True,
    parallel: bool = True,
    num_workers: int = None,
    parallel_network: bool = False,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate training data through self-play.

    Args:
        network: Policy-value network (used for sequential, ignored for parallel)
        num_games: Number of games to generate
        simulations_per_move: MCTS simulations per move
        temperature: Temperature for action selection
        show_progress: Whether to show progress bar
        parallel: Whether to use parallel processing (faster but uses heuristic MCTS)
        num_workers: Number of parallel workers (defaults to CPU count)
        parallel_network: Use threaded parallel with shared inference server (MPS optimized)

    Returns:
        states: Array of shape (num_samples, 43)
        policies: Array of shape (num_samples, 3)
        values: Array of shape (num_samples,)
    """
    all_states = []
    all_policies = []
    all_values = []

    if parallel_network and num_games >= 2:
        # Threaded parallel self-play with shared inference server (MPS optimized)
        if num_workers is None:
            num_workers = min(4, num_games)  # Threads, not processes

        with InferenceServer(network, batch_size=32, max_wait_ms=2.0) as server:
            args_list = [
                (simulations_per_move, temperature, server) for _ in range(num_games)
            ]

            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = [
                    executor.submit(_play_single_game_with_server, args)
                    for args in args_list
                ]

                games_iter = as_completed(futures)
                if show_progress:
                    games_iter = tqdm(
                        games_iter,
                        total=num_games,
                        desc=f"Self-play ({num_workers} threads, network)",
                    )

                for future in games_iter:
                    samples = future.result()
                    for state, policy, value in samples:
                        all_states.append(state)
                        all_policies.append(policy)
                        all_values.append(value)

            # Print inference server stats
            stats = server.get_stats()
            if show_progress and stats["batches"] > 0:
                print(
                    f"  Inference server: {stats['requests']} requests in {stats['batches']} batches "
                    f"(avg {stats['avg_batch_size']:.1f}/batch)"
                )

    elif parallel and num_games >= 4:
        # Parallel self-play using heuristic MCTS (faster)
        if num_workers is None:
            num_workers = min(cpu_count(), num_games, 8)

        args_list = [(simulations_per_move, temperature, i) for i in range(num_games)]

        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(_play_single_game, args) for args in args_list]

            games_iter = as_completed(futures)
            if show_progress:
                games_iter = tqdm(
                    games_iter, total=num_games, desc=f"Self-play ({num_workers} workers)"
                )

            for future in games_iter:
                samples = future.result()
                for state, policy, value in samples:
                    all_states.append(state)
                    all_policies.append(policy)
                    all_values.append(value)
    else:
        # Sequential self-play with network guidance
        games_iter = range(num_games)
        if show_progress:
            games_iter = tqdm(games_iter, desc="Self-play games")

        for _ in games_iter:
            samples = self_play_game(
                network=network,
                simulations=simulations_per_move,
                temperature=temperature,
            )

            for state, policy, value in samples:
                all_states.append(state)
                all_policies.append(policy)
                all_values.append(value)

    return (
        np.array(all_states, dtype=np.float32),
        np.array(all_policies, dtype=np.float32),
        np.array(all_values, dtype=np.float32),
    )


def train_epoch(
    network: PolicyValueNetwork,
    optimizer: optim.Optimizer,
    dataloader: DataLoader,
    device: torch.device,
) -> Tuple[float, float, float]:
    """
    Train for one epoch.
    
    Returns:
        total_loss, policy_loss, value_loss (averaged over batches)
    """
    network.train()
    
    total_loss_sum = 0.0
    policy_loss_sum = 0.0
    value_loss_sum = 0.0
    num_batches = 0
    
    for states, policies, values in dataloader:
        states = states.to(device)
        policies = policies.to(device)
        values = values.to(device).unsqueeze(1)
        
        optimizer.zero_grad()
        
        # Forward pass
        log_policy, pred_value = network(states)
        
        # Policy loss: cross-entropy (negative log likelihood with soft targets)
        policy_loss = -torch.sum(policies * log_policy, dim=1).mean()
        
        # Value loss: MSE
        value_loss = nn.functional.mse_loss(pred_value, values)
        
        # Total loss
        total_loss = policy_loss + value_loss
        
        # Backward pass
        total_loss.backward()
        optimizer.step()
        
        total_loss_sum += total_loss.item()
        policy_loss_sum += policy_loss.item()
        value_loss_sum += value_loss.item()
        num_batches += 1
    
    return (
        total_loss_sum / num_batches,
        policy_loss_sum / num_batches,
        value_loss_sum / num_batches,
    )


def train(
    network: PolicyValueNetwork,
    num_iterations: int = 10,
    games_per_iteration: int = 100,
    simulations_per_move: int = 200,
    epochs_per_iteration: int = 5,
    batch_size: int = 64,
    learning_rate: float = 0.001,
    output_dir: str = "checkpoints",
    device: torch.device = None,
    parallel: bool = True,
    num_workers: int = None,
    lr_decay: float = 0.95,
    switch_to_network_at: int = 10,
    parallel_network: bool = False,
    use_wandb: bool = False,
    start_iteration: int = 0,
    replay_window: int = 3,
    resume_checkpoint: dict = None,
) -> PolicyValueNetwork:
    """
    Main training loop.

    Each iteration:
    1. Generate new self-play games
    2. Train on all accumulated data
    3. Save checkpoint

    Args:
        lr_decay: Learning rate decay per iteration (0.95 = 5% decay each iteration)
        switch_to_network_at: After this many iterations, switch from parallel heuristic
                              to sequential network-guided self-play for better quality
        parallel_network: Use threaded parallel with shared inference server (MPS optimized)
        use_wandb: Enable Weights & Biases logging
        start_iteration: Starting iteration number (for resumed training)
    """
    if device is None:
        device = get_device()

    network = network.to(device)

    # Apply torch.compile for MPS optimization (significant speedup on Apple Silicon)
    if device.type == "mps" and hasattr(torch, "compile"):
        try:
            network = torch.compile(network, backend="inductor")
            print("  Applied torch.compile(backend='inductor') for MPS optimization")
        except Exception as e:
            print(f"  torch.compile not available: {e}")

    optimizer = optim.Adam(network.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ExponentialLR(optimizer, gamma=lr_decay)

    # Restore optimizer/scheduler state for seamless resume
    if resume_checkpoint is not None:
        if "optimizer_state_dict" in resume_checkpoint:
            optimizer.load_state_dict(resume_checkpoint["optimizer_state_dict"])
            print(f"  Restored optimizer state (LR: {optimizer.param_groups[0]['lr']:.6f})")
        if "scheduler_state_dict" in resume_checkpoint:
            scheduler.load_state_dict(resume_checkpoint["scheduler_state_dict"])
            print(f"  Restored scheduler state")

    os.makedirs(output_dir, exist_ok=True)
    
    # Accumulated training data (limit to recent iterations to avoid stale value targets)
    all_states = []
    all_policies = []
    all_values = []
    
    for iteration in range(num_iterations):
        global_iteration = start_iteration + iteration + 1
        print(f"\n=== Iteration {iteration + 1}/{num_iterations} (global: {global_iteration}) ===")
        current_lr = optimizer.param_groups[0]['lr']
        print(f"Learning rate: {current_lr:.6f}")
        
        # Switch to network-guided self-play after initial iterations
        use_parallel = parallel and (iteration < switch_to_network_at)
        use_parallel_network = parallel_network and not use_parallel
        if iteration == switch_to_network_at and parallel:
            if parallel_network:
                print("Switching to parallel network-guided self-play (threaded with inference server)")
            else:
                print("Switching to network-guided self-play for better quality data")

        # Adaptive temperature: start exploratory, become more greedy
        temperature = max(0.5, 1.0 - iteration * 0.02)

        # Generate new games
        if use_parallel:
            mode_str = f"parallel ({num_workers or 'auto'} workers)"
        elif use_parallel_network:
            mode_str = f"parallel network ({num_workers or 4} threads)"
        else:
            mode_str = "network-guided"
        print(f"Generating {games_per_iteration} self-play games ({mode_str}, temp={temperature:.2f})...")
        start_time = time.time()

        states, policies, values = generate_training_data(
            network=network,
            num_games=games_per_iteration,
            simulations_per_move=simulations_per_move,
            temperature=temperature,
            parallel=use_parallel,
            num_workers=num_workers,
            parallel_network=use_parallel_network,
        )
        
        elapsed = time.time() - start_time
        games_per_sec = games_per_iteration / elapsed if elapsed > 0 else 0
        print(f"Generated {len(states)} samples in {elapsed:.1f}s ({games_per_sec:.1f} games/s)")
        
        # Add to accumulated data
        all_states.append(states)
        all_policies.append(policies)
        all_values.append(values)

        # Trim to keep only last N iterations (avoid stale value targets)
        while len(all_states) > replay_window:
            all_states.pop(0)
            all_policies.pop(0)
            all_values.pop(0)

        # Create dataset from accumulated data
        combined_states = np.concatenate(all_states)
        combined_policies = np.concatenate(all_policies)
        combined_values = np.concatenate(all_values)
        
        dataset = TensorDataset(
            torch.from_numpy(combined_states),
            torch.from_numpy(combined_policies),
            torch.from_numpy(combined_values),
        )
        # num_workers=0 for MPS - multiprocess overhead exceeds benefits for small tensors
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0)
        
        # Train
        print(f"Training on {len(combined_states)} samples...")
        for epoch in range(epochs_per_iteration):
            total_loss, policy_loss, value_loss = train_epoch(
                network, optimizer, dataloader, device
            )
            print(f"  Epoch {epoch + 1}/{epochs_per_iteration}: "
                  f"loss={total_loss:.4f} (policy={policy_loss:.4f}, value={value_loss:.4f})")

            # Log epoch metrics to wandb
            if use_wandb and WANDB_AVAILABLE:
                metrics = {
                    "epoch": (iteration * epochs_per_iteration) + epoch + 1,
                    "iteration": global_iteration,
                    "loss/total": total_loss,
                    "loss/policy": policy_loss,
                    "loss/value": value_loss,
                    "learning_rate": current_lr,
                    "samples": len(combined_states),
                    "games_per_sec": games_per_sec,
                }
                wandb.log(metrics)
                print(f"    [wandb] logged: loss={total_loss:.4f}")

        # Step the learning rate scheduler
        scheduler.step()

        # Save checkpoint
        checkpoint_path = os.path.join(output_dir, f"checkpoint_{global_iteration}.pt")
        torch.save({
            "iteration": global_iteration,
            "model_state_dict": network.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
        }, checkpoint_path)
        print(f"Saved checkpoint to {checkpoint_path}")

        # Log checkpoint as wandb artifact for version control
        if use_wandb:
            artifact = wandb.Artifact(
                name=f"checkpoint-{global_iteration}",
                type="model",
                metadata={
                    "iteration": global_iteration,
                    "loss": total_loss,
                    "policy_loss": policy_loss,
                    "value_loss": value_loss,
                    "learning_rate": current_lr,
                },
            )
            artifact.add_file(checkpoint_path)
            wandb.log_artifact(artifact)
            print(f"    [wandb] logged artifact: checkpoint-{global_iteration}")
    
    return network


def export_weights(network: PolicyValueNetwork, output_path: str) -> None:
    """Export network weights to JSON format for WASM loading."""
    weights = network.export_weights()
    
    # Save as JSON
    with open(output_path, "w") as f:
        json.dump(weights.tolist(), f)
    
    print(f"Exported {len(weights)} weights to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Train Knucklebones AI")
    parser.add_argument("--iterations", type=int, default=10, help="Number of training iterations")
    parser.add_argument("--games", type=int, default=100, help="Games per iteration")
    parser.add_argument("--simulations", type=int, default=200, help="MCTS simulations per move")
    parser.add_argument("--epochs", type=int, default=5, help="Training epochs per iteration")
    parser.add_argument("--batch-size", type=int, default=128, help="Training batch size (128 optimal for MPS)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--lr-decay", type=float, default=0.95, help="LR decay per iteration (0.95 = 5%% decay)")
    parser.add_argument("--output-dir", type=str, default="checkpoints", help="Output directory")
    parser.add_argument("--export", type=str, default="weights.json", help="Export weights path")
    parser.add_argument("--resume", type=str, default=None, help="Resume from checkpoint")
    parser.add_argument("--no-parallel", action="store_true", help="Disable parallel self-play entirely")
    parser.add_argument("--parallel-network", action="store_true",
                        help="Use threaded parallel with shared inference server (faster network-guided)")
    parser.add_argument("--workers", type=int, default=None, help="Number of parallel workers/threads")
    parser.add_argument("--switch-at", type=int, default=10,
                        help="Switch from parallel to network-guided self-play after N iterations")
    parser.add_argument("--wandb", action="store_true", help="Enable Weights & Biases logging")
    parser.add_argument("--wandb-project", type=str, default="knucklebones", help="W&B project name")
    parser.add_argument("--wandb-name", type=str, default=None, help="W&B run name")
    parser.add_argument("--replay-window", type=int, default=3,
                        help="Number of iterations to keep in replay buffer (default: 3)")

    args = parser.parse_args()
    
    # Create or load network
    network = create_network()
    start_iteration = 0
    resume_checkpoint = None

    # Detect best device
    device = get_device()

    if args.resume:
        print(f"Resuming from {args.resume}")
        # Map checkpoint to current device (handles MPS->CUDA or CUDA->MPS transfers)
        resume_checkpoint = torch.load(args.resume, weights_only=False, map_location=device)
        state_dict = resume_checkpoint["model_state_dict"]
        # Handle state dicts from torch.compile() wrapped models
        if any(k.startswith("_orig_mod.") for k in state_dict.keys()):
            state_dict = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}
        network.load_state_dict(state_dict)
        start_iteration = resume_checkpoint.get("iteration", 0)
        print(f"  Resuming from iteration {start_iteration}")
    print(f"Using device: {device}")
    if device.type == "mps":
        print("  (Apple Silicon GPU acceleration enabled)")
    elif device.type == "cuda":
        print(f"  (CUDA GPU: {torch.cuda.get_device_name(0)})")
    
    parallel = not args.no_parallel
    parallel_network = args.parallel_network
    if parallel:
        workers = args.workers or min(cpu_count(), 8)
        if parallel_network:
            print(f"Parallel self-play for first {args.switch_at} iterations, then parallel network-guided")
            print(f"  Workers: {workers}, then {args.workers or 4} threads with inference server")
        else:
            print(f"Parallel self-play for first {args.switch_at} iterations, then network-guided")
            print(f"  Workers: {workers}")
    else:
        if parallel_network:
            print(f"Parallel network-guided self-play ({args.workers or 4} threads with inference server)")
        else:
            print("Network-guided self-play (slower but higher quality)")

    # Initialize wandb if enabled
    use_wandb = args.wandb and WANDB_AVAILABLE
    if args.wandb and not WANDB_AVAILABLE:
        print("Warning: --wandb flag set but wandb not installed. Run: pip install wandb")
    if use_wandb:
        wandb.init(
            project=args.wandb_project,
            name=args.wandb_name,
            config={
                "iterations": args.iterations,
                "games_per_iteration": args.games,
                "simulations_per_move": args.simulations,
                "epochs_per_iteration": args.epochs,
                "batch_size": args.batch_size,
                "learning_rate": args.lr,
                "lr_decay": args.lr_decay,
                "parallel": parallel,
                "parallel_network": parallel_network,
                "workers": args.workers,
                "switch_at": args.switch_at,
                "device": str(device),
                "start_iteration": start_iteration,
                "replay_window": args.replay_window,
            },
            resume="allow",
        )
        print(f"Weights & Biases logging enabled: {wandb.run.url}")

    network = train(
        network=network,
        num_iterations=args.iterations,
        games_per_iteration=args.games,
        simulations_per_move=args.simulations,
        epochs_per_iteration=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        output_dir=args.output_dir,
        device=device,
        parallel=parallel,
        num_workers=args.workers,
        lr_decay=args.lr_decay,
        switch_to_network_at=args.switch_at,
        parallel_network=parallel_network,
        use_wandb=use_wandb,
        start_iteration=start_iteration,
        replay_window=args.replay_window,
        resume_checkpoint=resume_checkpoint,
    )

    # Finish wandb run
    if use_wandb:
        wandb.finish()

    # Export weights
    export_path = os.path.join(args.output_dir, args.export)
    export_weights(network, export_path)

    print("\nTraining complete!")


if __name__ == "__main__":
    main()
