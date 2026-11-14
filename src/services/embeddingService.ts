import crypto from "crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { CacheService } from "./cacheService";
import { VectorMath } from "../utils/vectorMath";

export class EmbeddingService {
  private static embeddingsClient: OpenAIEmbeddings | null = null;
  public static readonly DIMENSIONS = 1536;

  private static getClient(): OpenAIEmbeddings | null {
    if (this.embeddingsClient) return this.embeddingsClient;

    if (
      env.OPENAI_API_KEY &&
      env.OPENAI_API_KEY !== "mock-key" &&
      !env.OPENAI_API_KEY.startsWith("mock-")
    ) {
      try {
        this.embeddingsClient = new OpenAIEmbeddings({
          openAIApiKey: env.OPENAI_API_KEY,
          modelName: "text-embedding-3-small"
        });
      } catch (err: any) {
        logger.warn({
          msg: "Could not initialize OpenAIEmbeddings client, will use deterministic fallback",
          error: err.message
        });
      }
    }
    return this.embeddingsClient;
  }

  /**
   * Generates a 1536-dimensional normalized embedding vector for input text.
   * Leverages caching to eliminate redundant API calls.
   */
  public static async embedText(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      return this.generateDeterministicVector("", this.DIMENSIONS);
    }

    const cacheKey = `embed:${crypto.createHash("sha256").update(trimmed).digest("hex")}`;
    const cached = await CacheService.get<number[]>(cacheKey);
    if (cached && cached.length === this.DIMENSIONS) {
      return cached;
    }

    const client = this.getClient();
    if (client) {
      try {
        const result = await client.embedQuery(trimmed);
        if (result && result.length === this.DIMENSIONS) {
          const normalized = VectorMath.normalize(result);
          await CacheService.set(cacheKey, normalized, 86400 * 7); // Cache for 7 days
          return normalized;
        }
      } catch (err: any) {
        logger.warn({
          msg: "OpenAI embedding generation failed, using deterministic fallback",
          error: err.message
        });
      }
    }

    const fallbackVector = this.generateDeterministicVector(trimmed, this.DIMENSIONS);
    await CacheService.set(cacheKey, fallbackVector, 86400 * 7);
    return fallbackVector;
  }

  /**
   * Generates embedding vectors for a batch of text chunks.
   */
  public static async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const vec = await this.embedText(text);
      results.push(vec);
    }
    return results;
  }

  /**
   * Generates a deterministic pseudo-random unit vector based on cryptographic hash.
   * Guaranteed to produce identical 1536-dim unit vectors for identical inputs in test/offline modes.
   */
  public static generateDeterministicVector(seedText: string, dimensions: number): number[] {
    const vector: number[] = new Array(dimensions);
    let currentHash = crypto.createHash("sha256").update(seedText).digest();

    for (let i = 0; i < dimensions; i++) {
      const byteIndex = (i * 2) % (currentHash.length - 1);
      const rawInt = currentHash.readInt16LE(byteIndex);
      vector[i] = rawInt / 32768.0;

      // Reseed periodically to generate high-entropy float streams
      if (i > 0 && i % 16 === 0) {
        currentHash = crypto.createHash("sha256").update(currentHash).digest();
      }
    }

    return VectorMath.normalize(vector);
  }
}
