import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllAgents,
  setAgentEnabledStatus,
} from "@/lib/agents/registry";
import { dbStore } from "@/lib/db/store";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";
import type { AgentSlug } from "@/types/student-os";

const ToggleAgentSchema = z.object({
  slug: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const agents = getAllAgents();
  const runs = dbStore.getRuns(sessionUserId);
  const agentTasks = dbStore.getAgentTasks(sessionUserId);

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      department: a.department,
      systemPrompt: a.systemPrompt,
      capabilities: a.capabilities,
      allowedTools: a.allowedTools,
      inputSchemaDescriptor: a.inputSchemaDescriptor,
      outputSchemaDescriptor: a.outputSchemaDescriptor,
      version: a.version,
      executionLimits: a.executionLimits,
      enabled: a.enabled,
      status: a.status,
    })),
    runs,
    agentTasks,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ToggleAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid agent update payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = setAgentEnabledStatus(
      parsed.data.slug as AgentSlug,
      parsed.data.enabled
    );

    if (!updated) {
      return NextResponse.json(
        { error: `Agent '${parsed.data.slug}' not found in registry` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      agent: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        enabled: updated.enabled,
        status: updated.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update agent status",
      },
      { status: 500 }
    );
  }
}
