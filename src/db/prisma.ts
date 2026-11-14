import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { env } from "../config/env";

// Declare global variable to preserve singleton instance during development hot-reloads
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Instantiate singleton Prisma client with query and error listeners
export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" }
    ]
  });

// Route Prisma error events to structured logger
prisma.$on("error" as never, (e: any) => {
  logger.error({ msg: "Prisma database client error", error: e });
});

// Route Prisma warning events to structured logger
prisma.$on("warn" as never, (e: any) => {
  logger.warn({ msg: "Prisma database client warning", warning: e });
});

// Cache instance on global object in non-production environments
if (env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

// Gracefully disconnect Prisma database connection on shutdown
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
