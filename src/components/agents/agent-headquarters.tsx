"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Filter,
  Info,
  Power,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import type {
  AgentDepartment,
  AgentExecutionLimits,
  AgentRunRecord,
  AgentSchemaDescriptor,
  AgentSlug,
  AgentTaskRecord,
} from "@/types/student-os";

export interface RegisteredAgentView {
  id: string;
  slug: AgentSlug;
  name: string;
  description: string;
  department: AgentDepartment;
  systemPrompt: string;
  capabilities: string[];
  allowedTools: string[];
  inputSchemaDescriptor: AgentSchemaDescriptor;
  outputSchemaDescriptor: AgentSchemaDescriptor;
  version: string;
  executionLimits: AgentExecutionLimits;
  enabled: boolean;
  status: "active" | "idle" | "error" | "disabled";
}

interface AgentHeadquartersProps {
  agents: RegisteredAgentView[];
  runs: AgentRunRecord[];
  agentTasks: AgentTaskRecord[];
  onToggleAgentEnabled: (slug: AgentSlug, enabled: boolean) => Promise<void>;
  onInvokeViaCEO: (directive: string) => void;
}

const DEPARTMENT_LABELS: Record<"all" | AgentDepartment, string> = {
  all: "All 16 Agents",
  executive: "Executive (1)",
  academic: "Academic (4)",
  career: "Career & Projects (4)",
  productivity: "Productivity & Research (3)",
  support: "Student Support (3)",
  intelligence: "Intelligence (1)",
};

