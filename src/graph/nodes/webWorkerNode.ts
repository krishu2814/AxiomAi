import { ResearchStateType, ResearchStateUpdate, SearchEvidence } from "../state";
import { SearchService } from "../../services/searchService";
import { logger } from "../../utils/logger";

// Worker node executing parallel web index searches for supervisor sub-questions
export async function webWorkerNode(state: ResearchStateType): Promise<ResearchStateUpdate> {
  const subQuestions = state.subQuestions.length > 0 ? state.subQuestions : [state.query];
  logger.info({ msg: "Web research worker dispatched", targetSubQuestions: subQuestions.length });

  const collected: SearchEvidence[] = [];

  // Iterate through sub-questions and query web search index
  for (const subQ of subQuestions) {
    try {
      const searchItems = await SearchService.search(subQ, { maxResults: 2 });
      for (const item of searchItems) {
        collected.push({
          source: "web",
          title: item.title,
          urlOrId: item.url,
          snippet: item.content,
          subQuestion: subQ,
          score: item.score ?? 0.8
        });
      }
    } catch (err: any) {
      logger.warn({ msg: "Web worker query encountered error", subQuestion: subQ, error: err.message });
    }
  }

  // Return new evidence items which append cleanly into state via LangGraph reducer
  return {
    collectedEvidence: collected
  };
}

