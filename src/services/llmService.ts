import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Configuration options for LLM model instantiation
export interface LLMOptions {
  modelName?: string;
  temperature?: number;
  provider?: "openai" | "groq";
  maxTokens?: number;
}

// Unified service for instantiating and configuring LLM chat models and structured parsers
export class LLMService {
  // Returns a configured chat model according to provider preference and options
  public static getModel(options: LLMOptions = {}): BaseChatModel {
    const provider = options.provider ?? (env.GROQ_API_KEY ? "groq" : "openai");
    const temperature = options.temperature ?? 0.2;

    // Use Groq high-speed inference if selected and API key is present
    if (provider === "groq" && env.GROQ_API_KEY) {
      return new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: options.modelName || "llama-3.3-70b-versatile",
        temperature,
        maxTokens: options.maxTokens
      });
    }

    // Default to OpenAI chat model client
    const openAiKey = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "mock-key" ? env.OPENAI_API_KEY : "sk-mock-key-for-local";

    return new ChatOpenAI({
      openAIApiKey: openAiKey,
      modelName: options.modelName || env.OPENAI_MODEL,
      temperature,
      maxTokens: options.maxTokens
    });
  }

  // Returns high-reasoning model instance for adversarial fact-checking and audit nodes
  public static getAuditModel(): BaseChatModel {
    const openAiKey = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "mock-key" ? env.OPENAI_API_KEY : "sk-mock-key-for-local";

    return new ChatOpenAI({
      openAIApiKey: openAiKey,
      modelName: env.OPENAI_AUDIT_MODEL,
      temperature: 0.0
    });
  }

  // Returns model instance with schema-enforced structured JSON output
  public static getStructuredModel<T extends z.ZodTypeAny>(schema: T, options: LLMOptions = {}) {
    const model = this.getModel(options);
    return model.withStructuredOutput(schema);
  }
}

