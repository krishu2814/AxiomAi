import { redis, isRedisHealthy } from "../config/redis";
import { logger } from "../utils/logger";

interface MemoryCacheItem {
  value: any;
  expiresAt: number;
}

// In-memory fallback map used whenever Redis is unavailable or offline
const memoryFallback = new Map<string, MemoryCacheItem>();

// Universal cache service supporting Redis and in-memory TTL caching
export class CacheService {
  private static prefix = "axiomai:cache:";

  // Prepends system prefix to prevent cache key collisions
  public static formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // Retrieves parsed JSON value from Redis or in-memory fallback
  public static async get<T>(key: string): Promise<T | null> {
    const fullKey = this.formatKey(key);

    // Try reading from Redis if connection is active
    if (isRedisHealthy()) {
      try {
        const raw = await redis.get(fullKey);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        logger.warn({ msg: "Redis get error, falling back to in-memory cache", error: err.message });
      }
    }

    // Read from in-memory fallback if Redis is down or missing
    const item = memoryFallback.get(fullKey);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryFallback.delete(fullKey);
      return null;
    }
    return item.value as T;
  }

  // Stores value serialized as JSON in Redis or in-memory with TTL in seconds
  public static async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const fullKey = this.formatKey(key);
    const serialized = JSON.stringify(value);

    // Write to Redis if healthy
    if (isRedisHealthy()) {
      try {
        await redis.set(fullKey, serialized, "EX", ttlSeconds);
        return;
      } catch (err: any) {
        logger.warn({ msg: "Redis set error, falling back to in-memory cache", error: err.message });
      }
    }

    // Store in in-memory map with calculated expiration timestamp
    memoryFallback.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  // Removes a key from both Redis and in-memory fallback
  public static async delete(key: string): Promise<void> {
    const fullKey = this.formatKey(key);

    if (isRedisHealthy()) {
      try {
        await redis.del(fullKey);
      } catch (err: any) {
        logger.warn({ msg: "Redis delete error", error: err.message });
      }
    }

    memoryFallback.delete(fullKey);
  }

  // Flushes all application keys matching prefix from Redis and in-memory
  public static async clear(): Promise<void> {
    if (isRedisHealthy()) {
      try {
        const keys = await redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err: any) {
        logger.warn({ msg: "Redis clear error", error: err.message });
      }
    }

    memoryFallback.clear();
  }

  // Returns count of active in-memory cache entries for diagnostics
  public static getMemoryFallbackSize(): number {
    return memoryFallback.size;
  }

  // Clears in-memory cache map specifically for test isolation
  public static resetMemoryFallbackForTests(): void {
    memoryFallback.clear();
  }
}
