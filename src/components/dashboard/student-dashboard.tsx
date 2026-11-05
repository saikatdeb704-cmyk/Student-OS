"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type {
  AgentRunRecord,
  AgentTaskRecord,
  ApprovalItem,
  DashboardMetrics,
  GoalItem,
  ProjectItem,
  StudentProfile,
  SubjectItem,
  TaskItem,
  UpcomingDeadlineItem,
} from "@/types/student-os";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface StudentDashboardProps {
  profile: StudentProfile | null;
  metrics: DashboardMetrics;
  todaysTasks: TaskItem[];
  upcomingDeadlines: UpcomingDeadlineItem[];
  goals: GoalItem[];
  subjects: SubjectItem[];
  projects: ProjectItem[];
  runs: AgentRunRecord[];
  agentTasks: AgentTaskRecord[];
  approvals: ApprovalItem[];
  onToggleTask: (task: TaskItem) => Promise<void>;
  onCreateTask: (title: string, priority: TaskItem["priority"]) => Promise<void>;
  onApprovalDecision: (
    approvalId: string,
    decision: "approved" | "rejected"
  ) => Promise<void>;
  onNavigate: (
    section:
      | "overview"
      | "ceo"
      | "agents"
      | "academic"
      | "learning"
      | "career"
      | "projects"
      | "opportunities"
      | "tasks"
      | "onboarding"
  ) => void;
  onTriggerCEODirective: (directive: string) => void;
}

