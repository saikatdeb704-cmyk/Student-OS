import { z } from "zod";

// ============================================================================
// STANDARD AGENT CONTRACT (PART 4 — SECTION 18)
// ============================================================================

export type AgentDepartment =
  | "executive"
  | "academic"
  | "career"
  | "productivity"
  | "support"
  | "intelligence";

export type AgentSlug =
  | "ceo"
  | "academic"
  | "study"
  | "tutor"
  | "exam"
  | "career"
  | "skill"
  | "project"
  | "opportunity"
  | "research"
  | "productivity"
  | "notes"
  | "communication"
  | "performance"
  | "finance"
  | "wellbeing";

export type ExecutionStatus =
  | "pending"
  | "planning"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "partial_failure"
  | "failed"
  | "cancelled"
  | "needs_input";

export const AgentInputSchema = z.object({
  userId: z.string(),
  runId: z.string(),
  taskId: z.string(),
  objective: z.string().min(1),
  context: z.record(z.unknown()).default({}),
  constraints: z.array(z.string()).default([]),
});

export type AgentInput = z.infer<typeof AgentInputSchema>;

export const ProposedActionSchema = z.object({
  type: z.enum([
    "create_task",
    "create_study_plan",
    "draft_external_email",
    "update_calendar",
    "save_opportunity",
  ]),
  title: z.string(),
  description: z.string(),
  requiresApproval: z.boolean().default(false),
  payload: z.record(z.unknown()).default({}),
});

export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const AgentResultSchema = z.object({
  status: z.enum(["completed", "failed", "needs_input"]),
  summary: z.string(),
  findings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  proposedActions: z.array(ProposedActionSchema).default([]),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        verifiedAt: z.string().optional(),
      })
    )
    .default([]),
  requiresApproval: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.9),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

export interface AgentExecutionLimits {
  maxSteps: number;
  maxTokensPerRun: number;
  timeoutMs: number;
  maxConcurrentTasks: number;
  cooldownSeconds: number;
  requiresApprovalForExternalActions: boolean;
}

export interface AgentSchemaDescriptor {
  name: string;
  description: string;
  requiredFields: string[];
  fields: Record<string, string>;
}

export interface AgentConfig {
  id: string;
  slug: AgentSlug;
  name: string;
  description: string;
  department: AgentDepartment;
  systemPrompt: string;
  capabilities: string[];
  allowedTools: string[];
  inputSchema: z.ZodType<AgentInput, z.ZodTypeDef, unknown>;
  outputSchema: z.ZodType<AgentResult, z.ZodTypeDef, unknown>;
  inputSchemaDescriptor: AgentSchemaDescriptor;
  outputSchemaDescriptor: AgentSchemaDescriptor;
  version: string;
  executionLimits: AgentExecutionLimits;
  enabled: boolean;
  fallbackGenerator: (input: AgentInput) => AgentResult;
}

export interface StudentAgent {
  id: string;
  slug: AgentSlug;
  name: string;
  description: string;
  department: AgentDepartment;
  systemPrompt: string;
  capabilities: string[];
  allowedTools: string[];
  inputSchema: z.ZodType<AgentInput, z.ZodTypeDef, unknown>;
  outputSchema: z.ZodType<AgentResult, z.ZodTypeDef, unknown>;
  inputSchemaDescriptor: AgentSchemaDescriptor;
  outputSchemaDescriptor: AgentSchemaDescriptor;
  version: string;
  executionLimits: AgentExecutionLimits;
  enabled: boolean;
  status: "active" | "idle" | "error" | "disabled";
  execute(input: AgentInput): Promise<AgentResult>;
}

// ============================================================================
// PHASE 3: CEO INTENT CLASSIFICATION, STRUCTURED PLAN & STREAMING EVENTS
// ============================================================================

export type CEOIntentCategory =
  | "executive_direct_query"
  | "direct_executive_inquiry"
  | "academic_planning"
  | "study_scheduling"
  | "concept_tutoring"
  | "exam_preparation"
  | "career_and_skills"
  | "project_architecture"
  | "opportunity_discovery"
  | "research_and_notes"
  | "productivity_and_tasks"
  | "communication_outreach"
  | "communication_drafting"
  | "finance_and_wellbeing"
  | "multi_domain_orchestration";

export interface CEOExecutionPlanStep {
  stepNumber: number;
  agent: AgentSlug;
  agentName: string;
  department?: AgentDepartment | string;
  objective: string;
  rationale: string;
  executionMode: "ceo_direct" | "specialist_plan" | "specialist_delegation";
  dependsOn?: number[];
  requiredTools?: string[];
  delegationDepth?: number;
}

