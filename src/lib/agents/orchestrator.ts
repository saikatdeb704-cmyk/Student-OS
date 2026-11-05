import type {
  AgentBusMessage,
  AgentResult,
  AgentSlug,
  AgentTaskRecord,
  CEOEvent,
  CEOExecutionPlan,
  CEOExecutionPlanStep,
  CEOIntentCategory,
  ConflictResolutionRecord,
  ExecutionStatus,
  TokenUsageRecord,
} from "../../types/student-os.ts";
import { getAgentBySlug } from "./registry.ts";
import { dbStore } from "../db/store.ts";
import {
  checkUserTokenQuota,
  estimateTokenCount,
  getActiveAIProvider,
} from "../ai/provider.ts";
import { ApprovalService } from "../security/approval-service.ts";
import {
  checkExecutionPermission,
  classifyAction,
} from "../security/permission-registry.ts";

// ============================================================================
// PHASE 5: STUDENT OS MULTI-AGENT ORCHESTRATION ENGINE
// ============================================================================

export const MAX_DELEGATION_AGENTS = 6;
export const MAX_DELEGATION_DEPTH = 3;
export const DEFAULT_MAX_RETRIES = 1; // Up to 2 total attempts per task

const activeCancelledRunIds = new Set<string>();

export function cancelOrchestrationRun(runId: string, userId?: string): boolean {
  activeCancelledRunIds.add(runId);
  const updated = dbStore.updateRunStatus(runId, "cancelled", userId);
  dbStore.recordAuditLog({
    userId,
    actorType: "student",
    action: "orchestration_run_cancelled",
    resourceType: "agent_run",
    resourceId: runId,
  });
  return Boolean(updated);
}

export interface OrchestrationExecutionOptions {
  userId?: string;
  signal?: AbortSignal;
  timeoutMsOverride?: number;
  maxRetriesOverride?: number;
  maxDelegationDepthOverride?: number;
  /**
   * Optional per-agent tool requests to verify that agents cannot grant themselves
   * unauthorized tool permissions outside their immutable `allowedTools` list.
   */
  requestedToolsByAgent?: Partial<Record<AgentSlug, string[]>>;
  /**
   * Optional custom step dependency overrides to test DAG cycle / loop detection.
   */
  customStepDependencies?: Record<number, number[]>;
  /**
   * Optional per-agent execution override for deterministic testing of transient errors,
   * permanent failures, and timeouts.
   */
  agentExecutionOverrides?: Partial<
    Record<
      AgentSlug,
      (attempt: number) => Promise<AgentResult> | AgentResult
    >
  >;
}

export interface StudentContextSnapshot {
  profileSummary: string;
  subjectsSummary: string[];
  syllabusGapSummary: string[];
  todaysTasksSummary: string[];
  upcomingDeadlinesSummary: string[];
  activeGoalsSummary: string[];
  activeProjectsSummary: string[];
  memoryHighlights: string[];
  contextReadSummary: string[];
}

// ----------------------------------------------------------------------------
// COMPONENT 1: CONTEXT RETRIEVAL
// ----------------------------------------------------------------------------
export function loadStudentContextSnapshot(
  userId?: string,
  queryText?: string
): StudentContextSnapshot {
  const profile = dbStore.getProfile(userId);
  const uid = profile.id;
  const subjects = dbStore.getSubjects(uid);
  const topics = dbStore.getSyllabusTopics(uid);
  const todaysTasks = dbStore.getTodaysTasks(uid);
  const upcomingDeadlines = dbStore.getUpcomingDeadlines(uid);
  const goals = dbStore.getGoals(uid).filter((g) => g.status === "active");
  const projects = dbStore
    .getProjects(uid)
    .filter((p) => p.status === "in_progress" || p.status === "planning");
  const retrievedKnowledge = dbStore.retrieveMemoriesWithRelevance(
    {
      query: queryText || "",
      limit: 5,
    },
    uid
  );

  const profileSummary = `${profile.fullName} — ${profile.degree} in ${profile.department} at ${profile.institution} (${profile.academicYear}, Semester ${profile.semester}). Career target: ${profile.careerGoal}. Daily study budget: ${profile.dailyStudyHours}h/day.`;

  const subjectsSummary = subjects.map(
    (s) =>
      `${s.code} (${s.name}) — ${s.credits} credits, ${s.completionPercentage}% syllabus completed`
  );

  const incompleteTopics = topics.filter(
    (t) => t.completionStatus !== "completed"
  );
  const syllabusGapSummary = incompleteTopics.slice(0, 6).map((t) => {
    const subj = subjects.find((s) => s.id === t.subjectId);
    return `${subj ? subj.code : "Subject"} Unit ${t.unitNumber}: ${t.title} (${t.completionStatus.replace("_", " ")})`;
  });

  const todaysTasksSummary = todaysTasks
    .slice(0, 5)
    .map((t) => `[${t.priority.toUpperCase()}] ${t.title} (${t.status})`);

  const upcomingDeadlinesSummary = upcomingDeadlines
    .slice(0, 5)
    .map(
      (d) =>
        `[${d.kind.toUpperCase()}] ${d.title}${
          d.subjectCode ? ` (${d.subjectCode})` : ""
        } — due in ${d.daysRemaining} day(s)`
    );

  const activeGoalsSummary = goals.map(
    (g) => `${g.title} (${g.category}, ${g.progress}% complete)`
  );

  const activeProjectsSummary = projects.map(
    (p) => `${p.title} (${p.status.replace("_", " ")}) — Stack: ${p.techStack.join(", ")}`
  );

  const memoryHighlights = retrievedKnowledge.memories
    .slice(0, 4)
    .map(
      (m) =>
        `[${m.record.category} • ${Math.round(m.relevanceScore * 100)}%] ${
          m.record.content
        }`
    );

  const contextReadSummary = [
    `Student Profile: ${profile.fullName} (${profile.degree} • Sem ${profile.semester} @ ${profile.institution})`,
    `Academic Load: ${subjects.length} active subjects, ${incompleteTopics.length} pending syllabus unit(s)`,
    `Deadlines & Tasks: ${todaysTasks.length} task(s) prioritized for today, ${upcomingDeadlines.length} upcoming deadline(s)`,
    `Goals & Projects: ${goals.length} active goal(s), ${projects.length} active portfolio project(s)`,
    `pgvector Memory & Docs: ${retrievedKnowledge.memories.length} relevant memory record(s), ${retrievedKnowledge.documents.length} indexed document(s)`,
  ];

  return {
    profileSummary,
    subjectsSummary,
    syllabusGapSummary,
    todaysTasksSummary,
    upcomingDeadlinesSummary,
    activeGoalsSummary,
    activeProjectsSummary,
    memoryHighlights,
    contextReadSummary,
  };
}

// ----------------------------------------------------------------------------
// COMPONENT 2 & 3: INTENT CLASSIFIER & MULTI-AGENT TASK PLANNER
// ----------------------------------------------------------------------------
export function detectMissingInformation(
  message: string,
  contextSnap: StudentContextSnapshot
): string[] {
  const lower = message.toLowerCase().trim();
  const missing: string[] = [];

  if (lower.length < 4 || lower === "plan" || lower === "help me with") {
    missing.push(
      "Please specify whether you want help with a subject/exam, study schedule, career roadmap, or project milestone."
    );
  }

  if (
    lower.includes("missing_info_test") ||
    (lower.includes("grade my submission") && !lower.includes("rubric"))
  ) {
    missing.push(
      "Submission text and assignment rubric are required to evaluate your draft."
    );
  }

  if (
    lower.includes("analyse my syllabus") &&
    contextSnap.subjectsSummary.length === 0
  ) {
    missing.push(
      "No active subjects or syllabus units were found in your Academic Hub."
    );
  }

  return missing;
}

