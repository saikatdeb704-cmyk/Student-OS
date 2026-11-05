import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { SupabaseDataService } from "@/lib/db/supabase-data-service";
import { getAllAgents } from "@/lib/agents/registry";
import { getAIUsageSnapshot } from "@/lib/ai/provider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SESSION_COOKIE_NAME } from "@/lib/supabase/middleware";

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const allAgents = getAllAgents();
  const [profile, tasks] = await Promise.all([
    SupabaseDataService.getProfile(sessionUserId),
    SupabaseDataService.getTasks(sessionUserId),
  ]);

  return NextResponse.json({
    profile,
    courses: dbStore.getCourses(sessionUserId),
    subjects: dbStore.getSubjects(sessionUserId),
    syllabusTopics: dbStore.getSyllabusTopics(sessionUserId),
    assignments: dbStore.getAssignments(sessionUserId),
    exams: dbStore.getExams(sessionUserId),
    studyPlans: dbStore.getStudyPlans(sessionUserId),
    studySessions: dbStore.getStudySessions(sessionUserId),
    tasks,
    todaysTasks: dbStore.getTodaysTasks(sessionUserId),
    upcomingDeadlines: dbStore.getUpcomingDeadlines(sessionUserId),
    goals: dbStore.getGoals(sessionUserId),
    studentSkills: dbStore.getStudentSkills(sessionUserId),
    projects: dbStore.getProjects(sessionUserId),
    opportunities: dbStore.getOpportunities(sessionUserId),
    documents: dbStore.getDocuments(sessionUserId),
    financeLedger: dbStore.getFinanceLedger(sessionUserId),
    wellbeingCheckins: dbStore.getWellbeingCheckins(sessionUserId),
    approvals: dbStore.getApprovals(sessionUserId),
    runs: dbStore.getRuns(sessionUserId),
    agentTasks: dbStore.getAgentTasks(sessionUserId),
    memories: dbStore.getMemories(sessionUserId),
    notifications: dbStore.getNotifications(sessionUserId),
    conversations: dbStore.getConversations(sessionUserId),
    metrics: dbStore.getDashboardMetrics(allAgents.length, sessionUserId),
    agents: allAgents.map((a) => ({
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
    systemStatus: {
      supabaseConnected: isSupabaseConfigured(),
      aiUsage: getAIUsageSnapshot(sessionUserId),
    },
  });
}
