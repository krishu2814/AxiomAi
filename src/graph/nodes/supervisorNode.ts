import { z } from "zod";
import { ResearchStateType, ResearchStateUpdate } from "../state";
import { LLMService } from "../../services/llmService";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

// Schema defining the structured query decomposition plan produced by the supervisor
export const SupervisorPlanSchema = z.object({
  subQuestions: z.array(z.string()).min(1).max(5),
  activeWorkers: z.array(z.enum(["web", "document"])).min(1)
});

export type SupervisorPlan = z.infer<typeof SupervisorPlanSchema>;

// Supervisor agent node that analyzes user inquiries and plans multi-worker research paths
export async function supervisorNode(state: ResearchStateType): Promise<ResearchStateUpdate> {
  const query = state.query?.trim() || "Deep research topic";
  logger.info({ msg: "Supervisor agent analyzing and decomposing research query", query });

  // Use LLM with structured output if valid API key is present
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "mock-key" && !env.OPENAI_API_KEY.startsWith("mock-")) {
    try {
      const plannerModel = LLMService.getStructuredModel(SupervisorPlanSchema, { temperature: 0.1 });
      const prompt = `You are the Lead Research Supervisor. Decompose this complex query into 3 focused, non-overlapping sub-questions for parallel evidence collection: "${query}". Determine which worker channels (web, document) should be dispatched.`;

      const plan = await plannerModel.invoke(prompt);
      if (plan && plan.subQuestions && plan.subQuestions.length > 0) {
        return {
          subQuestions: plan.subQuestions,
          activeWorkers: plan.activeWorkers
        };
      }
    } catch (err: any) {
      logger.warn({ msg: "Supervisor LLM decomposition failed, using heuristic fallback", error: err.message });
    }
  }

  // Generate deterministic analytical sub-questions for offline, test, or fallback execution
  const fallbackPlan: SupervisorPlan = {
    subQuestions: [
      `What are the core architectural foundations and primary mechanisms of ${query}?`,
      `What are the empirical performance benchmarks and verified trade-offs in ${query}?`,
      `What are the known limitations, edge cases, and future directions concerning ${query}?`
    ],
    activeWorkers: ["web", "document"]
  };

  return {
    subQuestions: fallbackPlan.subQuestions,
    activeWorkers: fallbackPlan.activeWorkers
  };
}

