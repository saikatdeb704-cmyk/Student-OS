import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeCEOOrchestration } from "@/lib/agents/orchestrator";
import {
  checkUserTokenQuota,
  estimateTokenCount,
  MAX_TOKENS_PER_REQUEST,
} from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";
import type { CEOEvent } from "@/types/student-os";

const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(
      12000,
      "Message exceeds maximum allowed length (12,000 characters)"
    ),
  conversationId: z.string().trim().min(1).optional(),
  stream: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid chat request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const sessionUserId =
      request.cookies.get(SESSION_COOKIE_NAME)?.value || "usr_arjun_01";

    const rateResult = checkRateLimit(`chat_${sessionUserId}`, "ai_chat", sessionUserId);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many AI CEO requests. Please wait a moment before sending more messages.",
          retryAfter: rateResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetInSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    const { message, conversationId, stream } = parsed.data;

    // Validate request token budget before launching CEO orchestration
    const estimatedPromptTokens = estimateTokenCount(message) + 250;
    if (estimatedPromptTokens > MAX_TOKENS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Request exceeds single-request token limit (${estimatedPromptTokens} > ${MAX_TOKENS_PER_REQUEST} tokens).`,
          code: "MAX_REQUEST_TOKENS_EXCEEDED",
        },
        { status: 422 }
      );
    }

    const quota = checkUserTokenQuota(sessionUserId, estimatedPromptTokens);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason || "Daily AI token quota reached.",
          code: "DAILY_QUOTA_EXCEEDED",
          remainingDailyTokens: quota.remainingDailyTokens,
        },
        { status: 429 }
      );
    }

    if (!stream) {
      const result = await executeCEOOrchestration(
        message,
        conversationId,
        undefined,
        sessionUserId
      );
      return NextResponse.json(result);
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (event: CEOEvent) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          await executeCEOOrchestration(
            message,
            conversationId,
            emit,
            sessionUserId
          );
        } catch (err) {
          emit({
            type: "error",
            code: "CEO_ORCHESTRATION_ERROR",
            message:
              err instanceof Error ? err.message : "CEO orchestration failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal orchestration error",
      },
      { status: 500 }
    );
  }
}
