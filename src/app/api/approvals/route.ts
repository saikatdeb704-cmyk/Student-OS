import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalService } from "@/lib/security/approval-service";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import type { AgentSlug, ApprovalStatus } from "@/types/student-os";

const CreateApprovalSchema = z.object({
  agentSlug: z.string(),
  actionType: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  runId: z.string().optional(),
  expiresInHours: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ApprovalStatus | null;
  const includeExpired = searchParams.get("includeExpired") === "true";

  try {
    const approvals = ApprovalService.listApprovals(sessionUserId, {
      status: status || undefined,
      includeExpired,
    });
    return NextResponse.json({ approvals });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list approvals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const body = await request.json();
  const parsed = CreateApprovalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid approval payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = ApprovalService.createApproval({
      userId: sessionUserId,
      agentSlug: parsed.data.agentSlug as AgentSlug,
      actionType: parsed.data.actionType,
      title: parsed.data.title,
      description: parsed.data.description,
      payload: parsed.data.payload,
      runId: parsed.data.runId,
      expiresInHours: parsed.data.expiresInHours,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create approval" },
      { status: 400 }
    );
  }
}

