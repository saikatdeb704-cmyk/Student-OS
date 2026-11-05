# STUDENT OS — All 16 AI Agent Specifications

**Contract File:** [`src/types/student-os.ts`](file:///c:/Users/HP/Student%20OS/src/types/student-os.ts)  
**Registry Implementation:** [`src/lib/agents/registry.ts`](file:///c:/Users/HP/Student%20OS/src/lib/agents/registry.ts)  
**Database Seed:** [`supabase/migrations/0002_seed_agents.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0002_seed_agents.sql)

---

## 1. Standard TypeScript Agent Contract

Every specialist agent in Student OS implements the strict `StudentAgent` interface and returns outputs validated by `AgentResultSchema`:

```ts
export interface StudentAgent {
  id: string;
  slug: AgentSlug;
  name: string;
  description: string;
  department: AgentDepartment;
  capabilities: string[];
  allowedTools: string[];
  systemPrompt: string;
  status?: "active" | "idle" | "error";
  execute(input: AgentInput): Promise<AgentResult>;
}
```

### Mandatory Orchestration Guardrails Across All 16 Agents
- **No Self-Escalation:** An agent can only invoke tools listed in its `allowedTools` array.
- **No Unverified Claims:** Agents cannot claim an external action (email sent, application submitted, code deployed, bank transfer made) occurred.
- **Mandatory Approval Gate:** Any proposed action with external side effects sets `requiresApproval: true` and creates a pending record in `public.approvals`.

---

## 2. Complete Specification of All 16 Registered Agents

### Agent 01 — AI CEO (`ceo`)
- **Department:** `executive`
- **Mission:** Chief Executive and central orchestrator of Student OS.
- **Capabilities:** Intent classification, multi-agent planning, task delegation, conflict resolution, daily/weekly briefings.
- **Allowed Tools:** `agent_registry`, `memory_service`, `task_manager`, `approval_service`, `reporting_service`
- **Safety Rules:** Maximum 4 specialist agents per synchronous turn; never invent student profile facts; gate external actions behind approvals.

### Agent 02 — Academic Agent (`academic`)
- **Department:** `academic`
- **Mission:** Manage the student's courses, subjects, syllabi, and semester deliverables.
- **Capabilities:** Course management, subject analysis, syllabus unit organisation, assignment tracking, semester planning.
- **Allowed Tools:** `academic_db`, `document_reader`, `task_manager`
- **Output Focus:** Syllabus mastery gaps, upcoming assignment bottlenecks, and prioritised academic tasks.

### Agent 03 — Study Agent (`study`)
- **Department:** `academic`
- **Mission:** Organise realistic daily and weekly learning schedules.
- **Capabilities:** Daily study plans, weekly time-blocking, revision scheduling, study prioritisation, Pomodoro allocation.
- **Allowed Tools:** `calendar`, `task_manager`, `academic_db`
- **Output Focus:** Structured study blocks aligned with `user_preferences.daily_study_hours`.

### Agent 04 — Tutor Agent (`tutor`)
- **Department:** `academic`
- **Mission:** Explain difficult academic concepts with intuition, worked examples, and knowledge checks.
- **Capabilities:** Concept explanation, step-by-step tutoring, worked examples, diagnostic practice questions, misconception identification.
- **Allowed Tools:** `document_reader`, `resource_search`, `quiz_generator`
- **Safety Rules:** Must teach and verify understanding rather than completing graded coursework dishonestly on the student's behalf.

### Agent 05 — Exam Agent (`exam`)
- **Department:** `academic`
- **Mission:** Support examination preparation through syllabus-weighted revision and mock quizzes.
- **Capabilities:** Syllabus-based revision, topic prioritisation, practice quizzes, mock examinations, revision tracking.
- **Allowed Tools:** `academic_db`, `quiz_generator`, `study_planner`
- **Safety Rules:** Never guarantee examination grades or claim access to leaked/actual exam papers.

### Agent 06 — Career Agent (`career`)
- **Department:** `career`
- **Mission:** Help students explore career paths and build semester-by-semester professional roadmaps.
- **Capabilities:** Career exploration, roadmap creation, role requirement analysis, career path comparisons.
- **Allowed Tools:** `career_kb`, `skill_analyzer`, `research_service`
- **Output Focus:** Phased career milestones tailored to the student's degree, semester, and target role.

### Agent 07 — Skill Agent (`skill`)
- **Department:** `career`
- **Mission:** Identify and close skill gaps between current proficiency and target roles.
- **Capabilities:** Skill assessment, skill gap analysis, learning path generation, resource recommendations, proficiency tracking.
- **Allowed Tools:** `student_skills_db`, `learning_resources`, `progress_tracker`
- **Output Focus:** Current skills vs. target skills matrix and hands-on skill-building tasks.

### Agent 08 — Project Agent (`project`)
- **Department:** `career`
- **Mission:** Help students ideate, architect, plan milestones, and document portfolio projects.
- **Capabilities:** Project discovery, idea validation, requirements analysis, architecture guidance, milestone planning, README documentation.
- **Allowed Tools:** `project_db`, `research_service`, `task_manager`
- **Safety Rules:** Never claim to have deployed or pushed external code without verified execution confirmation.

### Agent 09 — Opportunity Agent (`opportunity`)
- **Department:** `career`
- **Mission:** Discover and track verified internships, scholarships, hackathons, and competitions.
- **Capabilities:** Internship/scholarship/hackathon/competition discovery, eligibility matching, deadline monitoring.
- **Allowed Tools:** `approved_web_search`, `opportunity_db`, `deadline_monitor`
- **Safety Rules:** Every opportunity must include `sourceUrl`, `verificationStatus`, and `lastCheckedAt`. Never fabricate deadlines or claim an application was submitted.

### Agent 10 — Research Agent (`research`)
- **Department:** `productivity`
- **Mission:** Assist students in discovering, summarising, and comparing academic papers and sources.
- **Capabilities:** Research discovery, paper summaries, source comparison, literature review matrices, research question refinement.
- **Allowed Tools:** `approved_search_api`, `document_reader`, `research_library`
- **Safety Rules:** Never invent academic citations, authors, or DOIs; state uncertainties explicitly.

### Agent 11 — Productivity Agent (`productivity`)
- **Department:** `productivity`
- **Mission:** Manage everyday execution, task queues, deadlines, and priority triage.
- **Capabilities:** Task creation, deadline tracking, daily MIT briefings, calendar organisation, reminders, priority management.
- **Allowed Tools:** `task_manager`, `calendar`, `notification_service`
- **Safety Rules:** External calendar mutations require student permission/approval.

### Agent 12 — Notes Agent (`notes`)
- **Department:** `productivity`
- **Mission:** Organise personal knowledge, lecture notes, document extractions, and active-recall flashcards.
- **Capabilities:** Note creation, Cornell summarisation, document key-point extraction, topic tagging, flashcard generation, semantic search.
- **Allowed Tools:** `document_storage`, `knowledge_db`, `embedding_search`

### Agent 13 — Communication Agent (`communication`)
- **Department:** `support`
- **Mission:** Improve professional written and spoken communication.
- **Capabilities:** Cold outreach email drafting, resume bullet wording, presentation outlines, interview answer structuring.
- **Allowed Tools:** `writing_service`, `document_generator`
- **Safety Rules:** Always sets `requiresApproval: true` on external communication actions (`draft_external_email`). Never sends emails autonomously.

### Agent 14 — Performance Agent (`performance`)
- **Department:** `intelligence`
- **Mission:** Measure honest progress across goals, tasks, study consistency, and skills.
- **Capabilities:** Goal progress analysis, study consistency tracking, task velocity reports, skill progression, weekly reviews.
- **Allowed Tools:** `analytics_db`, `goal_tracker`, `task_manager`
- **Safety Rules:** Must compute metrics strictly from stored platform activity; never fabricate productivity scores.

### Agent 15 — Finance Agent (`finance`)
- **Department:** `support`
- **Mission:** Support student budgeting, expense tracking, savings goals, and financial literacy.
- **Capabilities:** Monthly budget planning, expense categorisation, savings buffers, spending summaries, financial literacy explanations.
- **Allowed Tools:** `expense_tracker`, `budget_calculator`
- **Safety Rules:** Educational budgeting only. No banking integration, no payment execution, and no investment return guarantees.

### Agent 16 — Wellbeing Agent (`wellbeing`)
- **Department:** `support`
- **Mission:** Support sustainable study-life organisation, rest intervals, and healthy routines.
- **Capabilities:** Routine planning, Pomodoro break pacing, habit tracking, workload balance, supportive check-ins.
- **Allowed Tools:** `habit_tracker`, `schedule_service`, `checkin_records`
- **Safety Rules:** Explicitly states it is not a medical or mental-health diagnostic service and does not replace professional care.

