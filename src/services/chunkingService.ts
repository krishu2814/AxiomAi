// Represents an individual chunk extracted from a larger document
export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
  charStart: number;
  charEnd: number;
}

// Configuration options governing chunk sizing and overlap thresholds
export interface ChunkOptions {
  maxChunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

// Service providing recursive, token-aware document text chunking
export class ChunkingService {
  // Splits document text into overlapping chunks respecting natural boundary separators
  public static splitText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const maxChunkSize = options.maxChunkSize ?? 800;
    const chunkOverlap = options.chunkOverlap ?? 150;
    const separators = options.separators ?? ["\n\n", "\n", ". ", " ", ""];

    const raw = text.trim();
    if (!raw) return [];

    // If whole text fits within max chunk size, return single chunk
    if (raw.length <= maxChunkSize) {
      return [
        {
          content: raw,
          index: 0,
          tokenCount: this.estimateTokens(raw),
          charStart: 0,
          charEnd: raw.length
        }
      ];
    }

    // Recursively split text into segments using hierarchy of separators
    const rawSegments = this.recursiveSplit(raw, separators, maxChunkSize);

    // Merge small segments into chunks up to maxChunkSize while applying overlap
    const chunks: TextChunk[] = [];
    let currentChunk = "";
    let chunkStartIndex = 0;
    let chunkIndex = 0;

    for (const segment of rawSegments) {
      // If adding segment exceeds limit, push current accumulator as a chunk
      if (currentChunk.length + segment.length > maxChunkSize && currentChunk.length > 0) {
        const trimmedChunk = currentChunk.trim();
        if (trimmedChunk) {
          chunks.push({
            content: trimmedChunk,
            index: chunkIndex++,
            tokenCount: this.estimateTokens(trimmedChunk),
            charStart: chunkStartIndex,
            charEnd: chunkStartIndex + trimmedChunk.length
          });
        }

        // Apply overlap from end of current chunk
        const overlapSlice = currentChunk.slice(Math.max(0, currentChunk.length - chunkOverlap));
        currentChunk = overlapSlice + segment;
        chunkStartIndex += Math.max(0, currentChunk.length - chunkOverlap);
      } else {
        currentChunk += segment;
      }
    }

    // Flush any remaining accumulated text as final chunk
    const finalChunk = currentChunk.trim();
    if (finalChunk.length > 0) {
      chunks.push({
        content: finalChunk,
        index: chunkIndex++,
        tokenCount: this.estimateTokens(finalChunk),
        charStart: chunkStartIndex,
        charEnd: chunkStartIndex + finalChunk.length
      });
    }

    return chunks;
  }

  // Recursively divides text by matching separator hierarchy until segments fit target size
  private static recursiveSplit(text: string, separators: string[], maxSize: number): string[] {
    if (text.length <= maxSize || separators.length === 0) {
      return [text];
    }

    const [currentSep, ...remainingSeps] = separators;
    const splits = text.split(currentSep);
    const result: string[] = [];

    for (let i = 0; i < splits.length; i++) {
      const part = splits[i];
      // Re-attach separator to all but the last item if separator is non-empty
      const partWithSep = i < splits.length - 1 && currentSep !== "" ? part + currentSep : part;

      if (partWithSep.length <= maxSize) {
        result.push(partWithSep);
      } else {
        // Recurse to finer-grained separator for oversized piece
        const finerSplits = this.recursiveSplit(partWithSep, remainingSeps, maxSize);
        result.push(...finerSplits);
      }
    }

    return result;
  }

  // Estimates token count assuming average English ratio of roughly 4 characters per token
  public static estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}

