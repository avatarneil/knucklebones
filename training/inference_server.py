"""
Batched Inference Server for Parallel Network-Guided MCTS

Enables multiple MCTS workers to share a single network with batched inference,
providing significant speedup on MPS/GPU backends.
"""

import numpy as np
import torch
from queue import Queue, Empty
from threading import Thread, Lock, Event
from typing import Optional, Tuple
import time

from game import GameState, encode_state
from network import PolicyValueNetwork


class InferenceServer:
    """
    Batched inference server that collects requests from multiple workers
    and processes them in efficient batches on GPU/MPS.

    Usage:
        server = InferenceServer(network, batch_size=32)
        server.start()

        # From worker threads:
        policy, value = server.infer(state)

        server.stop()
    """

    def __init__(
        self,
        network: PolicyValueNetwork,
        batch_size: int = 32,
        max_wait_ms: float = 2.0,
    ):
        """
        Initialize the inference server.

        Args:
            network: The policy-value network to use
            batch_size: Maximum batch size for inference
            max_wait_ms: Maximum time to wait for batch to fill (milliseconds)
        """
        self.network = network
        self.network.eval()
        self.device = next(network.parameters()).device
        self.batch_size = batch_size
        self.max_wait_ms = max_wait_ms

        self._request_queue: Queue = Queue()
        self._running = False
        self._thread: Optional[Thread] = None
        self._stats = {"batches": 0, "requests": 0, "total_batch_size": 0}

    def start(self) -> None:
        """Start the inference server thread."""
        if self._running:
            return
        self._running = True
        self._thread = Thread(target=self._inference_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stop the inference server."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None

    def infer(self, state: GameState) -> Tuple[np.ndarray, float]:
        """
        Request inference for a state. Blocks until result is ready.

        Thread-safe: can be called from multiple worker threads.

        Args:
            state: Game state to evaluate

        Returns:
            policy: Array of shape (3,) with action probabilities
            value: Value estimate in [-1, 1]
        """
        # Create result container
        result_event = Event()
        result_holder = {"policy": None, "value": None}

        # Encode state and submit request
        features = encode_state(state)
        self._request_queue.put((features, result_holder, result_event))

        # Wait for result
        result_event.wait()
        return result_holder["policy"], result_holder["value"]

    def infer_batch(self, states: list) -> Tuple[np.ndarray, np.ndarray]:
        """
        Request inference for multiple states. Blocks until all results ready.

        Args:
            states: List of GameState objects

        Returns:
            policies: Array of shape (n, 3)
            values: Array of shape (n,)
        """
        if not states:
            return np.empty((0, 3)), np.empty(0)

        # Create result containers for each state
        events = []
        holders = []

        for state in states:
            result_event = Event()
            result_holder = {"policy": None, "value": None}
            features = encode_state(state)
            self._request_queue.put((features, result_holder, result_event))
            events.append(result_event)
            holders.append(result_holder)

        # Wait for all results
        for event in events:
            event.wait()

        policies = np.array([h["policy"] for h in holders])
        values = np.array([h["value"] for h in holders])
        return policies, values

    def get_stats(self) -> dict:
        """Get server statistics."""
        stats = self._stats.copy()
        if stats["batches"] > 0:
            stats["avg_batch_size"] = stats["total_batch_size"] / stats["batches"]
        else:
            stats["avg_batch_size"] = 0
        return stats

    def _inference_loop(self) -> None:
        """Main inference loop - collects and processes batched requests."""
        while self._running:
            requests = []

            # Collect requests up to batch_size or max_wait
            start_time = time.perf_counter()

            while len(requests) < self.batch_size:
                elapsed_ms = (time.perf_counter() - start_time) * 1000

                # If we have requests and exceeded wait time, process them
                if elapsed_ms > self.max_wait_ms and requests:
                    break

                try:
                    # Short timeout to stay responsive
                    timeout = max(0.001, (self.max_wait_ms - elapsed_ms) / 1000)
                    req = self._request_queue.get(timeout=timeout)
                    requests.append(req)
                except Empty:
                    if requests:
                        break
                    continue

            if not requests:
                continue

            # Batch inference
            features_list = [r[0] for r in requests]
            features = np.stack(features_list)

            with torch.inference_mode():
                x = torch.from_numpy(features).float().to(self.device)
                log_policy, value = self.network(x)
                policies = torch.exp(log_policy).cpu().numpy()
                values = value.squeeze(-1).cpu().numpy()

            # Distribute results
            for i, (_, result_holder, result_event) in enumerate(requests):
                result_holder["policy"] = policies[i]
                result_holder["value"] = values[i].item() if values.ndim > 0 else values.item()
                result_event.set()

            # Update stats
            self._stats["batches"] += 1
            self._stats["requests"] += len(requests)
            self._stats["total_batch_size"] += len(requests)

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
        return False
