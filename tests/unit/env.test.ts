import { describe, it, expect } from "vitest";
import { parseEnv, EnvSchema } from "../../src/config/env";

describe("Environment Configuration", () => {
  it("should validate and parse default environment variables correctly", () => {
    const config = parseEnv({
      PORT: "4000",
      NODE_ENV: "test",
      LOG_LEVEL: "debug",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/testdb",
      REDIS_URL: "redis://localhost:6379",
      OPENAI_API_KEY: "sk-test-mock-key"
    });

    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe("test");
    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.OPENAI_MODEL).toBe("gpt-4o-mini");
  });

  it("should fail validation if an invalid NODE_ENV is provided", () => {
    expect(() => {
      parseEnv({
        NODE_ENV: "invalid_env" as any
      });
    }).toThrow("Invalid environment configuration");
  });

  it("should fail validation if an invalid LOG_LEVEL is provided", () => {
    expect(() => {
      parseEnv({
        LOG_LEVEL: "super-verbose" as any
      });
    }).toThrow("Invalid environment configuration");
  });
});
