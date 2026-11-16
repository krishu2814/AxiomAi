import { describe, it, expect, beforeEach } from "vitest";
import { getCheckpointer, resetCheckpointerForTests } from "../../src/graph/checkpointer";

// Tests for LangGraph state checkpointer management
describe("LangGraph Checkpointer", () => {
  beforeEach(() => {
    resetCheckpointerForTests();
  });

  // Verifies that checkpointer returns a valid checkpoint saver instance
  it("should initialize a singleton BaseCheckpointSaver instance", () => {
    const saver1 = getCheckpointer();
    const saver2 = getCheckpointer();

    expect(saver1).toBeDefined();
    expect(saver1).toBe(saver2);
  });

  // Verifies that resetCheckpointer creates a fresh instance
  it("should reset checkpointer singleton on demand", () => {
    const original = getCheckpointer();
    resetCheckpointerForTests();
    const fresh = getCheckpointer();

    expect(fresh).toBeDefined();
    expect(fresh).not.toBe(original);
  });
});

