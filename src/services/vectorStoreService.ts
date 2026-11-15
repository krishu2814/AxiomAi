import { prisma } from "../db/prisma";
import { EmbeddingService } from "./embeddingService";
import { logger } from "../utils/logger";

// Represents a matched document chunk with its computed semantic similarity score
export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
}

// Configuration options for vector similarity searches
export interface VectorSearchOptions {
  topK?: number;
  documentId?: string;
  minSimilarity?: number;
}

// Repository managing vector embeddings, indexing, and pgvector cosine similarity search
export class VectorStoreService {
  // Queries top-K semantically similar document chunks for a given search query
  public static async search(
    queryText: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const topK = options.topK ?? 5;
    const minSimilarity = options.minSimilarity ?? 0.0;

    const trimmed = queryText.trim();
    if (!trimmed) return [];

    // Convert search query text to 1536-dimensional embedding vector
    const queryVector = await EmbeddingService.embedText(trimmed);
    const vectorStr = `[${queryVector.join(",")}]`;

    try {
      // Execute raw SQL cosine distance query using pgvector operator <=>
      let results: any[];

      if (options.documentId) {
        results = await prisma.$queryRaw`
          SELECT
            dc.id AS "chunkId",
            dc."documentId" AS "documentId",
            d.title AS "documentTitle",
            dc.content AS "content",
            1 - (dc.embedding <=> ${vectorStr}::vector) AS similarity
          FROM "DocumentChunk" dc
          JOIN "Document" d ON d.id = dc."documentId"
          WHERE dc.embedding IS NOT NULL
            AND dc."documentId" = ${options.documentId}
            AND (1 - (dc.embedding <=> ${vectorStr}::vector)) >= ${minSimilarity}
          ORDER BY dc.embedding <=> ${vectorStr}::vector ASC
          LIMIT ${topK}
        `;
      } else {
        results = await prisma.$queryRaw`
          SELECT
            dc.id AS "chunkId",
            dc."documentId" AS "documentId",
            d.title AS "documentTitle",
            dc.content AS "content",
            1 - (dc.embedding <=> ${vectorStr}::vector) AS similarity
          FROM "DocumentChunk" dc
          JOIN "Document" d ON d.id = dc."documentId"
          WHERE dc.embedding IS NOT NULL
            AND (1 - (dc.embedding <=> ${vectorStr}::vector)) >= ${minSimilarity}
          ORDER BY dc.embedding <=> ${vectorStr}::vector ASC
          LIMIT ${topK}
        `;
      }

      // Map raw SQL rows into typed search results
      return results.map((row) => ({
        chunkId: String(row.chunkId),
        documentId: String(row.documentId),
        documentTitle: String(row.documentTitle),
        content: String(row.content),
        similarity: Number(row.similarity)
      }));
    } catch (err: any) {
      // In test/offline environments without active pgvector, log warning and return empty array
      logger.warn({
        msg: "pgvector similarity search failed or database unavailable, returning empty results",
        error: err.message
      });
      return [];
    }
  }

  // Inserts a new chunk with precomputed or freshly generated embedding vector
  public static async indexChunk(
    documentId: string,
    content: string,
    embedding?: number[]
  ): Promise<string> {
    const vector = embedding || (await EmbeddingService.embedText(content));
    const vectorStr = `[${vector.join(",")}]`;

    const result: any = await prisma.$queryRaw`
      INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding")
      VALUES (gen_random_uuid(), ${documentId}, ${content}, ${vectorStr}::vector)
      RETURNING id
    `;

    return result[0]?.id || "";
  }

  // Deletes all chunks and the parent document by ID
  public static async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.document.delete({
        where: { id: documentId }
      });
    } catch (err: any) {
      logger.warn({ msg: "Could not delete document", documentId, error: err.message });
    }
  }
}

