import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import { SupabaseDataService } from "@/lib/db/supabase-data-service";
import { getAgentBySlug } from "@/lib/agents/registry";
import { validateAgentToolPermissions } from "@/lib/agents/orchestrator";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import type { AgentSlug } from "@/types/student-os";

const AcademicActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_subject"),
    courseId: z.string().min(1),
    name: z.string().min(2),
    code: z.string().min(2),
    credits: z.number().int().min(1).max(10),
  }),
  z.object({
    action: z.literal("create_syllabus_topic"),
    subjectId: z.string().min(1),
    title: z.string().min(2),
    unitNumber: z.number().int().min(1).max(20),
  }),
  z.object({
    action: z.literal("update_syllabus_topic"),
    topicId: z.string().min(1),
    completionStatus: z.enum([
      "not_started",
      "in_progress",
      "completed",
      "needs_revision",
    ]),
  }),
  z.object({
    action: z.literal("create_assignment"),
    subjectId: z.string().min(1),
    title: z.string().min(2),
    dueAt: z.string().min(1),
  }),
  z.object({
    action: z.literal("update_assignment_status"),
    assignmentId: z.string().min(1),
    status: z.enum(["pending", "in_progress", "submitted", "overdue"]),
  }),
  z.object({
    action: z.literal("create_study_plan"),
    title: z.string().min(2),
    hoursPerDay: z.number().min(0.5).max(14),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  }),
  z.object({
    action: z.literal("log_study_session"),
    subjectId: z.string().optional().nullable(),
    durationMinutes: z.number().int().min(5).max(480),
    notes: z.string().min(2),
  }),
  z.object({
    action: z.literal("run_agent"),
    agentSlug: z.enum(["academic", "study", "tutor", "exam"]),
    objective: z.string().min(3),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  return NextResponse.json({
    courses: dbStore.getCourses(sessionUserId),
    subjects: dbStore.getSubjects(sessionUserId),
    syllabusTopics: dbStore.getSyllabusTopics(sessionUserId),
    assignments: dbStore.getAssignments(sessionUserId),
    exams: dbStore.getExams(sessionUserId),
    studyPlans: dbStore.getStudyPlans(sessionUserId),
    studySessions: dbStore.getStudySessions(sessionUserId),
    agentTasks: dbStore
      .getAgentTasks(sessionUserId)
      .filter((t) =>
        ["academic", "study", "tutor", "exam"].includes(t.agentSlug)
      ),
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const parsed = AcademicActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid academic action payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "create_subject") {
      const subject = await SupabaseDataService.createSubject(
        {
          courseId: payload.courseId,
          name: payload.name,
          code: payload.code,
          credits: payload.credits,
        },
        sessionUserId
      );
      if (!subject) {
        return NextResponse.json(
          { error: "Course not found or access denied" },
          { status: 403 }
        );
      }
      return NextResponse.json({ subject }, { status: 201 });
    }

    if (payload.action === "create_syllabus_topic") {
      const topic = await SupabaseDataService.createSyllabusTopic(
        {
          subjectId: payload.subjectId,
          title: payload.title,
          unitNumber: payload.unitNumber,
        },
        sessionUserId
      );
      if (!topic) {
        return NextResponse.json(
          { error: "Subject not found or access denied" },
          { status: 403 }
        );
      }
      return NextResponse.json({ topic }, { status: 201 });
    }

    if (payload.action === "update_syllabus_topic") {
      const updated = await SupabaseDataService.updateSyllabusTopicStatus(
        payload.topicId,
        payload.completionStatus,
        sessionUserId
      );
      if (!updated) {
        return NextResponse.json(
          { error: "Syllabus topic not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ topic: updated });
    }

    if (payload.action === "create_assignment") {
      const assignment = dbStore.createAssignment(
        {
          subjectId: payload.subjectId,
          title: payload.title,
          dueAt: payload.dueAt,
        },
        sessionUserId
      );
      if (!assignment) {
        return NextResponse.json(
          { error: "Subject not found or access denied" },
          { status: 403 }
        );
      }
      return NextResponse.json({ assignment }, { status: 201 });
    }

    if (payload.action === "update_assignment_status") {
      const assignment = dbStore.updateAssignmentStatus(
        payload.assignmentId,
        payload.status,
        sessionUserId
      );
      if (!assignment) {
        return NextResponse.json(
          { error: "Assignment not found or access denied" },
          { status: 404 }
        );
      }
      return NextResponse.json({ assignment });
    }

    if (payload.action === "create_study_plan") {
      const studyPlan = dbStore.createStudyPlan(
        {
          title: payload.title,
          hoursPerDay: payload.hoursPerDay,
          startDate: payload.startDate,
          endDate: payload.endDate,
        },
        sessionUserId
      );
      return NextResponse.json({ studyPlan }, { status: 201 });
    }

    if (payload.action === "log_study_session") {
      const studySession = dbStore.createStudySession(
        {
          subjectId: payload.subjectId,
          durationMinutes: payload.durationMinutes,
          notes: payload.notes,
        },
        sessionUserId
      );
      return NextResponse.json({ studySession }, { status: 201 });
    }

    if (payload.action === "run_agent") {
      const agent = getAgentBySlug(payload.agentSlug as AgentSlug);
      if (!agent) {
        return NextResponse.json(
          { error: "Academic agent not found" },
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
      const subjects = dbStore.getSubjects(profile.id);
      const topics = dbStore.getSyllabusTopics(profile.id);
      const runId = `run_acad_${Date.now()}`;
      const taskId = `atask_${agent.slug}_${Date.now()}`;

      const result = await agent.execute({
        userId: profile.id,
        runId,
        taskId,
        objective: payload.objective,
        context: {
          studentName: profile.fullName,
          degree: profile.degree,
          semester: profile.semester,
          dailyStudyHours: profile.dailyStudyHours,
          subjects,
          incompleteTopics: topics.filter(
            (t) => t.completionStatus !== "completed"
          ),
        },
        constraints: [
          "Ground recommendations in enrolled subjects and syllabus units",
          "Never claim access to unreleased exam papers",
        ],
      });

      const taskRecord = {
        id: taskId,
        runId,
        agentSlug: agent.slug,
        agentName: agent.name,
        objective: payload.objective,
        status: result.status,
        summary: result.summary,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        [taskRecord]
      );

      return NextResponse.json({
        runId,
        agentSlug: agent.slug,
        agentName: agent.name,
        result,
        taskRecord,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Academic department execution error",
      },
      { status: 500 }
    );
  }
}

