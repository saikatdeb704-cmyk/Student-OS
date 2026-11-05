import test from "node:test";
import assert from "node:assert/strict";
import { dbStore } from "../src/lib/db/store.ts";
import { getAgentBySlug, getAllAgents } from "../src/lib/agents/registry.ts";
import {
  validateAgentToolPermissions,
  validateAgentResultContract,
} from "../src/lib/agents/orchestrator.ts";

const USER_A = "student-demo-001";
const USER_B = "student-isolation-002";

test("Phase 6A — ACADEMIC Department: Academic, Study, Tutor & Exam Agents + Real DB CRUD & Ownership Isolation", async () => {
  dbStore.resetStateForTesting();

  // 1. Verify all 4 Academic Department agents exist, validate tool permissions, and produce valid structured outputs
  const academicSlugs = ["academic", "study", "tutor", "exam"];
  for (const slug of academicSlugs) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent, `Agent ${slug} must be registered`);
    assert.equal(agent.department, "academic");

    const perm = validateAgentToolPermissions(agent.slug, agent.allowedTools);
    assert.equal(perm.allowed, true, `${slug} permissions must be valid`);

    const runId = `run_test_${slug}_${Date.now()}`;
    const taskId = `task_test_${slug}_${Date.now()}`;
    const output = await agent.execute({
      userId: USER_A,
      runId,
      taskId,
      objective: `Execute ${agent.name} verification scenario for Operating Systems (CS302) and Design & Analysis of Algorithms (CS301)`,
      context: {
        studentName: "Aarav Sharma",
        dailyStudyHours: 3.5,
      },
      constraints: [],
    });

    const contract = validateAgentResultContract(output, slug);
    assert.equal(
      contract.valid,
      true,
      `${slug} output must satisfy structured AgentResult contract`
    );

    const now = new Date().toISOString();
    dbStore.recordRun(
      {
        id: runId,
        userId: USER_A,
        conversationId: "conv-default",
        objective: `Test ${slug}`,
        status: output.status,
        selectedAgents: [slug],
        agentResults: { [slug]: output },
        createdAt: now,
        completedAt: now,
      },
      [
        {
          id: taskId,
          runId,
          agentSlug: slug,
          agentName: agent.name,
          objective: `Test ${slug}`,
          status: output.status,
          summary: output.summary,
          createdAt: now,
          completedAt: now,
        },
      ]
    );
  }

  // 2. Real DB CRUD for Subjects, Syllabus Topics, Assignments, Study Plans & Study Sessions
  const courses = dbStore.getCourses(USER_A);
  assert.ok(courses.length > 0, "User A should have an active course");

  const newSubj = dbStore.createSubject(
    {
      courseId: courses[0].id,
      name: "Statistical Machine Learning",
      code: "CS405",
      credits: 4,
    },
    USER_A
  );
  assert.ok(newSubj, "Subject creation should succeed for owner");

  // Cross-user isolation check: User B cannot add a subject to User A's course
  const crossSubj = dbStore.createSubject(
    {
      courseId: courses[0].id,
      name: "Unauthorized Subject",
      code: "HACK101",
      credits: 4,
    },
    USER_B
  );
  assert.equal(
    crossSubj,
    null,
    "User B must not be able to create subject on User A course"
  );

  // Add 2 syllabus topics and complete 1 -> verify dynamic 50% completion calculation
  const topic1 = dbStore.createSyllabusTopic(
    {
      subjectId: newSubj.id,
      title: "Kernel Ridge Regression & SVMs",
      unitNumber: 1,
    },
    USER_A
  );
  const topic2 = dbStore.createSyllabusTopic(
    {
      subjectId: newSubj.id,
      title: "PAC Learning & VC Dimension",
      unitNumber: 2,
    },
    USER_A
  );
  assert.ok(topic1 && topic2);

  dbStore.updateSyllabusTopicStatus(topic1.id, "completed", USER_A);
  const updatedSubject = dbStore
    .getSubjects(USER_A)
    .find((s) => s.id === newSubj.id);
  assert.equal(
    updatedSubject?.completionPercentage,
    50,
    "Subject completion % must dynamically reflect 1/2 completed syllabus units"
  );

  // Create assignment, study plan, and study session
  const assignment = dbStore.createAssignment(
    {
      subjectId: newSubj.id,
      title: "SVM Dual Formulation Problem Set",
      dueAt: "2026-06-15T23:59:00.000Z",
    },
    USER_A
  );
  assert.ok(assignment);
  const submitted = dbStore.updateAssignmentStatus(
    assignment.id,
    "submitted",
    USER_A
  );
  assert.equal(submitted?.status, "submitted");

  const plan = dbStore.createStudyPlan(
    {
      title: "Mid-Sem High-Yield Revision Plan",
      hoursPerDay: 4,
      startDate: "2026-05-01",
      endDate: "2026-05-15",
    },
    USER_A
  );
  assert.equal(plan.status, "active");

  const session = dbStore.createStudySession(
    {
      subjectId: newSubj.id,
      studyPlanId: plan.id,
      durationMinutes: 50,
      notes: "Completed 50m Pomodoro on Kernel Trick derivations",
    },
    USER_A
  );
  assert.ok(session.id);
});

