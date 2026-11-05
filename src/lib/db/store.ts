import type {
  ActionClassification,
  AgentBusMessage,
  AgentRunRecord,
  AgentTaskRecord,
  ApprovalItem,
  ApprovalStatus,
  AssignmentItem,
  ChatMessageItem,
  ConversationItem,
  CourseItem,
  DashboardMetrics,
  ExamItem,
  ExecutionStatus,
  GoalItem,
  OnboardingProfileInput,
  OpportunityItem,
  ProjectItem,
  StudentProfile,
  SubjectItem,
  SyllabusTopicItem,
  TaskItem,
  UpcomingDeadlineItem,
} from "@/types/student-os";
import type {
  AgentMessageRow,
  AuditLogRow,
  ConversationRow,
  DocumentRow,
  MemoryRecordRow,
  MessageRow,
  NotificationRow,
  SkillRow,
  StudentSkillRow,
  StudyPlanRow,
  StudySessionRow,
  UsageRecordRow,
  UserPreferencesRow,
} from "@/types/database";
import {
  computeContentHash,
  findDuplicateMemory,
  generateEmbedding768,
  retrieveAndScoreKnowledge,
  type ScoredDocumentItem,
  type ScoredMemoryRecord,
} from "../memory/engine.ts";
import crypto from "node:crypto";

export function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, "student_os_auth_salt_2026", 10000, 32, "sha256")
    .toString("hex");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const computed = hashPassword(password);
  if (computed.length === storedHash.length) {
    try {
      if (
        crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash))
      ) {
        return true;
      }
    } catch {
      // Fall through
    }
  }
  return password === storedHash;
}

export interface StoredUserAccount {
  id: string;
  email: string;
  passwordHash: string;
  recoveryToken?: string;
  recoveryExpiresAt?: number;
  profile: StudentProfile;
}

interface RelationalDatabaseState {
  activeUserId: string;
  usersByEmail: Record<string, StoredUserAccount>;
  usersById: Record<string, StoredUserAccount>;

  // All 27 PostgreSQL Tables represented with strict tenant & parent FKs
  userPreferences: Record<string, UserPreferencesRow>;
  conversations: ConversationRow[];
  messages: MessageRow[];
  agentRuns: AgentRunRecord[];
  agentTasks: AgentTaskRecord[];
  agentMessages: AgentMessageRow[];
  courses: CourseItem[];
  subjects: Array<{
    id: string;
    courseId: string;
    name: string;
    code: string;
    credits: number;
    createdAt: string;
    updatedAt: string;
  }>;
  syllabusTopics: SyllabusTopicItem[];
  assignments: AssignmentItem[];
  exams: ExamItem[];
  goals: GoalItem[];
  tasks: TaskItem[];
  studyPlans: StudyPlanRow[];
  studySessions: StudySessionRow[];
  skills: SkillRow[];
  studentSkills: StudentSkillRow[];
  projects: ProjectItem[];
  opportunities: OpportunityItem[];
  documents: DocumentRow[];
  memories: MemoryRecordRow[];
  approvals: ApprovalItem[];
  notifications: NotificationRow[];
  usageRecords: UsageRecordRow[];
  auditLogs: AuditLogRow[];
}

const DEMO_USER_ID = "student-demo-001";
const nowIso = () => new Date().toISOString();
const daysFromNowIso = (days: number) =>
  new Date(Date.now() + 86400000 * days).toISOString();

const defaultDemoProfile: StudentProfile = {
  id: DEMO_USER_ID,
  email: "aarav.sharma@iitd.ac.in",
  fullName: "Aarav Sharma",
  country: "India",
  institution: "Indian Institute of Technology (IIT) Delhi",
  degree: "B.Tech",
  department: "Computer Science & Engineering",
  academicYear: "3rd Year (2026-2027)",
  semester: 5,
  careerInterests: [
    "AI Systems Engineering",
    "Full-Stack Software Development",
    "Distributed Systems",
  ],
  learningGoals:
    "Master Data Structures & Algorithms, Operating Systems concurrency, and ship 2 production AI portfolio projects before internship placements.",
  preferredLanguage: "English",
  timezone: "Asia/Kolkata",
  careerGoal: "AI Systems & Full-Stack Software Engineer",
  persona: "ambitious_builder",
  dailyStudyHours: 3.5,
  onboardingCompleted: true,
  createdAt: daysFromNowIso(-14),
  updatedAt: nowIso(),
};

const demoAccount: StoredUserAccount = {
  id: defaultDemoProfile.id,
  email: defaultDemoProfile.email,
  passwordHash: hashPassword("StudentOS123"),
  profile: defaultDemoProfile,
};

