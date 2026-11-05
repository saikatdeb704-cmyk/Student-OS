"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import type {
  AgentResult,
  AgentTaskRecord,
  ApprovalItem,
  GoalItem,
  StudentProfile,
  TaskItem,
} from "@/types/student-os";

interface ProductivityDepartmentStudioProps {
  profile: StudentProfile | null;
  onLaunchCEOObjective: (objective: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

export function ProductivityDepartmentStudio({
  profile,
  onLaunchCEOObjective,
  onRefreshDashboard,
}: ProductivityDepartmentStudioProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);

  const [activeAgentResult, setActiveAgentResult] =
    useState<AgentResult | null>(null);
  const [runningAgentSlug, setRunningAgentSlug] = useState<string | null>(null);
  const [agentObjective, setAgentObjective] = useState(
    "Prioritize my open tasks using an Eisenhower matrix and create a 3.5-hour deep-work schedule for today"
  );

  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskItem["priority"]>("high");
  const [taskDue, setTaskDue] = useState("");

  // Goal form
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] =
    useState<GoalItem["category"]>("academic");
  const [goalTargetDate, setGoalTargetDate] = useState("2026-06-30");

  // Communication Draft Form (Approval-Gated)
  const [commRecipient, setCommRecipient] = useState(
    "Prof. R. Subramanian (Research Lab Advisor)"
  );
  const [commSubject, setCommSubject] = useState(
    "Request for Undergraduate AI Systems Research Mentorship"
  );
  const [commObjective, setCommObjective] = useState(
    "Highlight my 9.1 CGPA, Distributed RAG project, and request a 15-minute office-hours slot next week."
  );
  const [draftingComm, setDraftingComm] = useState(false);

  async function loadProductivityData() {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity");
      if (!res.ok)
        throw new Error("Failed to load Productivity Department data.");
      const data = await res.json();
      setTasks(data.tasks || []);
      setGoals(data.goals || []);
      setApprovals(data.approvals || []);
      setAgentTasks(data.agentTasks || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error loading productivity data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductivityData();
  }, []);