export interface CEOExecutionPlan {
  intent: string;
  intentCategory: CEOIntentCategory;
  requiresSpecialistAgents: boolean;
  reasoning: string;
  intendedActionExplanation: string;
  contextReadSummary: string[];
  selectedAgents: AgentSlug[];
  steps: CEOExecutionPlanStep[];
  missingInformation?: string[];
}

export interface AgentBusMessage {
  id: string;
  runId: string;
  taskId: string | null;
  senderAgent: AgentSlug | "system";
  recipientAgent: AgentSlug | "ceo" | "student";
  messageType:
    | "delegation"
    | "context_handoff"
    | "result_report"
    | "conflict_resolution"
    | "error_report"
    | "permission_denied";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ConflictResolutionRecord {
  id: string;
  runId: string;
  conflictType:
    | "daily_study_hour_overflow"
    | "priority_task_overload"
    | "duplicate_action_proposal";
  involvedAgents: AgentSlug[];
  description: string;
  resolutionSummary: string;
  resolvedAt: string;
}

export interface TokenUsageRecord {
  id?: string;
  userId?: string;
  agentSlug?: AgentSlug | string;
  provider: string;
  providerMode?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  timestamp?: string;
  createdAt?: string;
}

export interface ConversationItem {
  id: string;
  userId: string;
  title: string;
  status: "active" | "archived";
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  metadata?: {
    runId?: string;
    intentCategory?: CEOIntentCategory;
    requiresSpecialistAgents?: boolean;
    selectedAgents?: AgentSlug[];
    plan?: CEOExecutionPlan;
    agentResults?: Record<string, AgentResult>;
    tokenUsage?: TokenUsageRecord;
    status?: ExecutionStatus;
  };
  createdAt: string;
}

export type CEOEvent =
  | {
      type: "message_start";
      runId: string;
      conversationId: string;
      conversationTitle?: string;
    }
  | {
      type: "context_loaded";
      summary: string[];
    }
  | {
      type: "intent_classified";
      intentCategory: CEOIntentCategory;
      requiresSpecialistAgents: boolean;
      reasoning?: string;
      intendedActionExplanation: string;
    }
  | {
      type: "plan_created";
      plan: CEOExecutionPlan;
    }
  | {
      type: "agent_started";
      agent: AgentSlug;
      agentName: string;
      objective: string;
      executionMode?: "ceo_direct" | "specialist_plan" | "specialist_delegation";
    }
  | {
      type: "agent_completed";
      agent: AgentSlug;
      agentName: string;
      result: AgentResult;
    }
  | {
      type: "approval_required";
      approvalId: string;
      actionType: string;
      title: string;
      description: string;
    }
  | { type: "message_delta"; text: string }
  | {
      type: "usage_recorded";
      usage: TokenUsageRecord;
    }
  | {
      type: "message_complete";
      messageId: string;
      conversationId: string;
      conversationTitle?: string;
      runId: string;
      status: ExecutionStatus;
      consolidatedText: string;
      plan: CEOExecutionPlan;
      agentResults: Record<string, AgentResult>;
      usage?: TokenUsageRecord;
    }
  | { type: "error"; message: string; code?: string };

// ============================================================================
// PHASE 1: AUTHENTICATION & ONBOARDING SCHEMAS
// ============================================================================

export const RegisterSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid college or personal email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RecoverPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type RecoverPasswordInput = z.infer<typeof RecoverPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Recovery token is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export type StudentPersona =
  | "confused_fresher"
  | "ambitious_builder"
  | "overwhelmed_organizer"
  | "research_explorer";

export const OnboardingProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  country: z.string().min(2, "Country is required").default("India"),
  institution: z.string().min(2, "College or university name is required"),
  degree: z.string().min(2, "Degree is required"),
  department: z.string().min(2, "Department is required"),
  academicYear: z
    .string()
    .min(1, "Current academic year is required")
    .default("3rd Year (2026-2027)"),
  semester: z.coerce.number().int().min(1).max(16),
  careerInterests: z
    .union([
      z.array(z.string()).min(1, "Select or enter at least one career interest"),
      z
        .string()
        .min(2, "Career interests are required")
        .transform((val) =>
          val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        ),
    ])
    .default(["AI Systems Engineering", "Full-Stack Software Development"]),
  learningGoals: z
    .string()
    .min(5, "Please describe your primary learning goals")
    .default(
      "Master Data Structures, Operating Systems, and build 2 production AI portfolio projects."
    ),
  preferredLanguage: z
    .string()
    .min(2, "Preferred language is required")
    .default("English"),
  timezone: z.string().min(2, "Time zone is required").default("Asia/Kolkata"),
  careerGoal: z.string().optional(),
  persona: z
    .enum([
      "confused_fresher",
      "ambitious_builder",
      "overwhelmed_organizer",
      "research_explorer",
    ])
    .default("ambitious_builder"),
  dailyStudyHours: z.coerce.number().min(1).max(14).default(3.5),
});

