import { describe, it, expect } from "vitest";
import { webWorkerNode } from "../../src/graph/nodes/webWorkerNode";
import { docWorkerNode } from "../../src/graph/nodes/docWorkerNode";
import { SearchEvidenceSchema } from "../../src/graph/state";

// Tests for parallel Web and Document worker nodes
describe("Research Worker Nodes", () => {
  // Test mock state with sample sub-questions
  const sampleState: any = {
    sessionId: "test-session",
    query: "Quantum computing algorithms",
    subQuestions: [
      "What is Shor's algorithm for prime factorization?",
      "How does Grover's search algorithm provide speedup?"
    ],
    activeWorkers: ["web", "document"],
    collectedEvidence: []
  };

  // Verifies web worker collects valid search evidence conforming to schema
  it("should fetch web evidence conforming to SearchEvidenceSchema", async () => {
    const update = await webWorkerNode(sampleState);

    expect(update.collectedEvidence).toBeDefined();
    expect(update.collectedEvidence!.length).toBeGreaterThan(0);

    for (const item of update.collectedEvidence!) {
      const parsed = SearchEvidenceSchema.safeParse(item);
      expect(parsed.success).toBe(true);
      expect(item.source).toBe("web");
      expect(item.urlOrId.length).toBeGreaterThan(0);
    }
  });

  // Verifies doc worker executes query and returns structured evidence
  it("should execute document vector search and return evidence list", async () => {
    const update = await docWorkerNode(sampleState);

    expect(update.collectedEvidence).toBeDefined();
    expect(Array.isArray(update.collectedEvidence)).toBe(true);
  });
});

