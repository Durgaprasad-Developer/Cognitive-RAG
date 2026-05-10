import gymnasium as gym
from gymnasium import spaces
import numpy as np

class RetrievalEnv(gym.Env):
    def __init__(self):
        super(RetrievalEnv, self).__init__()
        # State: [query_length, retrieval_confidence, latency, rerank_score]
        self.observation_space = spaces.Box(low=0, high=1, shape=(4,), dtype=np.float32)
        
        # Actions: 0: Vector Only, 1: BM25 Only, 2: Hybrid, 3: Hybrid + Rerank
        self.action_space = spaces.Discrete(4)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        return np.random.rand(4).astype(np.float32), {}

    def step(self, action):
        # In a real system, this would execute the retrieval and return the reward
        # For now, we simulate the environment
        observation = np.random.rand(4).astype(np.float32)
        reward = 1.0 if action == 3 else 0.5 # Encourage Hybrid + Rerank
        terminated = True
        return observation, reward, terminated, False, {}
