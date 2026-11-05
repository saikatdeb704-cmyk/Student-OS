import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";

const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let conversations = dbStore.getConversations(sessionUserId);

  // Ensure the student always has at least one active conversation
  if (conversations.length === 0) {
    dbStore.createConversation("Academic & Career Executive Plan", sessionUserId);
    conversations = dbStore.getConversations(sessionUserId);
  }

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const body = await request.json().catch(() => ({}));
    const parsed = CreateConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid conversation payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const conversation = dbStore.createConversation(
      parsed.data.title,
      sessionUserId
    );
    const details = dbStore.getConversationById(conversation.id, sessionUserId);

    return NextResponse.json(
      {
        conversation,
        messages: details?.messages ?? [],
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create conversation",
      },
      { status: 500 }
    );
  }
}

