import { Annotation } from "@langchain/langgraph";
import { z } from "zod";

// Zod schema validating a single unit of collected research evidence
export const SearchEvidenceSchema = z.object({
  source: z.enum(["web", "document", "academic"]),
  title: z.string(),
  urlOrId: z.string(),
  snippet: z.string(),
  subQuestion: z.string(),
  score: z.number().optional()
});

export type SearchEvidence = z.infer<typeof SearchEvidenceSchema>;

// Zod schema validating an individual falsifiable atomic claim extracted from draft reports
export const AtomicClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  associatedSources: z.array(z.string())
});

export type AtomicClaim = z.infer<typeof AtomicClaimSchema>;

// Zod schema validating an independently audited claim with veracity verdict and quote
export const AuditedClaimSchema = AtomicClaimSchema.extend({
  verdict: z.enum(["VERIFIED", "PARTIAL", "UNVERIFIED"]),
  confidenceScore: z.number().min(0).max(1),
  groundingRationale: z.string(),
  verbatimQuote: z.string().optional()
});

export type AuditedClaim = z.infer<typeof AuditedClaimSchema>;

// Root state annotation schema defining immutable state container for multi-agent graph
export const ResearchAnnotation = Annotation.Root({
  // Session tracking identifiers
  sessionId: Annotation<string>({
    reducer: (curr, update) => update ?? curr,
    default: () => ""
  }),
  query: Annotation<string>({
    reducer: (curr, update) => update ?? curr,
    default: () => ""
  }),

  // Supervisor query decomposition state
  subQuestions: Annotation<string[]>({
    reducer: (curr, update) => update ?? curr,
    default: () => []
  }),
  activeWorkers: Annotation<string[]>({
    reducer: (curr, update) => update ?? curr,
    default: () => []
  }),

  // Thread-safe append reducer accumulating evidence collected across parallel workers
  collectedEvidence: Annotation<SearchEvidence[]>({
    reducer: (current, incoming) => current.concat(incoming ?? []),
    default: () => []
  }),

  // Fact-checking and claim verification state
  extractedClaims: Annotation<AtomicClaim[]>({
    reducer: (curr, update) => update ?? curr,
    default: () => []
  }),
  auditedClaims: Annotation<AuditedClaim[]>({
    reducer: (curr, update) => update ?? curr,
    default: () => []
  }),
  overallGroundingScore: Annotation<number>({
    reducer: (curr, update) => update ?? curr,
    default: () => 0
  }),

  // Human-in-the-loop review and approval gates
  humanApproved: Annotation<boolean>({
    reducer: (curr, update) => update ?? curr,
    default: () => false
  }),
  humanFeedback: Annotation<string | null>({
    reducer: (curr, update) => update ?? curr,
    default: () => null
  }),

  // Final synthesized research deliverables
  finalReport: Annotation<string>({
    reducer: (curr, update) => update ?? curr,
    default: () => ""
  }),

  // Thread-safe accumulator collecting errors during execution without aborting graph
  errors: Annotation<string[]>({
    reducer: (current, incoming) => current.concat(incoming ?? []),
    default: () => []
  })
});

// Inferred TypeScript state and update types
export type ResearchStateType = typeof ResearchAnnotation.State;
export type ResearchStateUpdate = typeof ResearchAnnotation.Update;

