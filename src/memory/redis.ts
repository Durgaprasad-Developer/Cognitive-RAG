import Redis from "ioredis";

class MemoryCache {
  private redis: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async get(key: string) {
    if (!this.redis) return null;
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttl: number = 3600) {
    if (!this.redis) return;
    await this.redis.set(key, value, "EX", ttl);
  }

  async getSession(sessionId: string) {
    const data = await this.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
}

export const memory = new MemoryCache();