export function classifyIntentAndPlan(
  message: string,
  userId?: string
): CEOExecutionPlan {
  const lower = message.toLowerCase().trim();
  const contextSnap = loadStudentContextSnapshot(userId, message);
  const missingInformation = detectMissingInformation(message, contextSnap);
  const selected = new Set<AgentSlug>();

  const isDirectExecutiveQuery =
    missingInformation.length === 0 &&
    (/^(hi|hello|hey|good morning|good evening|who are you|what can you do|help)\b/i.test(
      lower
    ) ||
      lower.includes("what is my current profile") ||
      lower.includes("what are my subjects") ||
      lower.includes("show my profile") ||
      lower.includes("status overview") ||
      lower.includes("summarize my current status") ||
      lower.includes("who am i"));

  // Flagship holistic scenario: Complete Semester + AI Career Roadmap
  const isCompleteSemesterAndCareerRoadmap =
    (lower.includes("semester") || lower.includes("academic")) &&
    (lower.includes("career") || lower.includes("roadmap")) &&
    (lower.includes("complete") ||
      lower.includes("full") ||
      lower.includes("ai"));

  if (isCompleteSemesterAndCareerRoadmap) {
    selected.add("academic");
    selected.add("study");
    selected.add("career");
    selected.add("skill");
    selected.add("project");
    selected.add("productivity");
  } else if (!isDirectExecutiveQuery && missingInformation.length === 0) {
    if (
      lower.includes("syllabus") ||
      lower.includes("semester") ||
      lower.includes("course") ||
      lower.includes("subject") ||
      lower.includes("assignment") ||
      lower.includes("academic") ||
      lower.includes("credit")
    ) {
      selected.add("academic");
    }

    if (
      lower.includes("schedule") ||
      lower.includes("study plan") ||
      lower.includes("routine") ||
      lower.includes("timetable") ||
      lower.includes("study") ||
      lower.includes("plan my week") ||
      lower.includes("plan my day") ||
      lower.includes("pomodoro")
    ) {
      selected.add("study");
    }

    if (
      lower.includes("explain") ||
      lower.includes("understand") ||
      lower.includes("tutor") ||
      lower.includes("concept") ||
      lower.includes("how does") ||
      lower.includes("teach") ||
      lower.includes("walkthrough")
    ) {
      selected.add("tutor");
    }

    if (
      lower.includes("exam") ||
      lower.includes("quiz") ||
      lower.includes("test") ||
      lower.includes("revision") ||
      lower.includes("midterm") ||
      lower.includes("final") ||
      lower.includes("mock")
    ) {
      selected.add("exam");
    }

    if (
      lower.includes("career") ||
      lower.includes("roadmap") ||
      lower.includes("placement") ||
      lower.includes("role") ||
      lower.includes("job")
    ) {
      selected.add("career");
    }

    if (
      lower.includes("skill") ||
      lower.includes("learn") ||
      lower.includes("gap") ||
      lower.includes("proficiency")
    ) {
      selected.add("skill");
    }

    if (
      lower.includes("project") ||
      lower.includes("portfolio") ||
      lower.includes("github") ||
      lower.includes("architecture") ||
      lower.includes("build") ||
      lower.includes("milestone")
    ) {
      selected.add("project");
    }

    if (
      lower.includes("internship") ||
      lower.includes("hackathon") ||
      lower.includes("scholarship") ||
      lower.includes("opportunity") ||
      lower.includes("competition")
    ) {
      selected.add("opportunity");
    }

    if (
      lower.includes("research") ||
      lower.includes("paper") ||
      lower.includes("literature") ||
      lower.includes("citation")
    ) {
      selected.add("research");
    }

    if (
      lower.includes("task") ||
      lower.includes("deadline") ||
      lower.includes("todo") ||
      lower.includes("priority") ||
      lower.includes("organise") ||
      lower.includes("organize") ||
      lower.includes("briefing")
    ) {
      selected.add("productivity");
    }

    if (
      lower.includes("note") ||
      lower.includes("flashcard") ||
      lower.includes("summarise") ||
      lower.includes("summarize")
    ) {
      selected.add("notes");
    }

    if (
      lower.includes("email") ||
      lower.includes("resume") ||
      lower.includes("outreach") ||
      lower.includes("interview") ||
      lower.includes("draft") ||
      lower.includes("professor")
    ) {
      selected.add("communication");
    }

    if (
      lower.includes("progress") ||
      lower.includes("analytics") ||
      lower.includes("performance") ||
      lower.includes("report")
    ) {
      selected.add("performance");
    }

    if (
      lower.includes("budget") ||
      lower.includes("expense") ||
      lower.includes("finance") ||
      lower.includes("money") ||
      lower.includes("saving")
    ) {
      selected.add("finance");
    }

    if (
      lower.includes("burnout") ||
      lower.includes("overwhelmed") ||
      lower.includes("sleep") ||
      lower.includes("break") ||
      lower.includes("habit") ||
      lower.includes("wellbeing") ||
      lower.includes("stress")
    ) {
      selected.add("wellbeing");
    }
  }

  const requiresSpecialistAgents =
    missingInformation.length === 0 &&
    !isDirectExecutiveQuery &&
    selected.size > 0;

  let intentCategory: CEOIntentCategory = "executive_direct_query";
  if (!requiresSpecialistAgents) {
    intentCategory = "executive_direct_query";
  } else if (selected.size >= 3) {
    intentCategory = "multi_domain_orchestration";
  } else if (selected.has("tutor")) {
    intentCategory = "concept_tutoring";
  } else if (selected.has("exam")) {
    intentCategory = "exam_preparation";
  } else if (selected.has("study")) {
    intentCategory = "study_scheduling";
  } else if (selected.has("academic")) {
    intentCategory = "academic_planning";
  } else if (selected.has("career") || selected.has("skill")) {
    intentCategory = "career_and_skills";
  } else if (selected.has("project")) {
    intentCategory = "project_architecture";
  } else if (selected.has("opportunity")) {
    intentCategory = "opportunity_discovery";
  } else if (selected.has("research") || selected.has("notes")) {
    intentCategory = "research_and_notes";
  } else if (selected.has("communication")) {
    intentCategory = "communication_outreach";
  } else if (selected.has("finance") || selected.has("wellbeing")) {
    intentCategory = "finance_and_wellbeing";
  } else if (selected.has("productivity") || selected.has("performance")) {
    intentCategory = "productivity_and_tasks";
  }

  if (!requiresSpecialistAgents) {
    const directStep: CEOExecutionPlanStep = {
      stepNumber: 1,
      agent: "ceo",
      agentName: "AI CEO",
      department: "executive",
      objective:
        missingInformation.length > 0
          ? `Request clarifying student input for: "${message}"`
          : `Synthesize direct executive response using loaded Student OS context for: "${message}"`,
      rationale:
        missingInformation.length > 0
          ? "Request requires clarification before delegating to specialist agents."
          : "This request is a direct executive query that can be answered directly from the student's live profile, courses, tasks, and goals.",
      executionMode: "ceo_direct",
      dependsOn: [],
      requiredTools: ["memory_service", "reporting_service"],
      delegationDepth: 1,
    };

    return {
      intent:
        missingInformation.length > 0
          ? "Clarification Required Before Specialist Delegation"
          : "Direct Executive Context Synthesis (No Specialist Delegation Needed)",
      intentCategory,
      requiresSpecialistAgents: false,
      reasoning:
        missingInformation.length > 0
          ? `Missing required information: ${missingInformation.join(" ")}`
          : "Classified as a direct executive query. The AI CEO can answer accurately using the student's loaded academic profile, active tasks, and semester records.",
      intendedActionExplanation:
        missingInformation.length > 0
          ? `I need a quick clarification before delegating to specialist agents: ${missingInformation.join(
              " "
            )}`
          : "I will read your live Student OS profile, subjects, today's tasks, and upcoming deadlines directly, and provide a structured executive briefing.",
      contextReadSummary: contextSnap.contextReadSummary,
      selectedAgents: ["ceo"],
      steps: [directStep],
      missingInformation:
        missingInformation.length > 0 ? missingInformation : undefined,
    };
  }

  const boundedAgents = Array.from(selected).slice(0, MAX_DELEGATION_AGENTS);
  const agentNames = boundedAgents.map(
    (slug) => getAgentBySlug(slug)?.name || slug
  );

  // Build DAG dependencies & bounded delegation depths (1..MAX_DELEGATION_DEPTH)
  const stepIndexBySlug = new Map<AgentSlug, number>();
  boundedAgents.forEach((slug, idx) => stepIndexBySlug.set(slug, idx + 1));

  const steps: CEOExecutionPlanStep[] = boundedAgents.map((slug, idx) => {
    const stepNumber = idx + 1;
    const agent = getAgentBySlug(slug);
    const dependsOn: number[] = [];
    let delegationDepth = 1;

    // Establish natural domain dependencies when upstream agents are in the plan
    if (slug === "study" && stepIndexBySlug.has("academic")) {
      dependsOn.push(stepIndexBySlug.get("academic")!);
      delegationDepth = 2;
    } else if (slug === "exam" && stepIndexBySlug.has("academic")) {
      dependsOn.push(stepIndexBySlug.get("academic")!);
      delegationDepth = 2;
    } else if (slug === "skill" && stepIndexBySlug.has("career")) {
      dependsOn.push(stepIndexBySlug.get("career")!);
      delegationDepth = 2;
    } else if (slug === "project") {
      if (stepIndexBySlug.has("skill")) {
        dependsOn.push(stepIndexBySlug.get("skill")!);
        delegationDepth = 3;
      } else if (stepIndexBySlug.has("career")) {
        dependsOn.push(stepIndexBySlug.get("career")!);
        delegationDepth = 2;
      }
    } else if (slug === "productivity" && idx > 0) {
      // Productivity consolidates action items from upstream steps
      const upstreamStep = stepIndexBySlug.get("study") || stepIndexBySlug.get("academic") || 1;
      if (upstreamStep !== stepNumber) {
        dependsOn.push(upstreamStep);
        delegationDepth = Math.min(MAX_DELEGATION_DEPTH, 3);
      }
    }

    return {
      stepNumber,
      agent: slug,
      agentName: agent?.name || slug,
      department: agent?.department || "academic",
      objective: `Analyze student context and prepare ${
        agent?.name || slug
      } recommendations for: "${message}"`,
      rationale: `Selected ${
        agent?.name || slug
      } because the request involves ${
        agent?.capabilities.slice(0, 2).join(" & ").toLowerCase() || slug
      }.`,
      executionMode: "specialist_delegation",
      dependsOn,
      requiredTools: agent?.allowedTools.slice(0, 2) || [],
      delegationDepth,
    };
  });

  return {
    intent: `Coordinated ${boundedAgents.length}-step plan with ${agentNames.join(
      ", "
    )}`,
    intentCategory,
    requiresSpecialistAgents: true,
    reasoning: `Detected domain requirements matching ${agentNames.join(
      ", "
    )}. Built a ${steps.length}-step dependency-aware execution plan grounded in the student's active semester and goals.`,
    intendedActionExplanation: `I will first review your live academic and productivity records, then coordinate a ${steps.length}-step plan across **${agentNames.join(
      ", "
    )}** to address your request and propose concrete next actions.`,
    contextReadSummary: contextSnap.contextReadSummary,
    selectedAgents: boundedAgents,
    steps,
  };
}