  async function handleRunAgent(
    agentSlug: "productivity" | "communication",
    customObjective?: string
  ) {
    const objectiveToRun = (customObjective || agentObjective).trim();
    if (!objectiveToRun) return;
    setRunningAgentSlug(agentSlug);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_agent",
          agentSlug,
          objective: objectiveToRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent execution failed.");
      setActiveAgentResult(data.result);
      setSuccessMsg(
        `${data.agentName || agentSlug} completed execution and saved structured actions.`
      );
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setRunningAgentSlug(null);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_task",
          title: taskTitle.trim(),
          priority: taskPriority,
          dueAt: taskDue ? new Date(taskDue).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task.");
      setTaskTitle("");
      setTaskDue("");
      setSuccessMsg(`Created task "${data.task.title}".`);
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Task creation failed.");
    }
  }

  async function handleUpdateTaskStatus(
    taskId: string,
    status: TaskItem["status"]
  ) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_task_status",
          taskId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update task status.");
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_task",
          taskId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete task.");
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_goal",
          title: goalTitle.trim(),
          category: goalCategory,
          targetDate: goalTargetDate,
          progress: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create goal.");
      setGoalTitle("");
      setSuccessMsg(`Created active goal "${data.goal.title}".`);
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Goal creation failed.");
    }
  }

  async function handleUpdateGoalProgress(goalId: string, progress: number) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_goal_progress",
          goalId,
          progress,
        }),
      });
      if (!res.ok) throw new Error("Failed to update goal progress.");
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Goal update failed.");
    }
  }

  async function handleDraftCommunication(e: React.FormEvent) {
    e.preventDefault();
    if (!commRecipient.trim() || !commSubject.trim() || !commObjective.trim())
      return;
    setDraftingComm(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_communication",
          recipient: commRecipient.trim(),
          subject: commSubject.trim(),
          objective: commObjective.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Drafting failed.");
      setActiveAgentResult(data.result);
      setSuccessMsg(
        `Communication Agent generated draft for ${commRecipient} and queued it in the Approval Gate.`
      );
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Drafting failed.");
    } finally {
      setDraftingComm(false);
    }
  }

  async function handleDecideApproval(
    approvalId: string,
    decision: "approved" | "rejected"
  ) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decide_approval",
          approvalId,
          decision,
        }),
      });
      if (!res.ok) throw new Error("Failed to record approval decision.");
      setSuccessMsg(`Recorded approval decision: ${decision.toUpperCase()}.`);
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Approval failed.");
    }
  }

  async function handleCancelApproval(approvalId: string) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_approval",
          approvalId,
        }),
      });
      if (!res.ok) throw new Error("Failed to cancel approval request.");
      setSuccessMsg("Approval request successfully cancelled by student.");
      await loadProductivityData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cancellation failed.");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">
          Loading Productivity & Communication Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-2">
            <CalendarCheck className="w-3.5 h-3.5" />
            PRODUCTIVITY DEPARTMENT • PRODUCTIVITY AGENT & COMMUNICATION AGENT
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Daily Execution, Goals & Approval-Gated Communication Center
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage Eisenhower tasks, track milestone goals, and draft outreach
            messages with mandatory student approval before external send.
          </p>
        </div>

        <button
          onClick={() =>
            onLaunchCEOObjective(
              "Coordinate Productivity Agent and Communication Agent to optimize my daily schedule and prepare a professor research outreach draft."
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Coordinate via AI CEO
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Direct Agent Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={agentObjective}
            onChange={(e) => setAgentObjective(e.target.value)}
            placeholder="Objective for Productivity Agent or Communication Agent..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
          />
          <button
            disabled={runningAgentSlug !== null}
            onClick={() => handleRunAgent("productivity")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            {runningAgentSlug === "productivity" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Productivity Agent
          </button>
          <button
            disabled={runningAgentSlug !== null}
            onClick={() => handleRunAgent("communication")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            {runningAgentSlug === "communication" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Communication Agent
          </button>
        </div>

        {activeAgentResult && (
          <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Structured Agent Output ({activeAgentResult.status})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                Confidence: {Math.round(activeAgentResult.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeAgentResult.summary}
            </p>
            {activeAgentResult.recommendations.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-700 pt-1">
                {activeAgentResult.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Tasks & Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tasks Column */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
            Actionable Tasks ({tasks.length})
          </h3>

          <form
            onSubmit={handleCreateTask}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80"
          >
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="New task title..."
              className="sm:col-span-6 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <select
              value={taskPriority}
              onChange={(e) =>
                setTaskPriority(e.target.value as TaskItem["priority"])
              }
              className="sm:col-span-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No tasks in your queue. Add a task above.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2 bg-slate-50/40"
                >
                  <div className="space-y-0.5">
                    <p
                      className={`text-xs font-semibold ${
                        t.status === "completed"
                          ? "line-through text-slate-400"
                          : "text-slate-900"
                      }`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[10px] font-bold uppercase text-indigo-600">
                      Priority: {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        handleUpdateTaskStatus(
                          t.id,
                          e.target.value as TaskItem["status"]
                        )
                      }
                      className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals Column */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Semester & Career Goals ({goals.length})
          </h3>

          <form
            onSubmit={handleCreateGoal}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80"
          >
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="New milestone goal..."
              className="sm:col-span-5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <select
              value={goalCategory}
              onChange={(e) =>
                setGoalCategory(e.target.value as GoalItem["category"])
              }
              className="sm:col-span-4 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
            >
              <option value="academic">Academic</option>
              <option value="career">Career</option>
              <option value="skill">Skill</option>
              <option value="project">Project</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Goal
            </button>
          </form>

          {goals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No active goals yet.
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-slate-200 p-3.5 space-y-2 bg-slate-50/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mr-2">
                        {g.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {g.title}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      {g.progress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={g.progress}
                    onChange={(e) =>
                      handleUpdateGoalProgress(g.id, Number(e.target.value))
                    }
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Communication Studio & Approval Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            Communication Agent Outreach Drafter
          </h3>
          <p className="text-xs text-slate-500">
            Drafts professor emails, cold outreach, and interview follow-ups.
            Every outbound communication is automatically routed to the Approval
            Gate.
          </p>
          <form onSubmit={handleDraftCommunication} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Recipient
              </label>
              <input
                type="text"
                value={commRecipient}
                onChange={(e) => setCommRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Key Points & Context
              </label>
              <textarea
                rows={3}
                value={commObjective}
                onChange={(e) => setCommObjective(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={draftingComm}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
            >
              {draftingComm ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              Draft & Queue for Student Approval
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Human-in-the-Loop Approval Gate ({approvals.length})
          </h3>
          {approvals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No pending approval items.
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {app.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {app.classification || "Approval Required"}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                          app.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : app.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : app.status === "cancelled"
                            ? "bg-slate-100 text-slate-600 border border-slate-300"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{app.description}</p>
                  {app.expiresAt && (
                    <div className="text-[11px] text-slate-400">
                      TTL Expiration: {new Date(app.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  {app.status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDecideApproval(app.id, "approved")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Approve Action
                      </button>
                      <button
                        onClick={() => handleDecideApproval(app.id, "rejected")}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleCancelApproval(app.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Productivity & Communication Execution History ({agentTasks.length})
        </h3>
        {agentTasks.length === 0 ? (
          <p className="text-xs text-slate-500">
            No Productivity or Communication agent runs recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {agentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200/80 p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold uppercase text-indigo-700 mr-2">
                    [{task.agentSlug}]
                  </span>
                  <span className="font-semibold text-slate-900">
                    {task.objective}
                  </span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
