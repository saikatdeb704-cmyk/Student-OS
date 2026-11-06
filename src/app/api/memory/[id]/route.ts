import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { getAuthenticatedUserId } from "@/lib/auth/session";

const UpdateMemorySchema = z.object({
  content: z.string().min(3).optional(),
  category: z.string().min(2).optional(),
  importanceScore: z.number().min(0).max(1).optional(),
  reviewStatus: z.enum(["pending_review", "verified", "archived"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateMemorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid memory update payload",
        },
        { status: 400 }
      );
    }

    const updated = dbStore.updateMemoryRecord(id, parsed.data, sessionUserId);
    if (!updated) {
      return NextResponse.json(
        { error: "Memory record not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ record: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update memory record",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const { id } = await context.params;

    const deleted = dbStore.deleteMemoryRecord(id, sessionUserId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Memory record not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete memory record",
      },
      { status: 500 }
    );
  }
}

