import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initRedis, isRedisHealthy, closeRedis } from "./config/redis";
import { prisma, disconnectPrisma } from "./db/prisma";

// Create root Express application instance
export const app = express();

// Enable Cross-Origin Resource Sharing for front-end clients
app.use(cors());

// Parse incoming requests with JSON payloads capped at 10mb
app.use(express.json({ limit: "10mb" }));

// Log basic details for all incoming HTTP requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug({ method: req.method, url: req.url });
  next();
});

// Health check endpoint reporting overall system and dependent service availability
app.get("/health", async (_req: Request, res: Response) => {
  let dbHealthy = false;

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const redisHealthy = isRedisHealthy();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy,
      redis: redisHealthy
    }
  });
});

// Global error handling middleware to catch unhandled route exceptions
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ msg: "Unhandled HTTP route error", error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// Bootstraps background connections and starts listening on configured port
export async function startServer() {
  // Attempt Redis connection
  await initRedis();

  const server = app.listen(env.PORT, () => {
    logger.info({ msg: `AxiomAi HTTP API server listening on port ${env.PORT}`, env: env.NODE_ENV });
  });

  // Gracefully handles termination signals to cleanly close database and cache pools
  const shutdown = async (signal: string) => {
    logger.info({ msg: `Received ${signal}, starting graceful shutdown...` });
    server.close(async () => {
      await disconnectPrisma();
      await closeRedis();
      logger.info({ msg: "Graceful shutdown complete" });
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

// Start HTTP server only when file is executed directly (not when imported in test suites)
if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.error({ msg: "Failed to initialize server", error: err });
    process.exit(1);
  });
}