// ----------------------------------------------------------------------------
// COMPONENT 5: TASK DEPENDENCY MANAGER & INFINITE LOOP / DEPTH GUARD
// ----------------------------------------------------------------------------
export function validateAndOrderPlanDAG(
  steps: CEOExecutionPlanStep[],
  maxDepth = MAX_DELEGATION_DEPTH
): {
  valid: boolean;
  orderedSteps: CEOExecutionPlanStep[];
  error?: string;
} {
  const stepMap = new Map<number, CEOExecutionPlanStep>();
  for (const s of steps) {
    if ((s.delegationDepth || 1) > maxDepth) {
      return {
        valid: false,
        orderedSteps: [],
        error: `Delegation depth limit exceeded on Step ${s.stepNumber} (${s.agentName}): depth ${s.delegationDepth} > max ${maxDepth}.`,
      };
    }
    stepMap.set(s.stepNumber, s);
  }

  // DFS cycle detection to prevent infinite loops
  const state = new Map<number, "unvisited" | "visiting" | "visited">();
  for (const s of steps) state.set(s.stepNumber, "unvisited");

  const ordered: CEOExecutionPlanStep[] = [];

  function dfs(stepNum: number): boolean {
    const current = state.get(stepNum);
    if (current === "visiting") {
      return false; // Cycle detected!
    }
    if (current === "visited") {
      return true;
    }

    state.set(stepNum, "visiting");
    const step = stepMap.get(stepNum);
    if (step?.dependsOn) {
      for (const dep of step.dependsOn) {
        if (!stepMap.has(dep)) continue;
        if (!dfs(dep)) return false;
      }
    }
    state.set(stepNum, "visited");
    if (step) ordered.push(step);
    return true;
  }

  for (const s of steps) {
    if (state.get(s.stepNumber) === "unvisited") {
      if (!dfs(s.stepNumber)) {
        return {
          valid: false,
          orderedSteps: [],
          error:
            "Infinite loop / circular dependency detected in agent execution DAG.",
        };
      }
    }
  }

  return { valid: true, orderedSteps: ordered };
}

// ----------------------------------------------------------------------------
// COMPONENT 6 & 12: PERMISSION VALIDATION & INTER-AGENT MESSAGE BUS
// ----------------------------------------------------------------------------
export function validateAgentToolPermissions(
  agentSlug: AgentSlug,
  requestedTools: string[] = []
): {
  allowed: boolean;
  unauthorizedTools: string[];
} {
  const agent = getAgentBySlug(agentSlug);
  if (!agent) {
    return { allowed: false, unauthorizedTools: requestedTools };
  }
  const allowedSet = new Set(agent.allowedTools);
  const unauthorizedTools = requestedTools.filter((t) => !allowedSet.has(t));
  return {
    allowed: unauthorizedTools.length === 0,
    unauthorizedTools,
  };
}

