/**
 * Student OS Sliding-Window Rate Limiter
 *
 * Protects critical application boundaries:
 * 1. Authentication endpoints (prevents brute-force credential stuffing)
 * 2. AI CEO & Agent invocation routes (prevents denial-of-service and token exhaustion)
 * 3. General mutation API endpoints
 */

import { dbStore } from "../db/store.ts";

export interface RateLimitConfig {
  maxRequests: number; // Maximum allowed requests
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

interface RequestRecord {
  timestamps: number[];
}

const rateLimitBuckets = new Map<string, RequestRecord>();

export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 attempts per minute
  ai_chat: { maxRequests: 25, windowMs: 60 * 1000 }, // 25 requests per minute
  api_standard: { maxRequests: 120, windowMs: 60 * 1000 }, // 120 requests per minute
};

/**
 * Check and record a request against a sliding time window
 */
export function checkRateLimit(
  identifier: string,
  preset: "auth" | "ai_chat" | "api_standard" | RateLimitConfig = "api_standard",
  userId?: string
): RateLimitResult {
  const config =
    typeof preset === "string" ? RATE_LIMIT_PRESETS[preset] : preset;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  const record = rateLimitBuckets.get(identifier) || { timestamps: [] };

  // Evict timestamps outside current window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const oldest = validTimestamps[0];
    const resetInSeconds = Math.max(
      1,
      Math.ceil((oldest + config.windowMs - now) / 1000)
    );

    // Audit rate-limit violation
    dbStore.recordAuditLog({
      userId: userId || "anonymous",
      actorType: "system",
      action: "rate_limit_exceeded",
      resourceType: "endpoint",
      metadata: {
        identifier: identifier.slice(0, 32),
        preset: typeof preset === "string" ? preset : "custom",
        limit: config.maxRequests,
      },
    });

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Record current timestamp
  validTimestamps.push(now);
  rateLimitBuckets.set(identifier, { timestamps: validTimestamps });

  const remaining = config.maxRequests - validTimestamps.length;
  const resetInSeconds = Math.ceil(config.windowMs / 1000);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining,
    resetInSeconds,
  };
}

/**
 * Reset rate limit bucket (used for testing or explicit administrative reset)
 */
export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitBuckets.delete(identifier);
  } else {
    rateLimitBuckets.clear();
  }
}