test("Phase 6B/7A — CAREER Department: Career, Skill, Project & Opportunity Agents + Verified Source URL Rules", async () => {
  dbStore.resetStateForTesting();

  // 1. Execute all 4 Career Department agents and verify structured outputs
  const careerSlugs = ["career", "skill", "project", "opportunity"];
  for (const slug of careerSlugs) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent, `Agent ${slug} must exist`);
    assert.equal(agent.department, "career");

    const perm = validateAgentToolPermissions(agent.slug, agent.allowedTools);
    assert.equal(perm.allowed, true);

    const output = await agent.execute({
      userId: USER_A,
      runId: `run_${slug}`,
      taskId: `task_${slug}`,
      objective: `Execute ${agent.name} roadmap and portfolio alignment for AI Systems Engineering`,
      context: { careerGoal: "AI Systems Engineer" },
      constraints: [],
    });

    const contract = validateAgentResultContract(output, slug);
    assert.equal(contract.valid, true);
  }

  // 2. Upsert Student Skill Matrix
  const skill = dbStore.upsertStudentSkill(
    {
      name: "CUDA Kernel Optimization",
      category: "Systems & GPU",
      proficiency: "intermediate",
    },
    USER_A
  );
  assert.equal(skill.name, "CUDA Kernel Optimization");
  assert.equal(skill.proficiency, "intermediate");

  const upgradedSkill = dbStore.upsertStudentSkill(
    {
      name: "CUDA Kernel Optimization",
      category: "Systems & GPU",
      proficiency: "advanced",
    },
    USER_A
  );
  assert.equal(upgradedSkill.proficiency, "advanced");

  // 3. Portfolio Project Lab CRUD & Ownership Check
  const project = dbStore.createProject(
    {
      title: "Multi-Agent Evaluation Benchmark",
      description: "Deterministic DAG verifier for tool-calling LLM agents",
      techStack: ["TypeScript", "Next.js", "PostgreSQL"],
      status: "planning",
    },
    USER_A
  );
  assert.equal(project.status, "planning");

  const crossProjectUpdate = dbStore.updateProjectStatus(
    project.id,
    "completed",
    USER_B
  );
  assert.equal(
    crossProjectUpdate,
    null,
    "User B cannot mutate User A's portfolio project"
  );

  const ownerProjectUpdate = dbStore.updateProjectStatus(
    project.id,
    "in_progress",
    USER_A
  );
  assert.equal(ownerProjectUpdate?.status, "in_progress");

  // 4. Opportunity Agent Source URL Verification Rule
  const verifiedOpp = dbStore.createOpportunity(
    {
      title: "AI Systems Intern 2026",
      organisation: "DeepMind Research",
      type: "internship",
      sourceUrl: "https://deepmind.google/careers/internships",
      deadline: "2026-07-01T00:00:00.000Z",
    },
    USER_A
  );
  assert.equal(verifiedOpp.verificationStatus, "verified");
  assert.equal(
    verifiedOpp.status,
    "saved",
    "Opportunities default to 'saved' and never falsely claim external application submission"
  );
});

test("Phase 7B — INTELLIGENCE Department: Research & Notes Agents + Knowledge Base Search & Memory Graph", async () => {
  dbStore.resetStateForTesting();

  for (const slug of ["research", "notes"]) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent);

    const perm = validateAgentToolPermissions(agent.slug, agent.allowedTools);
    assert.equal(perm.allowed, true);

    const output = await agent.execute({
      userId: USER_A,
      runId: `run_${slug}`,
      taskId: `task_${slug}`,
      objective:
        "Synthesize Chandy-Lamport distributed snapshot paper into Cornell notes and 5 active-recall flashcards",
      context: {},
      constraints: [],
    });
    assert.equal(validateAgentResultContract(output, slug).valid, true);
  }

  const doc = dbStore.createDocument(
    {
      name: "FlashAttention_2_Hardware_Aware_IO.pdf",
      mimeType: "application/pdf",
      summary:
        "IO-aware exact attention algorithm using SRAM tiling and online softmax.",
    },
    USER_A
  );
  assert.equal(doc.processing_status, "ready");

  const note = dbStore.createMemory(
    {
      category: "cornell_summary",
      content:
        "FlashAttention-2 reduces HBM reads/writes from O(N^2) to O(N) via block-parallel SRAM tiling.",
    },
    USER_A
  );
  assert.equal(note.category, "cornell_summary");

  // Search Knowledge Base across both documents and memories
  const searchHits = dbStore.searchKnowledgeBase("SRAM tiling", USER_A);
  assert.ok(searchHits.documents.some((d) => d.id === doc.id));
  assert.ok(searchHits.memories.some((m) => m.id === note.id));

  // Cross-user isolation on deleteDocument
  assert.equal(dbStore.deleteDocument(doc.id, USER_B), false);
  assert.equal(dbStore.deleteDocument(doc.id, USER_A), true);
});

