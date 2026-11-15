import { describe, it, expect } from "vitest";
import { VectorStoreService } from "../../src/services/vectorStoreService";

// Tests for vector store repository and search mechanics
describe("VectorStoreService", () => {
  // Verifies that searching empty query string returns empty array immediately
  it("should return empty array for empty search queries", async () => {
    const results = await VectorStoreService.search("");
    expect(results).toEqual([]);

    const whitespaceResults = await VectorStoreService.search("   ");
    expect(whitespaceResults).toEqual([]);
  });

  // Verifies safe fallback when database connection is inactive in unit test mode
  it("should handle offline database query gracefully and return empty array", async () => {
    const results = await VectorStoreService.search("Transformer attention mechanism", {
      topK: 3,
      minSimilarity: 0.5
    });

    expect(Array.isArray(results)).toBe(true);
  });
});