export function StudentDashboard({
  profile,
  metrics,
  todaysTasks,
  upcomingDeadlines,
  goals,
  subjects,
  projects,
  runs,
  agentTasks,
  approvals,
  onToggleTask,
  onCreateTask,
  onApprovalDecision,
  onNavigate,
  onTriggerCEODirective,
}: StudentDashboardProps) {
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] =
    useState<TaskItem["priority"]>("high");
  const [addingTask, setAddingTask] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const activeGoals = goals.filter((g) => g.status === "active");

  async function handleQuickTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTaskTitle.trim() || addingTask) return;
    setAddingTask(true);
    try {
      await onCreateTask(quickTaskTitle.trim(), quickTaskPriority);
      setQuickTaskTitle("");
    } finally {
      setAddingTask(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* =====================================================================
          WIDGET 1: WELCOME MESSAGE & LIVE DATABASE KPI STRIP
         ===================================================================== */}
      <section
        aria-label="Welcome Message"
        className="rounded-card bg-surface border border-border p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                Student OS Executive Overview · {profile?.country} (
                {profile?.timezone})
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
              Welcome back, {profile?.fullName}.
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl">
              {profile?.degree} in {profile?.department} ({profile?.academicYear}
              , Semester {profile?.semester}) at {profile?.institution}. Target
              Focus:{" "}
              <span className="font-semibold text-text-primary">
                {profile?.careerInterests?.join(", ") || profile?.careerGoal}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() =>
                onTriggerCEODirective(
                  "Generate my daily executive briefing and prioritise today's study blocks and deadlines"
                )
              }
            >
              <Sparkles className="h-4 w-4" />
              Run Daily CEO Briefing
            </Button>
            <Button
              variant="secondary"
              onClick={() => onNavigate("onboarding")}
            >
              Profile Settings
            </Button>
          </div>
        </div>

        {/* Dynamic KPI Strip Computed Strictly from Database Records */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border">
          <div className="p-3.5 rounded-button bg-surface-muted/70 border border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase">
              <span>Today&apos;s Tasks</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {metrics.todaysTasksCount}
            </p>
            <p className="text-xs text-text-secondary">
              {metrics.openTasksCount} open · {metrics.completedTasksCount}{" "}
              completed
            </p>
          </div>

          <div className="p-3.5 rounded-button bg-surface-muted/70 border border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase">
              <span>Academic Mastery</span>
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {metrics.overallSyllabusCompletionPct}%
            </p>
            <p className="text-xs text-text-secondary">
              Across {metrics.activeSubjectsCount} active semester subjects
            </p>
          </div>

          <div className="p-3.5 rounded-button bg-surface-muted/70 border border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase">
              <span>Upcoming Deadlines</span>
              <CalendarClock className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {metrics.upcomingDeadlinesCount}
            </p>
            <p className="text-xs text-text-secondary">
              Assignments, exams & dated tasks
            </p>
          </div>

          <div className="p-3.5 rounded-button bg-surface-muted/70 border border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase">
              <span>Agent Activity</span>
              <Cpu className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {metrics.recentAgentRunsCount} Runs
            </p>
            <p className="text-xs text-text-secondary">
              {metrics.registeredAgentsCount} agents ·{" "}
              {metrics.pendingApprovalsCount} pending approval
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          WIDGET 2: QUICK ACTIONS BAR
         ===================================================================== */}
      <section
        aria-label="Quick Actions"
        className="rounded-card bg-surface border border-border p-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Zap className="h-4 w-4 text-primary" />
            <span>Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onTriggerCEODirective(
                  "Analyse my syllabus progress and create a 7-day study schedule"
                )
              }
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Plan Study Schedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onTriggerCEODirective(
                  "Generate a mock exam quiz and revision checklist for my next upcoming exam"
                )
              }
            >
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              Prep for Next Exam
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onTriggerCEODirective(
                  "Review my active portfolio projects and propose the next engineering milestone"
                )
              }
            >
              <FolderGit2 className="h-3.5 w-3.5 text-primary" />
              Scope Project Milestone
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("agents")}
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              View All {metrics.registeredAgentsCount} Agents
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ROW 1: TODAY'S TASKS (WIDGET 3) & UPCOMING DEADLINES (WIDGET 4)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 3: TODAY'S TASKS */}
        <section
          aria-label="Today's Tasks"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-text-primary">
                  Today&apos;s Tasks ({todaysTasks.length})
                </h4>
                <p className="text-xs text-text-secondary">
                  High-priority and due-today execution items from your task
                  queue
                </p>
              </div>
              <button
                onClick={() => onNavigate("tasks")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Full Task Center →
              </button>
            </div>

            <form onSubmit={handleQuickTaskSubmit} className="flex gap-2">
              <Input
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Quick-add a task for today..."
                className="flex-1"
              />
              <select
                value={quickTaskPriority}
                onChange={(e) =>
                  setQuickTaskPriority(e.target.value as TaskItem["priority"])
                }
                className="px-2.5 py-2 rounded-button border border-border text-xs bg-surface"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button type="submit" size="sm" disabled={addingTask}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>

            {todaysTasks.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">
                All tasks for today are complete. Add a new task above or ask
                your AI CEO to generate a study plan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {todaysTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onToggleTask(task)}
                    className="p-3 rounded-button border border-border hover:bg-surface-muted cursor-pointer transition flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-border text-primary"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-text-secondary truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              task.priority === "critical"
                                ? "danger"
                                : task.priority === "high"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {task.priority}
                          </Badge>
                          {task.sourceAgent && (
                            <span className="text-[11px] text-text-secondary">
                              via @{task.sourceAgent}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* WIDGET 4: UPCOMING DEADLINES */}
        <section
          aria-label="Upcoming Deadlines"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-text-primary">
                Upcoming Deadlines ({upcomingDeadlines.length})
              </h4>
              <p className="text-xs text-text-secondary">
                Unified timeline across assignments, examinations, and dated
                tasks
              </p>
            </div>
            <button
              onClick={() => onNavigate("academic")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Academic Hub →
            </button>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-text-secondary py-4 text-center">
              No upcoming deadlines recorded.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcomingDeadlines.slice(0, 6).map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="p-3 rounded-button border border-border bg-surface-muted/40 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          item.kind === "exam"
                            ? "danger"
                            : item.kind === "assignment"
                            ? "warning"
                            : "default"
                        }
                      >
                        {item.kind.toUpperCase()}
                      </Badge>
                      {item.subjectCode && (
                        <span className="text-xs font-bold text-primary">
                          {item.subjectCode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.title}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        item.daysRemaining <= 2
                          ? "text-danger"
                          : item.daysRemaining <= 7
                          ? "text-warning"
                          : "text-text-primary"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {item.daysRemaining === 0
                        ? "Due Today"
                        : `${item.daysRemaining}d left`}
                    </span>
                    <p className="text-[11px] text-text-secondary">
                      {new Date(item.dueAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================================
          ROW 2: ACADEMIC PROGRESS (WIDGET 5) & ACTIVE GOALS (WIDGET 6)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 5: ACADEMIC PROGRESS */}
        <section
          aria-label="Academic Progress"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-text-primary">
                Academic Progress (Semester {profile?.semester})
              </h4>
              <p className="text-xs text-text-secondary">
                Calculated from completed syllabus units across{" "}
                {subjects.length} subjects
              </p>
            </div>
            <Badge variant="default">
              Overall: {metrics.overallSyllabusCompletionPct}%
            </Badge>
          </div>

          <div className="space-y-3.5">
            {subjects.map((subj) => (
              <div
                key={subj.id}
                className="p-3 rounded-button border border-border space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-primary">{subj.code}</span>{" "}
                    <span className="font-medium text-text-primary">
                      {subj.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {subj.completedTopicsCount}/{subj.totalTopicsCount} units (
                    {subj.completionPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${subj.completionPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>{subj.credits} Credits</span>
                  <span>
                    {subj.pendingAssignments} pending assignment(s)
                    {subj.nextExamDate
                      ? ` · Exam ${new Date(
                          subj.nextExamDate
                        ).toLocaleDateString()}`
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WIDGET 6: ACTIVE GOALS */}
        <section
          aria-label="Active Goals"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-text-primary">
                Active Goals ({activeGoals.length})
              </h4>
              <p className="text-xs text-text-secondary">
                Average goal completion: {metrics.averageGoalProgressPct}%
              </p>
            </div>
            <Target className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-3.5 rounded-button border border-border bg-surface-muted/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="default">{goal.category.toUpperCase()}</Badge>
                  <span className="text-xs font-bold text-primary">
                    {goal.progress}%
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  {goal.title}
                </p>
                {goal.description && (
                  <p className="text-xs text-text-secondary">
                    {goal.description}
                  </p>
                )}
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-secondary">
                  Target Date: {goal.targetDate}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =====================================================================
          ROW 3: ACTIVE PROJECTS (WIDGET 7) & RECENT AGENT ACTIVITY (WIDGET 8)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 7: ACTIVE PROJECTS */}
        <section
          aria-label="Active Projects"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-text-primary">
                Active Portfolio Projects ({projects.length})
              </h4>
              <p className="text-xs text-text-secondary">
                Tracked by Project Agent (#08) in the Project Lab
              </p>
            </div>
            <button
              onClick={() => onNavigate("projects")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Project Lab →
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-button border border-border space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      proj.status === "in_progress" ? "default" : "secondary"
                    }
                  >
                    {proj.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  {proj.repositoryUrl && (
                    <a
                      href={proj.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Repository
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <h5 className="font-bold text-sm text-text-primary">
                  {proj.title}
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {proj.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded bg-surface-muted text-[11px] font-medium text-text-primary"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WIDGET 8: RECENT AGENT ACTIVITY & APPROVAL GATE */}
        <section
          aria-label="Recent Agent Activity"
          className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-text-primary">
                Recent Agent Activity ({agentTasks.length} Tasks · {runs.length}{" "}
                Runs)
              </h4>
              <p className="text-xs text-text-secondary">
                Observable execution trace from `agent_runs` and `agent_tasks`
              </p>
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </div>

          {/* Pending Approvals Banner if any */}
          {pendingApprovals.map((appr) => (
            <div
              key={appr.id}
              className="p-3.5 rounded-button border border-amber-300 bg-amber-50/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  Approval Required · @{appr.agentSlug}
                </span>
                <Badge variant="warning">Pending</Badge>
              </div>
              <p className="text-xs font-semibold text-amber-950">
                {appr.title}
              </p>
              <p className="text-[11px] text-amber-900">{appr.description}</p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onApprovalDecision(appr.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onApprovalDecision(appr.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}

          {/* Recent Agent Tasks */}
          <div className="space-y-2.5">
            {agentTasks.slice(0, 5).map((atask) => (
              <div
                key={atask.id}
                className="p-3 rounded-button border border-border bg-surface-muted/40 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    {atask.agentName} (@{atask.agentSlug})
                  </span>
                  <Badge
                    variant={
                      atask.status === "completed"
                        ? "success"
                        : atask.status === "waiting_for_approval"
                        ? "warning"
                        : "default"
                    }
                  >
                    {atask.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-text-primary">
                  {atask.summary || atask.objective}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {new Date(atask.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-1 flex justify-end">
            <button
              onClick={() => onNavigate("ceo")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Open CEO Command Center
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

