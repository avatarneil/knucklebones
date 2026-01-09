"""
Knucklebones Game Logic for Self-Play Training

This module implements the core game logic needed for self-play data generation.
"""

import numpy as np
from typing import Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum
import random


class Player(Enum):
    PLAYER1 = 0
    PLAYER2 = 1


class GamePhase(Enum):
    ROLLING = "rolling"
    PLACING = "placing"
    ENDED = "ended"


@dataclass
class GameState:
    """Represents the current state of a Knucklebones game."""
    # Each grid is 3 columns x 3 rows, values 0-6 (0 = empty)
    grid1: np.ndarray  # shape (3, 3)
    grid2: np.ndarray  # shape (3, 3)
    current_player: Player
    current_die: Optional[int]  # 1-6 or None
    phase: GamePhase
    
    @classmethod
    def new_game(cls) -> "GameState":
        """Create a new game state with player 1 to roll."""
        return cls(
            grid1=np.zeros((3, 3), dtype=np.int8),
            grid2=np.zeros((3, 3), dtype=np.int8),
            current_player=Player.PLAYER1,
            current_die=None,
            phase=GamePhase.ROLLING,
        )
    
    def copy(self) -> "GameState":
        """Create a deep copy of the game state."""
        return GameState(
            grid1=self.grid1.copy(),
            grid2=self.grid2.copy(),
            current_player=self.current_player,
            current_die=self.current_die,
            phase=self.phase,
        )
    
    def get_current_grid(self) -> np.ndarray:
        """Get the grid of the current player."""
        return self.grid1 if self.current_player == Player.PLAYER1 else self.grid2
    
    def get_opponent_grid(self) -> np.ndarray:
        """Get the grid of the opponent."""
        return self.grid2 if self.current_player == Player.PLAYER1 else self.grid1


def calculate_column_score(column: np.ndarray) -> int:
    """Calculate the score for a single column."""
    counts = np.zeros(7, dtype=np.int32)  # indices 1-6 used
    for v in column:
        if v > 0:
            counts[v] += 1
    
    total = 0
    for value in range(1, 7):
        count = counts[value]
        total += value * count * count
    return total


def calculate_grid_score(grid: np.ndarray) -> int:
    """Calculate the total score for a grid."""
    total = 0
    for col in range(3):
        total += calculate_column_score(grid[col])
    return total


def is_column_full(grid: np.ndarray, col: int) -> bool:
    """Check if a column is full."""
    return np.all(grid[col] != 0)


def is_grid_full(grid: np.ndarray) -> bool:
    """Check if a grid is completely full."""
    return np.all(grid != 0)


def get_legal_columns(state: GameState) -> List[int]:
    """Get list of legal column indices (not full)."""
    grid = state.get_current_grid()
    return [col for col in range(3) if not is_column_full(grid, col)]


def get_empty_row(grid: np.ndarray, col: int) -> Optional[int]:
    """Get the first empty row in a column, or None if full."""
    for row in range(3):
        if grid[col, row] == 0:
            return row
    return None


def roll_die() -> int:
    """Roll a die (1-6)."""
    return random.randint(1, 6)


def apply_roll(state: GameState, die_value: int) -> GameState:
    """Apply a die roll to transition from rolling to placing phase."""
    new_state = state.copy()
    new_state.current_die = die_value
    new_state.phase = GamePhase.PLACING
    return new_state


def apply_move(state: GameState, col: int) -> Optional[GameState]:
    """Apply a move (place die in column) and return the new state."""
    if state.phase != GamePhase.PLACING or state.current_die is None:
        return None
    
    die_value = state.current_die
    new_state = state.copy()
    
    # Get grids
    if state.current_player == Player.PLAYER1:
        my_grid = new_state.grid1
        opp_grid = new_state.grid2
    else:
        my_grid = new_state.grid2
        opp_grid = new_state.grid1
    
    # Find empty row in column
    row = get_empty_row(my_grid, col)
    if row is None:
        return None  # Column is full
    
    # Place die
    my_grid[col, row] = die_value
    
    # Remove matching dice from opponent's column
    opp_col = opp_grid[col]
    mask = opp_col != die_value
    # Compact the column (remove matching, shift down)
    remaining = opp_col[mask]
    new_col = np.zeros(3, dtype=np.int8)
    new_col[:len(remaining)] = remaining
    opp_grid[col] = new_col
    
    # Check if game ended
    if is_grid_full(my_grid):
        new_state.phase = GamePhase.ENDED
        new_state.current_die = None
        return new_state
    
    # Switch player
    new_state.current_player = Player.PLAYER2 if state.current_player == Player.PLAYER1 else Player.PLAYER1
    new_state.current_die = None
    new_state.phase = GamePhase.ROLLING
    
    return new_state


def get_winner(state: GameState) -> Optional[Player]:
    """Get the winner of a finished game, or None if tie."""
    if state.phase != GamePhase.ENDED:
        return None
    
    score1 = calculate_grid_score(state.grid1)
    score2 = calculate_grid_score(state.grid2)
    
    if score1 > score2:
        return Player.PLAYER1
    elif score2 > score1:
        return Player.PLAYER2
    else:
        return None  # Tie


def get_game_result(state: GameState, player: Player) -> float:
    """Get the game result from a player's perspective: 1.0 win, 0.0 tie, -1.0 loss."""
    winner = get_winner(state)
    if winner is None:
        return 0.0
    elif winner == player:
        return 1.0
    else:
        return -1.0


def encode_state(state: GameState) -> np.ndarray:
    """
    Encode game state into feature vector matching WASM encoding.
    
    Features (43 total):
    - 18 features for grid1: counts per die value (1-6) per column (3)
    - 18 features for grid2: same format
    - 1 feature for current player (0 or 1)
    - 6 features for current die (one-hot)
    
    All count features are normalized by max possible (3).
    """
    features = np.zeros(43, dtype=np.float32)
    idx = 0
    
    # Encode grid1
    for col in range(3):
        counts = np.zeros(7, dtype=np.int32)
        for row in range(3):
            v = state.grid1[col, row]
            if v > 0:
                counts[v] += 1
        for die in range(1, 7):
            features[idx] = counts[die] / 3.0
            idx += 1
    
    # Encode grid2
    for col in range(3):
        counts = np.zeros(7, dtype=np.int32)
        for row in range(3):
            v = state.grid2[col, row]
            if v > 0:
                counts[v] += 1
        for die in range(1, 7):
            features[idx] = counts[die] / 3.0
            idx += 1
    
    # Current player
    features[idx] = 0.0 if state.current_player == Player.PLAYER1 else 1.0
    idx += 1
    
    # Current die one-hot
    if state.current_die is not None and 1 <= state.current_die <= 6:
        features[idx + state.current_die - 1] = 1.0
    
    return features


def evaluate_state(state: GameState, player: Player) -> float:
    """
    Simple heuristic evaluation of a state from a player's perspective.
    Returns value in roughly [-1, 1] range.
    """
    if state.phase == GamePhase.ENDED:
        return get_game_result(state, player)
    
    my_grid = state.grid1 if player == Player.PLAYER1 else state.grid2
    opp_grid = state.grid2 if player == Player.PLAYER1 else state.grid1
    
    my_score = calculate_grid_score(my_grid)
    opp_score = calculate_grid_score(opp_grid)
    
    # Normalize by typical max score difference
    diff = (my_score - opp_score) / 200.0
    return np.clip(diff, -1.0, 1.0)