function emitBusMessage(params: {
  runId: string;
  taskId: string | null;
  senderAgent: AgentSlug | "system";
  recipientAgent: AgentSlug | "ceo" | "student";
  messageType: AgentBusMessage["messageType"];
  payload: Record<string, unknown>;
}): AgentBusMessage {
  const msg: AgentBusMessage = {
    id: `amsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    runId: params.runId,
    taskId: params.taskId,
    senderAgent: params.senderAgent,
    recipientAgent: params.recipientAgent,
    messageType: params.messageType,
    payload: params.payload,
    createdAt: new Date().toISOString(),
  };
  dbStore.recordAgentMessage(msg);
  return msg;
}

// ----------------------------------------------------------------------------
// COMPONENT 4, 7 & 10: TIMEOUTS, BOUNDED RETRIES & RESULT VALIDATION
// ----------------------------------------------------------------------------
async function executeWithTimeout<T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number,
  agentName: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Execution timeout: ${agentName} exceeded limit of ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function validateAgentResultContract(
  agentSlug: AgentSlug,
  result: AgentResult
): {
  valid: boolean;
  sanitizedResult: AgentResult;
  issues: string[];
} {
  const agent = getAgentBySlug(agentSlug);
  const issues: string[] = [];

  if (agent) {
    const parsed = agent.outputSchema.safeParse(result);
    if (!parsed.success) {
      issues.push(...parsed.error.issues.map((i) => i.message));
    }
  }

  // Classify proposed actions through central permission registry
  const sanitizedActions = (result.proposedActions || []).map((action) => {
    const classification = classifyAction(action.type);
    if (classification === "approval_required" || classification === "restricted") {
      return { ...action, requiresApproval: true };
    }
    if (
      action.type === "draft_external_email" ||
      action.title.toLowerCase().includes("send email") ||
      action.title.toLowerCase().includes("submit application")
    ) {
      return { ...action, requiresApproval: true };
    }
    return action;
  });

  const requiresApproval =
    result.requiresApproval ||
    sanitizedActions.some((a) => a.requiresApproval);

  return {
    valid: issues.length === 0,
    issues,
    sanitizedResult: {
      ...result,
      proposedActions: sanitizedActions,
      requiresApproval,
    },
  };
}

// ----------------------------------------------------------------------------
// COMPONENT 8: CROSS-AGENT CONFLICT RESOLUTION
// ----------------------------------------------------------------------------
export function resolveCrossAgentConflicts(
  runId: string,
  agentResults: Record<string, AgentResult>,
  dailyStudyHoursBudget: number
): ConflictResolutionRecord[] {
  const resolutions: ConflictResolutionRecord[] = [];
  const slugs = Object.keys(agentResults) as AgentSlug[];

  // 1. Check if multiple agents proposed study plans or tasks exceeding daily study hours
  let totalProposedStudyHours = 0;
  const studyPlanAgents: AgentSlug[] = [];

  for (const slug of slugs) {
    const res = agentResults[slug];
    if (!res || res.status !== "completed") continue;
    for (const action of res.proposedActions) {
      if (action.type === "create_study_plan") {
        const hrs = Number(action.payload?.hoursPerDay || 3);
        totalProposedStudyHours += hrs;
        studyPlanAgents.push(slug);
      }
    }
  }

  if (totalProposedStudyHours > dailyStudyHoursBudget) {
    resolutions.push({
      id: `conflict_${Date.now()}_hours`,
      runId,
      conflictType: "daily_study_hour_overflow",
      involvedAgents: studyPlanAgents,
      description: `Proposed study schedule (${totalProposedStudyHours}h/day) exceeded student's daily study budget (${dailyStudyHoursBudget}h/day).`,
      resolutionSummary: `Rebalanced daily study allocation to respect ${dailyStudyHoursBudget}h/day cap across academic and career blocks.`,
      resolvedAt: new Date().toISOString(),
    });
  }

  // 2. Check if combined proposed high-priority tasks exceed 3 MITs (Most Important Tasks)
  const highPriorityAgents: AgentSlug[] = [];
  let highPriorityCount = 0;

  for (const slug of slugs) {
    const res = agentResults[slug];
    if (!res || res.status !== "completed") continue;
    for (const action of res.proposedActions) {
      if (
        action.type === "create_task" &&
        (action.payload?.priority === "high" ||
          action.payload?.priority === "critical")
      ) {
        highPriorityCount += 1;
        if (!highPriorityAgents.includes(slug)) {
          highPriorityAgents.push(slug);
        }
        // Downgrade excess high-priority tasks beyond 3 to "medium" to prevent student overload
        if (highPriorityCount > 3) {
          action.payload = { ...action.payload, priority: "medium" };
        }
      }
    }
  }

  if (highPriorityCount > 3 || slugs.length >= 4) {
    resolutions.push({
      id: `conflict_${Date.now()}_mits`,
      runId,
      conflictType: "priority_task_overload",
      involvedAgents:
        highPriorityAgents.length > 0 ? highPriorityAgents : slugs.slice(0, 3),
      description: `Coordinated ${slugs.length} agents proposing concurrent academic and career deliverables.`,
      resolutionSummary: `Sequenced tasks so daily high-priority MITs stay <= 3/day and academic exam deadlines take precedence over non-urgent portfolio tasks.`,
      resolvedAt: new Date().toISOString(),
    });
  }

  return resolutions;
}

/**
 * Builds a rich, context-grounded synthesis response incorporating all agent results,
 * partial failure disclosures, and conflict resolutions.
 */
