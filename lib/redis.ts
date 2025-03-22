import { Redis } from "@upstash/redis"

// Add Node.js process type reference
declare const process: {
  env: {
    KV_REST_API_URL?: string;
    UPSTASH_REDIS_REST_URL?: string;
    KV_REST_API_TOKEN?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    [key: string]: string | undefined;
  };
};

// Initialize Redis client using environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// Helper function to ensure data is properly serialized when stored
export const safeRedis = {
  ...redis,
  // Override methods that store data to ensure proper serialization
  set: async (key: string, value: any) => {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    return redis.set(key, serialized)
  },
  lpush: async (key: string, ...values: any[]) => {
    const serialized = values.map(v => typeof v === 'string' ? v : JSON.stringify(v))
    return redis.lpush(key, ...serialized)
  },
  // Add other methods as needed
}

export default redis

