import { describe, it, expect, beforeEach } from "vitest";
import { SearchService } from "../../src/services/searchService";
import { CacheService } from "../../src/services/cacheService";

// Tests for external web search integration and offline fallback
describe("SearchService", () => {
  beforeEach(async () => {
    await CacheService.clear();
  });

  // Verifies that empty search queries return an empty array
  it("should return empty array for empty search queries", async () => {
    const results = await SearchService.search("");
    expect(results).toEqual([]);

    const whitespaceResults = await SearchService.search("    ");
    expect(whitespaceResults).toEqual([]);
  });

  // Verifies fallback search generates requested count of structured results
  it("should generate deterministic structured search results in offline mode", async () => {
    const results = await SearchService.search("Distributed consensus algorithms", {
      maxResults: 3
    });

    expect(results).toHaveLength(3);
    for (const item of results) {
      expect(item.title).toContain("Distributed consensus algorithms");
      expect(item.url).toMatch(/^https:\/\/example\.org\/research\//);
      expect(item.content.length).toBeGreaterThan(0);
      expect(typeof item.score).toBe("number");
    }
  });

  // Verifies caching behavior prevents re-generating results for duplicate queries
  it("should cache and return previous search results", async () => {
    const query = "Quantum Error Correction";
    const firstCall = await SearchService.search(query, { maxResults: 2 });
    const secondCall = await SearchService.search(query, { maxResults: 2 });

    expect(firstCall).toEqual(secondCall);
  });
});