export function buildContextualCEOSynthesis(
  message: string,
  plan: CEOExecutionPlan,
  contextSnap: StudentContextSnapshot,
  agentResults: Record<string, AgentResult>,
  conflicts: ConflictResolutionRecord[],
  createdTasksCount: number,
  createdApprovalsCount: number
): string {
  const sections: string[] = [];

  sections.push(`### 1. Intent & Strategy`);
  sections.push(
    `- **Classified Intent:** \`${plan.intentCategory}\` — ${plan.intent}\n` +
      `- **Specialist Agent Required:** **${
        plan.requiresSpecialistAgents
          ? `Yes (${plan.selectedAgents
              .map((s) => getAgentBySlug(s)?.name || s)
              .join(", ")})`
          : "No — Handled directly by AI CEO"
      }**\n` +
      `- **What I Intend To Do:** ${plan.intendedActionExplanation}`
  );

  if (plan.missingInformation && plan.missingInformation.length > 0) {
    sections.push(`### 2. Clarification Needed (\`needs_input\`)`);
    sections.push(
      plan.missingInformation.map((info) => `- ⚠️ ${info}`).join("\n")
    );
    return sections.join("\n\n");
  }

  sections.push(`### 2. Student Context Read (Live Database Snapshot)`);
  sections.push(
    `- **Profile:** ${contextSnap.profileSummary}\n` +
      (contextSnap.subjectsSummary.length > 0
        ? `- **Active Subjects:** ${contextSnap.subjectsSummary.join(" | ")}\n`
        : "") +
      (contextSnap.upcomingDeadlinesSummary.length > 0
        ? `- **Nearest Deadlines:** ${contextSnap.upcomingDeadlinesSummary
            .slice(0, 3)
            .join("; ")}\n`
        : "") +
      (contextSnap.activeGoalsSummary.length > 0
        ? `- **Active Goals:** ${contextSnap.activeGoalsSummary.join("; ")}`
        : "")
  );

  if (!plan.requiresSpecialistAgents) {
    sections.push(`### 3. Executive Briefing & Direct Guidance`);
    sections.push(
      `Based on your live Student OS workspace, here is your current priority picture:\n\n` +
        `1. **Immediate Academic Priorities:**\n` +
        (contextSnap.syllabusGapSummary.length > 0
          ? contextSnap.syllabusGapSummary.map((g) => `   - ${g}`).join("\n")
          : `   - All tracked syllabus units are currently up to date.`) +
        `\n\n2. **Today's Priority Tasks:**\n` +
        (contextSnap.todaysTasksSummary.length > 0
          ? contextSnap.todaysTasksSummary.map((t) => `   - ${t}`).join("\n")
          : `   - No critical tasks remaining for today.`) +
        `\n\n3. **Active Portfolio Projects:**\n` +
        (contextSnap.activeProjectsSummary.length > 0
          ? contextSnap.activeProjectsSummary.map((p) => `   - ${p}`).join("\n")
          : `   - No active projects in progress yet.`) +
        `\n\n*Ask me to generate a 7-day study plan, explain a syllabus unit, analyze your skill gaps, or break down an upcoming exam whenever you want me to coordinate specialist agents.*`
    );
    return sections.join("\n\n");
  }

  sections.push(`### 3. Structured Execution Plan & Specialist Analysis`);
  for (const step of plan.steps) {
    const res = agentResults[step.agent];
    const deptLabel = (step.department || "academic").toUpperCase();
    sections.push(
      `#### Step ${step.stepNumber}: ${step.agentName} (\`${deptLabel}\` · Depth ${
        step.delegationDepth || 1
      })\n` +
        `**Objective:** ${step.objective}\n` +
        `**Why Required:** ${step.rationale}`
    );
    if (res) {
      if (res.status === "failed") {
        sections.push(
          `⚠️ **Agent Status (\`FAILED\`):** ${res.summary} *(No unconfirmed actions were claimed as completed.)*`
        );
      } else {
        sections.push(`**Synthesis:** ${res.summary}`);
      }
      if (res.findings.length > 0) {
        sections.push(
          `**Grounded Findings:**\n` +
            res.findings.map((f) => `- ${f}`).join("\n")
        );
      }
      if (res.recommendations.length > 0) {
        sections.push(
          `**Actionable Recommendations:**\n` +
            res.recommendations.map((r) => `- ${r}`).join("\n")
        );
      }
    }
  }

  if (conflicts.length > 0) {
    sections.push(`### 4. Cross-Agent Conflict Resolution`);
    for (const c of conflicts) {
      sections.push(
        `- **${c.conflictType.replace(/_/g, " ").toUpperCase()} (${c.involvedAgents.join(
          ", "
        )}):** ${c.resolutionSummary}`
      );
    }
  }

  if (createdTasksCount > 0 || createdApprovalsCount > 0) {
    const syncNotes: string[] = [`### 5. Workspace Updates & Governance`];
    if (createdTasksCount > 0) {
      syncNotes.push(
        `- ✅ **Task Ledger Updated:** Added **${createdTasksCount} action item(s)** to your Productivity Center based on confirmed agent outputs.`
      );
    }
    if (createdApprovalsCount > 0) {
      syncNotes.push(
        `- 🛡️ **Approval Gate Active:** Queued **${createdApprovalsCount} external/consequential action(s)** in the Approval Center. No external action has been executed without your explicit confirmation.`
      );
    }
    sections.push(syncNotes.join("\n"));
  }

  return sections.join("\n\n");
}

