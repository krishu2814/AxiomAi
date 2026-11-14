import { describe, it, expect } from "vitest";
import { ChunkingService } from "../../src/services/chunkingService";

// Tests for recursive text chunking and token estimation service
describe("ChunkingService", () => {
  // Verifies handling of empty or whitespace text
  it("should return an empty array when splitting empty text", () => {
    expect(ChunkingService.splitText("")).toEqual([]);
    expect(ChunkingService.splitText("   ")).toEqual([]);
  });

  // Verifies that text smaller than chunk size returns a single chunk
  it("should return a single chunk if text is smaller than maxChunkSize", () => {
    const text = "AxiomAi is an autonomous multi-agent deep research platform.";
    const chunks = ChunkingService.splitText(text, { maxChunkSize: 500 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].charStart).toBe(0);
    expect(chunks[0].charEnd).toBe(text.length);
  });

  // Verifies recursive splitting when text exceeds chunk size limit
  it("should split long text into multiple chunks respecting maxChunkSize", () => {
    const paragraph1 = "Artificial intelligence research systems are evolving rapidly into autonomous agents.";
    const paragraph2 = "These multi-agent architectures decompose complex questions into targeted research sub-goals.";
    const paragraph3 = "Evidence gathered across disparate sources must be fact-checked and verified for grounding.";
    const fullText = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

    const chunks = ChunkingService.splitText(fullText, {
      maxChunkSize: 120,
      chunkOverlap: 20
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(140);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  // Verifies token estimation calculation
  it("should estimate tokens based on character length ratio", () => {
    const text = "1234567890123456"; // 16 chars -> ~4 tokens
    const tokens = ChunkingService.estimateTokens(text);
    expect(tokens).toBe(4);
  });
});

