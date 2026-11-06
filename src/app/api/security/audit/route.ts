import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getAuthenticatedUserId } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "30", 10))
  );

  try {
    const logs = dbStore.getAuditLogs(sessionUserId);
    return NextResponse.json({
      auditLogs: logs.slice(0, limit),
      total: logs.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}