test("Phase 8A — PRODUCTIVITY & COMMUNICATION Department: Tasks, Goals & Approval-Gated Outreach", async () => {
  dbStore.resetStateForTesting();

  for (const slug of ["productivity", "communication"]) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent);

    const perm = validateAgentToolPermissions(agent.slug, agent.allowedTools);
    assert.equal(perm.allowed, true);

    const output = await agent.execute({
      userId: USER_A,
      runId: `run_${slug}`,
      taskId: `task_${slug}`,
      objective:
        "Prioritize daily tasks and draft research mentorship email to Prof. Subramanian",
      context: {},
      constraints: [],
    });
    assert.equal(validateAgentResultContract(output, slug).valid, true);
  }

  // Task & Goal lifecycle
  const task = dbStore.createTask(
    {
      title: "Complete OS Kernel Paging Lab",
      priority: "critical",
      status: "pending",
    },
    USER_A
  );
  assert.equal(task.status, "pending");
  const completedTask = dbStore.updateTaskStatus(
    task.id,
    "completed",
    USER_A
  );
  assert.equal(completedTask?.status, "completed");

  const goal = dbStore.createGoal(
    {
      title: "Publish Systems Paper at Undergraduate Symposium",
      category: "academic",
      targetDate: "2026-08-15",
      progress: 25,
    },
    USER_A
  );
  const completedGoal = dbStore.updateGoalProgress(goal.id, 100, USER_A);
  assert.equal(completedGoal?.status, "completed");

  // Approval-gated communication workflow
  const approval = dbStore.createApproval(
    {
      runId: "run_comm_test",
      agentSlug: "communication",
      actionType: "send_external_communication_draft",
      title: "Approve Research Mentorship Email to Prof. Subramanian",
      description:
        "External emails require explicit student confirmation before dispatch.",
      payload: { recipient: "Prof. Subramanian" },
    },
    USER_A
  );
  assert.equal(approval.status, "pending");

  // User B cannot approve User A's gated action
  assert.equal(dbStore.decideApproval(approval.id, "approved", USER_B), null);

  const decided = dbStore.decideApproval(approval.id, "approved", USER_A);
  assert.equal(decided?.status, "approved");
});

test("Phase 8B — STUDENT SUPPORT Department: Performance, Finance & Wellbeing Agents + Grounded Metrics", async () => {
  dbStore.resetStateForTesting();

  for (const slug of ["performance", "finance", "wellbeing"]) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent);

    const perm = validateAgentToolPermissions(agent.slug, agent.allowedTools);
    assert.equal(perm.allowed, true);

    const output = await agent.execute({
      userId: USER_A,
      runId: `run_${slug}`,
      taskId: `task_${slug}`,
      objective:
        "Audit weekly academic velocity, monthly student budget runway, and sleep-recovery balance",
      context: {},
      constraints: [],
    });
    assert.equal(validateAgentResultContract(output, slug).valid, true);
  }

  // Finance Ledger mutation
  const initialLedger = dbStore.getFinanceLedger(USER_A);
  const initialCount = initialLedger.expenses.length;
  const updatedLedger = dbStore.addFinanceExpense(
    {
      title: "IEEE Conference Student Registration",
      category: "academics",
      amount: 1200,
    },
    USER_A
  );
  assert.equal(updatedLedger.expenses.length, initialCount + 1);
  assert.equal(
    updatedLedger.expenses[0].title,
    "IEEE Conference Student Registration"
  );

  // Wellbeing Check-in mutation
  const checkin = dbStore.recordWellbeingCheckin(
    {
      energyLevel: 5,
      sleepHours: 8,
      stressLevel: "low",
      notes: "Completed morning revision block and 30m run.",
    },
    USER_A
  );
  assert.equal(checkin.energyLevel, 5);
  assert.equal(checkin.sleepHours, 8);

  // Grounded Performance Metrics verification
  const metrics = dbStore.getDashboardMetrics(getAllAgents().length, USER_A);
  assert.equal(metrics.registeredAgentsCount, 16);
  assert.ok(metrics.activeSubjectsCount >= 1);
});
