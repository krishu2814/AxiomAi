/**
 * Vector mathematics utility functions for dense similarity calculations
 */

export class VectorMath {
  /**
   * Computes the dot product of two vectors of identical dimensions.
   */
  public static dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector length mismatch: ${a.length} !== ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Computes the Euclidean norm (L2 norm) of a vector.
   */
  public static norm(a: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Computes the cosine similarity between two vectors (range: -1.0 to 1.0).
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    const normA = this.norm(a);
    const normB = this.norm(b);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return this.dotProduct(a, b) / (normA * normB);
  }

  /**
   * Computes Euclidean distance between two vectors.
   */
  public static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector length mismatch: ${a.length} !== ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Normalizes a vector to unit length (L2 norm = 1.0).
   */
  public static normalize(v: number[]): number[] {
    const magnitude = this.norm(v);
    if (magnitude === 0) {
      return v.slice();
    }
    return v.map((x) => x / magnitude);
  }
}
