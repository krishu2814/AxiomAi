import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" }
    ]
  });

prisma.$on("error" as never, (e: any) => {
  logger.error({ msg: "Prisma database client error", error: e });
});

prisma.$on("warn" as never, (e: any) => {
  logger.warn({ msg: "Prisma database client warning", warning: e });
});

if (env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

