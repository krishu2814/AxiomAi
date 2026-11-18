import { ResearchStateType, ResearchStateUpdate, SearchEvidence } from "../state";
import { VectorStoreService } from "../../services/vectorStoreService";
import { logger } from "../../utils/logger";

// Worker node executing dense vector similarity search across indexed documents
export async function docWorkerNode(state: ResearchStateType): Promise<ResearchStateUpdate> {
  const subQuestions = state.subQuestions.length > 0 ? state.subQuestions : [state.query];
  logger.info({ msg: "Document retrieval worker dispatched", targetSubQuestions: subQuestions.length });

  const collected: SearchEvidence[] = [];

  // Query vector store for each sub-question
  for (const subQ of subQuestions) {
    try {
      const chunkMatches = await VectorStoreService.search(subQ, { topK: 2, minSimilarity: 0.1 });
      for (const match of chunkMatches) {
        collected.push({
          source: "document",
          title: match.documentTitle,
          urlOrId: match.chunkId,
          snippet: match.content,
          subQuestion: subQ,
          score: match.similarity
        });
      }
    } catch (err: any) {
      logger.warn({ msg: "Document worker search encountered error", subQuestion: subQ, error: err.message });
    }
  }

  // Return retrieved document evidence to be accumulated by LangGraph state reducer
  return {
    collectedEvidence: collected
  };
}

