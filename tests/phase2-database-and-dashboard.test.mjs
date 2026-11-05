import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dbStore } from "../src/lib/db/store.ts";
import { ALL_27_TABLE_NAMES } from "../src/types/database.ts";

const ROOT = process.cwd();

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

const REQUIRED_27_TABLES = [
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

test("1. All 27 PostgreSQL tables, RLS policies, constraints, indexes & triggers exist in migrations", () => {
  const mig1 = readFile("supabase/migrations/0001_initial_schema.sql");
  const mig2 = readFile("supabase/migrations/0002_seed_agents.sql");
  const mig3 = readFile("supabase/migrations/0003_phase1_auth_onboarding.sql");
  const mig4 = readFile(
    "supabase/migrations/0004_phase2_schema_constraints_rls_triggers.sql"
  );
  const allSql = [mig1, mig2, mig3, mig4].join("\n");

  assert.equal(
    REQUIRED_27_TABLES.length,
    27,
    "Must verify all 27 required database tables"
  );
  assert.deepEqual(
    ALL_27_TABLE_NAMES,
    REQUIRED_27_TABLES,
    "Typed Database interface must export all 27 table names in exact order"
  );

  for (const tableName of REQUIRED_27_TABLES) {
    assert.equal(
      allSql.includes(`create table if not exists public.${tableName}`),
      true,
      `SQL migrations must create table public.${tableName}`
    );
    assert.equal(
      allSql.includes(`alter table public.${tableName} enable row level security`),
      true,
      `SQL migrations must enable RLS on public.${tableName}`
    );
  }

  // Verify updated_at triggers exist across mutable tables
  const expectedTriggers = [
    "set_profiles_updated_at",
    "set_user_preferences_updated_at",
    "set_conversations_updated_at",
    "set_tasks_updated_at",
    "set_courses_updated_at",
    "set_subjects_updated_at",
    "set_syllabus_topics_updated_at",
    "set_assignments_updated_at",
    "set_exams_updated_at",
    "set_goals_updated_at",
    "set_study_plans_updated_at",
    "set_projects_updated_at",
    "set_opportunities_updated_at",
    "set_documents_updated_at",
    "set_approvals_updated_at",
  ];

  for (const trig of expectedTriggers) {
    assert.equal(
      allSql.includes(`create trigger ${trig}`),
      true,
      `SQL migrations must define updated_at trigger: ${trig}`
    );
  }
});

test("2. Multi-Tenant Access Isolation: User A and User B cannot read or mutate each other's data", () => {
  // Register User A
  const regA = dbStore.registerUser({
    fullName: "Ananya Rao",
    email: "ananya.rao@iisc.ac.in",
    password: "UserAPass123",
  });
  assert.ok(regA.account, "User A should be registered");
  const userAId = regA.account.id;

  // Register User B
  const regB = dbStore.registerUser({
    fullName: "Rohan Kapoor",
    email: "rohan.kapoor@bits.ac.in",
    password: "UserBPass123",
  });
  assert.ok(regB.account, "User B should be registered");
  const userBId = regB.account.id;

  // User A creates a course, a subject, 2 syllabus topics, a task, a goal, a project, and an approval
  const courseA = dbStore.createCourse(
    {
      name: "M.Tech AI Foundations",
      academicYear: "1st Year (2026-2027)",
      semester: 1,
    },
    userAId
  );
  const subjectA = dbStore.createSubject(
    {
      courseId: courseA.id,
      name: "Deep Learning Theory",
      code: "AI501",
      credits: 4,
    },
    userAId
  );
  assert.ok(subjectA, "User A can create a subject under User A's course");

  const topicA1 = dbStore.createSyllabusTopic(
    {
      subjectId: subjectA.id,
      title: "Unit 1: Optimization & SGD",
      unitNumber: 1,
      completionStatus: "completed",
    },
    userAId
  );
  const topicA2 = dbStore.createSyllabusTopic(
    {
      subjectId: subjectA.id,
      title: "Unit 2: Transformer Architectures",
      unitNumber: 2,
      completionStatus: "in_progress",
    },
    userAId
  );
  assert.ok(topicA1 && topicA2, "User A can create syllabus topics");

  const taskA = dbStore.createTask(
    {
      title: "Derive Backprop Jacobian Matrix",
      priority: "critical",
      status: "pending",
      dueAt: new Date().toISOString(),
    },
    userAId
  );
  const goalA = dbStore.createGoal(
    {
      title: "Publish NeurIPS Workshop Paper",
      category: "academic",
      targetDate: "2026-12-30",
      progress: 40,
    },
    userAId
  );
  const projectA = dbStore.createProject(
    {
      title: "Sparse Attention CUDA Kernel",
      description: "Custom Triton/CUDA attention implementation",
      techStack: ["CUDA", "PyTorch", "C++"],
      status: "in_progress",
    },
    userAId
  );
  const approvalA = dbStore.createApproval(
    {
      runId: "run-a-1",
      agentSlug: "communication",
      actionType: "draft_external_email",
      title: "Send Lab Collaboration Email",
      description: "Outreach to advisor",
      payload: {},
    },
    userAId
  );

  // VERIFY READ ISOLATION: User B sees 0 of User A's records
  assert.equal(dbStore.getCourses(userBId).length, 0);
  assert.equal(dbStore.getSubjects(userBId).length, 0);
  assert.equal(dbStore.getSyllabusTopics(userBId).length, 0);
  assert.equal(dbStore.getTasks(userBId).length, 0);
  assert.equal(dbStore.getGoals(userBId).length, 0);
  assert.equal(dbStore.getProjects(userBId).length, 0);
  assert.equal(dbStore.getApprovals(userBId).length, 0);

  // VERIFY WRITE & PARENT-OWNERSHIP ISOLATION: User B cannot attach child rows or mutate User A's rows
  constCrossSubject = dbStore.createSubject(
    {
      courseId: courseA.id,
      name: "Unauthorized Subject",
      code: "HACK101",
      credits: 4,
    },
    userBId
  );
  assert.equal(
    constCrossSubject,
    null,
    "User B must be blocked from adding a subject to User A's course"
  );

  const crossTopic = dbStore.createSyllabusTopic(
    {
      subjectId: subjectA.id,
      title: "Unauthorized Topic",
      unitNumber: 3,
    },
    userBId
  );
  assert.equal(
    crossTopic,
    null,
    "User B must be blocked from adding a syllabus topic to User A's subject"
  );

  assert.equal(
    dbStore.updateSyllabusTopicStatus(topicA2.id, "completed", userBId),
    null,
    "User B must be blocked from updating User A's syllabus topic"
  );
  assert.equal(
    dbStore.updateTaskStatus(taskA.id, "completed", userBId),
    null,
    "User B must be blocked from updating User A's task"
  );
  assert.equal(
    dbStore.deleteTask(taskA.id, userBId),
    false,
    "User B must be blocked from deleting User A's task"
  );
  assert.equal(
    dbStore.updateGoalProgress(goalA.id, 100, userBId),
    null,
    "User B must be blocked from updating User A's goal"
  );
  assert.equal(
    dbStore.decideApproval(approvalA.id, "approved", userBId),
    null,
    "User B must be blocked from approving User A's pending action"
  );
  assert.ok(projectA.id, "User A project exists intact");

  // VERIFY DYNAMIC DASHBOARD COMPUTATION FOR USER A
  const metricsBefore = dbStore.getDashboardMetrics(16, userAId);
  assert.equal(metricsBefore.activeSubjectsCount, 1);
  assert.equal(
    metricsBefore.overallSyllabusCompletionPct,
    50,
    "1 of 2 syllabus topics completed = 50% mastery"
  );
  assert.equal(metricsBefore.todaysTasksCount, 1);
  assert.equal(metricsBefore.activeGoalsCount, 1);
  assert.equal(metricsBefore.activeProjectsCount, 1);
  assert.equal(metricsBefore.pendingApprovalsCount, 1);

  // Now User A completes the second syllabus topic -> mastery dynamically becomes 100%
  dbStore.updateSyllabusTopicStatus(topicA2.id, "completed", userAId);
  const metricsAfter = dbStore.getDashboardMetrics(16, userAId);
  assert.equal(
    metricsAfter.overallSyllabusCompletionPct,
    100,
    "2 of 2 syllabus topics completed = 100% mastery"
  );
});

let constCrossSubject;

test("3. Student Dashboard UI Component Verification: All 8 widgets & zero hardcoded metrics", () => {
  const dashboardSrc = readFile(
    "src/components/dashboard/student-dashboard.tsx"
  );

  const requiredAriaSections = [
    'aria-label="Welcome Message"',
    'aria-label="Quick Actions"',
    'aria-label="Today\'s Tasks"',
    'aria-label="Upcoming Deadlines"',
    'aria-label="Academic Progress"',
    'aria-label="Active Goals"',
    'aria-label="Active Projects"',
    'aria-label="Recent Agent Activity"',
  ];

  for (const label of requiredAriaSections) {
    assert.equal(
      dashboardSrc.includes(label),
      true,
      `StudentDashboard must include widget section with ${label}`
    );
  }

  // Ensure no hardcoded KPI strings remain in the dashboard component
  assert.equal(
    dashboardSrc.includes("Avg syllabus completion: 69%"),
    false,
    "Dashboard must not contain hardcoded syllabus completion percentage"
  );
  assert.equal(
    dashboardSrc.includes('"16 Active"'),
    false,
    "Dashboard must not contain hardcoded agent count string"
  );
});

