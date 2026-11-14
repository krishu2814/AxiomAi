import crypto from "crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { CacheService } from "./cacheService";
import { VectorMath } from "../utils/vectorMath";

// Service responsible for generating dense vector embeddings for texts and documents
export class EmbeddingService {
  private static embeddingsClient: OpenAIEmbeddings | null = null;
  public static readonly DIMENSIONS = 1536;

  // Lazily initializes and returns the OpenAI embeddings client if valid API key is present
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

  // Generates or retrieves a cached 1536-dimensional normalized vector for a single text
  public static async embedText(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) {
      return this.generateDeterministicVector("", this.DIMENSIONS);
    }

    // Check Redis or in-memory cache first to avoid recomputing embeddings
    const cacheKey = `embed:${crypto.createHash("sha256").update(trimmed).digest("hex")}`;
    const cached = await CacheService.get<number[]>(cacheKey);
    if (cached && cached.length === this.DIMENSIONS) {
      return cached;
    }

    // Attempt OpenAI embedding API call if client is configured
    const client = this.getClient();
    if (client) {
      try {
        const result = await client.embedQuery(trimmed);
        if (result && result.length === this.DIMENSIONS) {
          const normalized = VectorMath.normalize(result);
          await CacheService.set(cacheKey, normalized, 86400 * 7);
          return normalized;
        }
      } catch (err: any) {
        logger.warn({
          msg: "OpenAI embedding generation failed, using deterministic fallback",
          error: err.message
        });
      }
    }

    // Fall back to offline deterministic vector generation when API key is missing or offline
    const fallbackVector = this.generateDeterministicVector(trimmed, this.DIMENSIONS);
    await CacheService.set(cacheKey, fallbackVector, 86400 * 7);
    return fallbackVector;
  }

  // Generates embedding vectors for an array of document text chunks
  public static async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const vec = await this.embedText(text);
      results.push(vec);
    }
    return results;
  }

  // Produces a repeatable 1536-dim unit vector from text hash for tests and offline usage
  public static generateDeterministicVector(seedText: string, dimensions: number): number[] {
    const vector: number[] = new Array(dimensions);
    let currentHash = crypto.createHash("sha256").update(seedText).digest();

    for (let i = 0; i < dimensions; i++) {
      const byteIndex = (i * 2) % (currentHash.length - 1);
      const rawInt = currentHash.readInt16LE(byteIndex);
      vector[i] = rawInt / 32768.0;

      // Reseed periodically to generate high-entropy float values across all dimensions
      if (i > 0 && i % 16 === 0) {
        currentHash = crypto.createHash("sha256").update(currentHash).digest();
      }
    }

    return VectorMath.normalize(vector);
  }
}
