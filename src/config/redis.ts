import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

let isConnected = false;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    // Reconnect with exponential backoff capped at 3 seconds
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  enableOfflineQueue: false,
  lazyConnect: true
});

redis.on("connect", () => {
  isConnected = true;
  logger.info({ msg: "Connected to Redis successfully", url: env.REDIS_URL });
});

redis.on("error", (err) => {
  isConnected = false;
  logger.warn({ msg: "Redis connection warning (operating in fallback mode)", error: err.message });
});

redis.on("close", () => {
  isConnected = false;
});

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

export function isRedisHealthy(): boolean {
  return isConnected;
}

export async function closeRedis(): Promise<void> {
  if (isConnected) {
    await redis.quit();
    isConnected = false;
  }
}

