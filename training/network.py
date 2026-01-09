"""
Policy-Value Network for Knucklebones

Architecture matches the WASM implementation:
- Input: 43 features (state encoding)
- Hidden: 128 neurons with ReLU
- Output: Policy (3 columns, softmax) + Value (tanh)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Tuple


# Network dimensions (must match WASM)
STATE_ENCODING_SIZE = 43
HIDDEN_SIZE = 128  # Doubled from 64 for more capacity
POLICY_OUTPUT_SIZE = 3


class PolicyValueNetwork(nn.Module):
    """
    Simple MLP for policy and value prediction.

    Architecture:
    - Linear: input (43) -> hidden (128)
    - ReLU activation
    - Policy head: Linear hidden (128) -> policy (3), then softmax
    - Value head: Linear hidden (128) -> value (1), then tanh
    """
    
    def __init__(self):
        super().__init__()
        
        # Shared layer
        self.fc1 = nn.Linear(STATE_ENCODING_SIZE, HIDDEN_SIZE)
        
        # Policy head
        self.policy_head = nn.Linear(HIDDEN_SIZE, POLICY_OUTPUT_SIZE)
        
        # Value head
        self.value_head = nn.Linear(HIDDEN_SIZE, 1)
        
        # Initialize with small weights (Xavier)
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights using Xavier initialization."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                nn.init.zeros_(module.bias)
    
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        
        Args:
            x: Input tensor of shape (batch, 43)
            
        Returns:
            policy: Log probabilities of shape (batch, 3)
            value: Value estimates of shape (batch, 1)
        """
        # Shared hidden layer
        h = F.relu(self.fc1(x))
        
        # Policy head (log softmax for numerical stability in training)
        policy_logits = self.policy_head(h)
        policy = F.log_softmax(policy_logits, dim=-1)
        
        # Value head
        value = torch.tanh(self.value_head(h))
        
        return policy, value
    
    def get_policy_value(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Get policy probabilities and value for inference.
        
        Args:
            x: Input tensor of shape (batch, 43) or (43,)
            
        Returns:
            policy: Probabilities of shape (batch, 3) or (3,)
            value: Value estimates of shape (batch, 1) or (1,)
        """
        squeeze = x.dim() == 1
        if squeeze:
            x = x.unsqueeze(0)
        
        log_policy, value = self.forward(x)
        policy = torch.exp(log_policy)
        
        if squeeze:
            policy = policy.squeeze(0)
            value = value.squeeze(0)
        
        return policy, value
    
    def get_weight_count(self) -> int:
        """Get total number of weights in the network."""
        return sum(p.numel() for p in self.parameters())
    
    def export_weights(self) -> np.ndarray:
        """
        Export weights as a flat array for loading into WASM.
        
        Format: [w1..., b1..., w_policy..., b_policy..., w_value..., b_value]
        
        Note: PyTorch uses (out_features, in_features) for weight matrices,
        but our WASM expects (HIDDEN_SIZE × STATE_ENCODING_SIZE) which is the same.
        """
        weights = []
        
        # w1: fc1 weights, shape (HIDDEN_SIZE, STATE_ENCODING_SIZE)
        w1 = self.fc1.weight.detach().cpu().numpy().flatten()
        weights.extend(w1)
        
        # b1: fc1 bias, shape (HIDDEN_SIZE,)
        b1 = self.fc1.bias.detach().cpu().numpy()
        weights.extend(b1)
        
        # w_policy: policy head weights, shape (POLICY_OUTPUT_SIZE, HIDDEN_SIZE)
        w_policy = self.policy_head.weight.detach().cpu().numpy().flatten()
        weights.extend(w_policy)
        
        # b_policy: policy head bias, shape (POLICY_OUTPUT_SIZE,)
        b_policy = self.policy_head.bias.detach().cpu().numpy()
        weights.extend(b_policy)
        
        # w_value: value head weights, shape (1, HIDDEN_SIZE) -> flatten to (HIDDEN_SIZE,)
        w_value = self.value_head.weight.detach().cpu().numpy().flatten()
        weights.extend(w_value)
        
        # b_value: value head bias, scalar
        b_value = self.value_head.bias.detach().cpu().numpy()[0]
        weights.append(b_value)
        
        return np.array(weights, dtype=np.float64)
    
    def load_weights_from_array(self, weights: np.ndarray) -> bool:
        """
        Load weights from a flat array.
        
        Args:
            weights: Flat array of weights in export format
            
        Returns:
            True if successful, False otherwise
        """
        expected_size = (
            HIDDEN_SIZE * STATE_ENCODING_SIZE +  # w1
            HIDDEN_SIZE +                         # b1
            POLICY_OUTPUT_SIZE * HIDDEN_SIZE +    # w_policy
            POLICY_OUTPUT_SIZE +                  # b_policy
            HIDDEN_SIZE +                         # w_value
            1                                     # b_value
        )
        
        if len(weights) != expected_size:
            return False
        
        idx = 0
        
        # w1
        w1_size = HIDDEN_SIZE * STATE_ENCODING_SIZE
        w1 = weights[idx:idx + w1_size].reshape(HIDDEN_SIZE, STATE_ENCODING_SIZE)
        self.fc1.weight.data = torch.from_numpy(w1.astype(np.float32))
        idx += w1_size
        
        # b1
        b1 = weights[idx:idx + HIDDEN_SIZE]
        self.fc1.bias.data = torch.from_numpy(b1.astype(np.float32))
        idx += HIDDEN_SIZE
        
        # w_policy
        w_policy_size = POLICY_OUTPUT_SIZE * HIDDEN_SIZE
        w_policy = weights[idx:idx + w_policy_size].reshape(POLICY_OUTPUT_SIZE, HIDDEN_SIZE)
        self.policy_head.weight.data = torch.from_numpy(w_policy.astype(np.float32))
        idx += w_policy_size
        
        # b_policy
        b_policy = weights[idx:idx + POLICY_OUTPUT_SIZE]
        self.policy_head.bias.data = torch.from_numpy(b_policy.astype(np.float32))
        idx += POLICY_OUTPUT_SIZE
        
        # w_value
        w_value = weights[idx:idx + HIDDEN_SIZE].reshape(1, HIDDEN_SIZE)
        self.value_head.weight.data = torch.from_numpy(w_value.astype(np.float32))
        idx += HIDDEN_SIZE
        
        # b_value
        b_value = np.array([weights[idx]])
        self.value_head.bias.data = torch.from_numpy(b_value.astype(np.float32))
        
        return True


def create_network() -> PolicyValueNetwork:
    """Create a new policy-value network."""
    return PolicyValueNetwork()


if __name__ == "__main__":
    # Test the network
    net = create_network()
    print(f"Network weight count: {net.get_weight_count()}")
    
    # Test forward pass
    x = torch.randn(1, STATE_ENCODING_SIZE)
    policy, value = net.get_policy_value(x)
    print(f"Policy shape: {policy.shape}, Value shape: {value.shape}")
    print(f"Policy: {policy.detach().numpy()}")
    print(f"Value: {value.item()}")
    
    # Test export/import
    weights = net.export_weights()
    print(f"Exported weights count: {len(weights)}")
    
    net2 = create_network()
    net2.load_weights_from_array(weights)
    policy2, value2 = net2.get_policy_value(x)
    print(f"After reload - Policy: {policy2.detach().numpy()}, Value: {value2.item()}")
