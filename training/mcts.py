"""
Monte Carlo Tree Search for Self-Play Training

Implements PUCT MCTS for generating training data with neural network guidance.
"""

import numpy as np
import torch
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from game import (
    GameState, Player, GamePhase,
    get_legal_columns, apply_move, apply_roll, roll_die,
    encode_state, evaluate_state, get_game_result
)
from network import PolicyValueNetwork


# MCTS hyperparameters
C_PUCT = 1.5  # Exploration constant
DEFAULT_SIMULATIONS = 800


@dataclass
class MCTSNode:
    """Node in the MCTS tree."""
    visits: int = 0
    total_value: float = 0.0
    prior: float = 0.0
    children: Dict[int, "MCTSNode"] = field(default_factory=dict)
    
    @property
    def mean_value(self) -> float:
        """Get mean value of this node."""
        if self.visits == 0:
            return 0.0
        return self.total_value / self.visits
    
    def puct_score(self, parent_visits: int) -> float:
        """Calculate PUCT score for this node."""
        q = self.mean_value
        u = C_PUCT * self.prior * np.sqrt(parent_visits) / (1 + self.visits)
        return q + u


class MCTS:
    """
    Monte Carlo Tree Search with neural network guidance.
    """
    
    def __init__(
        self,
        network: Optional[PolicyValueNetwork] = None,
        simulations: int = DEFAULT_SIMULATIONS,
        temperature: float = 1.0,
        batch_size: int = 64,
        inference_server: Optional["InferenceServer"] = None,
    ):
        """
        Initialize MCTS.

        Args:
            network: Policy-value network (uses heuristic if None)
            simulations: Number of simulations per move
            temperature: Temperature for action selection (higher = more exploration)
            batch_size: Batch size for parallel leaf evaluation (MPS optimization)
            inference_server: Optional shared inference server for parallel games
        """
        self.network = network
        self.simulations = simulations
        self.temperature = temperature
        self.batch_size = batch_size
        self.inference_server = inference_server
        self.root = MCTSNode()
        # Cache device reference to avoid repeated detection
        self._device = next(network.parameters()).device if network is not None else None
    
    def get_policy_value(self, state: GameState) -> Tuple[np.ndarray, float]:
        """
        Get policy and value from network, inference server, or heuristic.

        Returns:
            policy: Array of shape (3,) with probabilities for each column
            value: Value estimate in [-1, 1]
        """
        # Use inference server if available (for parallel games)
        if self.inference_server is not None:
            return self.inference_server.infer(state)
        elif self.network is not None:
            self.network.eval()
            with torch.inference_mode():
                features = encode_state(state)
                x = torch.from_numpy(features).float().to(self._device)
                policy, value = self.network.get_policy_value(x)
                return policy.cpu().numpy(), value.item()
        else:
            # Uniform policy, heuristic value
            policy = np.ones(3) / 3.0
            value = evaluate_state(state, state.current_player)
            return policy, value

    def get_policy_value_batched(
        self, states: List[GameState]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get policy and value for multiple states in a single batch.

        Optimized for MPS/GPU - amortizes inference overhead across batch.

        Args:
            states: List of GameState objects

        Returns:
            policies: Array of shape (batch_size, 3)
            values: Array of shape (batch_size,)
        """
        if not states:
            return np.empty((0, 3)), np.empty(0)

        # Use inference server if available (for parallel games)
        if self.inference_server is not None:
            return self.inference_server.infer_batch(states)
        elif self.network is not None:
            self.network.eval()
            with torch.inference_mode():
                features = np.stack([encode_state(s) for s in states])
                x = torch.from_numpy(features).float().to(self._device)
                log_policy, value = self.network(x)
                policies = torch.exp(log_policy).cpu().numpy()
                values = value.squeeze(-1).cpu().numpy()
                return policies, values
        else:
            # Heuristic fallback
            policies = np.ones((len(states), 3)) / 3.0
            values = np.array([evaluate_state(s, s.current_player) for s in states])
            return policies, values

    def expand(self, node: MCTSNode, state: GameState) -> None:
        """Expand a node by adding children for legal moves."""
        legal_cols = get_legal_columns(state)
        if not legal_cols:
            return
        
        # Get policy priors
        policy, _ = self.get_policy_value(state)
        
        # Mask and renormalize for legal moves
        mask = np.zeros(3)
        mask[legal_cols] = 1.0
        masked_policy = policy * mask
        sum_policy = masked_policy.sum()
        if sum_policy > 0:
            masked_policy /= sum_policy
        else:
            masked_policy[legal_cols] = 1.0 / len(legal_cols)
        
        # Create children
        for col in legal_cols:
            node.children[col] = MCTSNode(prior=masked_policy[col])
    
    def select_child(self, node: MCTSNode) -> Optional[int]:
        """Select best child according to PUCT."""
        if not node.children:
            return None

        best_action = None
        best_score = float("-inf")

        for action, child in node.children.items():
            score = child.puct_score(node.visits)
            if score > best_score:
                best_score = score
                best_action = action

        return best_action

    def _select_path(
        self, state: GameState, root_player: Player
    ) -> Tuple[
        List[Tuple[MCTSNode, Optional[int]]], Optional[MCTSNode], Optional[GameState], Optional[float]
    ]:
        """
        Select a path from root to leaf, applying virtual losses.

        Used by batched search to collect multiple leaves for batch evaluation.

        Args:
            state: Root game state
            root_player: Player from whose perspective to evaluate

        Returns:
            path: List of (node, action) tuples
            leaf_node: The leaf node needing expansion (or None if terminal)
            leaf_state: The game state at the leaf
            terminal_value: If terminal state reached, the game result (else None)
        """
        node = self.root
        path: List[Tuple[MCTSNode, Optional[int]]] = [(node, None)]
        current_state = state.copy()

        while True:
            node.visits += 1  # Virtual loss

            # Terminal state
            if current_state.phase == GamePhase.ENDED:
                value = get_game_result(current_state, root_player)
                return path, None, None, value

            # Handle rolling phase (chance node)
            if current_state.phase == GamePhase.ROLLING:
                die_value = roll_die()
                current_state = apply_roll(current_state, die_value)
                continue

            # Leaf node - needs expansion
            if not node.children:
                return path, node, current_state, None

            # Select action and descend
            action = self.select_child(node)
            if action is None:
                value = evaluate_state(current_state, root_player)
                return path, None, None, value

            new_state = apply_move(current_state, action)
            if new_state is None:
                value = evaluate_state(current_state, root_player)
                return path, None, None, value

            current_state = new_state
            node = node.children[action]
            path.append((node, action))

    def simulate(self, state: GameState, root_player: Player) -> float:
        """
        Run one MCTS simulation.
        
        Returns:
            Value from root_player's perspective
        """
        node = self.root
        path: List[Tuple[MCTSNode, Optional[int]]] = [(node, None)]
        current_state = state.copy()
        
        # Selection and expansion
        while True:
            node.visits += 1
            
            # Terminal state
            if current_state.phase == GamePhase.ENDED:
                value = get_game_result(current_state, root_player)
                break
            
            # Handle rolling phase (chance node)
            if current_state.phase == GamePhase.ROLLING:
                die_value = roll_die()
                current_state = apply_roll(current_state, die_value)
                continue
            
            # Expand if needed
            if not node.children:
                self.expand(node, current_state)
                
                if not node.children:
                    # No legal moves (shouldn't happen in normal play)
                    value = evaluate_state(current_state, root_player)
                    break
                
                # Evaluate with network and return
                _, value = self.get_policy_value(current_state)
                # Adjust for perspective
                if current_state.current_player != root_player:
                    value = -value
                break
            
            # Select action
            action = self.select_child(node)
            if action is None:
                value = evaluate_state(current_state, root_player)
                break
            
            # Apply move
            new_state = apply_move(current_state, action)
            if new_state is None:
                value = evaluate_state(current_state, root_player)
                break
            
            current_state = new_state
            node = node.children[action]
            path.append((node, action))
        
        # Backpropagation
        for node, _ in path:
            node.total_value += value
        
        return value
    
    def search(self, state: GameState) -> Tuple[int, np.ndarray]:
        """
        Run MCTS search and return best action and visit distribution.
        
        Args:
            state: Current game state
            
        Returns:
            action: Best action to take
            policy: Visit count distribution over actions (for training target)
        """
        # Reset root
        self.root = MCTSNode()
        
        legal_cols = get_legal_columns(state)
        if not legal_cols:
            return 0, np.zeros(3)
        
        if len(legal_cols) == 1:
            policy = np.zeros(3)
            policy[legal_cols[0]] = 1.0
            return legal_cols[0], policy
        
        # Expand root
        self.expand(self.root, state)

        # Run batched simulations for MPS/GPU efficiency
        root_player = state.current_player
        remaining = self.simulations

        while remaining > 0:
            current_batch = min(remaining, self.batch_size)

            # Collect paths and leaves for batch evaluation
            paths = []
            leaves = []  # (node, state, path_idx)
            leaf_states = []

            for i in range(current_batch):
                path, leaf_node, leaf_state, terminal_value = self._select_path(
                    state, root_player
                )

                if terminal_value is not None:
                    # Terminal state - backpropagate immediately
                    for node, _ in path:
                        node.total_value += terminal_value
                elif leaf_node is not None and leaf_state is not None:
                    # Leaf needs expansion and evaluation
                    self.expand(leaf_node, leaf_state)
                    paths.append(path)
                    leaves.append((leaf_node, leaf_state, len(paths) - 1))
                    leaf_states.append(leaf_state)

            # Batch evaluate all collected leaves
            if leaf_states:
                _, values = self.get_policy_value_batched(leaf_states)

                # Backpropagate each path with its value
                for idx, (leaf_node, leaf_state, path_idx) in enumerate(leaves):
                    value = values[idx]
                    # Adjust for perspective
                    if leaf_state.current_player != root_player:
                        value = -value
                    for node, _ in paths[path_idx]:
                        node.total_value += value

            remaining -= current_batch

        # Get visit counts
        visits = np.zeros(3)
        for action, child in self.root.children.items():
            visits[action] = child.visits
        
        # Select action based on temperature
        if self.temperature == 0:
            # Deterministic: pick highest visit count
            action = max(self.root.children.keys(), key=lambda a: self.root.children[a].visits)
            policy = np.zeros(3)
            policy[action] = 1.0
        else:
            # Sample from visit distribution with temperature
            visits_temp = visits ** (1.0 / self.temperature)
            policy = visits_temp / visits_temp.sum()
            action = np.random.choice(3, p=policy)
        
        return action, policy


def self_play_game(
    network: Optional[PolicyValueNetwork] = None,
    simulations: int = DEFAULT_SIMULATIONS,
    temperature: float = 1.0,
    temperature_threshold: int = 15,  # Use temp=0 after this many moves
    inference_server: Optional["InferenceServer"] = None,
) -> List[Tuple[np.ndarray, np.ndarray, float]]:
    """
    Play a complete game using MCTS self-play.

    Args:
        network: Policy-value network (ignored if inference_server provided)
        simulations: MCTS simulations per move
        temperature: Temperature for action selection
        temperature_threshold: Use temp=0 after this many moves
        inference_server: Optional shared inference server for parallel games

    Returns:
        List of (state_features, policy_target, value_target) tuples
    """
    state = GameState.new_game()
    mcts = MCTS(
        network=network,
        simulations=simulations,
        temperature=temperature,
        inference_server=inference_server,
    )
    
    history: List[Tuple[np.ndarray, np.ndarray, Player]] = []
    move_count = 0
    
    while state.phase != GamePhase.ENDED:
        # Roll die if needed
        if state.phase == GamePhase.ROLLING:
            die_value = roll_die()
            state = apply_roll(state, die_value)
            continue
        
        # Use lower temperature later in game for more deterministic play
        current_temp = temperature if move_count < temperature_threshold else 0.0
        mcts.temperature = current_temp
        
        # Get MCTS action and policy
        action, policy = mcts.search(state)
        
        # Record state and policy
        features = encode_state(state)
        history.append((features, policy, state.current_player))
        
        # Apply move
        new_state = apply_move(state, action)
        if new_state is None:
            break
        state = new_state
        move_count += 1
    
    # Get game result and create training samples
    samples = []
    for features, policy, player in history:
        value = get_game_result(state, player)
        samples.append((features, policy, value))
    
    return samples


if __name__ == "__main__":
    # Test self-play
    print("Running self-play game without network...")
    samples = self_play_game(network=None, simulations=100)
    print(f"Generated {len(samples)} training samples")
    
    if samples:
        features, policy, value = samples[0]
        print(f"First sample - Features shape: {features.shape}, Policy: {policy}, Value: {value}")
