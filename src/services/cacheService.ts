import { redis, isRedisHealthy } from "../config/redis";
import { logger } from "../utils/logger";

interface MemoryCacheItem {
  value: any;
  expiresAt: number;
}

// In-memory fallback cache when Redis is unavailable or offline
const memoryFallback = new Map<string, MemoryCacheItem>();

export class CacheService {
  private static prefix = "axiomai:cache:";

  public static formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public static async get<T>(key: string): Promise<T | null> {
    const fullKey = this.formatKey(key);

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

    // In-memory fallback
    const item = memoryFallback.get(fullKey);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryFallback.delete(fullKey);
      return null;
    }
    return item.value as T;
  }

  public static async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const fullKey = this.formatKey(key);
    const serialized = JSON.stringify(value);

    if (isRedisHealthy()) {
      try {
        await redis.set(fullKey, serialized, "EX", ttlSeconds);
        return;
      } catch (err: any) {
        logger.warn({ msg: "Redis set error, falling back to in-memory cache", error: err.message });
      }
    }

    // In-memory fallback
    memoryFallback.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

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

  public static getMemoryFallbackSize(): number {
    return memoryFallback.size;
  }

  public static resetMemoryFallbackForTests(): void {
    memoryFallback.clear();
  }
}

