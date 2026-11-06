import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { getAgentBySlug } from "@/lib/agents/registry";
import { validateAgentToolPermissions } from "@/lib/agents/orchestrator";
import { ApprovalService } from "@/lib/security/approval-service";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import type { AgentSlug } from "@/types/student-os";

const ProductivityActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_task"),
    title: z.string().min(2),
    priority: z.enum(["low", "medium", "high", "critical"]),
    dueAt: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_task_status"),
    taskId: z.string().min(1),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  }),
  z.object({
    action: z.literal("delete_task"),
    taskId: z.string().min(1),
  }),
  z.object({
    action: z.literal("create_goal"),
    title: z.string().min(2),
    description: z.string().optional(),
    category: z.enum([
      "academic",
      "career",
      "skill",
      "project",
      "finance",
      "wellbeing",
    ]),
    targetDate: z.string().min(1),
    progress: z.number().min(0).max(100).optional(),
  }),
  z.object({
    action: z.literal("update_goal_progress"),
    goalId: z.string().min(1),
    progress: z.number().min(0).max(100),
  }),
  z.object({
    action: z.literal("draft_communication"),
    recipient: z.string().min(2),
    subject: z.string().min(2),
    objective: z.string().min(5),
  }),
  z.object({
    action: z.literal("decide_approval"),
    approvalId: z.string().min(1),
    decision: z.enum(["approved", "rejected"]),
  }),
  z.object({
    action: z.literal("cancel_approval"),
    approvalId: z.string().min(1),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("run_agent"),
    agentSlug: z.enum(["productivity", "communication"]),
    objective: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  return NextResponse.json({
    tasks: dbStore.getTasks(sessionUserId),
    todaysTasks: dbStore.getTodaysTasks(sessionUserId),
    goals: dbStore.getGoals(sessionUserId),
    approvals: dbStore.getApprovals(sessionUserId),
    notifications: dbStore.getNotifications(sessionUserId),
    agentTasks: dbStore
      .getAgentTasks(sessionUserId)
      .filter((t) =>
        ["productivity", "communication"].includes(t.agentSlug)
      ),
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const parsed = ProductivityActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Invalid productivity action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "create_task") {
      const task = dbStore.createTask(
        {
          title: payload.title,
          priority: payload.priority,
          status: "pending",
          dueAt: payload.dueAt,
          sourceAgent: "productivity",
        },
        sessionUserId
      );
      return NextResponse.json({ task }, { status: 201 });
    }

    if (payload.action === "update_task_status") {
      const task = dbStore.updateTaskStatus(
        payload.taskId,
        payload.status,
        sessionUserId
      );
      if (!task) {
        return NextResponse.json(
          { error: "Task not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ task });
    }

    if (payload.action === "delete_task") {
      const deleted = dbStore.deleteTask(payload.taskId, sessionUserId);
      if (!deleted) {
        return NextResponse.json(
          { error: "Task not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ deleted: true });
    }

    if (payload.action === "create_goal") {
      const goal = dbStore.createGoal(
        {
          title: payload.title,
          description: payload.description,
          category: payload.category,
          targetDate: payload.targetDate,
          progress: payload.progress ?? 0,
        },
        sessionUserId
      );
      return NextResponse.json({ goal }, { status: 201 });
    }

    if (payload.action === "update_goal_progress") {
      const goal = dbStore.updateGoalProgress(
        payload.goalId,
        payload.progress,
        sessionUserId
      );
      if (!goal) {
        return NextResponse.json(
          { error: "Goal not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ goal });
    }

    if (payload.action === "decide_approval") {
      try {
        const approval = ApprovalService.decideApproval({
          approvalId: payload.approvalId,
          decision: payload.decision,
          userId: sessionUserId,
        });
        return NextResponse.json({ approval });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to record approval decision" },
          { status: 400 }
        );
      }
    }

    if (payload.action === "cancel_approval") {
      try {
        const approval = ApprovalService.cancelApproval({
          approvalId: payload.approvalId,
          userId: sessionUserId,
          reason: payload.reason,
        });
        return NextResponse.json({ approval });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to cancel approval" },
          { status: 400 }
        );
      }
    }

    if (payload.action === "draft_communication") {
      const agent = getAgentBySlug("communication");
      if (!agent) {
        return NextResponse.json(
          { error: "Communication Agent not found" },
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
      const runId = `run_comm_${Date.now()}`;
      const taskId = `atask_communication_${Date.now()}`;

      const result = await agent.execute({
        userId: profile.id,
        runId,
        taskId,
        objective: `Draft professional email to ${payload.recipient} with subject "${payload.subject}": ${payload.objective}`,
        context: {
          studentName: profile.fullName,
          degree: profile.degree,
          department: profile.department,
          institution: profile.institution,
          recipient: payload.recipient,
          subject: payload.subject,
        },
        constraints: [
          "Never dispatch external messages without explicit student approval",
        ],
      });

      const { approval } = ApprovalService.createApproval({
        userId: profile.id,
        runId,
        agentSlug: "communication",
        actionType: "send_email",
        title: `Approve Outreach Draft to ${payload.recipient}: "${payload.subject}"`,
        description:
          "Communication Agent prepared this draft. External messages are never sent automatically without explicit student approval.",
        payload: {
          recipient: payload.recipient,
          subject: payload.subject,
          objective: payload.objective,
          draftSummary: result.summary,
        },
      });

      const now = new Date().toISOString();
      const agentTask = {
        id: taskId,
        runId,
        agentSlug: "communication" as const,
        agentName: agent.name,
        objective: payload.objective,
        status: "waiting_for_approval" as const,
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
          status: "waiting_for_approval",
          selectedAgents: ["communication"],
          agentResults: { communication: result },
          createdAt: now,
          completedAt: now,
        },
        [agentTask]
      );

      return NextResponse.json(
        {
          agentSlug: agent.slug,
          agentName: agent.name,
          result,
          approval,
          agentTask,
        },
        { status: 201 }
      );
    }

    if (payload.action === "run_agent") {
      const agent = getAgentBySlug(payload.agentSlug as AgentSlug);
      if (!agent) {
        return NextResponse.json(
          { error: "Productivity department agent not found" },
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
      const tasks = dbStore.getTasks(profile.id);
      const goals = dbStore.getGoals(profile.id);
      const runId = `run_prod_${Date.now()}`;
      const taskId = `atask_${agent.slug}_${Date.now()}`;

      const result = await agent.execute({
        userId: profile.id,
        runId,
        taskId,
        objective: payload.objective,
        context: {
          studentName: profile.fullName,
          dailyStudyHours: profile.dailyStudyHours,
          openTasksCount: tasks.filter((t) => t.status !== "completed").length,
          tasks,
          goals,
        },
        constraints: [
          "Respect daily study hour limits and prevent scheduling conflicts",
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
            : "Unexpected error in Productivity Department API",
      },
      { status: 500 }
    );
  }
}
