import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { getAgentBySlug } from "@/lib/agents/registry";
import { validateAgentToolPermissions } from "@/lib/agents/orchestrator";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import type { AgentSlug } from "@/types/student-os";

const IntelligenceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_document"),
    name: z.string().min(2),
    mimeType: z.string().optional(),
    summary: z.string().min(5),
  }),
  z.object({
    action: z.literal("delete_document"),
    docId: z.string().min(1),
  }),
  z.object({
    action: z.literal("create_note_memory"),
    category: z.string().min(2),
    content: z.string().min(5),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    action: z.literal("run_agent"),
    agentSlug: z.enum(["research", "notes"]),
    objective: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const query = request.nextUrl.searchParams.get("q") || "";
  const searchResults = dbStore.searchKnowledgeBase(query, sessionUserId);

  return NextResponse.json({
    query,
    documents: searchResults.documents,
    memories: searchResults.memories,
    agentTasks: dbStore
      .getAgentTasks(sessionUserId)
      .filter((t) => ["research", "notes"].includes(t.agentSlug)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const parsed = IntelligenceActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Invalid intelligence action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "create_document") {
      const document = dbStore.createDocument(
        {
          name: payload.name,
          mimeType: payload.mimeType || "application/pdf",
          summary: payload.summary,
        },
        sessionUserId
      );
      return NextResponse.json({ document }, { status: 201 });
    }

    if (payload.action === "delete_document") {
      const deleted = dbStore.deleteDocument(payload.docId, sessionUserId);
      if (!deleted) {
        return NextResponse.json(
          { error: "Document not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ deleted: true });
    }

    if (payload.action === "create_note_memory") {
      const memory = dbStore.createMemory(
        {
          category: payload.category,
          content: payload.content,
          metadata: payload.metadata,
        },
        sessionUserId
      );
      return NextResponse.json({ memory }, { status: 201 });
    }

    if (payload.action === "run_agent") {
      const agent = getAgentBySlug(payload.agentSlug as AgentSlug);
      if (!agent) {
        return NextResponse.json(
          { error: "Intelligence department agent not found" },
          { status: 404 }
        );
      }

      const permCheck = validateAgentToolPermissions(
        agent.slug,
        agent.allowedTools
      );
      if (!permCheck.allowed) {
        return NextResponse.json(
          { error: "Agent tool permission validation failed" },
          { status: 403 }
        );
      }

      const profile = dbStore.getProfile(sessionUserId);
      const documents = dbStore.getDocuments(profile.id);
      const memories = dbStore.getMemories(profile.id);
      const runId = `run_intel_${Date.now()}`;
      const taskId = `atask_${agent.slug}_${Date.now()}`;

      const result = await agent.execute({
        userId: profile.id,
        runId,
        taskId,
        objective: payload.objective,
        context: {
          studentName: profile.fullName,
          degree: profile.degree,
          department: profile.department,
          documents,
          memories,
        },
        constraints: [
          "Ground summaries in indexed documents and memory records",
          "Never fabricate DOI or arXiv citations",
        ],
      });

      const now = new Date().toISOString();
      const agentTask = {
        id: taskId,
        runId,
        agentSlug: agent.slug,
        agentName: agent.name,
        objective: payload.objective,
        status: result.status,
        summary: result.summary,
        createdAt: now,
        completedAt: now,
      };

      dbStore.recordRun(
        {
          id: runId,
          userId: profile.id,
          conversationId: "conv-default",
          objective: payload.objective,
          status: result.status,
          selectedAgents: [agent.slug],
          agentResults: { [agent.slug]: result },
          createdAt: now,
          completedAt: now,
        },
        [agentTask]
      );

      return NextResponse.json({
        agentSlug: agent.slug,
        agentName: agent.name,
        result,
        agentTask,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error in Intelligence Department API",
      },
      { status: 500 }
    );
  }
}
