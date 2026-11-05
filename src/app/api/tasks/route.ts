import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SupabaseDataService } from "@/lib/db/supabase-data-service";
import { getAuthenticatedUserId } from "@/lib/auth/session";

const CreateTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueAt: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const tasks = await SupabaseDataService.getTasks(sessionUserId);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const body = await request.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const task = await SupabaseDataService.createTask(
    {
      ...parsed.data,
      dueAt: parsed.data.dueAt || new Date().toISOString(),
    },
    sessionUserId
  );
  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const body = await request.json();
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await SupabaseDataService.updateTaskStatus(
    parsed.data.id,
    parsed.data.status,
    sessionUserId
  );
  if (!updated) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 }
    );
  }
  return NextResponse.json({ task: updated });
}
