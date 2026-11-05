import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";

const UpdateTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Conversation title cannot be empty")
    .max(120, "Conversation title cannot exceed 120 characters"),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const details = dbStore.getConversationById(id, sessionUserId);

  if (!details) {
    return NextResponse.json(
      { error: "Conversation not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json(details);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const body = await request.json();
    const parsed = UpdateTitleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid conversation title",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updated = dbStore.updateConversationTitle(
      id,
      parsed.data.title,
      sessionUserId
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to rename conversation title",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const deleted = dbStore.deleteConversation(id, sessionUserId);

  if (!deleted) {
    return NextResponse.json(
      { error: "Conversation not found or access denied" },
      { status: 404 }
    );
  }

  // Ensure the student always retains at least one active conversation
  let remaining = dbStore.getConversations(sessionUserId);
  if (remaining.length === 0) {
    dbStore.createConversation("New Conversation", sessionUserId);
    remaining = dbStore.getConversations(sessionUserId);
  }

  return NextResponse.json({
    deleted: true,
    conversations: remaining,
  });
}

