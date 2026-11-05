import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { SupabaseDataService } from "@/lib/db/supabase-data-service";
import { getAgentBySlug } from "@/lib/agents/registry";
import { validateAgentToolPermissions } from "@/lib/agents/orchestrator";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";
import type { AgentSlug } from "@/types/student-os";

const CareerActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upsert_skill"),
    name: z.string().min(2),
    category: z.string().min(2),
    proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  }),
  z.object({
    action: z.literal("create_project"),
    title: z.string().min(2),
    description: z.string().min(4),
    techStack: z.array(z.string()).min(1),
    status: z
      .enum(["planning", "in_progress", "completed", "shipped"])
      .optional(),
    repositoryUrl: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_project_status"),
    projectId: z.string().min(1),
    status: z.enum(["planning", "in_progress", "completed", "shipped"]),
  }),
  z.object({
    action: z.literal("create_opportunity"),
    title: z.string().min(2),
    organisation: z.string().min(2),
    type: z.enum(["internship", "hackathon", "scholarship", "competition"]),
    sourceUrl: z.string().min(5),
    deadline: z.string().min(1),
  }),
  z.object({
    action: z.literal("update_opportunity_status"),
    opportunityId: z.string().min(1),
    status: z.enum(["saved", "preparing", "applied"]),
  }),
  z.object({
    action: z.literal("run_agent"),
    agentSlug: z.enum(["career", "skill", "project", "opportunity"]),
    objective: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return NextResponse.json({
    studentSkills: dbStore.getStudentSkills(sessionUserId),
    projects: dbStore.getProjects(sessionUserId),
    opportunities: dbStore.getOpportunities(sessionUserId),
    agentTasks: dbStore
      .getAgentTasks(sessionUserId)
      .filter((t) =>
        ["career", "skill", "project", "opportunity"].includes(t.agentSlug)
      ),
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const body = await request.json();
    const parsed = CareerActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid career action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "upsert_skill") {
      const skill = dbStore.upsertStudentSkill(
        {
          name: payload.name,
          category: payload.category,
          proficiency: payload.proficiency,
        },
        sessionUserId
      );
      return NextResponse.json({ skill }, { status: 201 });
    }

    if (payload.action === "create_project") {
      const project = await SupabaseDataService.createProject(
        {
          title: payload.title,
          description: payload.description,
          techStack: payload.techStack,
          status: payload.status || "planning",
          repositoryUrl: payload.repositoryUrl,
        },
        sessionUserId
      );
      return NextResponse.json({ project }, { status: 201 });
    }

    if (payload.action === "update_project_status") {
      const project = dbStore.updateProjectStatus(
        payload.projectId,
        payload.status,
        sessionUserId
      );
      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ project });
    }

    if (payload.action === "create_opportunity") {
      const opportunity = await SupabaseDataService.createOpportunity(
        {
          title: payload.title,
          organisation: payload.organisation,
          type: payload.type,
          sourceUrl: payload.sourceUrl,
          deadline: payload.deadline,
        },
        sessionUserId
      );
      return NextResponse.json({ opportunity }, { status: 201 });
    }

    if (payload.action === "update_opportunity_status") {
      const opportunity = dbStore.updateOpportunityStatus(
        payload.opportunityId,
        payload.status,
        sessionUserId
      );
      if (!opportunity) {
        return NextResponse.json(
          { error: "Opportunity not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ opportunity });
    }

    if (payload.action === "run_agent") {
      const agent = getAgentBySlug(payload.agentSlug as AgentSlug);
      if (!agent) {
        return NextResponse.json(
          { error: "Career department agent not found" },
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
      const studentSkills = dbStore.getStudentSkills(profile.id);
      const projects = dbStore.getProjects(profile.id);
      const opportunities = dbStore.getOpportunities(profile.id);
      const runId = `run_career_${Date.now()}`;
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
          careerGoal: profile.careerGoal,
          careerInterests: profile.careerInterests,
          studentSkills,
          projects,
          opportunities,
        },
        constraints: [
          "Ground recommendations in student skills and portfolio projects",
          "Never claim an external internship application was submitted automatically",
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
            : "Unexpected error in Career Department API",
      },
      { status: 500 }
    );
  }
}
