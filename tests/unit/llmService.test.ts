import { describe, it, expect } from "vitest";
import { z } from "zod";
import { LLMService } from "../../src/services/llmService";

// Tests for LLM factory and provider routing service
describe("LLMService", () => {
  // Verifies default chat model creation
  it("should return a configured chat model instance", () => {
    const model = LLMService.getModel({ temperature: 0.5 });
    expect(model).toBeDefined();
    expect(typeof model.invoke).toBe("function");
  });

  // Verifies audit model creation with deterministic zero temperature
  it("should return an audit model with zero temperature", () => {
    const auditModel: any = LLMService.getAuditModel();
    expect(auditModel).toBeDefined();
    expect(auditModel.temperature).toBe(0.0);
  });

  // Verifies structured model creation wrapping a Zod schema
  it("should create a structured output model from a Zod schema", () => {
    const TestSchema = z.object({
      summary: z.string(),
      relevanceScore: z.number()
    });

    const structuredModel = LLMService.getStructuredModel(TestSchema);
    expect(structuredModel).toBeDefined();
    expect(typeof structuredModel.invoke).toBe("function");
  });
});

