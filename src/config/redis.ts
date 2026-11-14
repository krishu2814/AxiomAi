import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

// Track connection status flag across reconnects
let isConnected = false;

// Create Redis client instance with exponential backoff and non-blocking retry
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    return Math.min(times * 200, 3000);
  },
  enableOfflineQueue: false,
  lazyConnect: true
});

// Update connection flag on successful connect
redis.on("connect", () => {
  isConnected = true;
  logger.info({ msg: "Connected to Redis successfully", url: env.REDIS_URL });
});

// Mark disconnected and log warning on Redis connection error
redis.on("error", (err) => {
  isConnected = false;
  logger.warn({ msg: "Redis connection warning (operating in fallback mode)", error: err.message });
});

// Reset connection flag on connection close
redis.on("close", () => {
  isConnected = false;
});

// Attempts connection on startup without crashing the app if Redis is offline
export async function initRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err: any) {
    logger.warn({
      msg: "Initial Redis connection could not be established; operating in in-memory fallback mode",
      error: err.message
    });
  }
}

// Returns true if Redis connection is live and healthy
export function isRedisHealthy(): boolean {
  return isConnected;
}

// Gracefully disconnects Redis connection during server shutdown
export async function closeRedis(): Promise<void> {
  if (isConnected) {
    await redis.quit();
    isConnected = false;
  }
}
