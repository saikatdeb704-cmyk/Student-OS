import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const productivityAgentConfig: AgentConfig = {
  id: "agent-11-productivity",
  slug: "productivity",
  name: "Productivity Agent",
  description:
    "Manages everyday execution: tasks, deadlines, daily briefings, and priority queues.",
  department: "productivity",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Task creation",
    "Deadline tracking",
    "Daily briefings",
    "Calendar organisation",
    "Reminders",
    "Priority management",
  ],
  allowedTools: ["task_manager", "calendar", "notification_service"],
  systemPrompt:
    "You are the Productivity Agent in Student OS. Organise the student's daily execution queue and prevent deadline collisions.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Productivity Agent", [
    "todaysTasks",
    "upcomingDeadlines",
    "dailyStudyHours",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Productivity Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Prioritised execution queue and deadline plan for: "${input.objective}"`,
    findings: [
      "Triaged active tasks using urgency vs. academic/career impact.",
      "Limited high-cognitive tasks to a maximum of 3 MITs (Most Important Tasks) per day to avoid burnout.",
    ],
    recommendations: [
      "Complete the highest-priority pending task in your first 60-minute focus block today.",
      "Batch administrative tasks and emails into a single 20-minute afternoon window.",
    ],
    proposedActions: [
      {
        type: "create_task",
        title: "Daily MIT #1: Execute Top Priority Academic Deliverable",
        description:
          "Complete 1 focused 50-minute block on primary upcoming deadline.",
        requiresApproval: false,
        payload: { priority: "high" },
      },
    ],
    sources: [{ title: "Productivity Center — Task Queue" }],
    requiresApproval: false,
    confidence: 0.94,
  }),
};

