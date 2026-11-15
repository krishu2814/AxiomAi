import { describe, it, expect } from "vitest";
import {
  SearchEvidenceSchema,
  AtomicClaimSchema,
  AuditedClaimSchema
} from "../../src/graph/state";

// Tests for LangGraph state Zod validation contracts
describe("Graph State & Contracts", () => {
  // Verifies valid search evidence schema parsing
  it("should validate well-formed SearchEvidence objects", () => {
    const validEvidence = {
      source: "web" as const,
      title: "Attention Is All You Need",
      urlOrId: "https://arxiv.org/abs/1706.03762",
      snippet: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.",
      subQuestion: "What is the core architecture of the Transformer?",
      score: 0.98
    };

    const parsed = SearchEvidenceSchema.safeParse(validEvidence);
    expect(parsed.success).toBe(true);
  });

  // Verifies rejection of invalid evidence sources
  it("should reject SearchEvidence with invalid source types", () => {
    const invalidEvidence = {
      source: "untrusted_source",
      title: "Invalid Document",
      urlOrId: "http://bad.org",
      snippet: "Snippet text",
      subQuestion: "Sub-question"
    };

    const parsed = SearchEvidenceSchema.safeParse(invalidEvidence);
    expect(parsed.success).toBe(false);
  });

  // Verifies atomic claim schema parsing
  it("should validate well-formed AtomicClaim objects", () => {
    const validClaim = {
      id: "claim-1",
      statement: "Transformers replace recurrence entirely with multi-head self-attention.",
      associatedSources: ["https://arxiv.org/abs/1706.03762"]
    };

    const parsed = AtomicClaimSchema.safeParse(validClaim);
    expect(parsed.success).toBe(true);
  });

  // Verifies audited claim schema with verdict and confidence scoring
  it("should validate AuditedClaim with VERIFIED verdict", () => {
    const validAudited = {
      id: "claim-1",
      statement: "Transformers replace recurrence entirely with multi-head self-attention.",
      associatedSources: ["https://arxiv.org/abs/1706.03762"],
      verdict: "VERIFIED" as const,
      confidenceScore: 0.96,
      groundingRationale: "Direct verbatim match found in section 3 of source paper.",
      verbatimQuote: "The Transformer is the first transduction model relying entirely on self-attention."
    };

    const parsed = AuditedClaimSchema.safeParse(validAudited);
    expect(parsed.success).toBe(true);
  });

  // Verifies that confidence score must fall within 0.0 to 1.0 range
  it("should reject AuditedClaim when confidenceScore is outside [0, 1]", () => {
    const invalidAudited = {
      id: "claim-2",
      statement: "Flawed claim",
      associatedSources: [],
      verdict: "UNVERIFIED" as const,
      confidenceScore: 1.5,
      groundingRationale: "Score exceeds upper bound"
    };

    const parsed = AuditedClaimSchema.safeParse(invalidAudited);
    expect(parsed.success).toBe(false);
  });
});

