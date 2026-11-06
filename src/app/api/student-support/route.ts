import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { getAgentBySlug, getAllAgents } from "@/lib/agents/registry";
import { validateAgentToolPermissions } from "@/lib/agents/orchestrator";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import type { AgentSlug } from "@/types/student-os";

const StudentSupportActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_expense"),
    title: z.string().min(2),
    category: z.enum(["essentials", "academics", "lifestyle", "savings"]),
    amount: z.number().min(1).max(500000),
  }),
  z.object({
    action: z.literal("record_wellbeing_checkin"),
    energyLevel: z.number().int().min(1).max(5),
    sleepHours: z.number().min(1).max(14),
    stressLevel: z.enum(["low", "moderate", "high"]),
    notes: z.string().min(2),
  }),
  z.object({
    action: z.literal("run_agent"),
    agentSlug: z.enum(["performance", "finance", "wellbeing"]),
    objective: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  const totalAgents = getAllAgents().length;
  return NextResponse.json({
    metrics: dbStore.getDashboardMetrics(totalAgents, sessionUserId),
    goals: dbStore.getGoals(sessionUserId),
    financeLedger: dbStore.getFinanceLedger(sessionUserId),
    wellbeingCheckins: dbStore.getWellbeingCheckins(sessionUserId),
    agentTasks: dbStore
      .getAgentTasks(sessionUserId)
      .filter((t) =>
        ["performance", "finance", "wellbeing"].includes(t.agentSlug)
      ),
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const parsed = StudentSupportActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Invalid student support action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "add_expense") {
      const financeLedger = dbStore.addFinanceExpense(
        {
          title: payload.title,
          category: payload.category,
          amount: payload.amount,
        },
        sessionUserId
      );
      return NextResponse.json({ financeLedger }, { status: 201 });
    }

    if (payload.action === "record_wellbeing_checkin") {
      const checkin = dbStore.recordWellbeingCheckin(
        {
          energyLevel: payload.energyLevel,
          sleepHours: payload.sleepHours,
          stressLevel: payload.stressLevel,
          notes: payload.notes,
        },
        sessionUserId
      );
      return NextResponse.json(
        {
          checkin,
          wellbeingCheckins: dbStore.getWellbeingCheckins(sessionUserId),
        },
        { status: 201 }
      );
    }

    if (payload.action === "run_agent") {
      const agent = getAgentBySlug(payload.agentSlug as AgentSlug);
      if (!agent) {
        return NextResponse.json(
          { error: "Student Support agent not found" },
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
      const metrics = dbStore.getDashboardMetrics(
        getAllAgents().length,
        profile.id
      );
      const financeLedger = dbStore.getFinanceLedger(profile.id);
      const wellbeingCheckins = dbStore.getWellbeingCheckins(profile.id);
      const runId = `run_support_${Date.now()}`;
      const taskId = `atask_${agent.slug}_${Date.now()}`;

      const result = await agent.execute({
        userId: profile.id,
        runId,
        taskId,
        objective: payload.objective,
        context: {
          studentName: profile.fullName,
          dailyStudyHours: profile.dailyStudyHours,
          metrics,
          financeLedger,
          wellbeingCheckins,
        },
        constraints: [
          "Ground performance metrics in real database counts",
          "Finance guidance is educational only; wellbeing guidance is non-clinical",
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
            : "Unexpected error in Student Support Department API",
      },
      { status: 500 }
    );
  }
}
