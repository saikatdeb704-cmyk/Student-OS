import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalService } from "@/lib/security/approval-service";
import { getAuthenticatedUserId } from "@/lib/auth/session";

const CancelSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionUserId = await getAuthenticatedUserId(request);
  let reason: string | undefined;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CancelSchema.safeParse(body);
    if (parsed.success) {
      reason = parsed.data.reason;
    }
  } catch {}

  try {
    const approval = ApprovalService.cancelApproval({
      approvalId: id,
      userId: sessionUserId,
      reason,
    });

    return NextResponse.json({
      success: true,
      approval,
      message: "Approval request successfully cancelled by student.",
    });
  } catch (error: any) {
    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 400;

    return NextResponse.json(
      { error: error.message || "Failed to cancel approval request" },
      { status }
    );
  }
}

