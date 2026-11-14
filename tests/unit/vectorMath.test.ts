import { describe, it, expect } from "vitest";
import { VectorMath } from "../../src/utils/vectorMath";

describe("VectorMath Utilities", () => {
  it("should compute dot product correctly", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(VectorMath.dotProduct(a, b)).toBe(32);
  });

  it("should throw error when dot product receives mismatched dimensions", () => {
    expect(() => VectorMath.dotProduct([1, 2], [1, 2, 3])).toThrow("Vector length mismatch");
  });

  it("should compute Euclidean norm correctly", () => {
    const v = [3, 4];
    // sqrt(3^2 + 4^2) = 5
    expect(VectorMath.norm(v)).toBe(5);
  });

  it("should compute cosine similarity correctly for identical and orthogonal vectors", () => {
    const a = [1, 0];
    const b = [1, 0];
    const c = [0, 1];

    expect(VectorMath.cosineSimilarity(a, b)).toBeCloseTo(1.0);
    expect(VectorMath.cosineSimilarity(a, c)).toBeCloseTo(0.0);
  });

  it("should normalize a vector to unit length", () => {
    const v = [10, 20, 30];
    const normalized = VectorMath.normalize(v);
    expect(VectorMath.norm(normalized)).toBeCloseTo(1.0);
  });

  it("should compute Euclidean distance between two vectors", () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(VectorMath.euclideanDistance(a, b)).toBe(5);
  });
});

