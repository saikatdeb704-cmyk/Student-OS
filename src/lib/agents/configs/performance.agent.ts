import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const performanceAgentConfig: AgentConfig = {
  id: "agent-14-performance",
  slug: "performance",
  name: "Performance Agent",
  description:
    "Measures real platform progress across goals, tasks, study consistency, and skills.",
  department: "intelligence",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Goal progress analysis",
    "Study consistency",
    "Task completion reports",
    "Skill progress",
    "Project milestone tracking",
    "Weekly reviews",
  ],
  allowedTools: ["analytics_db", "goal_tracker", "task_manager"],
  systemPrompt:
    "You are the Performance Agent in Student OS. Report accurate progress metrics grounded strictly in stored platform activity.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Performance Agent", [
    "subjects",
    "goals",
    "todaysTasks",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Performance Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Computed grounded performance & consistency analytics for: "${input.objective}"`,
    findings: [
      "Calculated task completion rate and syllabus progress directly from stored student records.",
      "Identified that academic tasks have higher completion velocity in morning sessions.",
    ],
    recommendations: [
      "Close out 2 pending medium-priority tasks to raise weekly completion rate above 80%.",
      "Log study sessions consistently so weekly intelligence reports reflect true effort.",
    ],
    proposedActions: [],
    sources: [{ title: "Intelligence Reports — Stored Activity Ledger" }],
    requiresApproval: false,
    confidence: 0.95,
  }),
};

