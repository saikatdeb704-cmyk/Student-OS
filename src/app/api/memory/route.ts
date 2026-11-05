import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LABELS } from "@/lib/memory/engine";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";

const MemoryActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    category: z.string().min(2),
    content: z.string().min(3),
    importanceScore: z.number().min(0).max(1).optional(),
    reviewStatus: z
      .enum(["pending_review", "verified", "archived"])
      .optional(),
    sourceType: z
      .enum([
        "manual",
        "onboarding",
        "conversation",
        "agent_decision",
        "document",
      ])
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    action: z.literal("sync_context"),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const query = request.nextUrl.searchParams.get("q") || "";
  const category = request.nextUrl.searchParams.get("category") || "all";
  const includeArchived =
    request.nextUrl.searchParams.get("includeArchived") === "true";

  const retrieved = dbStore.retrieveMemoriesWithRelevance(
    {
      query,
      category,
      includeArchived,
    },
    sessionUserId
  );

  return NextResponse.json({
    query,
    category,
    categories: MEMORY_CATEGORIES.map((id) => ({
      id,
      label: MEMORY_CATEGORY_LABELS[id],
    })),
    memories: retrieved.memories,
    documents: retrieved.documents,
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const body = await request.json();
    const parsed = MemoryActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid memory action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "sync_context") {
      const syncResult = dbStore.syncLiveContextToMemories(sessionUserId);
      return NextResponse.json(syncResult);
    }

    if (payload.action === "create") {
      const creationResult = dbStore.createMemoryWithDeduplication(
        {
          category: payload.category,
          content: payload.content,
          importanceScore: payload.importanceScore,
          reviewStatus: payload.reviewStatus || "verified",
          sourceType: payload.sourceType || "manual",
          metadata: payload.metadata,
        },
        sessionUserId
      );

      return NextResponse.json(creationResult, {
        status: creationResult.created ? 201 : 200,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error in Memory API",
      },
      { status: 500 }
    );
  }
}

