import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalService } from "@/lib/security/approval-service";
import { getAuthenticatedUserId } from "@/lib/auth/session";

const DecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionUserId = await getAuthenticatedUserId(request);
  const body = await request.json();
  const parsed = DecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid decision", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const approval = ApprovalService.decideApproval({
      approvalId: id,
      decision: parsed.data.decision,
      userId: sessionUserId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ approval });
  } catch (error: any) {
    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 400;

    return NextResponse.json(
      { error: error.message || "Failed to record approval decision" },
      { status }
    );
  }
}
