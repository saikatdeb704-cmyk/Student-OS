// ============================================================================
// PHASE 3: AI PROVIDER ABSTRACTION SERVICE (SERVER-ONLY GEMINI ADAPTER)
// ============================================================================
// Strictly server-side AI provider interface with request validation,
// per-request & per-user token limits, usage tracking, and graceful error handling.

import { z } from "zod";
import type { TokenUsageRecord } from "@/types/student-os";

export const MAX_TOKENS_PER_REQUEST = 4096;
export const DAILY_TOKEN_BUDGET_PER_USER = 120_000;

export const AIRequestSchema = z.object({
  systemPrompt: z.string().trim().min(1, "System prompt is required"),
  userPrompt: z
    .string()
    .trim()
    .min(1, "User prompt cannot be empty")
    .max(16000, "Prompt exceeds maximum allowed input character limit"),
  maxTokens: z
    .number()
    .int()
    .min(64)
    .max(MAX_TOKENS_PER_REQUEST)
    .optional(),
  maxOutputTokens: z
    .number()
    .int()
    .min(64)
    .max(MAX_TOKENS_PER_REQUEST)
    .optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  userId: z.string().optional(),
  agentSlug: z.string().optional(),
});

export type AIRequestOptions = z.infer<typeof AIRequestSchema>;

export interface TokenUsageSnapshot {
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  dailyBudgetTokens: number;
  remainingBudgetTokens: number;
  remainingDailyTokens: number;
  estimatedCostUsd: number;
  providerMode: "gemini" | "local_contextual_engine";
  model: string;
}

export interface AIProviderAdapter {
  readonly name: string;
  readonly providerId: string;
  readonly defaultModel: string;
  readonly modelName: string;
  isConfigured(): boolean;
  estimateTokens(text: string): number;
  generateJSON<T>(options: AIRequestOptions): Promise<{
    data: T | null;
    inputTokens: number;
    outputTokens: number;
    providerMode: "gemini" | "local_contextual_engine";
    model: string;
    error?: string;
  }>;
  streamText(
    options: AIRequestOptions,
    onDelta: (chunk: string) => void
  ): Promise<string | null>;
}

function assertServerOnlyContext() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: AI Provider Adapter and API keys must never be imported or executed in frontend code."
    );
  }
}

