"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookMarked,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  ChevronRight,
  Compass,
  ExternalLink,
  FileText,
  FolderGit2,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Volume2,
  X,
} from "lucide-react";
import type {
  AgentResult,
  AgentRunRecord,
  AgentSlug,
  AgentTaskRecord,
  ApprovalItem,
  AssignmentItem,
  CEOEvent,
  CourseItem,
  DashboardMetrics,
  ExamItem,
  GoalItem,
  OpportunityItem,
  ProjectItem,
  StudentProfile,
  SubjectItem,
  SyllabusTopicItem,
  TaskItem,
  UpcomingDeadlineItem,
} from "@/types/student-os";
import type { StudyPlanRow, StudySessionRow } from "@/types/database";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { CEOCommandCenter } from "@/components/ceo/ceo-command-center";
import {
  AgentHeadquarters,
  type RegisteredAgentView,
} from "@/components/agents/agent-headquarters";
import { AcademicDepartmentStudio } from "@/components/academic/academic-department-studio";
import { CareerDepartmentStudio } from "@/components/career/career-department-studio";
import { IntelligenceDepartmentStudio } from "@/components/intelligence/intelligence-department-studio";
import { ProductivityDepartmentStudio } from "@/components/productivity/productivity-department-studio";
import { StudentSupportStudio } from "@/components/support/student-support-studio";
import { MemoryVoiceStudio } from "@/components/memory/memory-voice-studio";
import {
  PwaBannerControls,
  PwaHeaderActionButtons,
} from "@/components/pwa/pwa-banner-controls";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";

export type NavSection =
  | "overview"
  | "ceo"
  | "agents"
  | "academic"
  | "learning"
  | "career"
  | "projects"
  | "opportunities"
  | "intelligence"
  | "memory_voice"
  | "tasks"
  | "support"
  | "onboarding";

interface AgentSummary {
  id: string;
  slug: AgentSlug;
  name: string;
  description: string;
  department: string;
  capabilities: string[];
  allowedTools: string[];
}

interface ChatTurn {
  id: string;
  role: "user" | "ceo";
  text: string;
  timestamp: string;
  selectedAgents?: AgentSlug[];
  agentResults?: Record<string, AgentResult>;
  status?: string;
}

const emptyMetrics: DashboardMetrics = {
  activeSubjectsCount: 0,
  overallSyllabusCompletionPct: 0,
  todaysTasksCount: 0,
  openTasksCount: 0,
  completedTasksCount: 0,
  upcomingDeadlinesCount: 0,
  activeGoalsCount: 0,
  averageGoalProgressPct: 0,
  activeProjectsCount: 0,
  registeredAgentsCount: 0,
  pendingApprovalsCount: 0,
  recentAgentRunsCount: 0,
};

