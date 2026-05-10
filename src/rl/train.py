from stable_baselines3 import PPO
from rl.environment import RetrievalEnv
import os

def train_agent():
    env = RetrievalEnv()
    model = PPO("MlpPolicy", env, verbose=1, tensorboard_log="./runs/")
    
    print("🧠 Training RL Retrieval Agent...")
    model.learn(total_timesteps=10000)
    
    # Save the model
    os.makedirs("models", exist_ok=True)
    model.save("models/retrieval_agent")
    print("✅ Agent trained and saved to models/retrieval_agent")

if __name__ == "__main__":
    train_agent()
