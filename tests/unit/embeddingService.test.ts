import { describe, it, expect, beforeEach } from "vitest";
import { EmbeddingService } from "../../src/services/embeddingService";
import { CacheService } from "../../src/services/cacheService";
import { VectorMath } from "../../src/utils/vectorMath";

describe("EmbeddingService", () => {
  beforeEach(async () => {
    await CacheService.clear();
  });

  it("should generate a 1536-dimensional unit vector", async () => {
    const text = "Autonomous multi-agent research systems";
    const vector = await EmbeddingService.embedText(text);

    expect(vector).toHaveLength(1536);
    expect(VectorMath.norm(vector)).toBeCloseTo(1.0, 4);
  });

  it("should produce deterministic vectors for identical inputs in offline fallback", async () => {
    const text = "Stateful fact-checking engine";
    const v1 = await EmbeddingService.embedText(text);
    const v2 = await EmbeddingService.embedText(text);

    expect(v1).toEqual(v2);
    expect(VectorMath.cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
  });

  it("should generate different vectors for different inputs", async () => {
    const v1 = await EmbeddingService.embedText("Deep learning with transformers");
    const v2 = await EmbeddingService.embedText("Culinary recipes for Italian pasta");

    const similarity = VectorMath.cosineSimilarity(v1, v2);
    expect(similarity).toBeLessThan(0.95);
  });

  it("should batch embed multiple documents", async () => {
    const docs = ["Document alpha", "Document beta", "Document gamma"];
    const vectors = await EmbeddingService.embedDocuments(docs);

    expect(vectors).toHaveLength(3);
    for (const vec of vectors) {
      expect(vec).toHaveLength(1536);
      expect(VectorMath.norm(vec)).toBeCloseTo(1.0, 4);
    }
  });
});

