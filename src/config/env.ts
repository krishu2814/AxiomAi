import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

export const EnvSchema = z.object({
  // Server runtime
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Data persistence
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgrespassword@localhost:5432/axiomai?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // LLM Providers & Models
  OPENAI_API_KEY: z.string().default("mock-key"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_AUDIT_MODEL: z.string().default("gpt-4o"),

  // Optional Providers
  GROQ_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, unknown> = process.env): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error("❌ Invalid environment variables configuration:", JSON.stringify(formattedErrors, null, 2));
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = parseEnv();
