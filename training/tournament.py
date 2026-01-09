#!/usr/bin/env python3
"""
Tournament Evaluation Script

Run tournaments between different AI agents to measure strength.
Produces win rates and estimated Elo ratings.
"""

import argparse
import json
import os
import random
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from tqdm import tqdm

from game import (
    GameState, Player, GamePhase,
    get_legal_columns, apply_move, apply_roll, roll_die,
    encode_state, evaluate_state, get_game_result, calculate_grid_score
)
from mcts import MCTS
from network import PolicyValueNetwork, create_network


class AgentType(Enum):
    RANDOM = "random"
    GREEDY = "greedy"
    MCTS_HEURISTIC = "mcts_heuristic"
    MCTS_NEURAL = "mcts_neural"


@dataclass
class Agent:
    """Represents an AI agent."""
    name: str
    agent_type: AgentType
    network: Optional[PolicyValueNetwork] = None
    simulations: int = 200
    
    def get_move(self, state: GameState) -> int:
        """Get the agent's move for the current state."""
        legal_cols = get_legal_columns(state)
        if not legal_cols:
            return 0
        if len(legal_cols) == 1:
            return legal_cols[0]
        
        if self.agent_type == AgentType.RANDOM:
            return random.choice(legal_cols)
        
        elif self.agent_type == AgentType.GREEDY:
            # Pick move with best immediate score gain
            best_col = legal_cols[0]
            best_score = float("-inf")
            
            for col in legal_cols:
                new_state = apply_move(state, col)
                if new_state is None:
                    continue
                
                # Evaluate from current player's perspective
                if state.current_player == Player.PLAYER1:
                    score = calculate_grid_score(new_state.grid1) - calculate_grid_score(state.grid1)
                    opp_loss = calculate_grid_score(state.grid2) - calculate_grid_score(new_state.grid2)
                else:
                    score = calculate_grid_score(new_state.grid2) - calculate_grid_score(state.grid2)
                    opp_loss = calculate_grid_score(state.grid1) - calculate_grid_score(new_state.grid1)
                
                total_score = score + opp_loss
                if total_score > best_score:
                    best_score = total_score
                    best_col = col
            
            return best_col
        
        elif self.agent_type == AgentType.MCTS_HEURISTIC:
            mcts = MCTS(network=None, simulations=self.simulations, temperature=0)
            action, _ = mcts.search(state)
            return action
        
        elif self.agent_type == AgentType.MCTS_NEURAL:
            if self.network is None:
                # Fall back to heuristic MCTS
                mcts = MCTS(network=None, simulations=self.simulations, temperature=0)
            else:
                mcts = MCTS(network=self.network, simulations=self.simulations, temperature=0)
            action, _ = mcts.search(state)
            return action
        
        return legal_cols[0]


def play_game(agent1: Agent, agent2: Agent) -> Tuple[Optional[Player], int, int]:
    """
    Play a game between two agents.
    
    Returns:
        winner: Player.PLAYER1, Player.PLAYER2, or None for tie
        score1: Final score for player 1
        score2: Final score for player 2
    """
    state = GameState.new_game()
    
    while state.phase != GamePhase.ENDED:
        # Roll die if needed
        if state.phase == GamePhase.ROLLING:
            die_value = roll_die()
            state = apply_roll(state, die_value)
            continue
        
        # Get agent's move
        agent = agent1 if state.current_player == Player.PLAYER1 else agent2
        action = agent.get_move(state)
        
        # Apply move
        new_state = apply_move(state, action)
        if new_state is None:
            break
        state = new_state
    
    score1 = calculate_grid_score(state.grid1)
    score2 = calculate_grid_score(state.grid2)
    
    if score1 > score2:
        winner = Player.PLAYER1
    elif score2 > score1:
        winner = Player.PLAYER2
    else:
        winner = None
    
    return winner, score1, score2


