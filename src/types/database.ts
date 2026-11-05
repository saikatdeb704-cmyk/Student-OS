// ============================================================================
// STUDENT OS — TYPED POSTGRESQL DATABASE INTERFACES (ALL 27 TABLES)
// ============================================================================
// Maps 1:1 to the approved Supabase PostgreSQL schema in:
// - supabase/migrations/0001_initial_schema.sql
// - supabase/migrations/0002_seed_agents.sql
// - supabase/migrations/0003_phase1_auth_onboarding.sql
// - supabase/migrations/0004_phase2_schema_constraints_rls_triggers.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 1. profiles
export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  institution: string | null;
  degree: string | null;
  department: string | null;
  academic_year: string | null;
  semester: number | null;
  career_goal: string | null;
  career_interests: string[];
  learning_goals: string | null;
  preferred_language: string | null;
  persona:
    | "confused_fresher"
    | "ambitious_builder"
    | "overwhelmed_organizer"
    | "research_explorer"
    | null;
  timezone: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// 2. user_preferences
export interface UserPreferencesRow {
  user_id: string;
  theme: "light" | "dark" | "system";
  language: string;
  voice_enabled: boolean;
  notifications_enabled: boolean;
  daily_study_hours: number;
  preferences: Json;
  updated_at: string;
}

// 3. agents
export interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  department:
    | "executive"
    | "academic"
    | "career"
    | "productivity"
    | "support"
    | "intelligence";
  system_prompt: string | null;
  capabilities: string[];
  input_schema: Json;
  output_schema: Json;
  allowed_tools: string[];
  enabled: boolean;
  version: number;
  created_at: string;
}

// 4. conversations
export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

// 5. messages
export interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  metadata: Json;
  created_at: string;
}

// 6. agent_runs
export interface AgentRunRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  status:
    | "pending"
    | "planning"
    | "running"
    | "waiting_for_approval"
    | "completed"
    | "failed"
    | "cancelled"
    | "needs_input";
  objective: string;
  plan: Json;
  result: Json | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// 7. agent_tasks
export interface AgentTaskRow {
  id: string;
  run_id: string;
  agent_id: string;
  parent_task_id: string | null;
  objective: string;
  input: Json;
  output: Json | null;
  status:
    | "pending"
    | "running"
    | "waiting_for_approval"
    | "completed"
    | "failed"
    | "needs_input";
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// 8. agent_messages
export interface AgentMessageRow {
  id: string;
  run_id: string;
  task_id: string | null;
  sender_agent_id: string | null;
  recipient_agent_id: string | null;
  message_type: string;
  content: Json;
  created_at: string;
}

// 9. courses
export interface CourseRow {
  id: string;
  user_id: string;
  name: string;
  academic_year: string | null;
  semester: number | null;
  created_at: string;
  updated_at: string;
}

// 10. subjects
export interface SubjectRow {
  id: string;
  course_id: string;
  name: string;
  code: string | null;
  credits: number | null;
  created_at: string;
  updated_at: string;
}

// 11. syllabus_topics
export interface SyllabusTopicRow {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  unit_number: number | null;
  completion_status:
    | "not_started"
    | "in_progress"
    | "completed"
    | "needs_revision";
  created_at: string;
  updated_at: string;
}

// 12. assignments
export interface AssignmentRow {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "in_progress" | "submitted" | "overdue";
  created_at: string;
  updated_at: string;
}

// 13. exams
export interface ExamRow {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  exam_at: string | null;
  created_at: string;
  updated_at: string;
}

// 14. goals
export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category:
    | "academic"
    | "career"
    | "skill"
    | "project"
    | "finance"
    | "wellbeing";
  target_date: string | null;
  progress: number;
  status: "active" | "completed" | "paused" | "archived";
  created_at: string;
  updated_at: string;
}

