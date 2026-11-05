"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  HeartPulse,
  Loader2,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import type {
  AgentResult,
  AgentTaskRecord,
  DashboardMetrics,
  StudentProfile,
} from "@/types/student-os";

interface FinanceExpense {
  id: string;
  title: string;
  category: "essentials" | "academics" | "lifestyle" | "savings";
  amount: number;
  date: string;
}

interface WellbeingCheckin {
  id: string;
  energyLevel: number;
  sleepHours: number;
  stressLevel: "low" | "moderate" | "high";
  notes: string;
  createdAt: string;
}

interface StudentSupportStudioProps {
  profile: StudentProfile | null;
  onLaunchCEOObjective: (objective: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

export function StudentSupportStudio({
  profile,
  onLaunchCEOObjective,
  onRefreshDashboard,
}: StudentSupportStudioProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState(15000);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [wellbeingCheckins, setWellbeingCheckins] = useState<
    WellbeingCheckin[]
  >([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);

  const [activeAgentResult, setActiveAgentResult] =
    useState<AgentResult | null>(null);
  const [runningAgentSlug, setRunningAgentSlug] = useState<string | null>(null);
  const [agentObjective, setAgentObjective] = useState(
    "Analyze my syllabus completion velocity, monthly student budget runway, and sleep sustainability to prevent exam burnout"
  );

  // Expense form
  const [expTitle, setExpTitle] = useState("");
  const [expCategory, setExpCategory] =
    useState<FinanceExpense["category"]>("academics");
  const [expAmount, setExpAmount] = useState(650);

  // Wellbeing check-in form
  const [energyLevel, setEnergyLevel] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [stressLevel, setStressLevel] =
    useState<WellbeingCheckin["stressLevel"]>("low");
  const [wbNotes, setWbNotes] = useState("");

  async function loadSupportData() {
    setErrorMsg("");
    try {
      const res = await fetch("/api/student-support");
      if (!res.ok)
        throw new Error("Failed to load Student Support Department data.");
      const data = await res.json();
      setMetrics(data.metrics || null);
      setMonthlyBudget(data.financeLedger?.monthlyBudget || 15000);
      setExpenses(data.financeLedger?.expenses || []);
      setWellbeingCheckins(data.wellbeingCheckins || []);
      setAgentTasks(data.agentTasks || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error loading support data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData();
  }, []);

  async function handleRunAgent(
    agentSlug: "performance" | "finance" | "wellbeing",
    customObjective?: string
  ) {
    const objectiveToRun = (customObjective || agentObjective).trim();
    if (!objectiveToRun) return;
    setRunningAgentSlug(agentSlug);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/student-support", {
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
        `${data.agentName || agentSlug} completed analysis and logged structured recommendations.`
      );
      await loadSupportData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setRunningAgentSlug(null);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/student-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_expense",
          title: expTitle.trim(),
          category: expCategory,
          amount: Number(expAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log expense.");
      setExpTitle("");
      setExpenses(data.financeLedger?.expenses || []);
      setSuccessMsg("Recorded expense in student finance ledger.");
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Expense log failed.");
    }
  }

  async function handleRecordWellbeing(e: React.FormEvent) {
    e.preventDefault();
    if (!wbNotes.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/student-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_wellbeing_checkin",
          energyLevel: Number(energyLevel),
          sleepHours: Number(sleepHours),
          stressLevel,
          notes: wbNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save check-in.");
      setWbNotes("");
      setWellbeingCheckins(data.wellbeingCheckins || []);
      setSuccessMsg("Logged daily wellbeing and sleep check-in.");
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Check-in failed.");
    }
  }

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = Math.max(0, monthlyBudget - totalSpent);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">
          Loading Student Support Department Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-2">
            <HeartPulse className="w-3.5 h-3.5" />
            STUDENT SUPPORT • PERFORMANCE, FINANCE & WELLBEING AGENTS
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Performance Analytics, Budget Runway & Sustainable Routine Studio
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Grounded database metrics, student budget tracking, and non-clinical
            study sustainability routines for {profile?.fullName || "Student"}.
          </p>
        </div>

        <button
          onClick={() =>
            onLaunchCEOObjective(
              "Coordinate Performance, Finance, and Wellbeing agents to review my weekly execution velocity, budget runway, and study-rest balance."
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Holistic Review via AI CEO
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

      {/* Grounded Performance Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Syllabus Mastery</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {metrics?.overallSyllabusCompletionPct ?? 0}%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Across {metrics?.activeSubjectsCount ?? 0} active subjects
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Goal Progress Avg</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {metrics?.averageGoalProgressPct ?? 0}%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.completedTasksCount ?? 0} tasks completed
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Budget Left</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{remainingBudget.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Spent ₹{totalSpent.toLocaleString()} of ₹
            {monthlyBudget.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Latest Sleep & Energy</span>
            <HeartPulse className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {wellbeingCheckins[0]?.sleepHours ?? 7.5}h •{" "}
            {wellbeingCheckins[0]?.energyLevel ?? 4}/5
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
            Stress: {wellbeingCheckins[0]?.stressLevel ?? "low"}
          </p>
        </div>
      </div>

      {/* Direct Agent Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={agentObjective}
            onChange={(e) => setAgentObjective(e.target.value)}
            placeholder="Objective for Performance, Finance, or Wellbeing Agent..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
          />
          {(
            [
              { slug: "performance", label: "Run Performance Agent" },
              { slug: "finance", label: "Run Finance Agent" },
              { slug: "wellbeing", label: "Run Wellbeing Agent" },
            ] as const
          ).map((btn) => (
            <button
              key={btn.slug}
              disabled={runningAgentSlug !== null}
              onClick={() => handleRunAgent(btn.slug)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold transition"
            >
              {runningAgentSlug === btn.slug ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {btn.label}
            </button>
          ))}
        </div>

        {activeAgentResult && (
          <div className="rounded-xl bg-teal-50/60 border border-teal-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Structured Support Output ({activeAgentResult.status})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
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

      {/* Finance & Wellbeing Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Finance Ledger */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-600" />
              Student Budget & Expense Ledger
            </h3>
            <span className="text-[11px] text-slate-500">
              50/30/20 Educational Budgeting
            </span>
          </div>

          <form
            onSubmit={handleAddExpense}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80"
          >
            <input
              type="text"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="Expense item (e.g., Textbooks, Mess)"
              className="sm:col-span-5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
            />
            <select
              value={expCategory}
              onChange={(e) =>
                setExpCategory(e.target.value as FinanceExpense["category"])
              }
              className="sm:col-span-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
            >
              <option value="essentials">Essentials</option>
              <option value="academics">Academics</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="savings">Savings</option>
            </select>
            <input
              type="number"
              min={1}
              value={expAmount}
              onChange={(e) => setExpAmount(Number(e.target.value))}
              className="sm:col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log
            </button>
          </form>

          <div className="space-y-2">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-xl border border-slate-200 p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {exp.title}
                  </span>
                  <span className="ml-2 text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    {exp.category}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  ₹{exp.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wellbeing & Study Sustainability */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Wellbeing & Study Sustainability Check-In
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Non-Clinical Routine Guide
            </span>
          </div>

          <form
            onSubmit={handleRecordWellbeing}
            className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80"
          >
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Energy (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Sleep Hours
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={1}
                  max={14}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Stress Level
                </label>
                <select
                  value={stressLevel}
                  onChange={(e) =>
                    setStressLevel(
                      e.target.value as WellbeingCheckin["stressLevel"]
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <input
              type="text"
              value={wbNotes}
              onChange={(e) => setWbNotes(e.target.value)}
              placeholder="Routine reflection (e.g., Completed 2 Pomodoro blocks, took 20m walk)..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Check-In
            </button>
          </form>

          <div className="space-y-2">
            {wellbeingCheckins.map((wb) => (
              <div
                key={wb.id}
                className="rounded-xl border border-slate-200 p-3 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Energy {wb.energyLevel}/5 • Sleep {wb.sleepHours}h
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                    Stress: {wb.stressLevel}
                  </span>
                </div>
                <p className="text-slate-600">{wb.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Student Support Execution History ({agentTasks.length})
        </h3>
        {agentTasks.length === 0 ? (
          <p className="text-xs text-slate-500">
            No Performance, Finance, or Wellbeing agent runs recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {agentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200/80 p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold uppercase text-teal-700 mr-2">
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
