import { ResearchStateType, ResearchStateUpdate, SearchEvidence } from "../state";
import { logger } from "../../utils/logger";

// Aggregator node responsible for de-duplicating, scoring, and re-ranking collected evidence
export async function aggregatorNode(state: ResearchStateType): Promise<ResearchStateUpdate> {
  const rawEvidence = state.collectedEvidence || [];
  logger.info({ msg: "Aggregator node processing raw collected evidence", totalItems: rawEvidence.length });

  if (rawEvidence.length === 0) {
    return { collectedEvidence: [] };
  }

  // De-duplicate evidence items based on normalized URL/ID and snippet content
  const seenUrls = new Set<string>();
  const seenSnippetPrefixes = new Set<string>();
  const uniqueEvidence: SearchEvidence[] = [];

  for (const item of rawEvidence) {
    // Normalize URL by removing query parameters and trailing slashes for comparison
    const normalizedUrl = (item.urlOrId || "").toLowerCase().split("?")[0].replace(/\/+$/, "");
    // Extract first 80 characters of snippet to detect identical content mirrors
    const snippetKey = (item.snippet || "").slice(0, 80).toLowerCase().replace(/\s+/g, " ");

    if (normalizedUrl && seenUrls.has(normalizedUrl)) {
      continue;
    }
    if (snippetKey && seenSnippetPrefixes.has(snippetKey)) {
      continue;
    }

    if (normalizedUrl) seenUrls.add(normalizedUrl);
    if (snippetKey) seenSnippetPrefixes.add(snippetKey);
    uniqueEvidence.push(item);
  }

  // Calculate composite relevance score incorporating base worker score and text informativeness
  const scoredEvidence = uniqueEvidence.map((item) => {
    let score = item.score ?? 0.7;

    // Reward rich snippets that provide comprehensive empirical depth
    if (item.snippet && item.snippet.length > 250) {
      score += 0.05;
    }

    // Give higher priority to uploaded internal document evidence
    if (item.source === "document") {
      score += 0.1;
    }

    return {
      ...item,
      score: Math.min(1.0, Math.max(0.0, score))
    };
  });

  // Sort descending by final calculated relevance score
  scoredEvidence.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Cap aggregated evidence pool to top 15 highest-authority cards
  const topEvidence = scoredEvidence.slice(0, 15);

  return {
    collectedEvidence: topEvidence
  };
}