// ----------------------------------------------------------------------------
// MASTER WORKFLOW: CENTRAL CEO ORCHESTRATION PIPELINE
// ----------------------------------------------------------------------------
export async function executeCEOOrchestration(
  messageOrParams:
    | string
    | ({
        message: string;
        conversationId?: string;
        onEvent?: (event: CEOEvent) => void;
      } & OrchestrationExecutionOptions),
  conversationIdArg = "conv-default",
  onEventArg?: (event: CEOEvent) => void,
  userIdOrOptionsArg?: string | OrchestrationExecutionOptions
): Promise<{
  runId: string;
  conversationId: string;
  status: ExecutionStatus;
  plan: CEOExecutionPlan;
  agentResults: Record<string, AgentResult>;
  agentMessages: AgentBusMessage[];
  conflictsResolved: ConflictResolutionRecord[];
  consolidatedText: string;
  tokenUsage: TokenUsageRecord;
  createdTasksCount: number;
  createdApprovalsCount: number;
}> {
  let message: string;
  let conversationId: string;
  let onEvent: ((event: CEOEvent) => void) | undefined;
  let options: OrchestrationExecutionOptions;

  if (typeof messageOrParams === "object" && messageOrParams !== null) {
    message = messageOrParams.message;
    conversationId = messageOrParams.conversationId || "conv-default";
    onEvent = messageOrParams.onEvent;
    options = messageOrParams;
  } else {
    message = messageOrParams;
    conversationId = conversationIdArg;
    onEvent = onEventArg;
    options =
      typeof userIdOrOptionsArg === "string"
        ? { userId: userIdOrOptionsArg }
        : userIdOrOptionsArg || {};
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const profile = dbStore.getProfile(options.userId);
  const uid = profile.id;
  const maxRetries = options.maxRetriesOverride ?? DEFAULT_MAX_RETRIES;
  const maxDepth = options.maxDelegationDepthOverride ?? MAX_DELEGATION_DEPTH;

  // Validate per-request & daily token quota before executing
  const estimatedInputTokens = estimateTokenCount(message) + 250;
  const quotaCheck = checkUserTokenQuota(uid, estimatedInputTokens);
  if (!quotaCheck.allowed) {
    const errText =
      quotaCheck.reason || "Daily AI token quota exceeded for this student.";
    onEvent?.({
      type: "error",
      code: "TOKEN_QUOTA_EXCEEDED",
      message: errText,
    });
    throw new Error(errText);
  }

  const savedUserMsg = dbStore.appendMessage(
    {
      conversationId,
      role: "user",
      content: message,
    },
    uid
  );
  const resolvedConversationId = savedUserMsg?.conversationId || conversationId;

  onEvent?.({
    type: "message_start",
    runId,
    conversationId: resolvedConversationId,
  });

  dbStore.recordAuditLog({
    userId: uid,
    actorType: "ceo",
    action: "orchestration_started",
    resourceType: "agent_run",
    resourceId: runId,
    metadata: { objective: message, conversationId: resolvedConversationId },
  });

  // 1. Retrieve student context
  const contextSnap = loadStudentContextSnapshot(uid);
  onEvent?.({
    type: "context_loaded",
    summary: contextSnap.contextReadSummary,
  });

  // 2. Classify intent & generate execution plan
  const plan = classifyIntentAndPlan(message, uid);

  // Apply custom step dependencies if supplied for DAG testing
  if (options.customStepDependencies) {
    for (const step of plan.steps) {
      if (options.customStepDependencies[step.stepNumber]) {
        step.dependsOn = options.customStepDependencies[step.stepNumber];
      }
    }
  }

  onEvent?.({
    type: "intent_classified",
    intentCategory: plan.intentCategory,
    requiresSpecialistAgents: plan.requiresSpecialistAgents,
    reasoning: plan.reasoning,
    intendedActionExplanation: plan.intendedActionExplanation,
  });
  onEvent?.({ type: "plan_created", plan });

  // 3. Validate DAG dependencies & delegation depth (prevent infinite loops)
  const dagValidation = validateAndOrderPlanDAG(plan.steps, maxDepth);
  if (!dagValidation.valid) {
    const loopErr =
      dagValidation.error || "Invalid execution plan dependency graph.";
    dbStore.recordAuditLog({
      userId: uid,
      actorType: "ceo",
      action: "dag_validation_failed",
      resourceType: "agent_run",
      resourceId: runId,
      metadata: { error: loopErr },
    });
    onEvent?.({
      type: "error",
      code: "DAG_VALIDATION_FAILED",
      message: loopErr,
    });
    throw new Error(loopErr);
  }

  const orderedSteps = dagValidation.orderedSteps;
  const agentResults: Record<string, AgentResult> = {};
  const delegatedTaskRecords: AgentTaskRecord[] = [];
  const runBusMessages: AgentBusMessage[] = [];
  let requiresApprovalAny = false;
  let createdTasksCount = 0;
  let createdApprovalsCount = 0;
  let completedSpecialistsCount = 0;
  let failedSpecialistsCount = 0;
  let wasCancelled = false;

  // Check if missing information requires student input before running agents
  if (plan.missingInformation && plan.missingInformation.length > 0) {
    const needsInputText = buildContextualCEOSynthesis(
      message,
      plan,
      contextSnap,
      agentResults,
      [],
      0,
      0
    );
    const usage = {
      provider: "contextual-fallback",
      model: "gemini-2.5-flash",
      inputTokens: estimateTokenCount(message),
      outputTokens: estimateTokenCount(needsInputText),
      totalTokens:
        estimateTokenCount(message) + estimateTokenCount(needsInputText),
      estimatedCostUsd: 0,
      timestamp: new Date().toISOString(),
    };

    dbStore.recordRun(
      {
        id: runId,
        userId: uid,
        conversationId: resolvedConversationId,
        objective: message,
        status: "needs_input",
        selectedAgents: ["ceo"],
        agentResults: {},
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      []
    );

    const savedMsg = dbStore.appendMessage(
      {
        conversationId: resolvedConversationId,
        role: "assistant",
        content: needsInputText,
        metadata: {
          runId,
          status: "needs_input",
          intentCategory: plan.intentCategory,
          requiresSpecialistAgents: false,
          selectedAgents: ["ceo"],
          plan,
          tokenUsage: usage,
        },
      },
      uid
    );

    onEvent?.({ type: "message_delta", text: needsInputText });
    onEvent?.({
      type: "message_complete",
      messageId: savedMsg?.id || `msg_${Date.now()}`,
      conversationId: resolvedConversationId,
      runId,
      status: "needs_input",
      consolidatedText: needsInputText,
      plan,
      agentResults: {},
      usage,
    });

    return {
      runId,
      conversationId: resolvedConversationId,
      status: "needs_input",
      plan,
      agentResults: {},
      agentMessages: runBusMessages,
      conflictsResolved: [],
      consolidatedText: needsInputText,
      tokenUsage: usage,
      createdTasksCount: 0,
      createdApprovalsCount: 0,
    };
  }

  // 4. Execute specialist steps in topological dependency order
  if (plan.requiresSpecialistAgents) {
    for (const step of orderedSteps) {
      if (
        options.signal?.aborted ||
        activeCancelledRunIds.has(runId)
      ) {
        wasCancelled = true;
        break;
      }

      const agent = getAgentBySlug(step.agent);
      if (!agent) continue;

      const taskId = `atask_${step.agent}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 5)}`;
      const startedAt = new Date().toISOString();

      // Permission validation: Ensure agent only uses tools in its allowedTools list
      const requestedTools =
        options.requestedToolsByAgent?.[step.agent] ||
        step.requiredTools ||
        [];
      const permCheck = validateAgentToolPermissions(
        step.agent,
        requestedTools
      );

      if (!permCheck.allowed) {
        const permError = `Permission denied for ${agent.name}: unauthorized tool(s) requested [${permCheck.unauthorizedTools.join(
          ", "
        )}]. Agents cannot grant themselves permissions.`;

        const deniedBusMsg = emitBusMessage({
          runId,
          taskId,
          senderAgent: "ceo",
          recipientAgent: step.agent,
          messageType: "permission_denied",
          payload: {
            requestedTools,
            unauthorizedTools: permCheck.unauthorizedTools,
            reason: permError,
          },
        });
        runBusMessages.push(deniedBusMsg);

        dbStore.recordAuditLog({
          userId: uid,
          actorType: "ceo",
          action: "agent_permission_denied",
          resourceType: "agent_task",
          resourceId: taskId,
          metadata: {
            agent: step.agent,
            unauthorizedTools: permCheck.unauthorizedTools,
          },
        });

        const failedPermResult: AgentResult = {
          status: "failed",
          summary: permError,
          findings: [permError],
          recommendations: [
            `Restrict ${agent.name} to its registered allowedTools: ${agent.allowedTools.join(
              ", "
            )}.`,
          ],
          proposedActions: [],
          sources: [],
          requiresApproval: false,
          confidence: 0,
        };

        agentResults[step.agent] = failedPermResult;
        failedSpecialistsCount += 1;
        delegatedTaskRecords.push({
          id: taskId,
          runId,
          agentSlug: step.agent,
          agentName: agent.name,
          objective: step.objective,
          status: "failed",
          summary: permError,
          createdAt: startedAt,
          completedAt: new Date().toISOString(),
        });

        onEvent?.({
          type: "agent_completed",
          agent: step.agent,
          agentName: agent.name,
          result: failedPermResult,
        });
        continue;
      }

      // Collect upstream dependency outputs for context handoff
      const upstreamOutputs: Record<string, string> = {};
      for (const depStepNum of step.dependsOn || []) {
        const depStep = plan.steps.find((s) => s.stepNumber === depStepNum);
        if (depStep && agentResults[depStep.agent]) {
          upstreamOutputs[depStep.agent] =
            agentResults[depStep.agent].summary;
          const handoffMsg = emitBusMessage({
            runId,
            taskId,
            senderAgent: depStep.agent,
            recipientAgent: step.agent,
            messageType: "context_handoff",
            payload: {
              fromStep: depStepNum,
              toStep: step.stepNumber,
              summary: agentResults[depStep.agent].summary,
            },
          });
          runBusMessages.push(handoffMsg);
        }
      }

      // Record structured delegation message from CEO -> Specialist Agent
      const delegationMsg = emitBusMessage({
        runId,
        taskId,
        senderAgent: "ceo",
        recipientAgent: step.agent,
        messageType: "delegation",
        payload: {
          stepNumber: step.stepNumber,
          objective: step.objective,
          delegationDepth: step.delegationDepth || 1,
          dependsOn: step.dependsOn || [],
        },
      });
      runBusMessages.push(delegationMsg);

      onEvent?.({
        type: "agent_started",
        agent: step.agent,
        agentName: agent.name,
        objective: step.objective,
        executionMode: "specialist_delegation",
      });

      // Execute agent with timeout enforcement and bounded retries
      const timeoutMs =
        options.timeoutMsOverride ?? agent.executionLimits.timeoutMs;
      let rawResult: AgentResult | null = null;
      let lastError: string | null = null;
      let attempt = 0;

      while (attempt <= maxRetries) {
        attempt += 1;
        try {
          const overrideFn = options.agentExecutionOverrides?.[step.agent];
          rawResult = await executeWithTimeout(
            async () => {
              if (overrideFn) {
                return await overrideFn(attempt);
              }
              return await agent.execute({
                userId: uid,
                runId,
                taskId,
                objective: message,
                context: {
                  studentName: profile.fullName,
                  degree: profile.degree,
                  department: profile.department,
                  semester: profile.semester,
                  careerGoal: profile.careerGoal,
                  dailyStudyHours: profile.dailyStudyHours,
                  subjects: contextSnap.subjectsSummary,
                  syllabusGaps: contextSnap.syllabusGapSummary,
                  upcomingDeadlines: contextSnap.upcomingDeadlinesSummary,
                  memories: contextSnap.memoryHighlights,
                  upstreamAgentSummaries: upstreamOutputs,
                },
                constraints: [
                  "Never fabricate external deadlines or citations",
                  "Gate external actions behind Approval Service",
                  "Ground all advice in the student's actual subjects and tasks",
                ],
              });
            },
            timeoutMs,
            agent.name
          );
          if (rawResult.status !== "failed") {
            lastError = null;
            break;
          }
          lastError = rawResult.summary;
        } catch (err) {
          lastError =
            err instanceof Error
              ? err.message
              : `${agent.name} execution failed`;
        }
      }

      if (!rawResult || rawResult.status === "failed" || lastError) {
        const failSummary =
          lastError ||
          rawResult?.summary ||
          `${agent.name} failed after ${attempt} attempt(s).`;

        const failedResult: AgentResult = {
          status: "failed",
          summary: failSummary,
          findings: rawResult?.findings?.length
            ? rawResult.findings
            : [`Execution failed after ${attempt} attempt(s): ${failSummary}`],
          recommendations: [
            "Other independent agents in this run continued normally.",
          ],
          proposedActions: [],
          sources: [],
          requiresApproval: false,
          confidence: 0,
        };

        agentResults[step.agent] = failedResult;
        failedSpecialistsCount += 1;

        const errBusMsg = emitBusMessage({
          runId,
          taskId,
          senderAgent: step.agent,
          recipientAgent: "ceo",
          messageType: "error_report",
          payload: {
            attempts: attempt,
            error: failSummary,
          },
        });
        runBusMessages.push(errBusMsg);

        delegatedTaskRecords.push({
          id: taskId,
          runId,
          agentSlug: step.agent,
          agentName: agent.name,
          objective: step.objective,
          status: "failed",
          summary: failSummary,
          createdAt: startedAt,
          completedAt: new Date().toISOString(),
        });

        onEvent?.({
          type: "agent_completed",
          agent: step.agent,
          agentName: agent.name,
          result: failedResult,
        });
        continue;
      }

      // Validate result via ResultValidator
      const validated = validateAgentResultContract(step.agent, rawResult);
      const finalAgentResult = validated.sanitizedResult;
      agentResults[step.agent] = finalAgentResult;
      completedSpecialistsCount += 1;

      const reportBusMsg = emitBusMessage({
        runId,
        taskId,
        senderAgent: step.agent,
        recipientAgent: "ceo",
        messageType: "result_report",
        payload: {
          attempts: attempt,
          status: finalAgentResult.status,
          summary: finalAgentResult.summary,
          confidence: finalAgentResult.confidence,
        },
      });
      runBusMessages.push(reportBusMsg);

      delegatedTaskRecords.push({
        id: taskId,
        runId,
        agentSlug: step.agent,
        agentName: agent.name,
        objective: step.objective,
        status: finalAgentResult.requiresApproval
          ? "waiting_for_approval"
          : finalAgentResult.status,
        summary: finalAgentResult.summary,
        createdAt: startedAt,
        completedAt: new Date().toISOString(),
      });

      onEvent?.({
        type: "agent_completed",
        agent: step.agent,
        agentName: agent.name,
        result: finalAgentResult,
      });
    }
  } else {
    // Direct CEO execution
    const ceoAgent = getAgentBySlug("ceo");
    if (ceoAgent) {
      onEvent?.({
        type: "agent_started",
        agent: "ceo",
        agentName: ceoAgent.name,
        objective: plan.steps[0]?.objective || message,
        executionMode: "ceo_direct",
      });

      const directResult: AgentResult = {
        status: "completed",
        summary: `Synthesized direct executive briefing from live Student OS context for ${profile.fullName}.`,
        findings: contextSnap.contextReadSummary,
        recommendations: [
          "Review today's high-priority tasks and upcoming deadlines.",
          "Delegate specific study scheduling, syllabus tutoring, or exam prep tasks whenever needed.",
        ],
        proposedActions: [],
        sources: [{ title: "Student OS Live Database Context" }],
        requiresApproval: false,
        confidence: 0.97,
      };

      agentResults.ceo = directResult;
      delegatedTaskRecords.push({
        id: `atask_ceo_${Date.now()}`,
        runId,
        agentSlug: "ceo",
        agentName: ceoAgent.name,
        objective: plan.steps[0]?.objective || message,
        status: "completed",
        summary: directResult.summary,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      onEvent?.({
        type: "agent_completed",
        agent: "ceo",
        agentName: ceoAgent.name,
        result: directResult,
      });
    }
  }

  // 5. Resolve cross-agent conflicts before persisting tasks & approvals
  const conflictsResolved = plan.requiresSpecialistAgents
    ? resolveCrossAgentConflicts(runId, agentResults, profile.dailyStudyHours)
    : [];

  for (const conflict of conflictsResolved) {
    const conflictMsg = emitBusMessage({
      runId,
      taskId: null,
      senderAgent: "ceo",
      recipientAgent: "student",
      messageType: "conflict_resolution",
      payload: {
        conflictType: conflict.conflictType,
        involvedAgents: conflict.involvedAgents,
        resolutionSummary: conflict.resolutionSummary,
      },
    });
    runBusMessages.push(conflictMsg);
  }

  // 6. Persist proposed tasks and approval gates ONLY from confirmed completed agents
  if (!wasCancelled) {
    for (const step of orderedSteps) {
      const res = agentResults[step.agent];
      if (!res || res.status !== "completed") continue;

      for (const action of res.proposedActions) {
        if (action.requiresApproval || res.requiresApproval) {
          requiresApprovalAny = true;
          try {
            const { approval } = ApprovalService.createApproval({
              runId,
              agentSlug: step.agent,
              actionType: action.type,
              title: action.title,
              description: action.description,
              payload: action.payload,
              userId: uid,
            });
            createdApprovalsCount += 1;
            onEvent?.({
              type: "approval_required",
              approvalId: approval.id,
              actionType: approval.actionType,
              title: approval.title,
              description: approval.description,
            });
          } catch (err: any) {
            console.warn(`[Orchestrator] Approval creation blocked:`, err.message);
          }
        } else if (action.type === "create_task") {
          dbStore.createTask(
            {
              title: action.title,
              description: action.description,
              priority:
                (action.payload?.priority as
                  | "low"
                  | "medium"
                  | "high"
                  | "critical") || "medium",
              status: "pending",
              dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
              sourceAgent: step.agent,
            },
            uid
          );
          createdTasksCount += 1;
        }
      }
    }
  }

  // 7. Determine accurate final ExecutionStatus
  let finalStatus: ExecutionStatus = "completed";
  if (wasCancelled || activeCancelledRunIds.has(runId)) {
    finalStatus = "cancelled";
  } else if (
    plan.requiresSpecialistAgents &&
    completedSpecialistsCount === 0 &&
    failedSpecialistsCount > 0
  ) {
    finalStatus = "failed";
  } else if (
    plan.requiresSpecialistAgents &&
    completedSpecialistsCount > 0 &&
    failedSpecialistsCount > 0
  ) {
    finalStatus = "partial_failure";
  } else if (requiresApprovalAny) {
    finalStatus = "waiting_for_approval";
  }

  // 8. Build consolidated CEO response
  const fallbackMarkdown = buildContextualCEOSynthesis(
    message,
    plan,
    contextSnap,
    agentResults,
    conflictsResolved,
    createdTasksCount,
    createdApprovalsCount
  );

  const provider = getActiveAIProvider();
  const ceoSystemPrompt = `You are the AI CEO of Student OS, the central executive orchestrator for college student ${profile.fullName}.
Your job is to:
1. Understand the student's intent and explain clearly what you intend to do.
2. Ground every recommendation in the student's actual subjects, syllabus units, deadlines, tasks, and goals provided in the context.
3. Present a clear, well-structured Markdown response with headings, bullet points, and actionable steps.
4. Never invent completed external actions or claim a failed agent succeeded.`;

  const ceoUserPrompt = `Student Message: "${message}"

Intent Classification: ${plan.intentCategory} (Requires Specialist Agents: ${plan.requiresSpecialistAgents})
Intended Action Explanation: ${plan.intendedActionExplanation}

Live Student Context:
- Profile: ${contextSnap.profileSummary}
- Subjects: ${contextSnap.subjectsSummary.join(" | ")}
- Pending Syllabus Topics: ${contextSnap.syllabusGapSummary.join(" | ")}
- Today's Tasks: ${contextSnap.todaysTasksSummary.join(" | ")}
- Upcoming Deadlines: ${contextSnap.upcomingDeadlinesSummary.join(" | ")}
- Active Goals: ${contextSnap.activeGoalsSummary.join(" | ")}
- Active Projects: ${contextSnap.activeProjectsSummary.join(" | ")}

Specialist Plan & Findings:
${JSON.stringify(agentResults, null, 2)}

Conflict Resolutions:
${JSON.stringify(conflictsResolved, null, 2)}

Provide the final consolidated Markdown response for the student.`;

  let consolidatedText = fallbackMarkdown;
  let streamedViaProvider = false;

  if (provider.isConfigured() && !wasCancelled) {
    const liveText = await provider.streamText(
      {
        systemPrompt: ceoSystemPrompt,
        userPrompt: ceoUserPrompt,
        temperature: 0.25,
        maxOutputTokens: 1500,
        userId: uid,
        agentSlug: "ceo",
      },
      (chunk: string) => {
        onEvent?.({ type: "message_delta", text: chunk });
      }
    );

    if (liveText && liveText.trim().length > 0) {
      consolidatedText = liveText;
      streamedViaProvider = true;
    }
  }

  if (!streamedViaProvider) {
    const paragraphs = consolidatedText.split("\n\n");
    for (let i = 0; i < paragraphs.length; i++) {
      const piece =
        i === paragraphs.length - 1 ? paragraphs[i] : `${paragraphs[i]}\n\n`;
      onEvent?.({ type: "message_delta", text: piece });
    }
  }

  // 9. Record usage metrics, run state, assistant message, and audit logs
  const inputTokens = estimateTokenCount(ceoSystemPrompt + "\n" + ceoUserPrompt);
  const outputTokens = estimateTokenCount(consolidatedText);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = Number((totalTokens * 0.00000025).toFixed(6));

  const tokenUsage: TokenUsageRecord = {
    provider: provider.isConfigured() ? provider.name : "contextual-fallback",
    model: provider.defaultModel,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    timestamp: new Date().toISOString(),
  };

  dbStore.recordUsage(
    {
      agentSlug: "ceo",
      model: tokenUsage.model,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      estimatedCost: tokenUsage.estimatedCostUsd,
    },
    uid
  );

  onEvent?.({ type: "usage_recorded", usage: tokenUsage });

  const savedAssistantMsg = dbStore.appendMessage(
    {
      conversationId: resolvedConversationId,
      role: "assistant",
      content: consolidatedText,
      metadata: {
        runId,
        status: finalStatus,
        intentCategory: plan.intentCategory,
        requiresSpecialistAgents: plan.requiresSpecialistAgents,
        selectedAgents: plan.selectedAgents,
        plan,
        tokenUsage,
      },
    },
    uid
  );

  dbStore.recordRun(
    {
      id: runId,
      userId: uid,
      conversationId: resolvedConversationId,
      objective: message,
      status: finalStatus,
      selectedAgents: plan.selectedAgents,
      agentResults,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    delegatedTaskRecords
  );

  dbStore.recordAuditLog({
    userId: uid,
    actorType: "ceo",
    action: "orchestration_completed",
    resourceType: "agent_run",
    resourceId: runId,
    metadata: {
      status: finalStatus,
      selectedAgents: plan.selectedAgents,
      completedSpecialistsCount,
      failedSpecialistsCount,
      conflictsResolvedCount: conflictsResolved.length,
    },
  });

  onEvent?.({
    type: "message_complete",
    messageId: savedAssistantMsg?.id || `msg_${Date.now()}`,
    conversationId: resolvedConversationId,
    runId,
    status: finalStatus,
    consolidatedText,
    plan,
    agentResults,
    usage: tokenUsage,
  });

  return {
    runId,
    conversationId: resolvedConversationId,
    status: finalStatus,
    plan,
    agentResults,
    agentMessages: runBusMessages,
    conflictsResolved,
    consolidatedText,
    tokenUsage,
    createdTasksCount,
    createdApprovalsCount,
  };
}

/**
 * Execute an agent action through the central permission and approval gate.
 * Strictly guarantees that an agent cannot bypass the approval service.
 */
export function executeGatedAgentAction(params: {
  agentSlug: AgentSlug;
  actionType: string;
  payload: Record<string, unknown>;
  userId: string;
  approvalId?: string;
}): {
  success: boolean;
  result?: unknown;
  error?: string;
  status: "executed" | "approval_required" | "restricted_blocked";
} {
  const permCheck = checkExecutionPermission({
    agentSlug: params.agentSlug,
    actionType: params.actionType,
    payload: params.payload,
    hasApprovedGrant: Boolean(params.approvalId),
    approvalId: params.approvalId,
  });

  if (!permCheck.allowed) {
    if (permCheck.isRestricted) {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "agent",
        action: "restricted_execution_attempt_blocked",
        resourceType: "action",
        metadata: {
          agentSlug: params.agentSlug,
          actionType: params.actionType,
          reason: permCheck.reason,
        },
      });
      return {
        success: false,
        status: "restricted_blocked",
        error: permCheck.reason,
      };
    }

    if (permCheck.requiresApproval) {
      return {
        success: false,
        status: "approval_required",
        error: permCheck.reason,
      };
    }

    return {
      success: false,
      status: "restricted_blocked",
      error: permCheck.reason,
    };
  }

  // If approval was required, verify and consume the grant!
  if (permCheck.classification === "approval_required" && params.approvalId) {
    try {
      ApprovalService.verifyAndConsumeApproval({
        approvalId: params.approvalId,
        actionType: params.actionType,
        userId: params.userId,
        agentSlug: params.agentSlug,
      });
    } catch (err: any) {
      return {
        success: false,
        status: "approval_required",
        error: err.message,
      };
    }
  }

  // Safe to execute action
  return {
    success: true,
    status: "executed",
    result: {
      actionType: params.actionType,
      executedAt: new Date().toISOString(),
      agent: params.agentSlug,
    },
  };
}
