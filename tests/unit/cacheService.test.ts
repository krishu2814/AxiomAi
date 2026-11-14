import { describe, it, expect, beforeEach } from "vitest";
import { CacheService } from "../../src/services/cacheService";

describe("CacheService (with In-Memory Fallback)", () => {
  beforeEach(() => {
    CacheService.resetMemoryFallbackForTests();
  });

  it("should set and retrieve values from the cache", async () => {
    const payload = { query: "Quantum Computing", results: [1, 2, 3] };
    await CacheService.set("test-key-1", payload, 60);

    const retrieved = await CacheService.get<typeof payload>("test-key-1");
    expect(retrieved).toEqual(payload);
  });

  it("should return null for non-existent keys", async () => {
    const result = await CacheService.get("non-existent-key");
    expect(result).toBeNull();
  });

  it("should format keys with standard system prefix", () => {
    const formatted = CacheService.formatKey("my-sub-question");
    expect(formatted).toBe("axiomai:cache:my-sub-question");
  });

  it("should delete existing keys from cache", async () => {
    await CacheService.set("key-to-delete", "some-data", 60);
    expect(await CacheService.get("key-to-delete")).toBe("some-data");

    await CacheService.delete("key-to-delete");
    expect(await CacheService.get("key-to-delete")).toBeNull();
  });

  it("should clear all cached items", async () => {
    await CacheService.set("key-a", "val-a", 60);
    await CacheService.set("key-b", "val-b", 60);

    expect(CacheService.getMemoryFallbackSize()).toBeGreaterThanOrEqual(2);

    await CacheService.clear();
    expect(await CacheService.get("key-a")).toBeNull();
    expect(await CacheService.get("key-b")).toBeNull();
    expect(CacheService.getMemoryFallbackSize()).toBe(0);
  });

  it("should expire items when TTL has elapsed", async () => {
    // Set item with negative/zero TTL to simulate expiration
    await CacheService.set("expired-key", "old-data", -1);
    const result = await CacheService.get("expired-key");
    expect(result).toBeNull();
  });
});