export type OnboardingProfileInput = z.infer<typeof OnboardingProfileSchema>;

// ============================================================================
// PHASE 2: DOMAIN ENTITIES & DYNAMIC DASHBOARD TYPES
// ============================================================================

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string;
  country: string;
  institution: string;
  degree: string;
  department: string;
  academicYear: string;
  semester: number;
  careerInterests: string[];
  learningGoals: string;
  preferredLanguage: string;
  timezone: string;
  careerGoal: string;
  persona: StudentPersona;
  dailyStudyHours: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseItem {
  id: string;
  userId: string;
  name: string;
  academicYear: string;
  semester: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusTopicItem {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  unitNumber: number;
  completionStatus: "not_started" | "in_progress" | "completed" | "needs_revision";
  createdAt: string;
  updatedAt: string;
}

export interface SubjectItem {
  id: string;
  courseId: string;
  name: string;
  code: string;
  credits: number;
  completionPercentage: number;
  totalTopicsCount: number;
  completedTopicsCount: number;
  nextExamDate?: string;
  pendingAssignments: number;
}

export interface AssignmentItem {
  id: string;
  userId: string;
  subjectId: string;
  subjectCode?: string;
  title: string;
  description?: string;
  dueAt: string;
  status: "pending" | "in_progress" | "submitted" | "overdue";
  createdAt: string;
  updatedAt: string;
}

export interface ExamItem {
  id: string;
  userId: string;
  subjectId: string;
  subjectCode?: string;
  title: string;
  examAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  goalId?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueAt?: string;
  sourceAgent?: AgentSlug;
  createdAt: string;
  updatedAt: string;
}

export interface GoalItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: "academic" | "career" | "skill" | "project" | "finance" | "wellbeing";
  progress: number;
  targetDate: string;
  status: "active" | "completed" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  techStack: string[];
  status: "planning" | "in_progress" | "completed" | "shipped";
  repositoryUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityItem {
  id: string;
  userId: string;
  title: string;
  organisation: string;
  type: "internship" | "scholarship" | "hackathon" | "competition";
  sourceUrl: string;
  deadline: string;
  lastCheckedAt: string;
  verificationStatus: "verified" | "unverified";
  status: "saved" | "preparing" | "applied";
  createdAt: string;
  updatedAt: string;
}

export type ActionClassification = "automatic" | "approval_required" | "restricted";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export interface ApprovalItem {
  id: string;
  userId: string;
  runId: string;
  agentSlug: AgentSlug;
  actionType: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  classification?: ActionClassification;
  idempotencyKey?: string;
  status: ApprovalStatus;
  expiresAt?: string;
  decidedAt?: string;
  cancellationReason?: string;
  executedAt?: string;
  createdAt: string;
}

export interface AgentTaskRecord {
  id: string;
  runId: string;
  agentSlug: AgentSlug;
  agentName: string;
  objective: string;
  status: "pending" | "running" | "waiting_for_approval" | "completed" | "failed" | "needs_input";
  summary?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentRunRecord {
  id: string;
  userId: string;
  conversationId: string;
  objective: string;
  status: ExecutionStatus;
  selectedAgents: AgentSlug[];
  agentResults: Record<string, AgentResult>;
  createdAt: string;
  completedAt?: string;
}

export interface UpcomingDeadlineItem {
  id: string;
  kind: "assignment" | "exam" | "task";
  title: string;
  subjectCode?: string;
  dueAt: string;
  daysRemaining: number;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface DashboardMetrics {
  activeSubjectsCount: number;
  overallSyllabusCompletionPct: number;
  todaysTasksCount: number;
  openTasksCount: number;
  completedTasksCount: number;
  upcomingDeadlinesCount: number;
  activeGoalsCount: number;
  averageGoalProgressPct: number;
  activeProjectsCount: number;
  registeredAgentsCount: number;
  pendingApprovalsCount: number;
  recentAgentRunsCount: number;
}