export function AgentHeadquarters({
  agents,
  runs,
  agentTasks,
  onToggleAgentEnabled,
  onInvokeViaCEO,
}: AgentHeadquartersProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<
    "all" | AgentDepartment
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedAgentSlug, setInspectedAgentSlug] =
    useState<AgentSlug | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<AgentSlug | null>(null);
  const [historyFilterSlug, setHistoryFilterSlug] = useState<
    "all" | AgentSlug
  >("all");

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      if (
        selectedDepartment !== "all" &&
        agent.department !== selectedDepartment
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.id.toLowerCase().includes(q) ||
        agent.description.toLowerCase().includes(q) ||
        agent.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        agent.allowedTools.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [agents, selectedDepartment, searchQuery]);

  const inspectedAgent = useMemo(
    () => agents.find((a) => a.slug === inspectedAgentSlug) || null,
    [agents, inspectedAgentSlug]
  );

  const filteredAgentTasks = useMemo(() => {
    if (historyFilterSlug === "all") return agentTasks;
    return agentTasks.filter((t) => t.agentSlug === historyFilterSlug);
  }, [agentTasks, historyFilterSlug]);

  const enabledCount = agents.filter((a) => a.enabled).length;

  async function handleToggle(agent: RegisteredAgentView) {
    if (agent.slug === "ceo") return; // Central CEO orchestrator stays enabled
    setTogglingSlug(agent.slug);
    try {
      await onToggleAgentEnabled(agent.slug, !agent.enabled);
    } finally {
      setTogglingSlug(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* =====================================================================
          1. HEADQUARTERS HEADER & HONEST CAPABILITY GOVERNANCE BANNER
      ===================================================================== */}
      <div className="rounded-card bg-surface border border-border p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-200 text-xs font-bold uppercase tracking-wider">
                Phase 4 · Agent Registry
              </span>
              <span className="text-xs text-text-secondary">
                Registry Contract v1.0.0
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Student OS Agent Headquarters ({agents.length} Registered Agents)
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl">
              Every agent is registered via its own configuration module in{" "}
              <code className="px-1.5 py-0.5 rounded bg-surface-muted text-xs font-mono">
                src/lib/agents/configs/*.agent.ts
              </code>{" "}
              and implements the shared{" "}
              <code className="px-1.5 py-0.5 rounded bg-surface-muted text-xs font-mono">
                StudentAgent
              </code>{" "}
              TypeScript interface with validated Zod input/output schemas and
              strict execution limits.
            </p>
          </div>

          {/* Registry Telemetry Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-3 rounded-button bg-surface-muted border border-border">
              <p className="text-[11px] text-text-secondary">Registered</p>
              <p className="text-lg font-bold text-text-primary">
                {agents.length} / 16
              </p>
            </div>
            <div className="p-3 rounded-button bg-surface-muted border border-border">
              <p className="text-[11px] text-text-secondary">Enabled</p>
              <p className="text-lg font-bold text-success">{enabledCount}</p>
            </div>
            <div className="p-3 rounded-button bg-surface-muted border border-border">
              <p className="text-[11px] text-text-secondary">CEO Runs</p>
              <p className="text-lg font-bold text-primary">{runs.length}</p>
            </div>
            <div className="p-3 rounded-button bg-surface-muted border border-border">
              <p className="text-[11px] text-text-secondary">Task Executions</p>
              <p className="text-lg font-bold text-text-primary">
                {agentTasks.length}
              </p>
            </div>
          </div>
        </div>

        {/* Honest Capability & Tool Governance Notice */}
        <div className="rounded-button bg-blue-50/70 border border-blue-200 p-3 flex items-start gap-2.5 text-xs text-blue-950">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong>Capability & Tool Transparency:</strong> All 16 agents are
            registered with validated Zod input/output schemas, system prompts,
            and structured CEO orchestration plans. External side-effect tools
            (such as sending external emails or submitting applications) are
            never executed silently—consequential actions are queued in the{" "}
            <strong>Approval Center</strong> for student confirmation.
          </div>
        </div>

        {/* Search & Department Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {(
              Object.keys(DEPARTMENT_LABELS) as Array<"all" | AgentDepartment>
            ).map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-1.5 rounded-button text-xs font-semibold transition ${
                  selectedDepartment === dept
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-muted text-text-secondary hover:text-text-primary border border-border"
                }`}
              >
                {DEPARTMENT_LABELS[dept]}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="h-3.5 w-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by agent, capability, or tool..."
              className="w-full pl-8 pr-3 py-1.5 rounded-button border border-border bg-background text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. 16 REGISTERED AGENTS GRID
      ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredAgents.map((agent) => {
          const agentRunTasks = agentTasks.filter(
            (t) => t.agentSlug === agent.slug
          );
          const lastTask = agentRunTasks[0];
          const isToggling = togglingSlug === agent.slug;

          return (
            <div
              key={agent.id}
              className={`rounded-card bg-surface border p-5 flex flex-col justify-between space-y-4 shadow-xs transition ${
                agent.enabled
                  ? "border-border hover:border-blue-300"
                  : "border-slate-200 opacity-75 bg-slate-50/60"
              }`}
            >
              <div className="space-y-3">
                {/* Top Row: ID, Department & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-200">
                    {agent.department}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        agent.enabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          agent.enabled ? "bg-success" : "bg-slate-500"
                        }`}
                      />
                      {agent.enabled ? `Ready (${agent.status})` : "Disabled"}
                    </span>

                    {agent.slug !== "ceo" && (
                      <button
                        type="button"
                        onClick={() => handleToggle(agent)}
                        disabled={isToggling}
                        title={
                          agent.enabled
                            ? `Disable ${agent.name}`
                            : `Enable ${agent.name}`
                        }
                        className={`p-1 rounded border text-xs transition ${
                          agent.enabled
                            ? "border-border text-text-secondary hover:text-danger hover:border-red-200"
                            : "border-primary text-primary bg-blue-50"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Agent Name, Unique ID & Version */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base text-text-primary">
                      {agent.name}
                    </h3>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary border border-border">
                      v{agent.version}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-text-secondary">
                    ID: {agent.id} · @{agent.slug}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-text-secondary flex items-center justify-between">
                    <span>Capabilities ({agent.capabilities.length})</span>
                    <span className="text-[10px] text-emerald-700 font-normal">
                      CEO Plan Ready
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[11px] px-2 py-0.5 rounded bg-surface-muted text-text-primary border border-border"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Allowed Tools */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-text-secondary flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-primary" />
                    Allowed Tools ({agent.allowedTools.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.allowedTools.map((tool) => (
                      <code
                        key={tool}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Execution Limits Summary */}
                <div className="p-2.5 rounded-button bg-surface-muted/70 border border-border grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-text-secondary block">Max Steps</span>
                    <span className="font-semibold text-text-primary">
                      {agent.executionLimits.maxSteps} steps
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">
                      Token Limit
                    </span>
                    <span className="font-semibold text-text-primary">
                      {agent.executionLimits.maxTokensPerRun} tok
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Timeout</span>
                    <span className="font-semibold text-text-primary">
                      {Math.round(agent.executionLimits.timeoutMs / 1000)}s
                    </span>
                  </div>
                </div>

                {/* Recent Agent Execution Snapshot */}
                <div className="text-[11px] text-text-secondary pt-0.5">
                  {lastTask ? (
                    <div className="p-2 rounded bg-blue-50/40 border border-blue-100 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-text-primary">
                        <span>Last Run ({agentRunTasks.length} total)</span>
                        <span className="text-[10px] text-success uppercase">
                          {lastTask.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[11px]">
                        {lastTask.summary}
                      </p>
                    </div>
                  ) : (
                    <p className="italic text-[11px]">
                      No runs recorded in current session yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInspectedAgentSlug(agent.slug)}
                  className="px-2.5 py-1.5 rounded-button bg-surface-muted hover:bg-slate-200/70 text-text-primary text-xs font-medium flex items-center gap-1 border border-border transition"
                >
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  Inspect Spec
                </button>

                <button
                  type="button"
                  disabled={!agent.enabled}
                  onClick={() =>
                    onInvokeViaCEO(
                      `Coordinate with ${agent.name} to help me with my current semester priorities.`
                    )
                  }
                  className="px-3 py-1.5 rounded-button bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  Invoke via CEO
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          3. RECENT AGENT EXECUTION HISTORY LEDGER
      ===================================================================== */}
      <div className="rounded-card bg-surface border border-border p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Agent Execution History ({filteredAgentTasks.length})
            </h3>
            <p className="text-xs text-text-secondary">
              Real-time audit trail of delegated specialist tasks and direct CEO
              synthesis runs stored in{" "}
              <code className="px-1 py-0.5 rounded bg-surface-muted font-mono">
                agent_runs
              </code>{" "}
              and{" "}
              <code className="px-1 py-0.5 rounded bg-surface-muted font-mono">
                agent_tasks
              </code>
              .
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-text-secondary" />
            <select
              value={historyFilterSlug}
              onChange={(e) =>
                setHistoryFilterSlug(e.target.value as "all" | AgentSlug)
              }
              aria-label="Filter execution history by agent"
              className="px-3 py-1.5 rounded-button border border-border bg-background text-xs text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="all">All Agents ({agentTasks.length})</option>
              {agents.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name} (@{a.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAgentTasks.length === 0 ? (
          <div className="p-6 rounded-button bg-surface-muted border border-border text-center text-xs text-text-secondary">
            No execution records match the selected agent filter yet. Click{" "}
            <strong>Invoke via CEO</strong> on any agent card above to run a
            delegated workflow.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAgentTasks.slice(0, 15).map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-button bg-surface-muted/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-primary border border-blue-200 text-xs font-bold">
                      {task.agentName} (@{task.agentSlug})
                    </span>
                    <span className="text-[11px] font-mono text-text-secondary">
                      Task ID: {task.id}
                    </span>
                    <span className="text-[11px] font-mono text-text-secondary">
                      Run: {task.runId}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-primary">
                    {task.objective}
                  </p>
                  <p className="text-xs text-text-secondary">{task.summary}</p>
                </div>

                <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      task.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : task.status === "waiting_for_approval"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-red-50 text-danger border border-red-200"
                    }`}
                  >
                    {task.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(task.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          4. AGENT SPECIFICATION, SCHEMA & SYSTEM PROMPT INSPECTOR MODAL
      ===================================================================== */}
      {inspectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-surface border border-border rounded-card max-w-3xl w-full max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-primary text-xs font-bold uppercase">
                    {inspectedAgent.department}
                  </span>
                  <span className="text-xs font-mono text-text-secondary">
                    {inspectedAgent.id} · v{inspectedAgent.version}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">
                  {inspectedAgent.name} — Technical Specification
                </h3>
              </div>
              <button
                onClick={() => setInspectedAgentSlug(null)}
                className="p-1.5 rounded-button hover:bg-surface-muted text-text-secondary"
                aria-label="Close inspector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* System Prompt */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-primary" />
                  System Prompt
                </h4>
                <pre className="p-3 rounded-button bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {inspectedAgent.systemPrompt}
                </pre>
              </div>

              {/* Execution Limits */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-primary" />
                  Execution Limits & Governance
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">Max Steps</span>
                    <span className="font-bold text-text-primary">
                      {inspectedAgent.executionLimits.maxSteps}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">
                      Max Tokens / Run
                    </span>
                    <span className="font-bold text-text-primary">
                      {inspectedAgent.executionLimits.maxTokensPerRun} tokens
                    </span>
                  </div>
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">Timeout</span>
                    <span className="font-bold text-text-primary">
                      {inspectedAgent.executionLimits.timeoutMs} ms
                    </span>
                  </div>
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">
                      Max Concurrent Tasks
                    </span>
                    <span className="font-bold text-text-primary">
                      {inspectedAgent.executionLimits.maxConcurrentTasks}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">Cooldown</span>
                    <span className="font-bold text-text-primary">
                      {inspectedAgent.executionLimits.cooldownSeconds}s
                    </span>
                  </div>
                  <div className="p-2.5 rounded-button bg-surface-muted border border-border">
                    <span className="text-text-secondary block">
                      External Approval Gate
                    </span>
                    <span className="font-bold text-success">
                      {inspectedAgent.executionLimits
                        .requiresApprovalForExternalActions
                        ? "Enforced"
                        : "Standard"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input & Output Schemas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-button bg-surface-muted border border-border space-y-2">
                  <p className="font-bold text-text-primary">
                    Input Schema:{" "}
                    <code className="text-primary">
                      {inspectedAgent.inputSchemaDescriptor.name}
                    </code>
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {inspectedAgent.inputSchemaDescriptor.description}
                  </p>
                  <div className="space-y-1 pt-1">
                    {Object.entries(
                      inspectedAgent.inputSchemaDescriptor.fields
                    ).map(([field, typeDesc]) => (
                      <div
                        key={field}
                        className="p-1.5 rounded bg-surface border border-border flex flex-col"
                      >
                        <span className="font-mono font-semibold text-text-primary">
                          {field}
                          {inspectedAgent.inputSchemaDescriptor.requiredFields.includes(
                            field
                          ) && <span className="text-danger ml-1">*</span>}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono">
                          {typeDesc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-button bg-surface-muted border border-border space-y-2">
                  <p className="font-bold text-text-primary">
                    Output Schema:{" "}
                    <code className="text-primary">
                      {inspectedAgent.outputSchemaDescriptor.name}
                    </code>
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {inspectedAgent.outputSchemaDescriptor.description}
                  </p>
                  <div className="space-y-1 pt-1">
                    {Object.entries(
                      inspectedAgent.outputSchemaDescriptor.fields
                    ).map(([field, typeDesc]) => (
                      <div
                        key={field}
                        className="p-1.5 rounded bg-surface border border-border flex flex-col"
                      >
                        <span className="font-mono font-semibold text-text-primary">
                          {field}
                          {inspectedAgent.outputSchemaDescriptor.requiredFields.includes(
                            field
                          ) && <span className="text-danger ml-1">*</span>}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono">
                          {typeDesc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-surface-muted flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                Config File:{" "}
                <code className="font-mono">
                  src/lib/agents/configs/{inspectedAgent.slug}.agent.ts
                </code>
              </span>
              <button
                onClick={() => {
                  const targetName = inspectedAgent.name;
                  setInspectedAgentSlug(null);
                  onInvokeViaCEO(
                    `Delegate a task to ${targetName} based on my current semester context.`
                  );
                }}
                className="px-4 py-2 rounded-button bg-primary text-white text-xs font-semibold"
              >
                Delegate to {inspectedAgent.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

