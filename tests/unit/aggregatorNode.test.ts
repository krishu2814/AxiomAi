import { describe, it, expect } from "vitest";
import { aggregatorNode } from "../../src/graph/nodes/aggregatorNode";
import { SearchEvidence } from "../../src/graph/state";

// Tests for evidence aggregator and re-ranking node
describe("Aggregator Node", () => {
  // Verifies that empty evidence returns an empty list without crashing
  it("should handle empty evidence lists gracefully", async () => {
    const update = await aggregatorNode({ collectedEvidence: [] } as any);
    expect(update.collectedEvidence).toEqual([]);
  });

  // Verifies de-duplication of duplicate URLs and mirror snippets
  it("should remove duplicate evidence items sharing the same URL or identical content", async () => {
    const rawEvidence: SearchEvidence[] = [
      {
        source: "web",
        title: "Paper on Multi-Agent Systems",
        urlOrId: "https://example.com/paper?ref=1",
        snippet: "Autonomous multi-agent architectures decompose complex tasks into parallel sub-goals.",
        subQuestion: "Architecture overview",
        score: 0.8
      },
      {
        source: "web",
        title: "Duplicate Link with different query string",
        urlOrId: "https://example.com/paper?ref=2",
        snippet: "Autonomous multi-agent architectures decompose complex tasks into parallel sub-goals.",
        subQuestion: "Architecture overview",
        score: 0.75
      },
      {
        source: "web",
        title: "Unique Paper on RAG",
        urlOrId: "https://example.com/rag",
        snippet: "Vector retrieval grounds model outputs with source citations.",
        subQuestion: "Grounding details",
        score: 0.85
      }
    ];

    const update = await aggregatorNode({ collectedEvidence: rawEvidence } as any);

    expect(update.collectedEvidence).toBeDefined();
    expect(update.collectedEvidence!.length).toBe(2);
  });

  // Verifies prioritization and ranking of higher-authority items
  it("should rank document evidence and higher-scoring items at the top", async () => {
    const rawEvidence: SearchEvidence[] = [
      {
        source: "web",
        title: "Web snippet",
        urlOrId: "https://example.com/web",
        snippet: "Short snippet",
        subQuestion: "Sub Q1",
        score: 0.7
      },
      {
        source: "document",
        title: "Internal Architecture Whitepaper",
        urlOrId: "doc-chunk-1",
        snippet: "In-depth internal specifications detailing the system components and failover procedures in production environments.",
        subQuestion: "Sub Q1",
        score: 0.8
      }
    ];

    const update = await aggregatorNode({ collectedEvidence: rawEvidence } as any);

    expect(update.collectedEvidence![0].source).toBe("document");
    expect(update.collectedEvidence![0].score).toBeGreaterThan(update.collectedEvidence![1].score ?? 0);
  });
});