// 15. tasks
export interface TaskRow {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  due_at: string | null;
  source_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

// 16. study_plans
export interface StudyPlanRow {
  id: string;
  user_id: string;
  title: string;
  plan_data: Json;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

// 17. study_sessions
export interface StudySessionRow {
  id: string;
  user_id: string;
  study_plan_id: string | null;
  subject_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
}

// 18. skills
export interface SkillRow {
  id: string;
  name: string;
  category: string | null;
}

// 19. student_skills
export interface StudentSkillRow {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  created_at: string;
}

// 20. projects
export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  technology_stack: string[];
  status: "planning" | "in_progress" | "completed" | "shipped";
  repository_url: string | null;
  created_at: string;
  updated_at: string;
}

// 21. opportunities
export interface OpportunityRow {
  id: string;
  user_id: string;
  title: string;
  organisation: string | null;
  opportunity_type:
    | "internship"
    | "scholarship"
    | "hackathon"
    | "competition"
    | "fellowship"
    | null;
  source_url: string;
  deadline: string | null;
  last_checked_at: string;
  verification_status: "unverified" | "verified" | "expired";
  status: "saved" | "preparing" | "applied" | "archived";
  created_at: string;
  updated_at: string;
}

// 22. documents
export interface DocumentRow {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  summary: string | null;
  processing_status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}

// 23. memory_records
export interface MemoryRecordRow {
  id: string;
  user_id: string;
  category: string;
  content: string;
  embedding: number[] | null;
  review_status?: "pending_review" | "verified" | "archived";
  importance_score?: number;
  content_hash?: string;
  source_type?:
    | "manual"
    | "onboarding"
    | "conversation"
    | "agent_decision"
    | "document";
  metadata: Json;
  created_at: string;
  updated_at?: string;
}

// 24. approvals
export interface ApprovalRow {
  id: string;
  user_id: string;
  run_id: string | null;
  action_type: string;
  action_payload: Json;
  action_classification?: "automatic" | "approval_required" | "restricted";
  idempotency_key?: string | null;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  expires_at: string | null;
  decided_at: string | null;
  cancellation_reason?: string | null;
  executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// 25. notifications
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "info" | "approval" | "deadline" | "agent_complete" | "warning";
  read_at: string | null;
  created_at: string;
}

// 26. usage_records
export interface UsageRecordRow {
  id: string;
  user_id: string;
  agent_id: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

// 27. audit_logs
export interface AuditLogRow {
  id: string;
  user_id: string | null;
  actor_type: "student" | "ceo" | "agent" | "system";
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow };
      user_preferences: { Row: UserPreferencesRow };
      agents: { Row: AgentRow };
      conversations: { Row: ConversationRow };
      messages: { Row: MessageRow };
      agent_runs: { Row: AgentRunRow };
      agent_tasks: { Row: AgentTaskRow };
      agent_messages: { Row: AgentMessageRow };
      courses: { Row: CourseRow };
      subjects: { Row: SubjectRow };
      syllabus_topics: { Row: SyllabusTopicRow };
      assignments: { Row: AssignmentRow };
      exams: { Row: ExamRow };
      goals: { Row: GoalRow };
      tasks: { Row: TaskRow };
      study_plans: { Row: StudyPlanRow };
      study_sessions: { Row: StudySessionRow };
      skills: { Row: SkillRow };
      student_skills: { Row: StudentSkillRow };
      projects: { Row: ProjectRow };
      opportunities: { Row: OpportunityRow };
      documents: { Row: DocumentRow };
      memory_records: { Row: MemoryRecordRow };
      approvals: { Row: ApprovalRow };
      notifications: { Row: NotificationRow };
      usage_records: { Row: UsageRecordRow };
      audit_logs: { Row: AuditLogRow };
    };
  };
}

export const ALL_27_TABLE_NAMES: Array<keyof Database["public"]["Tables"]> = [
  "profiles",
  "user_preferences",
  "agents",
  "conversations",
  "messages",
  "agent_runs",
  "agent_tasks",
  "agent_messages",
  "courses",
  "subjects",
  "syllabus_topics",
  "assignments",
  "exams",
  "goals",
  "tasks",
  "study_plans",
  "study_sessions",
  "skills",
  "student_skills",
  "projects",
  "opportunities",
  "documents",
  "memory_records",
  "approvals",
  "notifications",
  "usage_records",
  "audit_logs",
];