const initialRelationalState: RelationalDatabaseState = {
  activeUserId: DEMO_USER_ID,
  usersByEmail: {
    [defaultDemoProfile.email.toLowerCase()]: demoAccount,
  },
  usersById: {
    [DEMO_USER_ID]: demoAccount,
  },
  userPreferences: {
    [DEMO_USER_ID]: {
      user_id: DEMO_USER_ID,
      theme: "light",
      language: "English",
      voice_enabled: true,
      notifications_enabled: true,
      daily_study_hours: 3.5,
      preferences: {},
      updated_at: nowIso(),
    },
  },
  conversations: [
    {
      id: "conv-default",
      user_id: DEMO_USER_ID,
      title: "Semester 5 Weekly Plan & Internship Strategy",
      status: "active",
      created_at: daysFromNowIso(-3),
      updated_at: nowIso(),
    },
  ],
  messages: [
    {
      id: "msg-seed-1",
      conversation_id: "conv-default",
      user_id: DEMO_USER_ID,
      role: "assistant",
      content:
        "Welcome to Student OS. Your Semester 5 courses, syllabus units, assignments, and exams are synced.",
      metadata: {},
      created_at: daysFromNowIso(-3),
    },
  ],
  courses: [
    {
      id: "course-sem5-cse",
      userId: DEMO_USER_ID,
      name: "B.Tech CSE — Semester 5 Core Curriculum",
      academicYear: "3rd Year (2026-2027)",
      semester: 5,
      createdAt: daysFromNowIso(-30),
      updatedAt: nowIso(),
    },
  ],
  subjects: [
    {
      id: "subj-cs301",
      courseId: "course-sem5-cse",
      name: "Data Structures & Algorithms II",
      code: "CS301",
      credits: 4,
      createdAt: daysFromNowIso(-30),
      updatedAt: nowIso(),
    },
    {
      id: "subj-cs302",
      courseId: "course-sem5-cse",
      name: "Operating Systems & Concurrency",
      code: "CS302",
      credits: 4,
      createdAt: daysFromNowIso(-30),
      updatedAt: nowIso(),
    },
    {
      id: "subj-cs303",
      courseId: "course-sem5-cse",
      name: "Database Management Systems",
      code: "CS303",
      credits: 3,
      createdAt: daysFromNowIso(-30),
      updatedAt: nowIso(),
    },
    {
      id: "subj-cs304",
      courseId: "course-sem5-cse",
      name: "Foundations of Machine Learning",
      code: "CS304",
      credits: 4,
      createdAt: daysFromNowIso(-30),
      updatedAt: nowIso(),
    },
  ],
  syllabusTopics: [
    // CS301: 3 of 4 units completed (75%)
    {
      id: "top-cs301-1",
      subjectId: "subj-cs301",
      title: "Unit 1: Balanced Search Trees & Skip Lists",
      unitNumber: 1,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-25),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs301-2",
      subjectId: "subj-cs301",
      title: "Unit 2: Dynamic Programming & Amortized Analysis",
      unitNumber: 2,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-20),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs301-3",
      subjectId: "subj-cs301",
      title: "Unit 3: Shortest Paths & Minimum Spanning Trees",
      unitNumber: 3,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-10),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs301-4",
      subjectId: "subj-cs301",
      title: "Unit 4: Network Flows & NP-Completeness",
      unitNumber: 4,
      completionStatus: "in_progress",
      createdAt: daysFromNowIso(-5),
      updatedAt: nowIso(),
    },
    // CS302: 2 of 4 units completed (50%)
    {
      id: "top-cs302-1",
      subjectId: "subj-cs302",
      title: "Unit 1: Process Scheduling & System Calls",
      unitNumber: 1,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-25),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs302-2",
      subjectId: "subj-cs302",
      title: "Unit 2: Mutexes, Semaphores & Deadlock Prevention",
      unitNumber: 2,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-15),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs302-3",
      subjectId: "subj-cs302",
      title: "Unit 3: Virtual Memory & Page Replacement",
      unitNumber: 3,
      completionStatus: "in_progress",
      createdAt: daysFromNowIso(-7),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs302-4",
      subjectId: "subj-cs302",
      title: "Unit 4: File Systems & I/O Subsystems",
      unitNumber: 4,
      completionStatus: "not_started",
      createdAt: daysFromNowIso(-7),
      updatedAt: nowIso(),
    },
    // CS303: 3 of 3 units completed (100%)
    {
      id: "top-cs303-1",
      subjectId: "subj-cs303",
      title: "Unit 1: Relational Algebra & SQL Normalisation",
      unitNumber: 1,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-25),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs303-2",
      subjectId: "subj-cs303",
      title: "Unit 2: B+ Tree Indexing & Query Cost Estimation",
      unitNumber: 2,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-15),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs303-3",
      subjectId: "subj-cs303",
      title: "Unit 3: ACID Transactions & MVCC Isolation",
      unitNumber: 3,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-5),
      updatedAt: nowIso(),
    },
    // CS304: 2 of 4 units completed (50%)
    {
      id: "top-cs304-1",
      subjectId: "subj-cs304",
      title: "Unit 1: Linear Models, Regularisation & Cross-Validation",
      unitNumber: 1,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-22),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs304-2",
      subjectId: "subj-cs304",
      title: "Unit 2: Support Vector Machines & Kernel Methods",
      unitNumber: 2,
      completionStatus: "completed",
      createdAt: daysFromNowIso(-12),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs304-3",
      subjectId: "subj-cs304",
      title: "Unit 3: Neural Networks & Backpropagation",
      unitNumber: 3,
      completionStatus: "in_progress",
      createdAt: daysFromNowIso(-4),
      updatedAt: nowIso(),
    },
    {
      id: "top-cs304-4",
      subjectId: "subj-cs304",
      title: "Unit 4: Unsupervised Clustering & Dimensionality Reduction",
      unitNumber: 4,
      completionStatus: "not_started",
      createdAt: daysFromNowIso(-4),
      updatedAt: nowIso(),
    },
  ],
  assignments: [
    {
      id: "asgn-201",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs302",
      subjectCode: "CS302",
      title: "Kernel Page Replacement Simulator (LRU vs Clock)",
      description: "Submit C++ source code and page-fault ratio benchmark report.",
      dueAt: daysFromNowIso(2),
      status: "in_progress",
      createdAt: daysFromNowIso(-5),
      updatedAt: nowIso(),
    },
    {
      id: "asgn-202",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs301",
      subjectCode: "CS301",
      title: "Problem Set 4: Max-Flow Min-Cut & Bipartite Matching",
      description: "Solve 5 algorithmic proofs and submit complexity analysis.",
      dueAt: daysFromNowIso(4),
      status: "pending",
      createdAt: daysFromNowIso(-3),
      updatedAt: nowIso(),
    },
    {
      id: "asgn-203",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs304",
      subjectCode: "CS304",
      title: "Lab 3: Gradient Descent & Regularisation on Tabular Data",
      description: "Jupyter notebook + 2-page error analysis.",
      dueAt: daysFromNowIso(6),
      status: "pending",
      createdAt: daysFromNowIso(-2),
      updatedAt: nowIso(),
    },
  ],
  exams: [
    {
      id: "exam-301",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs301",
      subjectCode: "CS301",
      title: "CS301 Mid-Semester Examination (Units 1–3)",
      examAt: daysFromNowIso(9),
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
    {
      id: "exam-302",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs302",
      subjectCode: "CS302",
      title: "CS302 Operating Systems Concurrency & Paging Quiz",
      examAt: daysFromNowIso(12),
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
    {
      id: "exam-303",
      userId: DEMO_USER_ID,
      subjectId: "subj-cs303",
      subjectCode: "CS303",
      title: "CS303 Database Indexing & Transactions Lab Exam",
      examAt: daysFromNowIso(15),
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
  ],
  goals: [
    {
      id: "goal-1",
      userId: DEMO_USER_ID,
      title: "Achieve 9.0+ SGPA in Semester 5 Core CS Courses",
      description: "Complete all syllabus units 7 days before final exams.",
      category: "academic",
      progress: 72,
      targetDate: "2026-12-15",
      status: "active",
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
    {
      id: "goal-2",
      userId: DEMO_USER_ID,
      title: "Ship 2 Production AI/Systems Portfolio Projects for Summer Internships",
      description: "Include live deployment, pgvector benchmarks, and architecture docs.",
      category: "career",
      progress: 60,
      targetDate: "2026-11-30",
      status: "active",
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
    {
      id: "goal-3",
      userId: DEMO_USER_ID,
      title: "Maintain 3.5h/day Deep Work Study Habit (6 days/week)",
      description: "50/10 Pomodoro blocks tracked via Study & Wellbeing Agents.",
      category: "wellbeing",
      progress: 84,
      targetDate: "2026-12-01",
      status: "active",
      createdAt: daysFromNowIso(-14),
      updatedAt: nowIso(),
    },
  ],
  tasks: [
    {
      id: "task-101",
      userId: DEMO_USER_ID,
      goalId: "goal-1",
      title: "Implement Virtual Memory Page Replacement Lab (CS302)",
      description: "Compare LRU and Clock page replacement policies in C++.",
      priority: "critical",
      status: "in_progress",
      dueAt: daysFromNowIso(0), // Due today
      sourceAgent: "academic",
      createdAt: daysFromNowIso(-2),
      updatedAt: nowIso(),
    },
    {
      id: "task-102",
      userId: DEMO_USER_ID,
      goalId: "goal-1",
      title: "Revise Unit 4: Ford-Fulkerson Max-Flow Proof (CS301)",
      description: "Complete 4 practice problems on residual graphs and augmenting paths.",
      priority: "high",
      status: "pending",
      dueAt: daysFromNowIso(0), // Due today
      sourceAgent: "study",
      createdAt: daysFromNowIso(-1),
      updatedAt: nowIso(),
    },
    {
      id: "task-103",
      userId: DEMO_USER_ID,
      goalId: "goal-2",
      title: "Add pgvector Semantic Search Benchmark to Portfolio Project",
      description: "Document query latency and recall@10 in project README.",
      priority: "medium",
      status: "pending",
      dueAt: daysFromNowIso(3),
      sourceAgent: "project",
      createdAt: daysFromNowIso(-1),
      updatedAt: nowIso(),
    },
    {
      id: "task-104",
      userId: DEMO_USER_ID,
      goalId: "goal-1",
      title: "Complete 45-min Mock Quiz on B+ Trees & Transaction Isolation",
      description: "Closed-book check generated by Exam Agent.",
      priority: "medium",
      status: "completed",
      dueAt: daysFromNowIso(-1),
      sourceAgent: "exam",
      createdAt: daysFromNowIso(-3),
      updatedAt: nowIso(),
    },
  ],
  studyPlans: [
    {
      id: "sp-1",
      user_id: DEMO_USER_ID,
      title: "Semester 5 Mid-Term High-Yield Study Plan",
      plan_data: { hoursPerDay: 3.5, blocksPerDay: 3 },
      start_date: "2026-11-01",
      end_date: "2026-11-15",
      status: "active",
      created_at: daysFromNowIso(-4),
      updated_at: nowIso(),
    },
  ],
  studySessions: [
    {
      id: "ss-1",
      user_id: DEMO_USER_ID,
      study_plan_id: "sp-1",
      subject_id: "subj-cs301",
      started_at: daysFromNowIso(-1),
      ended_at: daysFromNowIso(-1),
      notes: "Completed Dijkstra & Bellman-Ford complexity trace.",
      created_at: daysFromNowIso(-1),
    },
  ],
  skills: [
    { id: "sk-ts", name: "TypeScript", category: "Programming" },
    { id: "sk-pg", name: "PostgreSQL & pgvector", category: "Databases" },
    { id: "sk-cpp", name: "C++20 Systems Programming", category: "Systems" },
    { id: "sk-ml", name: "PyTorch & Machine Learning", category: "AI" },
  ],
  studentSkills: [
    {
      id: "ssk-1",
      user_id: DEMO_USER_ID,
      skill_id: "sk-ts",
      proficiency: "advanced",
      created_at: daysFromNowIso(-10),
    },
    {
      id: "ssk-2",
      user_id: DEMO_USER_ID,
      skill_id: "sk-pg",
      proficiency: "intermediate",
      created_at: daysFromNowIso(-10),
    },
  ],
  projects: [
    {
      id: "proj-1",
      userId: DEMO_USER_ID,
      title: "Distributed Campus Study-Group Matcher & RAG Notes Engine",
      description:
        "Full-stack Next.js + Supabase pgvector platform for semantic lecture search and peer study matching.",
      techStack: ["Next.js", "TypeScript", "Supabase", "pgvector", "Tailwind CSS"],
      status: "in_progress",
      repositoryUrl: "https://github.com/student-demo/campus-rag-engine",
      createdAt: daysFromNowIso(-12),
      updatedAt: nowIso(),
    },
    {
      id: "proj-2",
      userId: DEMO_USER_ID,
      title: "Lightweight Linux Process Profiler CLI",
      description:
        "Systems engineering project tracking per-process syscall latency and memory page faults.",
      techStack: ["C++20", "Linux procfs", "CMake"],
      status: "planning",
      repositoryUrl: "https://github.com/student-demo/linux-proc-profiler",
      createdAt: daysFromNowIso(-6),
      updatedAt: nowIso(),
    },
  ],
  opportunities: [
    {
      id: "opp-1",
      userId: DEMO_USER_ID,
      title: "Google Summer of Code (GSoC) — Open Source Contributor",
      organisation: "Google Open Source",
      type: "internship",
      sourceUrl: "https://summerofcode.withgoogle.com",
      deadline: daysFromNowIso(28),
      lastCheckedAt: nowIso(),
      verificationStatus: "verified",
      status: "preparing",
      createdAt: daysFromNowIso(-7),
      updatedAt: nowIso(),
    },
    {
      id: "opp-2",
      userId: DEMO_USER_ID,
      title: "Smart India Hackathon (SIH) — Software Edition",
      organisation: "Ministry of Education Innovation Cell",
      type: "hackathon",
      sourceUrl: "https://www.sih.gov.in",
      deadline: daysFromNowIso(14),
      lastCheckedAt: nowIso(),
      verificationStatus: "verified",
      status: "saved",
      createdAt: daysFromNowIso(-5),
      updatedAt: nowIso(),
    },
    {
      id: "opp-3",
      userId: DEMO_USER_ID,
      title: "Reliance Foundation Undergraduate Scholarship",
      organisation: "Reliance Foundation",
      type: "scholarship",
      sourceUrl: "https://www.scholarships.reliancefoundation.org",
      deadline: daysFromNowIso(21),
      lastCheckedAt: nowIso(),
      verificationStatus: "verified",
      status: "saved",
      createdAt: daysFromNowIso(-4),
      updatedAt: nowIso(),
    },
  ],
  documents: [
    {
      id: "doc-1",
      user_id: DEMO_USER_ID,
      name: "CS302_Operating_Systems_Syllabus.pdf",
      storage_path: `${DEMO_USER_ID}/CS302_Operating_Systems_Syllabus.pdf`,
      mime_type: "application/pdf",
      summary: "4-unit syllabus covering processes, concurrency, paging, and file systems.",
      processing_status: "ready",
      created_at: daysFromNowIso(-10),
      updated_at: nowIso(),
    },
  ],
  memories: [
    {
      id: "mem-1",
      user_id: DEMO_USER_ID,
      category: "student_preference",
      content:
        "Prefers 50/10 Pomodoro blocks with morning theory and evening coding labs in Asia/Kolkata timezone (3.5h/day).",
      embedding: generateEmbedding768(
        "Prefers 50/10 Pomodoro blocks with morning theory and evening coding labs in Asia/Kolkata timezone (3.5h/day)."
      ),
      review_status: "verified",
      importance_score: 0.92,
      content_hash: computeContentHash(
        "Prefers 50/10 Pomodoro blocks with morning theory and evening coding labs in Asia/Kolkata timezone (3.5h/day)."
      ),
      source_type: "onboarding",
      metadata: { domain: "preferences" },
      created_at: daysFromNowIso(-7),
      updated_at: daysFromNowIso(-7),
    },
    {
      id: "mem-2",
      user_id: DEMO_USER_ID,
      category: "academic_context",
      content:
        "B.Tech Computer Science Semester 5 at IIT Delhi. Active coursework: CS301 Algorithms, CS302 Operating Systems, and CS303 Database Systems.",
      embedding: generateEmbedding768(
        "B.Tech Computer Science Semester 5 at IIT Delhi. Active coursework: CS301 Algorithms, CS302 Operating Systems, and CS303 Database Systems."
      ),
      review_status: "verified",
      importance_score: 0.95,
      content_hash: computeContentHash(
        "B.Tech Computer Science Semester 5 at IIT Delhi. Active coursework: CS301 Algorithms, CS302 Operating Systems, and CS303 Database Systems."
      ),
      source_type: "onboarding",
      metadata: { semester: 5 },
      created_at: daysFromNowIso(-6),
      updated_at: daysFromNowIso(-6),
    },
    {
      id: "mem-3",
      user_id: DEMO_USER_ID,
      category: "career_goal",
      content:
        "Targeting Summer 2026 AI Systems Engineering and Distributed Systems internships with focus on PyTorch, TypeScript, and RAG evaluation.",
      embedding: generateEmbedding768(
        "Targeting Summer 2026 AI Systems Engineering and Distributed Systems internships with focus on PyTorch, TypeScript, and RAG evaluation."
      ),
      review_status: "verified",
      importance_score: 0.94,
      content_hash: computeContentHash(
        "Targeting Summer 2026 AI Systems Engineering and Distributed Systems internships with focus on PyTorch, TypeScript, and RAG evaluation."
      ),
      source_type: "onboarding",
      metadata: { targetRole: "AI Systems Engineer" },
      created_at: daysFromNowIso(-5),
      updated_at: daysFromNowIso(-5),
    },
    {
      id: "mem-4",
      user_id: DEMO_USER_ID,
      category: "active_project",
      content:
        "Building Campus Knowledge Graph & RAG Engine using Next.js, TypeScript, Supabase pgvector, and Gemini API.",
      embedding: generateEmbedding768(
        "Building Campus Knowledge Graph & RAG Engine using Next.js, TypeScript, Supabase pgvector, and Gemini API."
      ),
      review_status: "verified",
      importance_score: 0.9,
      content_hash: computeContentHash(
        "Building Campus Knowledge Graph & RAG Engine using Next.js, TypeScript, Supabase pgvector, and Gemini API."
      ),
      source_type: "agent_decision",
      metadata: { projectId: "proj-1" },
      created_at: daysFromNowIso(-4),
      updated_at: daysFromNowIso(-4),
    },
    {
      id: "mem-5",
      user_id: DEMO_USER_ID,
      category: "previous_decision",
      content:
        "Decided to prioritize CS301 Graph Algorithms lab before starting the Smart India Hackathon prototype sprint.",
      embedding: generateEmbedding768(
        "Decided to prioritize CS301 Graph Algorithms lab before starting the Smart India Hackathon prototype sprint."
      ),
      review_status: "verified",
      importance_score: 0.86,
      content_hash: computeContentHash(
        "Decided to prioritize CS301 Graph Algorithms lab before starting the Smart India Hackathon prototype sprint."
      ),
      source_type: "agent_decision",
      metadata: { decidedBy: "ceo_and_student" },
      created_at: daysFromNowIso(-3),
      updated_at: daysFromNowIso(-3),
    },
    {
      id: "mem-6",
      user_id: DEMO_USER_ID,
      category: "conversation_summary",
      content:
        "CEO Session Summary: Aligned Semester 5 exam schedule with 7-day study sprint and queued professor research mentorship outreach for approval.",
      embedding: generateEmbedding768(
        "CEO Session Summary: Aligned Semester 5 exam schedule with 7-day study sprint and queued professor research mentorship outreach for approval."
      ),
      review_status: "verified",
      importance_score: 0.85,
      content_hash: computeContentHash(
        "CEO Session Summary: Aligned Semester 5 exam schedule with 7-day study sprint and queued professor research mentorship outreach for approval."
      ),
      source_type: "conversation",
      metadata: { conversationId: "convo-seed-1" },
      created_at: daysFromNowIso(-2),
      updated_at: daysFromNowIso(-2),
    },
    {
      id: "mem-7",
      user_id: DEMO_USER_ID,
      category: "document_knowledge",
      content:
        "Document Digest (CS302_Operating_Systems_Syllabus.pdf): Covers process scheduling, mutex/semaphore concurrency, virtual memory paging, and journaled file systems.",
      embedding: generateEmbedding768(
        "Document Digest (CS302_Operating_Systems_Syllabus.pdf): Covers process scheduling, mutex/semaphore concurrency, virtual memory paging, and journaled file systems."
      ),
      review_status: "verified",
      importance_score: 0.88,
      content_hash: computeContentHash(
        "Document Digest (CS302_Operating_Systems_Syllabus.pdf): Covers process scheduling, mutex/semaphore concurrency, virtual memory paging, and journaled file systems."
      ),
      source_type: "document",
      metadata: { documentId: "doc-1" },
      created_at: daysFromNowIso(-1),
      updated_at: daysFromNowIso(-1),
    },
  ],
  approvals: [
    {
      id: "appr-201",
      userId: DEMO_USER_ID,
      runId: "run-initial-01",
      agentSlug: "communication",
      actionType: "draft_external_email",
      title: "Send Research Internship Inquiry to Prof. R. Verma (AI Lab)",
      description:
        "Communication Agent drafted a 125-word outreach email attaching your CS304 coursework and RAG portfolio project. Requires your explicit approval before marking ready for dispatch.",
      payload: {
        recipient: "r.verma@cse.iitd.ac.in",
        subject: "Undergraduate Research Inquiry — Semester 5 CSE (Aarav Sharma)",
      },
      status: "pending",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ],
  agentRuns: [
    {
      id: "run-initial-01",
      userId: DEMO_USER_ID,
      conversationId: "conv-default",
      objective:
        "Prepare my weekly study plan for CS301 & CS302 and draft an internship outreach email.",
      status: "waiting_for_approval",
      selectedAgents: ["academic", "study", "communication"],
      agentResults: {},
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 3 + 4000).toISOString(),
    },
    {
      id: "run-initial-02",
      userId: DEMO_USER_ID,
      conversationId: "conv-default",
      objective:
        "Audit my Campus RAG Engine project milestones and generate a timed DBMS quiz.",
      status: "completed",
      selectedAgents: ["project", "exam"],
      agentResults: {},
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 8 + 3200).toISOString(),
    },
  ],
  agentTasks: [
    {
      id: "atask-1",
      runId: "run-initial-01",
      agentSlug: "academic",
      agentName: "Academic Agent",
      objective: "Analyse CS301 & CS302 syllabus completion and upcoming lab deadlines",
      status: "completed",
      summary: "Identified CS302 Unit 3 Paging Lab due in 48 hours and CS301 Unit 4 in progress.",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 3 + 1200).toISOString(),
    },
    {
      id: "atask-2",
      runId: "run-initial-01",
      agentSlug: "study",
      agentName: "Study Agent",
      objective: "Allocate 3.5h/day study blocks across CS302 lab and CS301 graph theory",
      status: "completed",
      summary: "Scheduled morning 90-min CS301 block and evening 90-min CS302 C++ lab block.",
      createdAt: new Date(Date.now() - 3600000 * 3 + 1200).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 3 + 2500).toISOString(),
    },
    {
      id: "atask-3",
      runId: "run-initial-01",
      agentSlug: "communication",
      agentName: "Communication Agent",
      objective: "Draft outreach email to Prof. R. Verma for AI Lab research internship",
      status: "waiting_for_approval",
      summary: "Drafted 125-word inquiry email; gated behind Approval Service.",
      createdAt: new Date(Date.now() - 3600000 * 3 + 2500).toISOString(),
    },
  ],
  agentMessages: [],
  notifications: [
    {
      id: "notif-1",
      user_id: DEMO_USER_ID,
      title: "Approval Required: Research Internship Email Draft",
      body: "Communication Agent queued an external email draft for your review.",
      type: "approval",
      read_at: null,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ],
  usageRecords: [],
  auditLogs: [],
};

// Persist store across Next.js hot reloads in development
const globalForStore = globalThis as unknown as {
  studentOSRelationalStore?: RelationalDatabaseState;
};

function getStore(): RelationalDatabaseState {
  if (!globalForStore.studentOSRelationalStore) {
    globalForStore.studentOSRelationalStore = structuredClone(
      initialRelationalState
    );
  }
  return globalForStore.studentOSRelationalStore;
}

function resolveUserId(userId?: string): string {
  const store = getStore();
  return userId || store.activeUserId;
}

export const dbStore = {
  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION & USER ACCOUNT METHODS
  // --------------------------------------------------------------------------
  registerUser(input: {
    fullName: string;
    email: string;
    password: string;
  }): { account?: StoredUserAccount; error?: string } {
    const store = getStore();
    const normalizedEmail = input.email.trim().toLowerCase();

    if (store.usersByEmail[normalizedEmail]) {
      return { error: "An account with this email address already exists." };
    }

    const id = `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = nowIso();

    const profile: StudentProfile = {
      id,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      country: "India",
      institution: "",
      degree: "",
      department: "",
      academicYear: "1st Year (2026-2027)",
      semester: 1,
      careerInterests: [],
      learningGoals: "",
      preferredLanguage: "English",
      timezone: "Asia/Kolkata",
      careerGoal: "",
      persona: "confused_fresher",
      dailyStudyHours: 3,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const account: StoredUserAccount = {
      id,
      email: normalizedEmail,
      passwordHash: hashPassword(input.password),
      profile,
    };

    store.usersByEmail[normalizedEmail] = account;
    store.usersById[id] = account;
    store.userPreferences[id] = {
      user_id: id,
      theme: "light",
      language: "English",
      voice_enabled: true,
      notifications_enabled: true,
      daily_study_hours: 3,
      preferences: {},
      updated_at: now,
    };
    store.activeUserId = id;

    return { account };
  },

  authenticateUser(input: {
    email: string;
    password: string;
  }): { account?: StoredUserAccount; error?: string } {
    const store = getStore();
    const normalizedEmail = input.email.trim().toLowerCase();
    const account = store.usersByEmail[normalizedEmail];

    if (!account || !verifyPassword(input.password, account.passwordHash)) {
      return { error: "Invalid email or password. Please try again." };
    }

    store.activeUserId = account.id;
    return { account };
  },

  createPasswordRecoveryToken(email: string): {
    token?: string;
    account?: StoredUserAccount;
  } {
    const store = getStore();
    const normalizedEmail = email.trim().toLowerCase();
    const account = store.usersByEmail[normalizedEmail];
    if (!account) {
      return {};
    }
    const token = `rec-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    account.recoveryToken = token;
    account.recoveryExpiresAt = Date.now() + 1000 * 60 * 30;
    return { token, account };
  },

  resetPasswordWithToken(input: {
    email: string;
    token: string;
    newPassword: string;
  }): { success: boolean; error?: string } {
    const store = getStore();
    const normalizedEmail = input.email.trim().toLowerCase();
    const account = store.usersByEmail[normalizedEmail];

    if (!account) {
      return { success: false, error: "Account not found for this email." };
    }

    if (
      !account.recoveryToken ||
      account.recoveryToken !== input.token ||
      (account.recoveryExpiresAt && Date.now() > account.recoveryExpiresAt)
    ) {
      return {
        success: false,
        error: "Invalid or expired recovery token. Please request a new link.",
      };
    }

    account.passwordHash = hashPassword(input.newPassword);
    account.recoveryToken = undefined;
    account.recoveryExpiresAt = undefined;
    return { success: true };
  },

  getUserById(userId?: string): StoredUserAccount | undefined {
    const store = getStore();
    const effectiveId = resolveUserId(userId);
    return store.usersById[effectiveId];
  },

  // --------------------------------------------------------------------------
  // 2. PROFILE & ONBOARDING METHODS (RLS SCOPED)
  // --------------------------------------------------------------------------
  getProfile(userId?: string): StudentProfile {
    const account = this.getUserById(userId);
    return account ? account.profile : defaultDemoProfile;
  },

  createProfile(
    profile: Partial<StudentProfile> & { id: string; email?: string }
  ): StudentProfile {
    const store = getStore();
    const id = profile.id;
    const email = (profile.email || `${id}@student-os.local`).toLowerCase();
    const newProfile: StudentProfile = {
      id,
      email,
      fullName: profile.fullName || "Student",
      country: profile.country || "India",
      institution: profile.institution || "University",
      degree: profile.degree || "Undergraduate",
      department: profile.department || "Engineering",
      academicYear: profile.academicYear || "1st Year",
      semester: typeof profile.semester === "number" ? profile.semester : 1,
      careerInterests: Array.isArray(profile.careerInterests)
        ? profile.careerInterests
        : typeof profile.careerInterests === "string"
        ? (profile.careerInterests as string).split(",").map((s) => s.trim())
        : ["Technology"],
      learningGoals: profile.learningGoals || "Build software skills",
      preferredLanguage: profile.preferredLanguage || "English",
      timezone: profile.timezone || "Asia/Kolkata",
      careerGoal: profile.careerGoal || "",
      persona: profile.persona || "ambitious_builder",
      dailyStudyHours: profile.dailyStudyHours || 3,
      onboardingCompleted: profile.onboardingCompleted ?? true,
      createdAt: profile.createdAt || nowIso(),
      updatedAt: profile.updatedAt || nowIso(),
    };
    const account: StoredUserAccount = {
      id,
      email,
      passwordHash: hashPassword("dummy-hash"),
      profile: newProfile,
    };
    store.usersById[id] = account;
    store.usersByEmail[email] = account;
    return newProfile;
  },

  updateProfile(
    input: OnboardingProfileInput,
    userId?: string
  ): StudentProfile {
    const store = getStore();
    const targetId = resolveUserId(userId);
    const account = store.usersById[targetId];
    if (!account) {
      throw new Error("Unauthorized: Cannot update non-existent user profile.");
    }

    const normalizedInterests = Array.isArray(input.careerInterests)
      ? input.careerInterests
      : String(input.careerInterests)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const primaryCareerGoal =
      input.careerGoal?.trim() ||
      normalizedInterests[0] ||
      "Software & AI Engineer";

    const now = nowIso();
    const updated: StudentProfile = {
      ...account.profile,
      fullName: input.fullName.trim(),
      country: input.country.trim(),
      institution: input.institution.trim(),
      degree: input.degree.trim(),
      department: input.department.trim(),
      academicYear: input.academicYear.trim(),
      semester: input.semester,
      careerInterests: normalizedInterests,
      learningGoals: input.learningGoals.trim(),
      preferredLanguage: input.preferredLanguage.trim(),
      timezone: input.timezone.trim(),
      careerGoal: primaryCareerGoal,
      persona: input.persona || "ambitious_builder",
      dailyStudyHours: input.dailyStudyHours ?? 3.5,
      onboardingCompleted: true,
      updatedAt: now,
    };

    account.profile = updated;
    store.userPreferences[targetId] = {
      user_id: targetId,
      theme: "light",
      language: updated.preferredLanguage,
      voice_enabled: true,
      notifications_enabled: true,
      daily_study_hours: updated.dailyStudyHours,
      preferences: {},
      updated_at: now,
    };

    store.memories.unshift({
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: targetId,
      category: "onboarding_profile",
      content: `${updated.fullName} studies ${updated.degree} in ${updated.department} (${updated.academicYear}, Sem ${updated.semester}) at ${updated.institution}, ${updated.country}. Career interests: ${updated.careerInterests.join(
        ", "
      )}. Learning goals: ${updated.learningGoals}.`,
      embedding: null,
      metadata: {},
      created_at: now,
    });

    return updated;
  },

  // --------------------------------------------------------------------------
  // 3. ACADEMIC TABLES (COURSES, SUBJECTS, SYLLABUS_TOPICS, ASSIGNMENTS, EXAMS)
  //    Enforces parent ownership: subjects -> courses.userId, topics -> subjects
  // --------------------------------------------------------------------------
  getCourses(userId?: string): CourseItem[] {
    const uid = resolveUserId(userId);
    return getStore().courses.filter((c) => c.userId === uid);
  },

  createCourse(
    input: { name: string; academicYear: string; semester: number },
    userId?: string
  ): CourseItem {
    const uid = resolveUserId(userId);
    const now = nowIso();
    const course: CourseItem = {
      id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      name: input.name,
      academicYear: input.academicYear,
      semester: input.semester,
      createdAt: now,
      updatedAt: now,
    };
    getStore().courses.push(course);
    return course;
  },

  createSubject(
    input: { courseId: string; name: string; code: string; credits: number },
    userId?: string
  ) {
    const uid = resolveUserId(userId);
    const store = getStore();
    // Parent ownership verification: course must belong to userId
    const parentCourse = store.courses.find(
      (c) => c.id === input.courseId && c.userId === uid
    );
    if (!parentCourse) {
      return null;
    }

    const now = nowIso();
    const subject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseId: input.courseId,
      name: input.name,
      code: input.code,
      credits: input.credits,
      createdAt: now,
      updatedAt: now,
    };
    store.subjects.push(subject);
    return subject;
  },

  createSyllabusTopic(
    input: {
      subjectId: string;
      title: string;
      unitNumber: number;
      completionStatus?: SyllabusTopicItem["completionStatus"];
    },
    userId?: string
  ): SyllabusTopicItem | null {
    const uid = resolveUserId(userId);
    const store = getStore();
    // Grandparent ownership verification: subject -> course.userId === uid
    const subject = store.subjects.find((s) => s.id === input.subjectId);
    if (!subject) return null;
    const course = store.courses.find(
      (c) => c.id === subject.courseId && c.userId === uid
    );
    if (!course) return null;

    const now = nowIso();
    const topic: SyllabusTopicItem = {
      id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId: input.subjectId,
      title: input.title,
      unitNumber: input.unitNumber,
      completionStatus: input.completionStatus || "not_started",
      createdAt: now,
      updatedAt: now,
    };
    store.syllabusTopics.push(topic);
    return topic;
  },

  updateSyllabusTopicStatus(
    topicId: string,
    completionStatus: SyllabusTopicItem["completionStatus"],
    userId?: string
  ): SyllabusTopicItem | null {
    const uid = resolveUserId(userId);
    const store = getStore();
    const topic = store.syllabusTopics.find((t) => t.id === topicId);
    if (!topic) return null;

    const subject = store.subjects.find((s) => s.id === topic.subjectId);
    if (!subject) return null;
    const course = store.courses.find(
      (c) => c.id === subject.courseId && c.userId === uid
    );
    if (!course) return null;

    topic.completionStatus = completionStatus;
    topic.updatedAt = nowIso();
    return topic;
  },

  getSubjects(userId?: string): SubjectItem[] {
    const uid = resolveUserId(userId);
    const store = getStore();
    const ownedCourseIds = new Set(
      store.courses.filter((c) => c.userId === uid).map((c) => c.id)
    );

    const ownedSubjects = store.subjects.filter((s) =>
      ownedCourseIds.has(s.courseId)
    );
    const userAssignments = store.assignments.filter((a) => a.userId === uid);
    const userExams = store.exams.filter((e) => e.userId === uid);

    return ownedSubjects.map((s) => {
      const topics = store.syllabusTopics.filter((t) => t.subjectId === s.id);
      const totalTopicsCount = topics.length;
      const completedTopicsCount = topics.filter(
        (t) => t.completionStatus === "completed"
      ).length;
      const completionPercentage =
        totalTopicsCount > 0
          ? Math.round((completedTopicsCount / totalTopicsCount) * 100)
          : 0;

      const pendingAssignments = userAssignments.filter(
        (a) => a.subjectId === s.id && a.status !== "submitted"
      ).length;

      const upcomingExam = userExams
        .filter((e) => e.subjectId === s.id)
        .sort(
          (a, b) => new Date(a.examAt).getTime() - new Date(b.examAt).getTime()
        )[0];

      return {
        id: s.id,
        courseId: s.courseId,
        name: s.name,
        code: s.code,
        credits: s.credits,
        completionPercentage,
        totalTopicsCount,
        completedTopicsCount,
        nextExamDate: upcomingExam?.examAt,
        pendingAssignments,
      };
    });
  },

  getSyllabusTopics(userId?: string): SyllabusTopicItem[] {
    const uid = resolveUserId(userId);
    const store = getStore();
    const ownedCourseIds = new Set(
      store.courses.filter((c) => c.userId === uid).map((c) => c.id)
    );
    const ownedSubjectIds = new Set(
      store.subjects
        .filter((s) => ownedCourseIds.has(s.courseId))
        .map((s) => s.id)
    );

    return store.syllabusTopics.filter((t) => ownedSubjectIds.has(t.subjectId));
  },

  getAssignments(userId?: string): AssignmentItem[] {
    const uid = resolveUserId(userId);
    return getStore().assignments.filter((a) => a.userId === uid);
  },

  getExams(userId?: string): ExamItem[] {
    const uid = resolveUserId(userId);
    return getStore().exams.filter((e) => e.userId === uid);
  },

  // --------------------------------------------------------------------------
  // 4. TASKS, GOALS, PROJECTS & OPPORTUNITIES (RLS SCOPED BY USER_ID)
  // --------------------------------------------------------------------------
  getTasks(userId?: string): TaskItem[] {
    const uid = resolveUserId(userId);
    return getStore().tasks.filter((t) => t.userId === uid);
  },

  createTask(
    task: Omit<TaskItem, "id" | "createdAt" | "updatedAt" | "userId">,
    userId?: string
  ): TaskItem {
    const store = getStore();
    const uid = resolveUserId(userId);
    const now = nowIso();
    const newTask: TaskItem = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      createdAt: now,
      updatedAt: now,
    };
    store.tasks.unshift(newTask);
    return newTask;
  },

  updateTaskStatus(
    taskId: string,
    status: TaskItem["status"],
    userId?: string
  ): TaskItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    // Strict ownership verification: must match both id and userId
    const item = store.tasks.find((t) => t.id === taskId && t.userId === uid);
    if (!item) return null;
    item.status = status;
    item.updatedAt = nowIso();
    return item;
  },

  deleteTask(taskId: string, userId?: string): boolean {
    const store = getStore();
    const uid = resolveUserId(userId);
    const index = store.tasks.findIndex(
      (t) => t.id === taskId && t.userId === uid
    );
    if (index === -1) return false;
    store.tasks.splice(index, 1);
    return true;
  },

  getGoals(userId?: string): GoalItem[] {
    const uid = resolveUserId(userId);
    return getStore().goals.filter((g) => g.userId === uid);
  },

  createGoal(
    input: {
      title: string;
      description?: string;
      category: GoalItem["category"];
      targetDate: string;
      progress?: number;
    },
    userId?: string
  ): GoalItem {
    const uid = resolveUserId(userId);
    const now = nowIso();
    const goal: GoalItem = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      title: input.title,
      description: input.description,
      category: input.category,
      targetDate: input.targetDate,
      progress: input.progress ?? 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    getStore().goals.unshift(goal);
    return goal;
  },

  updateGoalProgress(
    goalId: string,
    progress: number,
    userId?: string
  ): GoalItem | null {
    const uid = resolveUserId(userId);
    const goal = getStore().goals.find(
      (g) => g.id === goalId && g.userId === uid
    );
    if (!goal) return null;
    goal.progress = Math.max(0, Math.min(100, progress));
    if (goal.progress === 100) {
      goal.status = "completed";
    }
    goal.updatedAt = nowIso();
    return goal;
  },

  getProjects(userId?: string): ProjectItem[] {
    const uid = resolveUserId(userId);
    return getStore().projects.filter((p) => p.userId === uid);
  },

  createProject(
    input: {
      title: string;
      description: string;
      techStack: string[];
      status?: ProjectItem["status"];
      repositoryUrl?: string;
    },
    userId?: string
  ): ProjectItem {
    const uid = resolveUserId(userId);
    const now = nowIso();
    const project: ProjectItem = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      title: input.title,
      description: input.description,
      techStack: input.techStack,
      status: input.status || "planning",
      repositoryUrl: input.repositoryUrl,
      createdAt: now,
      updatedAt: now,
    };
    getStore().projects.unshift(project);
    return project;
  },

  getOpportunities(userId?: string): OpportunityItem[] {
    const uid = resolveUserId(userId);
    return getStore().opportunities.filter((o) => o.userId === uid);
  },

  // --------------------------------------------------------------------------
  // 5. APPROVALS, AGENT RUNS, AGENT TASKS & MEMORIES (RLS SCOPED)
  // --------------------------------------------------------------------------
  getApprovals(userId?: string): ApprovalItem[] {
    const uid = resolveUserId(userId);
    const store = getStore();
    const now = Date.now();
    for (const a of store.approvals) {
      if (a.userId === uid && a.status === "pending" && a.expiresAt) {
        if (new Date(a.expiresAt).getTime() < now) {
          a.status = "expired";
        }
      }
    }
    return store.approvals.filter((a) => a.userId === uid);
  },

  createApproval(
    approval: Omit<ApprovalItem, "id" | "createdAt" | "status" | "userId"> & {
      status?: ApprovalStatus;
      expiresAt?: string;
      classification?: ActionClassification;
      idempotencyKey?: string;
    },
    userId?: string
  ): ApprovalItem {
    const store = getStore();
    const uid = resolveUserId(userId);

    // Duplicate action prevention: Check for existing pending approval with same idempotency key
    if (approval.idempotencyKey) {
      const existing = store.approvals.find(
        (a) =>
          a.userId === uid &&
          a.idempotencyKey === approval.idempotencyKey &&
          a.status === "pending"
      );
      if (existing) {
        if (existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now()) {
          existing.status = "expired";
        } else {
          return existing;
        }
      }
    }

    const newApproval: ApprovalItem = {
      ...approval,
      id: `appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      classification: approval.classification || "approval_required",
      status: approval.status || "pending",
      expiresAt:
        approval.expiresAt ||
        new Date(Date.now() + 86400000 * 1).toISOString(), // 24h default TTL
      createdAt: nowIso(),
    };
    store.approvals.unshift(newApproval);
    return newApproval;
  },

  decideApproval(
    approvalId: string,
    decision: "approved" | "rejected",
    userId?: string
  ): ApprovalItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const item = store.approvals.find(
      (a) => a.id === approvalId && a.userId === uid
    );
    if (!item) return null;
    if (item.status !== "pending") return null;
    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      item.status = "expired";
      return null;
    }
    item.status = decision;
    item.decidedAt = nowIso();
    return item;
  },

  cancelApproval(
    approvalId: string,
    userId?: string,
    reason?: string
  ): ApprovalItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const item = store.approvals.find(
      (a) => a.id === approvalId && a.userId === uid
    );
    if (!item) return null;
    if (item.status !== "pending") return null;
    item.status = "cancelled";
    item.cancellationReason = reason || "Cancelled by student";
    item.decidedAt = nowIso();
    return item;
  },

  consumeApproval(
    approvalId: string,
    userId?: string
  ): ApprovalItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const item = store.approvals.find(
      (a) => a.id === approvalId && a.userId === uid
    );
    if (!item) return null;
    if (item.status !== "approved") return null;
    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      item.status = "expired";
      return null;
    }
    if (item.executedAt) return null; // already executed
    item.executedAt = nowIso();
    return item;
  },

  getRuns(userId?: string): AgentRunRecord[] {
    const uid = resolveUserId(userId);
    return getStore().agentRuns.filter((r) => r.userId === uid);
  },

  getAgentTasks(userId?: string): AgentTaskRecord[] {
    const uid = resolveUserId(userId);
    const store = getStore();
    const ownedRunIds = new Set(
      store.agentRuns.filter((r) => r.userId === uid).map((r) => r.id)
    );
    return store.agentTasks.filter((t) => ownedRunIds.has(t.runId));
  },

  recordRun(
    run: AgentRunRecord,
    delegatedTasks: AgentTaskRecord[] = []
  ): void {
    const store = getStore();
    store.agentRuns.unshift(run);
    for (const task of delegatedTasks) {
      store.agentTasks.unshift(task);
    }
  },

  getMemories(userId?: string): MemoryRecordRow[] {
    const uid = resolveUserId(userId);
    return getStore().memories.filter((m) => m.user_id === uid);
  },

  getNotifications(userId?: string): NotificationRow[] {
    const uid = resolveUserId(userId);
    return getStore().notifications.filter((n) => n.user_id === uid);
  },

  createNotification(
    input: Omit<NotificationRow, "id" | "created_at"> & {
      id?: string;
      created_at?: string;
    },
    userId?: string
  ): NotificationRow {
    const uid = resolveUserId(userId || input.user_id);
    const store = getStore();
    const notification: NotificationRow = {
      id:
        input.id ||
        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      title: input.title,
      body: input.body ?? null,
      type: input.type,
      read_at: input.read_at ?? null,
      created_at: input.created_at || nowIso(),
    };
    store.notifications.unshift(notification);
    return notification;
  },

  // --------------------------------------------------------------------------
  // 6. DYNAMIC DASHBOARD COMPUTATION (ZERO HARDCODED METRICS)
  // --------------------------------------------------------------------------
  getUpcomingDeadlines(userId?: string): UpcomingDeadlineItem[] {
    const uid = resolveUserId(userId);
    const assignments = this.getAssignments(uid).filter(
      (a) => a.status !== "submitted"
    );
    const exams = this.getExams(uid);
    const tasksWithDue = this.getTasks(uid).filter(
      (t) => t.status !== "completed" && t.status !== "cancelled" && t.dueAt
    );

    const nowMs = Date.now();
    const calcDays = (iso: string) =>
      Math.max(0, Math.ceil((new Date(iso).getTime() - nowMs) / 86400000));

    const combined: UpcomingDeadlineItem[] = [
      ...assignments.map((a) => ({
        id: a.id,
        kind: "assignment" as const,
        title: a.title,
        subjectCode: a.subjectCode,
        dueAt: a.dueAt,
        daysRemaining: calcDays(a.dueAt),
        status: a.status,
        priority: (calcDays(a.dueAt) <= 2 ? "critical" : "high") as
          | "critical"
          | "high",
      })),
      ...exams.map((e) => ({
        id: e.id,
        kind: "exam" as const,
        title: e.title,
        subjectCode: e.subjectCode,
        dueAt: e.examAt,
        daysRemaining: calcDays(e.examAt),
        status: "scheduled",
        priority: (calcDays(e.examAt) <= 7 ? "critical" : "high") as
          | "critical"
          | "high",
      })),
      ...tasksWithDue.map((t) => ({
        id: t.id,
        kind: "task" as const,
        title: t.title,
        dueAt: t.dueAt!,
        daysRemaining: calcDays(t.dueAt!),
        status: t.status,
        priority: t.priority,
      })),
    ];

    return combined.sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    );
  },

  getTodaysTasks(userId?: string): TaskItem[] {
    const uid = resolveUserId(userId);
    const tasks = this.getTasks(uid);
    const endOfTodayMs = new Date().setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled") return false;
      if (t.status === "in_progress" || t.priority === "critical") return true;
      if (t.dueAt && new Date(t.dueAt).getTime() <= endOfTodayMs) return true;
      return true;
    });
  },

  getDashboardMetrics(
    registeredAgentsCount: number = 16,
    userId?: string
  ): DashboardMetrics {
    const uid = resolveUserId(userId);
    const subjects = this.getSubjects(uid);
    const topics = this.getSyllabusTopics(uid);
    const tasks = this.getTasks(uid);
    const todaysTasks = this.getTodaysTasks(uid);
    const deadlines = this.getUpcomingDeadlines(uid);
    const activeGoals = this.getGoals(uid).filter((g) => g.status === "active");
    const activeProjects = this.getProjects(uid).filter(
      (p) => p.status === "in_progress" || p.status === "planning"
    );
    const pendingApprovals = this.getApprovals(uid).filter(
      (a) => a.status === "pending"
    );
    const runs = this.getRuns(uid);

    const overallSyllabusCompletionPct =
      topics.length > 0
        ? Math.round(
            (topics.filter((t) => t.completionStatus === "completed").length /
              topics.length) *
              100
          )
        : subjects.length > 0
        ? Math.round(
            subjects.reduce((acc, s) => acc + s.completionPercentage, 0) /
              subjects.length
          )
        : 0;

    const averageGoalProgressPct =
      activeGoals.length > 0
        ? Math.round(
            activeGoals.reduce((acc, g) => acc + g.progress, 0) /
              activeGoals.length
          )
        : 0;

    return {
      activeSubjectsCount: subjects.length,
      overallSyllabusCompletionPct,
      todaysTasksCount: todaysTasks.length,
      openTasksCount: tasks.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      ).length,
      completedTasksCount: tasks.filter((t) => t.status === "completed").length,
      upcomingDeadlinesCount: deadlines.length,
      activeGoalsCount: activeGoals.length,
      averageGoalProgressPct,
      activeProjectsCount: activeProjects.length,
      registeredAgentsCount,
      pendingApprovalsCount: pendingApprovals.length,
      recentAgentRunsCount: runs.length,
    };
  },

  // ---------------------------------------------------------------------------
  // Phase 3: Persistent Conversations, Messages & Usage Ledger
  // ---------------------------------------------------------------------------
  resetStateForTesting(): void {
    globalForStore.studentOSRelationalStore = structuredClone(
      initialRelationalState
    );
  },

  getConversations(userId?: string): ConversationItem[] {
    const store = getStore();
    const uid = resolveUserId(userId);
    const convos = store.conversations
      .filter((c) => c.user_id === uid && c.status !== "archived")
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    return convos.map((c) => {
      const msgs = store.messages
        .filter((m) => m.conversation_id === c.id && m.user_id === uid)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      const lastMsg = msgs[msgs.length - 1];
      return {
        id: c.id,
        userId: c.user_id,
        title: c.title,
        status: c.status,
        messageCount: msgs.length,
        lastMessagePreview: lastMsg
          ? lastMsg.content.replace(/\s+/g, " ").slice(0, 120)
          : undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });
  },

  getConversationById(
    conversationId: string,
    userId?: string
  ): {
    conversation: ConversationItem;
    messages: ChatMessageItem[];
    runs: AgentRunRecord[];
  } | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const convo = store.conversations.find(
      (c) => c.id === conversationId && c.user_id === uid
    );
    if (!convo) return null;

    const msgs: ChatMessageItem[] = store.messages
      .filter((m) => m.conversation_id === convo.id && m.user_id === uid)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        userId: m.user_id,
        role: m.role,
        content: m.content,
        metadata: m.metadata as ChatMessageItem["metadata"],
        createdAt: m.created_at,
      }));

    const runs = store.agentRuns.filter(
      (r) => r.conversationId === convo.id && r.userId === uid
    );

    const lastMsg = msgs[msgs.length - 1];
    return {
      conversation: {
        id: convo.id,
        userId: convo.user_id,
        title: convo.title,
        status: convo.status,
        messageCount: msgs.length,
        lastMessagePreview: lastMsg
          ? lastMsg.content.replace(/\s+/g, " ").slice(0, 120)
          : undefined,
        createdAt: convo.created_at,
        updatedAt: convo.updated_at,
      },
      messages: msgs,
      runs,
    };
  },

  createConversation(title?: string, userId?: string): ConversationItem {
    const store = getStore();
    const uid = resolveUserId(userId);
    const profile = this.getProfile(uid);
    const now = nowIso();
    const convoId = `convo_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const resolvedTitle =
      title && title.trim().length > 0 ? title.trim() : "New Conversation";

    const row: ConversationRow = {
      id: convoId,
      user_id: uid,
      title: resolvedTitle,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    store.conversations.unshift(row);

    const welcomeMsg: MessageRow = {
      id: `msg_${Date.now()}_welcome_${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: convoId,
      user_id: uid,
      role: "assistant",
      content: `Welcome to a new **Student OS CEO Session**, **${profile.fullName}**. I have loaded your Semester ${profile.semester} (${profile.department}) context. Tell me what you want to plan, study, build, or review today.`,
      metadata: {
        status: "completed",
        selectedAgents: ["ceo"],
      },
      created_at: now,
    };
    store.messages.push(welcomeMsg);

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      status: row.status,
      messageCount: 1,
      lastMessagePreview: welcomeMsg.content.slice(0, 120),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  updateConversationTitle(
    conversationId: string,
    title: string,
    userId?: string
  ): ConversationItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const convo = store.conversations.find(
      (c) => c.id === conversationId && c.user_id === uid
    );
    if (!convo) return null;

    const cleanTitle = title.trim().slice(0, 120);
    if (!cleanTitle) return null;

    convo.title = cleanTitle;
    convo.updated_at = nowIso();

    const details = this.getConversationById(conversationId, uid);
    return details ? details.conversation : null;
  },

  deleteConversation(conversationId: string, userId?: string): boolean {
    const store = getStore();
    const uid = resolveUserId(userId);
    const idx = store.conversations.findIndex(
      (c) => c.id === conversationId && c.user_id === uid
    );
    if (idx === -1) return false;

    store.conversations.splice(idx, 1);
    store.messages = store.messages.filter(
      (m) => !(m.conversation_id === conversationId && m.user_id === uid)
    );
    return true;
  },

  appendMessage(
    input: {
      conversationId: string;
      role: ChatMessageItem["role"];
      content: string;
      metadata?: ChatMessageItem["metadata"];
    },
    userId?: string
  ): ChatMessageItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    let convo = store.conversations.find(
      (c) => c.id === input.conversationId && c.user_id === uid
    );

    if (!convo) {
      // Auto-create conversation if client passed a non-existent or default ID
      const created = this.createConversation("New Conversation", uid);
      convo = store.conversations.find((c) => c.id === created.id)!;
    }

    const now = nowIso();
    const msgRow: MessageRow = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversation_id: convo.id,
      user_id: uid,
      role: input.role,
      content: input.content,
      metadata: (input.metadata ?? {}) as MessageRow["metadata"],
      created_at: now,
    };

    store.messages.push(msgRow);
    convo.updated_at = now;

    // Auto-generate a smart conversation title from the first user prompt
    if (
      input.role === "user" &&
      (convo.title === "New Conversation" || convo.title === "New CEO Session")
    ) {
      const cleaned = input.content
        .replace(/[#*_`~>\n\r]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 0) {
        convo.title =
          cleaned.length > 56 ? `${cleaned.slice(0, 53)}...` : cleaned;
      }
    }

    return {
      id: msgRow.id,
      conversationId: msgRow.conversation_id,
      userId: msgRow.user_id,
      role: msgRow.role,
      content: msgRow.content,
      metadata: msgRow.metadata as ChatMessageItem["metadata"],
      createdAt: msgRow.created_at,
    };
  },

  recordUsage(
    input: {
      agentSlug: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      estimatedCost: number;
    },
    userId?: string
  ): UsageRecordRow {
    const store = getStore();
    const uid = resolveUserId(userId);
    const row: UsageRecordRow = {
      id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      agent_id: input.agentSlug,
      model: input.model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost: input.estimatedCost,
      created_at: nowIso(),
    };
    store.usageRecords.unshift(row);
    return row;
  },

  getUsageRecords(userId?: string): UsageRecordRow[] {
    const store = getStore();
    const uid = resolveUserId(userId);
    return store.usageRecords.filter((u) => u.user_id === uid);
  },

  // ---------------------------------------------------------------------------
  // Phase 5: Structured Inter-Agent Message Bus, Execution State & Audit Logs
  // ---------------------------------------------------------------------------
  recordAgentMessage(msg: AgentBusMessage): AgentMessageRow {
    const store = getStore();
    const row: AgentMessageRow = {
      id: msg.id,
      run_id: msg.runId,
      task_id: msg.taskId,
      sender_agent_id: msg.senderAgent,
      recipient_agent_id: msg.recipientAgent,
      message_type: msg.messageType,
      content: msg.payload as AgentMessageRow["content"],
      created_at: msg.createdAt,
    };
    store.agentMessages.push(row);
    return row;
  },

  getAgentMessages(runId?: string, userId?: string): AgentMessageRow[] {
    const store = getStore();
    const uid = resolveUserId(userId);
    const ownedRunIds = new Set(
      store.agentRuns.filter((r) => r.userId === uid).map((r) => r.id)
    );
    return store.agentMessages.filter(
      (m) => ownedRunIds.has(m.run_id) && (!runId || m.run_id === runId)
    );
  },

  recordAuditLog(input: {
    userId?: string;
    actorType: AuditLogRow["actor_type"];
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogRow {
    const store = getStore();
    const uid = resolveUserId(input.userId);
    const row: AuditLogRow = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      actor_type: input.actorType,
      action: input.action,
      resource_type: input.resourceType || null,
      resource_id: input.resourceId || null,
      metadata: (input.metadata ?? {}) as AuditLogRow["metadata"],
      created_at: nowIso(),
    };
    store.auditLogs.unshift(row);
    return row;
  },

  getAuditLogs(userId?: string): AuditLogRow[] {
    const store = getStore();
    const uid = resolveUserId(userId);
    return store.auditLogs.filter((l) => l.user_id === uid);
  },

  updateRunStatus(
    runId: string,
    status: ExecutionStatus,
    userId?: string
  ): AgentRunRecord | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const run = store.agentRuns.find(
      (r) => r.id === runId && r.userId === uid
    );
    if (!run) return null;
    run.status = status;
    run.completedAt = nowIso();
    return run;
  },

  // ---------------------------------------------------------------------------
  // Phase 6–8 Department Module CRUD Operations (RLS Scoped & Verified)
  // ---------------------------------------------------------------------------

  // A. ACADEMIC DEPARTMENT CRUD
  createAssignment(
    input: {
      subjectId: string;
      title: string;
      dueAt: string;
      status?: AssignmentItem["status"];
    },
    userId?: string
  ): AssignmentItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const ownedSubjects = this.getSubjects(uid);
    const subject = ownedSubjects.find((s) => s.id === input.subjectId);
    if (!subject) return null;

    const now = nowIso();
    const item: AssignmentItem = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      subjectId: subject.id,
      subjectCode: subject.code,
      title: input.title.trim(),
      dueAt: input.dueAt,
      status: input.status || "pending",
      createdAt: now,
      updatedAt: now,
    };
    store.assignments.unshift(item);
    return item;
  },

  updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentItem["status"],
    userId?: string
  ): AssignmentItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const item = store.assignments.find(
      (a) => a.id === assignmentId && a.userId === uid
    );
    if (!item) return null;
    item.status = status;
    item.updatedAt = nowIso();
    return item;
  },

  createExam(
    input: {
      subjectId: string;
      title: string;
      examAt: string;
    },
    userId?: string
  ): ExamItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const ownedSubjects = this.getSubjects(uid);
    const subject = ownedSubjects.find((s) => s.id === input.subjectId);
    if (!subject) return null;

    const now = nowIso();
    const exam: ExamItem = {
      id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      subjectId: subject.id,
      subjectCode: subject.code,
      title: input.title.trim(),
      examAt: input.examAt,
      createdAt: now,
      updatedAt: now,
    };
    store.exams.push(exam);
    return exam;
  },

  getStudyPlans(userId?: string): StudyPlanRow[] {
    const uid = resolveUserId(userId);
    return getStore().studyPlans.filter((sp) => sp.user_id === uid);
  },

  createStudyPlan(
    input: {
      title: string;
      hoursPerDay: number;
      startDate: string;
      endDate: string;
      blocks?: string[];
    },
    userId?: string
  ): StudyPlanRow {
    const store = getStore();
    const uid = resolveUserId(userId);
    const now = nowIso();
    const row: StudyPlanRow = {
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      title: input.title.trim(),
      plan_data: {
        hoursPerDay: input.hoursPerDay,
        blocks: input.blocks || [
          "Morning Deep Theory Block (90m)",
          "Afternoon Problem Solving & Lab (60m)",
          "Evening Active Recall & Flashcards (30m)",
        ],
      },
      start_date: input.startDate,
      end_date: input.endDate,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    store.studyPlans.unshift(row);
    return row;
  },

  getStudySessions(userId?: string): StudySessionRow[] {
    const uid = resolveUserId(userId);
    return getStore().studySessions.filter((ss) => ss.user_id === uid);
  },

  createStudySession(
    input: {
      subjectId?: string | null;
      studyPlanId?: string | null;
      durationMinutes: number;
      notes: string;
    },
    userId?: string
  ): StudySessionRow {
    const store = getStore();
    const uid = resolveUserId(userId);
    const now = nowIso();
    const started = new Date(
      Date.now() - input.durationMinutes * 60000
    ).toISOString();
    const row: StudySessionRow = {
      id: `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      study_plan_id: input.studyPlanId || null,
      subject_id: input.subjectId || null,
      started_at: started,
      ended_at: now,
      notes: input.notes.trim(),
      created_at: now,
    };
    store.studySessions.unshift(row);
    return row;
  },

  // B. CAREER DEPARTMENT CRUD
  getStudentSkills(userId?: string): Array<{
    id: string;
    userId: string;
    skillId: string;
    name: string;
    category: string;
    proficiency: StudentSkillRow["proficiency"];
    createdAt: string;
  }> {
    const store = getStore();
    const uid = resolveUserId(userId);
    const rows = store.studentSkills.filter((ss) => ss.user_id === uid);
    return rows.map((r) => {
      const skill = store.skills.find((s) => s.id === r.skill_id);
      return {
        id: r.id,
        userId: r.user_id,
        skillId: r.skill_id,
        name: skill?.name || r.skill_id,
        category: skill?.category || "General",
        proficiency: r.proficiency,
        createdAt: r.created_at,
      };
    });
  },

  upsertStudentSkill(
    input: {
      name: string;
      category: string;
      proficiency: StudentSkillRow["proficiency"];
    },
    userId?: string
  ) {
    const store = getStore();
    const uid = resolveUserId(userId);
    const cleanName = input.name.trim();
    let skill = store.skills.find(
      (s) => s.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (!skill) {
      skill = {
        id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        category: input.category.trim() || "Engineering",
      };
      store.skills.push(skill);
    }

    let studentSkill = store.studentSkills.find(
      (ss) => ss.user_id === uid && ss.skill_id === skill!.id
    );
    if (studentSkill) {
      studentSkill.proficiency = input.proficiency;
    } else {
      studentSkill = {
        id: `ssk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        user_id: uid,
        skill_id: skill.id,
        proficiency: input.proficiency,
        created_at: nowIso(),
      };
      store.studentSkills.push(studentSkill);
    }

    return {
      id: studentSkill.id,
      userId: uid,
      skillId: skill.id,
      name: skill.name,
      category: skill.category || "Engineering",
      proficiency: studentSkill.proficiency,
      createdAt: studentSkill.created_at,
    };
  },

  updateProjectStatus(
    projectId: string,
    status: ProjectItem["status"],
    userId?: string
  ): ProjectItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const proj = store.projects.find(
      (p) => p.id === projectId && p.userId === uid
    );
    if (!proj) return null;
    proj.status = status;
    proj.updatedAt = nowIso();
    return proj;
  },

  createOpportunity(
    input: {
      title: string;
      organisation: string;
      type: OpportunityItem["type"];
      sourceUrl: string;
      deadline: string;
      status?: OpportunityItem["status"];
    },
    userId?: string
  ): OpportunityItem {
    const store = getStore();
    const uid = resolveUserId(userId);
    const now = nowIso();
    const isHttpsSource = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(
      input.sourceUrl.trim()
    );

    const opp: OpportunityItem = {
      id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: uid,
      title: input.title.trim(),
      organisation: input.organisation.trim(),
      type: input.type,
      sourceUrl: input.sourceUrl.trim(),
      deadline: input.deadline,
      lastCheckedAt: now,
      verificationStatus: isHttpsSource ? "verified" : "unverified",
      status: input.status || "saved",
      createdAt: now,
      updatedAt: now,
    };
    store.opportunities.unshift(opp);
    return opp;
  },

  updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityItem["status"],
    userId?: string
  ): OpportunityItem | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const opp = store.opportunities.find(
      (o) => o.id === opportunityId && o.userId === uid
    );
    if (!opp) return null;
    opp.status = status;
    opp.updatedAt = nowIso();
    return opp;
  },

  // C. INTELLIGENCE (RESEARCH & NOTES) DEPARTMENT CRUD
  getDocuments(userId?: string): DocumentRow[] {
    const uid = resolveUserId(userId);
    return getStore().documents.filter((d) => d.user_id === uid);
  },

  createDocument(
    input: {
      name: string;
      mimeType?: string;
      summary: string;
    },
    userId?: string
  ): DocumentRow {
    const store = getStore();
    const uid = resolveUserId(userId);
    const now = nowIso();
    const cleanName = input.name.trim();
    const doc: DocumentRow = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      name: cleanName,
      storage_path: `${uid}/${cleanName.replace(/\s+/g, "_")}`,
      mime_type: input.mimeType || "application/pdf",
      summary: input.summary.trim(),
      processing_status: "ready",
      created_at: now,
      updated_at: now,
    };
    store.documents.unshift(doc);
    return doc;
  },

  deleteDocument(docId: string, userId?: string): boolean {
    const store = getStore();
    const uid = resolveUserId(userId);
    const idx = store.documents.findIndex(
      (d) => d.id === docId && d.user_id === uid
    );
    if (idx === -1) return false;
    store.documents.splice(idx, 1);
    return true;
  },

  createMemory(
    input: {
      category: string;
      content: string;
      importanceScore?: number;
      reviewStatus?: "pending_review" | "verified" | "archived";
      sourceType?:
        | "manual"
        | "onboarding"
        | "conversation"
        | "agent_decision"
        | "document";
      metadata?: Record<string, unknown>;
    },
    userId?: string
  ): MemoryRecordRow {
    const res = this.createMemoryWithDeduplication(input, userId);
    return res.record;
  },

  createMemoryWithDeduplication(
    input: {
      category: string;
      content: string;
      importanceScore?: number;
      reviewStatus?: "pending_review" | "verified" | "archived";
      sourceType?:
        | "manual"
        | "onboarding"
        | "conversation"
        | "agent_decision"
        | "document";
      metadata?: Record<string, unknown>;
    },
    userId?: string
  ): {
    created: boolean;
    duplicate: boolean;
    duplicateReason?: string;
    similarity?: number;
    record: MemoryRecordRow;
  } {
    const store = getStore();
    const uid = resolveUserId(userId);
    const cleanCategory = input.category.trim();
    const cleanContent = input.content.trim();
    const existingUserMemories = this.getMemories(uid);

    const dupCheck = findDuplicateMemory(
      cleanContent,
      cleanCategory,
      existingUserMemories
    );
    if (dupCheck.isDuplicate && dupCheck.duplicateRecord) {
      return {
        created: false,
        duplicate: true,
        duplicateReason: dupCheck.reason,
        similarity: dupCheck.similarity,
        record: dupCheck.duplicateRecord,
      };
    }

    const now = nowIso();
    const row: MemoryRecordRow = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      category: cleanCategory,
      content: cleanContent,
      embedding: generateEmbedding768(cleanContent),
      review_status: input.reviewStatus || "verified",
      importance_score:
        typeof input.importanceScore === "number"
          ? Math.max(0, Math.min(1, input.importanceScore))
          : 0.85,
      content_hash: computeContentHash(cleanContent),
      source_type: input.sourceType || "manual",
      metadata: (input.metadata ?? {}) as MemoryRecordRow["metadata"],
      created_at: now,
      updated_at: now,
    };
    store.memories.unshift(row);
    return {
      created: true,
      duplicate: false,
      record: row,
    };
  },

  retrieveMemoriesWithRelevance(
    params: {
      query?: string;
      category?: string;
      includeArchived?: boolean;
      minRelevanceScore?: number;
      limit?: number;
    },
    userId?: string
  ): {
    memories: ScoredMemoryRecord[];
    documents: ScoredDocumentItem[];
  } {
    const uid = resolveUserId(userId);
    const userMemories = this.getMemories(uid);
    const userDocuments = this.getDocuments(uid);

    return retrieveAndScoreKnowledge({
      query: params.query || "",
      memories: userMemories,
      documents: userDocuments,
      categoryFilter: params.category,
      includeArchived: params.includeArchived,
      minRelevanceScore: params.minRelevanceScore,
      limit: params.limit,
    });
  },

  reviewMemoryRecord(
    memoryId: string,
    reviewStatus: "pending_review" | "verified" | "archived",
    userId?: string
  ): MemoryRecordRow | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const record = store.memories.find(
      (m) => m.id === memoryId && m.user_id === uid
    );
    if (!record) return null;
    record.review_status = reviewStatus;
    record.updated_at = nowIso();
    return record;
  },

  updateMemoryRecord(
    memoryId: string,
    updates: {
      content?: string;
      category?: string;
      importanceScore?: number;
      reviewStatus?: "pending_review" | "verified" | "archived";
    },
    userId?: string
  ): MemoryRecordRow | null {
    const store = getStore();
    const uid = resolveUserId(userId);
    const record = store.memories.find(
      (m) => m.id === memoryId && m.user_id === uid
    );
    if (!record) return null;

    if (typeof updates.category === "string" && updates.category.trim()) {
      record.category = updates.category.trim();
    }
    if (typeof updates.content === "string" && updates.content.trim()) {
      const clean = updates.content.trim();
      record.content = clean;
      record.embedding = generateEmbedding768(clean);
      record.content_hash = computeContentHash(clean);
    }
    if (typeof updates.importanceScore === "number") {
      record.importance_score = Math.max(
        0,
        Math.min(1, updates.importanceScore)
      );
    }
    if (updates.reviewStatus) {
      record.review_status = updates.reviewStatus;
    }
    record.updated_at = nowIso();
    return record;
  },

  deleteMemoryRecord(memoryId: string, userId?: string): boolean {
    const store = getStore();
    const uid = resolveUserId(userId);
    const idx = store.memories.findIndex(
      (m) => m.id === memoryId && m.user_id === uid
    );
    if (idx === -1) return false;
    store.memories.splice(idx, 1);
    return true;
  },

  syncLiveContextToMemories(userId?: string): {
    syncedCount: number;
    skippedDuplicatesCount: number;
    records: MemoryRecordRow[];
  } {
    const uid = resolveUserId(userId);
    const profile = this.getProfile(uid);
    const subjects = this.getSubjects(uid);
    const projects = this.getProjects(uid);
    const conversations = this.getConversations(uid);
    const documents = this.getDocuments(uid);
    const approvals = this.getApprovals(uid).filter(
      (a) => a.status === "approved"
    );

    const candidates: Array<{
      category: string;
      content: string;
      sourceType:
        | "onboarding"
        | "conversation"
        | "agent_decision"
        | "document";
      importanceScore: number;
    }> = [
      {
        category: "student_preference",
        content: `Student ${profile.fullName} prefers ${profile.dailyStudyHours}h/day of focused study in ${profile.preferredLanguage} (${profile.timezone}).`,
        sourceType: "onboarding",
        importanceScore: 0.9,
      },
      {
        category: "academic_context",
        content: `${profile.degree} (${profile.department}) Semester ${
          profile.semester
        } at ${profile.institution}. Enrolled in: ${
          subjects.map((s) => `${s.code} ${s.name}`).join(", ") || "Core curriculum"
        }.`,
        sourceType: "onboarding",
        importanceScore: 0.94,
      },
      {
        category: "career_goal",
        content: `Target career goal: ${
          profile.careerGoal || profile.careerInterests.join(", ")
        }. Learning focus: ${profile.learningGoals}`,
        sourceType: "onboarding",
        importanceScore: 0.92,
      },
    ];

    if (projects.length > 0) {
      candidates.push({
        category: "active_project",
        content: `Active portfolio project "${projects[0].title}" (${
          projects[0].status
        }): ${projects[0].description} [${projects[0].techStack.join(", ")}]`,
        sourceType: "agent_decision",
        importanceScore: 0.89,
      });
    }

    if (approvals.length > 0) {
      candidates.push({
        category: "previous_decision",
        content: `Approved decision: ${approvals[0].title} (${approvals[0].actionType}).`,
        sourceType: "agent_decision",
        importanceScore: 0.85,
      });
    }

    if (conversations.length > 0) {
      candidates.push({
        category: "conversation_summary",
        content: `Conversation "${conversations[0].title}": ${
          conversations[0].lastMessagePreview || "Active CEO planning session"
        }`,
        sourceType: "conversation",
        importanceScore: 0.82,
      });
    }

    if (documents.length > 0) {
      candidates.push({
        category: "document_knowledge",
        content: `Indexed document "${documents[0].name}": ${
          documents[0].summary || "Ready for RAG retrieval"
        }`,
        sourceType: "document",
        importanceScore: 0.88,
      });
    }

    let syncedCount = 0;
    let skippedDuplicatesCount = 0;
    for (const item of candidates) {
      const res = this.createMemoryWithDeduplication(
        {
          category: item.category,
          content: item.content,
          sourceType: item.sourceType,
          importanceScore: item.importanceScore,
          reviewStatus: "verified",
        },
        uid
      );
      if (res.created) syncedCount += 1;
      else skippedDuplicatesCount += 1;
    }

    return {
      syncedCount,
      skippedDuplicatesCount,
      records: this.getMemories(uid),
    };
  },

  getVoiceSettings(userId?: string): {
    voiceEnabled: boolean;
    provider: "browser_native" | "cloud_speech_provider" | "text_fallback";
    disclosureAcknowledged: boolean;
    thirdPartyAudioConsent: boolean;
    speechRate: number;
  } {
    const store = getStore();
    const uid = resolveUserId(userId);
    const pref = store.userPreferences[uid];
    const raw = (pref?.preferences || {}) as Record<string, unknown>;
    return {
      voiceEnabled: pref?.voice_enabled ?? true,
      provider:
        (raw.voiceProvider as
          | "browser_native"
          | "cloud_speech_provider"
          | "text_fallback") || "browser_native",
      disclosureAcknowledged: Boolean(raw.disclosureAcknowledged),
      thirdPartyAudioConsent: Boolean(raw.thirdPartyAudioConsent),
      speechRate: Number(raw.speechRate || 1.02),
    };
  },

  updateVoiceSettings(
    input: {
      voiceEnabled?: boolean;
      provider?: "browser_native" | "cloud_speech_provider" | "text_fallback";
      disclosureAcknowledged?: boolean;
      thirdPartyAudioConsent?: boolean;
      speechRate?: number;
    },
    userId?: string
  ) {
    const store = getStore();
    const uid = resolveUserId(userId);
    const current = this.getVoiceSettings(uid);
    const nextProvider = input.provider ?? current.provider;
    const nextDisclosure =
      input.disclosureAcknowledged ?? current.disclosureAcknowledged;
    const nextConsent =
      input.thirdPartyAudioConsent ?? current.thirdPartyAudioConsent;

    // Enforce third-party audio consent rule at the store level
    const safeProvider =
      nextProvider === "cloud_speech_provider" &&
      (!nextDisclosure || !nextConsent)
        ? "browser_native"
        : nextProvider;

    if (!store.userPreferences[uid]) {
      store.userPreferences[uid] = {
        user_id: uid,
        theme: "light",
        language: "English",
        voice_enabled: input.voiceEnabled ?? true,
        notifications_enabled: true,
        daily_study_hours: 3.5,
        preferences: {},
        updated_at: nowIso(),
      };
    }

    const rawPrefs = (store.userPreferences[uid].preferences || {}) as Record<
      string,
      unknown
    >;
    store.userPreferences[uid].voice_enabled =
      input.voiceEnabled ?? store.userPreferences[uid].voice_enabled;
    store.userPreferences[uid].preferences = {
      ...rawPrefs,
      voiceProvider: safeProvider,
      disclosureAcknowledged: nextDisclosure,
      thirdPartyAudioConsent: nextConsent,
      speechRate: input.speechRate ?? current.speechRate,
    };
    store.userPreferences[uid].updated_at = nowIso();
    return this.getVoiceSettings(uid);
  },

  searchKnowledgeBase(
    query: string,
    userId?: string
  ): {
    documents: DocumentRow[];
    memories: MemoryRecordRow[];
  } {
    const uid = resolveUserId(userId);
    const q = query.trim().toLowerCase();
    const docs = this.getDocuments(uid);
    const mems = this.getMemories(uid);
    if (!q) {
      return { documents: docs, memories: mems };
    }
    return {
      documents: docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.summary && d.summary.toLowerCase().includes(q))
      ),
      memories: mems.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          (m.category && m.category.toLowerCase().includes(q))
      ),
    };
  },

  // D. STUDENT SUPPORT (FINANCE & WELLBEING) CRUD (stored in user_preferences.preferences)
  getFinanceLedger(userId?: string): {
    monthlyBudget: number;
    expenses: Array<{
      id: string;
      title: string;
      category: "essentials" | "academics" | "lifestyle" | "savings";
      amount: number;
      date: string;
    }>;
  } {
    const store = getStore();
    const uid = resolveUserId(userId);
    const pref = store.userPreferences[uid];
    const rawPrefs = (pref?.preferences || {}) as Record<string, unknown>;
    const monthlyBudget = Number(rawPrefs.monthlyBudget || 15000);
    const expenses = Array.isArray(rawPrefs.expenses)
      ? (rawPrefs.expenses as Array<{
          id: string;
          title: string;
          category: "essentials" | "academics" | "lifestyle" | "savings";
          amount: number;
          date: string;
        }>)
      : [
          {
            id: "exp-seed-1",
            title: "Hostel Mess & Groceries",
            category: "essentials" as const,
            amount: 4500,
            date: nowIso(),
          },
          {
            id: "exp-seed-2",
            title: "Cloud GPU Credits & Reference Books",
            category: "academics" as const,
            amount: 1800,
            date: nowIso(),
          },
        ];

    return { monthlyBudget, expenses };
  },

  addFinanceExpense(
    input: {
      title: string;
      category: "essentials" | "academics" | "lifestyle" | "savings";
      amount: number;
    },
    userId?: string
  ) {
    const store = getStore();
    const uid = resolveUserId(userId);
    const current = this.getFinanceLedger(uid);
    const newItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: input.title.trim(),
      category: input.category,
      amount: Math.max(0, Number(input.amount)),
      date: nowIso(),
    };
    const updatedExpenses = [newItem, ...current.expenses];
    if (!store.userPreferences[uid]) {
      store.userPreferences[uid] = {
        user_id: uid,
        theme: "light",
        language: "English",
        voice_enabled: true,
        notifications_enabled: true,
        daily_study_hours: 3.5,
        preferences: {},
        updated_at: nowIso(),
      };
    }
    const rawPrefs = (store.userPreferences[uid].preferences || {}) as Record<
      string,
      unknown
    >;
    store.userPreferences[uid].preferences = {
      ...rawPrefs,
      monthlyBudget: current.monthlyBudget,
      expenses: updatedExpenses,
    };
    store.userPreferences[uid].updated_at = nowIso();
    return { monthlyBudget: current.monthlyBudget, expenses: updatedExpenses };
  },

  getWellbeingCheckins(userId?: string): Array<{
    id: string;
    energyLevel: number;
    sleepHours: number;
    stressLevel: "low" | "moderate" | "high";
    notes: string;
    createdAt: string;
  }> {
    const store = getStore();
    const uid = resolveUserId(userId);
    const pref = store.userPreferences[uid];
    const rawPrefs = (pref?.preferences || {}) as Record<string, unknown>;
    if (Array.isArray(rawPrefs.wellbeingCheckins)) {
      return rawPrefs.wellbeingCheckins as Array<{
        id: string;
        energyLevel: number;
        sleepHours: number;
        stressLevel: "low" | "moderate" | "high";
        notes: string;
        createdAt: string;
      }>;
    }
    return [
      {
        id: "wb-seed-1",
        energyLevel: 4,
        sleepHours: 7.5,
        stressLevel: "low",
        notes: "Maintained 50/10 Pomodoro pacing and evening walk.",
        createdAt: nowIso(),
      },
    ];
  },

  recordWellbeingCheckin(
    input: {
      energyLevel: number;
      sleepHours: number;
      stressLevel: "low" | "moderate" | "high";
      notes: string;
    },
    userId?: string
  ) {
    const store = getStore();
    const uid = resolveUserId(userId);
    const current = this.getWellbeingCheckins(uid);
    const entry = {
      id: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      energyLevel: Math.min(5, Math.max(1, input.energyLevel)),
      sleepHours: Math.min(14, Math.max(1, input.sleepHours)),
      stressLevel: input.stressLevel,
      notes: input.notes.trim(),
      createdAt: nowIso(),
    };
    const updated = [entry, ...current];
    if (!store.userPreferences[uid]) {
      store.userPreferences[uid] = {
        user_id: uid,
        theme: "light",
        language: "English",
        voice_enabled: true,
        notifications_enabled: true,
        daily_study_hours: 3.5,
        preferences: {},
        updated_at: nowIso(),
      };
    }
    const rawPrefs = (store.userPreferences[uid].preferences || {}) as Record<
      string,
      unknown
    >;
    store.userPreferences[uid].preferences = {
      ...rawPrefs,
      wellbeingCheckins: updated,
    };
    store.userPreferences[uid].updated_at = nowIso();
    return entry;
  },
};
