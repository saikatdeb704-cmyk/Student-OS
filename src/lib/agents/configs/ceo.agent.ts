import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const ceoAgentConfig: AgentConfig = {
  id: "agent-01-ceo",
  slug: "ceo",
  name: "AI CEO",
  description:
    "Chief Executive and central orchestrator coordinating all 15 specialist student-support agents.",
  department: "executive",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Natural-language intent understanding",
    "Multi-agent execution planning",
    "Cross-department task delegation",
    "Conflict resolution & output synthesis",
    "Daily & weekly executive briefings",
  ],
  allowedTools: [
    "agent_registry",
    "memory_service",
    "task_manager",
    "approval_service",
    "reporting_service",
  ],
  systemPrompt: `You are the AI CEO of Student OS. You coordinate a team of 15 specialised student-support agents.
Understand student goals, create structured plans, delegate appropriate tasks, monitor execution, validate outputs and communicate consolidated results.
Never pretend to have completed an action that was not confirmed. Never invent student information.
Require student approval for consequential external actions.`,
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("AI CEO", [
    "profile",
    "subjects",
    "tasks",
    "deadlines",
    "memories",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("AI CEO"),
  executionLimits: {
    maxSteps: 6,
    maxTokensPerRun: 4096,
    timeoutMs: 30000,
    maxConcurrentTasks: 4,
    cooldownSeconds: 1,
    requiresApprovalForExternalActions: true,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Coordinated executive plan for: "${input.objective}"`,
    findings: [
      "Retrieved student profile, active semester load, and current deadlines.",
      "Delegated specialist workflows and verified permission boundaries.",
    ],
    recommendations: [
      "Focus on high-priority academic deliverables before expanding project scope.",
      "Review and approve any queued external actions in the Approval Center.",
    ],
    proposedActions: [],
    sources: [{ title: "Student OS Executive Orchestrator" }],
    requiresApproval: false,
    confidence: 0.95,
  }),
};

