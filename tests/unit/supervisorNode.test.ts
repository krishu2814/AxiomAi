import { describe, it, expect } from "vitest";
import { supervisorNode } from "../../src/graph/nodes/supervisorNode";
import { ResearchAnnotation } from "../../src/graph/state";

// Tests for supervisor research planner node
describe("Supervisor Planner Node", () => {
  // Verifies that supervisor produces non-empty sub-questions and active workers
  it("should decompose query into sub-questions and activate workers", async () => {
    // Instantiate base state
    const baseState = {
      ...ResearchAnnotation.spec,
      sessionId: "session-123",
      query: "Vector databases vs relational databases for hybrid RAG",
      subQuestions: [],
      activeWorkers: [],
      collectedEvidence: [],
      extractedClaims: [],
      auditedClaims: [],
      overallGroundingScore: 0,
      humanApproved: false,
      humanFeedback: null,
      finalReport: "",
      errors: []
    };

    const update = await supervisorNode(baseState as any);

    expect(update.subQuestions).toBeDefined();
    expect(update.subQuestions!.length).toBeGreaterThan(0);
    expect(update.activeWorkers).toBeDefined();
    expect(update.activeWorkers!.length).toBeGreaterThan(0);
  });
});