def run_tournament(
    agent1: Agent,
    agent2: Agent,
    num_games: int = 100,
    show_progress: bool = True,
) -> Dict:
    """
    Run a tournament between two agents.
    
    Each agent plays as both player 1 and player 2 for fairness.
    
    Returns:
        Dictionary with results
    """
    wins1 = 0
    wins2 = 0
    ties = 0
    scores1 = []
    scores2 = []
    
    games_iter = range(num_games)
    if show_progress:
        games_iter = tqdm(games_iter, desc=f"{agent1.name} vs {agent2.name}")
    
    for i in games_iter:
        # Alternate who plays as player 1
        if i % 2 == 0:
            a1, a2 = agent1, agent2
            winner, s1, s2 = play_game(a1, a2)
            scores1.append(s1)
            scores2.append(s2)
            
            if winner == Player.PLAYER1:
                wins1 += 1
            elif winner == Player.PLAYER2:
                wins2 += 1
            else:
                ties += 1
        else:
            a1, a2 = agent2, agent1
            winner, s1, s2 = play_game(a1, a2)
            scores1.append(s2)  # agent1 played as player 2
            scores2.append(s1)
            
            if winner == Player.PLAYER2:
                wins1 += 1
            elif winner == Player.PLAYER1:
                wins2 += 1
            else:
                ties += 1
    
    total_games = wins1 + wins2 + ties
    winrate1 = wins1 / total_games if total_games > 0 else 0.5
    
    # Estimate Elo difference from winrate
    # Elo formula: expected = 1 / (1 + 10^((rating2 - rating1) / 400))
    # Rearranging: rating_diff = 400 * log10((1 - winrate) / winrate)
    if 0 < winrate1 < 1:
        elo_diff = 400 * np.log10((1 - winrate1) / winrate1)
        elo_diff = -elo_diff  # Make positive mean agent1 is stronger
    else:
        elo_diff = 400 if winrate1 >= 1 else -400
    
    return {
        "agent1": agent1.name,
        "agent2": agent2.name,
        "wins1": wins1,
        "wins2": wins2,
        "ties": ties,
        "total_games": total_games,
        "winrate1": winrate1,
        "elo_difference": elo_diff,
        "avg_score1": np.mean(scores1),
        "avg_score2": np.mean(scores2),
    }


def print_results(results: Dict) -> None:
    """Print tournament results."""
    print(f"\n{'='*50}")
    print(f"Tournament: {results['agent1']} vs {results['agent2']}")
    print(f"{'='*50}")
    print(f"Games played: {results['total_games']}")
    print(f"  {results['agent1']}: {results['wins1']} wins ({results['winrate1']*100:.1f}%)")
    print(f"  {results['agent2']}: {results['wins2']} wins ({(1-results['winrate1'])*100:.1f}%)")
    print(f"  Ties: {results['ties']}")
    print(f"Elo difference: {results['elo_difference']:+.0f}")
    print(f"Avg scores: {results['agent1']}={results['avg_score1']:.1f}, {results['agent2']}={results['avg_score2']:.1f}")


def main():
    parser = argparse.ArgumentParser(description="Run AI tournament")
    parser.add_argument("--games", type=int, default=100, help="Number of games per matchup")
    parser.add_argument("--simulations", type=int, default=200, help="MCTS simulations per move")
    parser.add_argument("--weights", type=str, default=None, help="Path to neural network weights")
    parser.add_argument("--output", type=str, default=None, help="Output JSON file for results")
    
    args = parser.parse_args()
    
    # Create agents
    agents = [
        Agent("Random", AgentType.RANDOM),
        Agent("Greedy", AgentType.GREEDY),
        Agent(f"MCTS-Heuristic-{args.simulations}", AgentType.MCTS_HEURISTIC, simulations=args.simulations),
    ]
    
    # Add neural agent if weights provided
    if args.weights:
        network = create_network()
        with open(args.weights, "r") as f:
            weights = np.array(json.load(f))
        if network.load_weights_from_array(weights):
            print(f"Loaded neural network weights from {args.weights}")
            agents.append(Agent(f"MCTS-Neural-{args.simulations}", AgentType.MCTS_NEURAL, 
                               network=network, simulations=args.simulations))
        else:
            print(f"Failed to load weights from {args.weights}")
    
    # Run round-robin tournament
    all_results = []
    
    for i, agent1 in enumerate(agents):
        for agent2 in agents[i+1:]:
            results = run_tournament(agent1, agent2, num_games=args.games)
            print_results(results)
            all_results.append(results)
    
    # Calculate Elo ratings
    print(f"\n{'='*50}")
    print("Estimated Elo Ratings (Random = 1000)")
    print(f"{'='*50}")
    
    # Simple estimation: set Random to 1000 and calculate others from winrates
    elo_ratings = {"Random": 1000}
    
    for results in all_results:
        if results["agent1"] == "Random":
            elo_ratings[results["agent2"]] = 1000 - results["elo_difference"]
        elif results["agent2"] == "Random":
            elo_ratings[results["agent1"]] = 1000 + results["elo_difference"]
    
    # Fill in remaining from transitive relationships
    for results in all_results:
        a1, a2 = results["agent1"], results["agent2"]
        if a1 in elo_ratings and a2 not in elo_ratings:
            elo_ratings[a2] = elo_ratings[a1] - results["elo_difference"]
        elif a2 in elo_ratings and a1 not in elo_ratings:
            elo_ratings[a1] = elo_ratings[a2] + results["elo_difference"]
    
    # Sort and print
    sorted_agents = sorted(elo_ratings.items(), key=lambda x: x[1], reverse=True)
    for name, elo in sorted_agents:
        print(f"  {name}: {elo:.0f}")
    
    # Save results
    if args.output:
        output_data = {
            "tournaments": all_results,
            "elo_ratings": elo_ratings,
        }
        with open(args.output, "w") as f:
            json.dump(output_data, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