interface UserUsageTracker {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

const globalForAIUsage = globalThis as unknown as {
  studentOSAIUsageByUser?: Record<string, UserUsageTracker>;
  studentOSGlobalAIUsage?: UserUsageTracker;
};

function getGlobalTracker(): UserUsageTracker {
  if (!globalForAIUsage.studentOSGlobalAIUsage) {
    globalForAIUsage.studentOSGlobalAIUsage = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }
  return globalForAIUsage.studentOSGlobalAIUsage;
}

function getUserTracker(userId = "usr_arjun_01"): UserUsageTracker {
  if (!globalForAIUsage.studentOSAIUsageByUser) {
    globalForAIUsage.studentOSAIUsageByUser = {};
  }
  if (!globalForAIUsage.studentOSAIUsageByUser[userId]) {
    globalForAIUsage.studentOSAIUsageByUser[userId] = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }
  return globalForAIUsage.studentOSAIUsageByUser[userId];
}

export function resetAIUsageMetricsForTesting() {
  globalForAIUsage.studentOSAIUsageByUser = {};
  globalForAIUsage.studentOSGlobalAIUsage = {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
  };
}

export function estimateTokenCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function getDailyTokenBudgetLimit(): number {
  return Number(
    process.env.DAILY_TOKEN_BUDGET_PER_USER || DAILY_TOKEN_BUDGET_PER_USER
  );
}

export function getMaxTokensPerRequest(): number {
  return Number(process.env.MAX_TOKENS_PER_REQUEST || MAX_TOKENS_PER_REQUEST);
}

export function recordAIUsageMetrics(params: {
  userId?: string;
  agentSlug?: string;
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
}): TokenUsageRecord {
  assertServerOnlyContext();
  const uid = params.userId || "usr_arjun_01";
  const userTracker = getUserTracker(uid);
  const globalTracker = getGlobalTracker();

  const totalTokens = params.inputTokens + params.outputTokens;
  const callCost =
    (params.inputTokens / 1_000_000) * 0.075 +
    (params.outputTokens / 1_000_000) * 0.3;

  userTracker.requests += 1;
  userTracker.inputTokens += params.inputTokens;
  userTracker.outputTokens += params.outputTokens;
  userTracker.estimatedCostUsd = Number(
    (userTracker.estimatedCostUsd + callCost).toFixed(6)
  );

  globalTracker.requests += 1;
  globalTracker.inputTokens += params.inputTokens;
  globalTracker.outputTokens += params.outputTokens;
  globalTracker.estimatedCostUsd = Number(
    (globalTracker.estimatedCostUsd + callCost).toFixed(6)
  );

  return {
    id: `usage_${Date.now()}`,
    userId: uid,
    agentSlug: params.agentSlug || "ceo",
    provider: params.provider || "gemini",
    model: params.model || process.env.GEMINI_MODEL || "gemini-1.5-flash",
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens,
    estimatedCostUsd: Number(callCost.toFixed(6)),
    timestamp: new Date().toISOString(),
  };
}

export function checkUserTokenQuota(
  userId = "usr_arjun_01",
  additionalEstimatedTokens = 0
): {
  allowed: boolean;
  usedTokens: number;
  limitTokens: number;
  remainingTokens: number;
  remainingDailyTokens: number;
  reason?: string;
} {
  assertServerOnlyContext();
  const tracker = getUserTracker(userId);
  const limitTokens = getDailyTokenBudgetLimit();
  const usedTokens = tracker.inputTokens + tracker.outputTokens;
  const remainingTokens = Math.max(0, limitTokens - usedTokens);

  if (additionalEstimatedTokens > getMaxTokensPerRequest()) {
    return {
      allowed: false,
      usedTokens,
      limitTokens,
      remainingTokens,
      remainingDailyTokens: remainingTokens,
      reason: `Request exceeds single-request token limit (${additionalEstimatedTokens} > ${getMaxTokensPerRequest()} tokens).`,
    };
  }

  if (usedTokens + additionalEstimatedTokens > limitTokens) {
    return {
      allowed: false,
      usedTokens,
      limitTokens,
      remainingTokens,
      remainingDailyTokens: remainingTokens,
      reason: `Daily token budget reached (${limitTokens} tokens/day) for this student account.`,
    };
  }

  return {
    allowed: true,
    usedTokens,
    limitTokens,
    remainingTokens,
    remainingDailyTokens: remainingTokens,
  };
}

export function getAIUsageSnapshot(userId?: string): TokenUsageSnapshot {
  assertServerOnlyContext();
  const tracker = userId ? getUserTracker(userId) : getGlobalTracker();
  const dailyBudgetTokens = getDailyTokenBudgetLimit();
  const totalTokens = tracker.inputTokens + tracker.outputTokens;
  const remaining = Math.max(0, dailyBudgetTokens - totalTokens);

  return {
    totalRequests: tracker.requests,
    inputTokens: tracker.inputTokens,
    outputTokens: tracker.outputTokens,
    totalTokens,
    dailyBudgetTokens,
    remainingBudgetTokens: remaining,
    remainingDailyTokens: remaining,
    estimatedCostUsd: tracker.estimatedCostUsd,
    providerMode: process.env.GEMINI_API_KEY
      ? "gemini"
      : "local_contextual_engine",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  };
}

export class GeminiProviderAdapter implements AIProviderAdapter {
  readonly name = "gemini";
  readonly providerId = "google-gemini";