export default function StudentOSApp() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [syllabusTopics, setSyllabusTopics] = useState<SyllabusTopicItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlanRow[]>([]);
  const [studySessions, setStudySessions] = useState<StudySessionRow[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<TaskItem[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    UpcomingDeadlineItem[]
  >([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);
  const [agents, setAgents] = useState<RegisteredAgentView[]>([]);
  const [systemStatus, setSystemStatus] = useState<{
    supabaseConnected: boolean;
    aiUsage: {
      totalRequests: number;
      inputTokens: number;
      outputTokens: number;
      providerMode: string;
      model: string;
    };
  } | null>(null);

  // CEO Command Center cross-module directive state
  const [pendingCEODirective, setPendingCEODirective] = useState<string | null>(
    null
  );

  // Quick Task inputs for Productivity Center
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high" | "critical"
  >("high");

  // Full 11-Field Phase 1 Onboarding & Profile Form State
  const [onboardingForm, setOnboardingForm] = useState({
    fullName: "",
    country: "India",
    institution: "",
    degree: "",
    department: "",
    academicYear: "",
    semester: 1,
    careerInterests: "",
    learningGoals: "",
    preferredLanguage: "English",
    timezone: "Asia/Kolkata",
    careerGoal: "",
    persona: "ambitious_builder",
    dailyStudyHours: 3.5,
  });
  const [onboardingSavedMsg, setOnboardingSavedMsg] = useState("");
  const [onboardingErrorMsg, setOnboardingErrorMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function fetchDashboardData() {
    setLoadError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        throw new Error("Failed to load Student OS workspace data.");
      }
      const data = await res.json();
      setProfile(data.profile);
      setMetrics(data.metrics || emptyMetrics);
      setCourses(data.courses || []);
      setSubjects(data.subjects || []);
      setSyllabusTopics(data.syllabusTopics || []);
      setAssignments(data.assignments || []);
      setExams(data.exams || []);
      setStudyPlans(data.studyPlans || []);
      setStudySessions(data.studySessions || []);
      setTasks(data.tasks || []);
      setTodaysTasks(data.todaysTasks || []);
      setUpcomingDeadlines(data.upcomingDeadlines || []);
      setGoals(data.goals || []);
      setProjects(data.projects || []);
      setOpportunities(data.opportunities || []);
      setApprovals(data.approvals || []);
      setRuns(data.runs || []);
      setAgentTasks(data.agentTasks || []);
      setAgents(data.agents || []);
      setSystemStatus(data.systemStatus || null);
      if (data.profile) {
        setOnboardingForm({
          fullName: data.profile.fullName || "",
          country: data.profile.country || "India",
          institution: data.profile.institution || "",
          degree: data.profile.degree || "",
          department: data.profile.department || "",
          academicYear: data.profile.academicYear || "",
          semester: data.profile.semester || 1,
          careerInterests: Array.isArray(data.profile.careerInterests)
            ? data.profile.careerInterests.join(", ")
            : data.profile.careerInterests || "",
          learningGoals: data.profile.learningGoals || "",
          preferredLanguage: data.profile.preferredLanguage || "English",
          timezone: data.profile.timezone || "Asia/Kolkata",
          careerGoal: data.profile.careerGoal || "",
          persona: data.profile.persona || "ambitious_builder",
          dailyStudyHours: data.profile.dailyStudyHours || 3.5,
        });
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Unable to load workspace data."
      );
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function handleSendCEOChat(promptOverride?: string) {
    if (promptOverride && promptOverride.trim()) {
      setPendingCEODirective(promptOverride.trim());
    }
    setActiveNav("ceo");
  }

  async function handleToggleAgentEnabled(slug: AgentSlug, enabled: boolean) {
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, enabled }),
    });
    await fetchDashboardData();
  }

  async function handleToggleTask(task: TaskItem) {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
    await fetchDashboardData();
  }

  async function handleCreateTask(
    title: string,
    priority: TaskItem["priority"]
  ) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        priority,
        dueAt: new Date().toISOString(),
      }),
    });
    await fetchDashboardData();
  }

  async function handleCreateTaskForm(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await handleCreateTask(newTaskTitle.trim(), newTaskPriority);
    setNewTaskTitle("");
  }

  async function handleApprovalDecision(
    approvalId: string,
    decision: "approved" | "rejected"
  ) {
    await fetch(`/api/approvals/${approvalId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    await fetchDashboardData();
  }

  async function handleSaveOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setOnboardingSavedMsg("");
    setOnboardingErrorMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...onboardingForm,
          careerInterests: onboardingForm.careerInterests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOnboardingErrorMsg(data.error || "Unable to save profile.");
      } else {
        setOnboardingSavedMsg(
          "Student profile & all 11 onboarding attributes saved and synced to AI CEO Memory."
        );
        await fetchDashboardData();
        setTimeout(() => setOnboardingSavedMsg(""), 4000);
      }
    } catch (err) {
      setOnboardingErrorMsg(
        err instanceof Error ? err.message : "Network error saving profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  function selectNav(section: NavSection) {
    setActiveNav(section);
    setMobileNavOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-button bg-primary flex items-center justify-center text-white font-bold shadow-sm">
              OS
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-text-primary">
                STUDENT OS
              </h1>
              <p className="text-xs text-text-secondary">
                {agents.length > 0 ? `${agents.length} Agents Ready` : "AI OS"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-button text-text-secondary hover:bg-surface-muted"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-5 text-sm">
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Command
            </p>
            <div className="space-y-1">
              <SidebarButton
                active={activeNav === "overview"}
                onClick={() => selectNav("overview")}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Overview Dashboard"
              />
              <SidebarButton
                active={activeNav === "ceo"}
                onClick={() => selectNav("ceo")}
                icon={<Sparkles className="h-4 w-4" />}
                label="CEO Command Center"
                badge="Live"
              />
              <SidebarButton
                active={activeNav === "agents"}
                onClick={() => selectNav("agents")}
                icon={<Bot className="h-4 w-4" />}
                label="Agent Headquarters"
                badge={agents.length > 0 ? `${agents.length}` : undefined}
              />
            </div>
          </div>

          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Academics
            </p>
            <div className="space-y-1">
              <SidebarButton
                active={activeNav === "academic"}
                onClick={() => selectNav("academic")}
                icon={<GraduationCap className="h-4 w-4" />}
                label="Academic Hub"
              />
              <SidebarButton
                active={activeNav === "learning"}
                onClick={() => selectNav("learning")}
                icon={<BookOpen className="h-4 w-4" />}
                label="AI Learning Studio"
              />
            </div>
          </div>

          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Career & Projects
            </p>
            <div className="space-y-1">
              <SidebarButton
                active={activeNav === "career"}
                onClick={() => selectNav("career")}
                icon={<Briefcase className="h-4 w-4" />}
                label="Career & Skills"
              />
              <SidebarButton
                active={activeNav === "projects"}
                onClick={() => selectNav("projects")}
                icon={<FolderGit2 className="h-4 w-4" />}
                label="Project Lab"
              />
              <SidebarButton
                active={activeNav === "opportunities"}
                onClick={() => selectNav("opportunities")}
                icon={<Compass className="h-4 w-4" />}
                label="Opportunities"
              />
            </div>
          </div>

          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Intelligence & Productivity
            </p>
            <div className="space-y-1">
              <SidebarButton
                active={activeNav === "intelligence"}
                onClick={() => selectNav("intelligence")}
                icon={<BookMarked className="h-4 w-4" />}
                label="Research & Notes"
              />
              <SidebarButton
                active={activeNav === "memory_voice"}
                onClick={() => selectNav("memory_voice")}
                icon={<Mic className="h-4 w-4" />}
                label="Memory & Voice"
                badge="pgvector"
              />
              <SidebarButton
                active={activeNav === "tasks"}
                onClick={() => selectNav("tasks")}
                icon={<Calendar className="h-4 w-4" />}
                label="Productivity & Outreach"
                badge={
                  pendingApprovals.length > 0
                    ? `${pendingApprovals.length}`
                    : undefined
                }
              />
              <SidebarButton
                active={activeNav === "support"}
                onClick={() => selectNav("support")}
                icon={<HeartPulse className="h-4 w-4" />}
                label="Performance & Support"
              />
              <SidebarButton
                active={activeNav === "onboarding"}
                onClick={() => selectNav("onboarding")}
                icon={<UserCheck className="h-4 w-4" />}
                label="Profile & Onboarding"
              />
            </div>
          </div>
        </nav>
      </div>

      {/* SYSTEM STATUS & LOGOUT FOOTER */}
      <div className="space-y-2 pt-4">
        <div className="rounded-card bg-surface-muted p-3 border border-border text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text-primary flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              Engine Online
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-border text-text-secondary">
              {systemStatus?.aiUsage.providerMode === "gemini"
                ? "Gemini API"
                : "Demo Mode"}
            </span>
          </div>
          <p className="text-text-secondary truncate">
            {profile?.fullName} · Sem {profile?.semester}
          </p>
          <p className="text-[11px] text-text-secondary truncate">
            {profile?.timezone} · {profile?.preferredLanguage}
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border text-xs font-semibold text-text-secondary hover:bg-red-50 hover:text-danger hover:border-red-200 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <PwaBannerControls />
      <div className="flex flex-1 min-h-0">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-surface flex-col justify-between p-4">
          {sidebarContent}
        </aside>

        {/* MOBILE DRAWER OVERLAY */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative z-10 w-72 max-w-[85vw] bg-surface h-full flex flex-col justify-between p-4 overflow-y-auto shadow-xl">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* MAIN CONTENT WORKSPACE */}
        <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          {/* TOP HEADER BAR */}
          <header className="h-16 border-b border-border bg-surface px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-button border border-border text-text-primary hover:bg-surface-muted"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="font-semibold text-base sm:text-lg text-text-primary truncate">
                {activeNav === "overview" && "Student Operating System Dashboard"}
                {activeNav === "ceo" && "AI CEO Command Center"}
                {activeNav === "agents" &&
                  `Agent Headquarters — All ${agents.length} Agents`}
                {activeNav === "academic" && "Academic Hub & Syllabus Tracker"}
                {activeNav === "learning" && "AI Learning & Exam Studio"}
                {activeNav === "career" && "Career Roadmap & Skill Gap Studio"}
                {activeNav === "projects" && "Project Lab & Architecture"}
                {activeNav === "opportunities" && "Verified Opportunity Center"}
                {activeNav === "intelligence" &&
                  "Research Synthesis & Second-Brain Notes Studio"}
                {activeNav === "memory_voice" &&
                  "Semantic pgvector Memory Vault & Voice Interaction Console"}
                {activeNav === "tasks" &&
                  "Productivity & Approval-Gated Communication Center"}
                {activeNav === "support" &&
                  "Performance Analytics, Finance & Wellbeing Studio"}
                {activeNav === "onboarding" &&
                  "Student Profile & Onboarding Settings"}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <PwaHeaderActionButtons />
              {pendingApprovals.length > 0 && (
                <button
                  onClick={() => setActiveNav("tasks")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-amber-50 border border-amber-300 text-amber-800 text-xs font-medium"
                >
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  {pendingApprovals.length} Approval
                </button>
              )}
              <button
                onClick={() => setActiveNav("ceo")}
                className="flex items-center gap-2 px-3.5 py-2 rounded-button bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-medium transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>Ask AI CEO</span>
              </button>
            </div>
          </header>

        {/* LOADING & ERROR BANNER STATES */}
        {initialLoading && (
          <div className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Synchronising Student OS database records...
            </div>
          </div>
        )}

        {loadError && (
          <div className="m-6 p-4 rounded-button bg-red-50 border border-red-300 text-red-900 text-xs flex items-center justify-between">
            <span>{loadError}</span>
            <button
              onClick={fetchDashboardData}
              className="px-3 py-1 rounded bg-danger text-white font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* MODULE 2: PHASE 2 STUDENT DASHBOARD (8 DATABASE-DRIVEN WIDGETS) */}
        {!initialLoading && activeNav === "overview" && (
          <StudentDashboard
            profile={profile}
            metrics={metrics}
            todaysTasks={todaysTasks}
            upcomingDeadlines={upcomingDeadlines}
            goals={goals}
            subjects={subjects}
            projects={projects}
            runs={runs}
            agentTasks={agentTasks}
            approvals={approvals}
            onToggleTask={handleToggleTask}
            onCreateTask={handleCreateTask}
            onApprovalDecision={handleApprovalDecision}
            onNavigate={(section) => setActiveNav(section)}
            onTriggerCEODirective={(directive) => {
              setActiveNav("ceo");
              handleSendCEOChat(directive);
            }}
          />
        )}

        {/* MODULE 1: THREE-COLUMN CEO COMMAND CENTER (PHASE 3) */}
        {!initialLoading && activeNav === "ceo" && (
          <CEOCommandCenter
            profile={profile}
            approvals={approvals}
            aiUsageSnapshot={systemStatus?.aiUsage}
            initialDirective={pendingCEODirective}
            onDirectiveConsumed={() => setPendingCEODirective(null)}
            onWorkspaceRefresh={fetchDashboardData}
            onApprovalDecision={handleApprovalDecision}
          />
        )}

        {/* MODULE 3: AGENT HEADQUARTERS (PHASE 4) */}
        {!initialLoading && activeNav === "agents" && (
          <AgentHeadquarters
            agents={agents}
            runs={runs}
            agentTasks={agentTasks}
            onToggleAgentEnabled={handleToggleAgentEnabled}
            onInvokeViaCEO={(directive) => handleSendCEOChat(directive)}
          />
        )}

        {/* PHASE 6A — ACADEMIC DEPARTMENT (Academic, Study, Tutor, Exam Agents) */}
        {!initialLoading &&
          (activeNav === "academic" || activeNav === "learning") && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <AcademicDepartmentStudio
                mode={
                  activeNav === "academic" ? "academic_hub" : "learning_studio"
                }
                profile={profile}
                courses={courses}
                subjects={subjects}
                syllabusTopics={syllabusTopics}
                assignments={assignments}
                exams={exams}
                studyPlans={studyPlans}
                studySessions={studySessions}
                agentTasks={agentTasks.filter((t) =>
                  ["academic", "study", "tutor", "exam"].includes(t.agentSlug)
                )}
                onRefresh={fetchDashboardData}
                onInvokeCEO={(directive) => handleSendCEOChat(directive)}
              />
            </div>
          )}

        {/* PHASE 6B/7A — CAREER DEPARTMENT (Career, Skill, Project, Opportunity Agents) */}
        {!initialLoading &&
          (activeNav === "career" ||
            activeNav === "projects" ||
            activeNav === "opportunities") && (
            <div className="p-4 sm:p-6 overflow-y-auto">
              <CareerDepartmentStudio
                mode={
                  activeNav === "career"
                    ? "career_studio"
                    : activeNav === "projects"
                    ? "project_lab"
                    : "opportunity_center"
                }
                profile={profile}
                onLaunchCEOObjective={(directive) =>
                  handleSendCEOChat(directive)
                }
                onRefreshDashboard={fetchDashboardData}
              />
            </div>
          )}

        {/* PHASE 7B — INTELLIGENCE DEPARTMENT (Research & Notes Agents) */}
        {!initialLoading && activeNav === "intelligence" && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <IntelligenceDepartmentStudio
              profile={profile}
              onLaunchCEOObjective={(directive) => handleSendCEOChat(directive)}
              onRefreshDashboard={fetchDashboardData}
            />
          </div>
        )}

        {/* PHASE 9 — USER-SCOPED PGVECTOR MEMORY & VOICE INTERACTION STUDIO */}
        {!initialLoading && activeNav === "memory_voice" && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <MemoryVoiceStudio
              profile={profile}
              onLaunchCEOObjective={(directive) => handleSendCEOChat(directive)}
              onRefreshDashboard={fetchDashboardData}
            />
          </div>
        )}

        {/* PHASE 8A — PRODUCTIVITY & COMMUNICATION DEPARTMENT */}
        {!initialLoading && activeNav === "tasks" && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <ProductivityDepartmentStudio
              profile={profile}
              onLaunchCEOObjective={(directive) => handleSendCEOChat(directive)}
              onRefreshDashboard={fetchDashboardData}
            />
          </div>
        )}

        {/* PHASE 8B — STUDENT SUPPORT DEPARTMENT (Performance, Finance & Wellbeing Agents) */}
        {!initialLoading && activeNav === "support" && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <StudentSupportStudio
              profile={profile}
              onLaunchCEOObjective={(directive) => handleSendCEOChat(directive)}
              onRefreshDashboard={fetchDashboardData}
            />
          </div>
        )}

        {/* FR-002 & FR-003: STUDENT PROFILE & ALL 11 ONBOARDING ATTRIBUTES */}
        {!initialLoading && activeNav === "onboarding" && (
          <div className="p-4 sm:p-6 max-w-4xl overflow-y-auto">
            <form
              onSubmit={handleSaveOnboarding}
              className="rounded-card bg-surface border border-border p-6 space-y-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">
                    Student Profile & Onboarding Attributes
                  </h3>
                  <p className="text-xs text-text-secondary">
                    All 11 onboarding attributes are synced with Supabase RLS
                    and loaded into the AI CEO at Step 3 of every orchestration
                    run.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="px-3 py-1.5 rounded-button border border-border text-xs font-semibold text-primary hover:bg-blue-50"
                >
                  Open Step-by-Step Onboarding Wizard →
                </button>
              </div>

              {onboardingSavedMsg && (
                <div className="p-3 rounded-button bg-green-50 border border-green-300 text-green-900 text-xs font-medium">
                  {onboardingSavedMsg}
                </div>
              )}

              {onboardingErrorMsg && (
                <div className="p-3 rounded-button bg-red-50 border border-red-300 text-red-900 text-xs font-medium">
                  {onboardingErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    1. Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.fullName}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        fullName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    2. Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.country}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        country: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    3. College / University *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.institution}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        institution: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    4. Degree *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.degree}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        degree: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    5. Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.department}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    6. Current Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.academicYear}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        academicYear: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    7. Semester (1–16) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    required
                    value={onboardingForm.semester}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        semester: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    10. Preferred Language *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.preferredLanguage}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        preferredLanguage: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    8. Career Interests (comma-separated) *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.careerInterests}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        careerInterests: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    9. Learning Goals *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={onboardingForm.learningGoals}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        learningGoals: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    11. Time Zone *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.timezone}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        timezone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Daily Study Hours Target
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={14}
                    value={onboardingForm.dailyStudyHours}
                    onChange={(e) =>
                      setOnboardingForm({
                        ...onboardingForm,
                        dailyStudyHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-button border border-border text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-button bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {savingProfile
                  ? "Saving Profile..."
                  : "Save & Sync to AI CEO Memory"}
              </button>
            </form>
          </div>
        )}
      </main>
      </div>

      {/* RESPONSIVE MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        activeNav={activeNav}
        onSelectNav={(nav) => setActiveNav(nav)}
        pendingApprovalsCount={pendingApprovals.length}
      />
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-button text-sm font-medium transition ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
      }`}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        <span>{label}</span>
      </span>
      {badge && (
        <span
          className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
            active
              ? "bg-white/20 text-white"
              : "bg-surface-muted text-text-primary"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
