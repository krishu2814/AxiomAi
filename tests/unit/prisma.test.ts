import { describe, it, expect } from "vitest";
import { prisma, disconnectPrisma } from "../../src/db/prisma";

describe("Prisma Database Client", () => {
  it("should initialize the singleton Prisma client instance", () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("should have models configured from schema.prisma", () => {
    expect(prisma.document).toBeDefined();
    expect(prisma.documentChunk).toBeDefined();
    expect(prisma.researchSession).toBeDefined();
  });

  it("should export disconnectPrisma helper function", async () => {
    expect(typeof disconnectPrisma).toBe("function");
  });
});