  get defaultModel(): string {
    return process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  get modelName(): string {
    return this.defaultModel;
  }

  isConfigured(): boolean {
    assertServerOnlyContext();
    return Boolean(process.env.GEMINI_API_KEY);
  }

  estimateTokens(text: string): number {
    return estimateTokenCount(text);
  }

  async generateJSON<T>(options: AIRequestOptions): Promise<{
    data: T | null;
    inputTokens: number;
    outputTokens: number;
    providerMode: "gemini" | "local_contextual_engine";
    model: string;
    error?: string;
  }> {
    assertServerOnlyContext();

    const parsed = AIRequestSchema.safeParse(options);
    if (!parsed.success) {
      return {
        data: null,
        inputTokens: 0,
        outputTokens: 0,
        providerMode: this.isConfigured()
          ? "gemini"
          : "local_contextual_engine",
        model: this.modelName,
        error: parsed.error.issues[0]?.message || "Invalid AI request options",
      };
    }

    const maxTokens = Math.min(
      parsed.data.maxOutputTokens ||
        parsed.data.maxTokens ||
        getMaxTokensPerRequest(),
      getMaxTokensPerRequest()
    );
    const estimatedInput = this.estimateTokens(
      parsed.data.systemPrompt + "\n" + parsed.data.userPrompt
    );

    const quota = checkUserTokenQuota(parsed.data.userId, estimatedInput);
    if (!quota.allowed) {
      return {
        data: null,
        inputTokens: 0,
        outputTokens: 0,
        providerMode: this.isConfigured()
          ? "gemini"
          : "local_contextual_engine",
        model: this.modelName,
        error: quota.reason,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const simulatedOutputTokens = 210;
      recordAIUsageMetrics({
        userId: parsed.data.userId,
        agentSlug: parsed.data.agentSlug,
        inputTokens: estimatedInput,
        outputTokens: simulatedOutputTokens,
      });
      return {
        data: null,
        inputTokens: estimatedInput,
        outputTokens: simulatedOutputTokens,
        providerMode: "local_contextual_engine",
        model: this.modelName,
      };
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: parsed.data.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: parsed.data.userPrompt }],
            },
          ],
          generationConfig: {
            temperature: parsed.data.temperature ?? 0.3,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
          },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          data: null,
          inputTokens: estimatedInput,
          outputTokens: 0,
          providerMode: "gemini",
          model: this.modelName,
          error: `Gemini API returned status ${response.status}`,
        };
      }

      const payload = await response.json();
      const rawText: string | undefined =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text;

      const actualInput = Number(
        payload?.usageMetadata?.promptTokenCount || estimatedInput
      );
      const actualOutput = Number(
        payload?.usageMetadata?.candidatesTokenCount ||
          this.estimateTokens(rawText || "")
      );

      recordAIUsageMetrics({
        userId: parsed.data.userId,
        agentSlug: parsed.data.agentSlug,
        inputTokens: actualInput,
        outputTokens: actualOutput,
      });

      if (!rawText) {
        return {
          data: null,
          inputTokens: actualInput,
          outputTokens: actualOutput,
          providerMode: "gemini",
          model: this.modelName,
          error: "Empty response from Gemini API",
        };
      }

      return {
        data: JSON.parse(rawText) as T,
        inputTokens: actualInput,
        outputTokens: actualOutput,
        providerMode: "gemini",
        model: this.modelName,
      };
    } catch (err) {
      return {
        data: null,
        inputTokens: estimatedInput,
        outputTokens: 0,
        providerMode: "gemini",
        model: this.modelName,
        error:
          err instanceof Error ? err.message : "Failed to call Gemini API",
      };
    }
  }

  async streamText(
    options: AIRequestOptions,
    onDelta: (chunk: string) => void
  ): Promise<string | null> {
    assertServerOnlyContext();

    const parsed = AIRequestSchema.safeParse(options);
    if (!parsed.success) return null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const maxTokens = Math.min(
      parsed.data.maxOutputTokens ||
        parsed.data.maxTokens ||
        getMaxTokensPerRequest(),
      getMaxTokensPerRequest()
    );
    const estimatedInput = this.estimateTokens(
      parsed.data.systemPrompt + "\n" + parsed.data.userPrompt
    );

    const quota = checkUserTokenQuota(parsed.data.userId, estimatedInput);
    if (!quota.allowed) return null;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: parsed.data.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: parsed.data.userPrompt }],
            },
          ],
          generationConfig: {
            temperature: parsed.data.temperature ?? 0.25,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!response.ok) return null;
      const payload = await response.json();
      const text: string | undefined =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const actualInput = Number(
        payload?.usageMetadata?.promptTokenCount || estimatedInput
      );
      const actualOutput = Number(
        payload?.usageMetadata?.candidatesTokenCount ||
          this.estimateTokens(text)
      );

      recordAIUsageMetrics({
        userId: parsed.data.userId,
        agentSlug: parsed.data.agentSlug,
        inputTokens: actualInput,
        outputTokens: actualOutput,
      });

      const chunks = text.split("\n\n");
      for (let i = 0; i < chunks.length; i++) {
        const piece =
          i === chunks.length - 1 ? chunks[i] : `${chunks[i]}\n\n`;
        onDelta(piece);
      }

      return text;
    } catch {
      return null;
    }
  }
}

const defaultProviderInstance = new GeminiProviderAdapter();

export function getAIProvider(): AIProviderAdapter {
  assertServerOnlyContext();
  return defaultProviderInstance;
}

export function getActiveAIProvider(): AIProviderAdapter {
  assertServerOnlyContext();
  return defaultProviderInstance;
}

export async function generateAIJSON<T>(
  options: AIRequestOptions
): Promise<T | null> {
  const result = await defaultProviderInstance.generateJSON<T>(options);
  return result.data;
}
