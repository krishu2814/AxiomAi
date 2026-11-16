import { BaseCheckpointSaver, MemorySaver } from "@langchain/langgraph";
import { logger } from "../utils/logger";

// Shared checkpointer singleton instance holding graph state checkpoints
let sharedCheckpointer: BaseCheckpointSaver | null = null;

// Retrieves or initializes the shared LangGraph state checkpointer instance
export function getCheckpointer(): BaseCheckpointSaver {
  if (!sharedCheckpointer) {
    logger.info({ msg: "Initializing LangGraph state checkpointer (MemorySaver resilient mode)" });
    sharedCheckpointer = new MemorySaver();
  }
  return sharedCheckpointer;
}

// Resets the checkpointer instance to a fresh state for isolated test runs
export function resetCheckpointerForTests(): void {
  sharedCheckpointer = new MemorySaver();
}

