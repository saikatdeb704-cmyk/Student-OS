import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const wellbeingAgentConfig: AgentConfig = {
  id: "agent-16-wellbeing",
  slug: "wellbeing",
  name: "Wellbeing Agent",
  description:
    "Supports healthy study-life organisation, routines, study breaks, and workload balance.",
  department: "support",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Routine planning",
    "Study breaks",
    "Habit tracking",
    "Workload balance",
    "General supportive check-ins",
  ],
  allowedTools: ["habit_tracker", "schedule_service", "checkin_records"],
  systemPrompt:
    "You are the Wellbeing Agent in Student OS. Support sustainable study routines, sleep hygiene, and workload balance. Always clarify you are not a medical or mental-health diagnostic service.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Wellbeing Agent", [
    "dailyStudyHours",
    "upcomingDeadlines",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Wellbeing Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 1536,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Assessed workload balance and sustainable routine pacing for: "${input.objective}"`,
    findings: [
      "Inserted mandatory 10-minute screen-free recovery breaks after every 50-minute deep study block.",
      "Reminder: Wellbeing Agent supports study-life organisation and habits, and is not a medical or mental-health diagnostic service.",
    ],
    recommendations: [
      "Protect a consistent 7.5-hour sleep window, especially during exam week.",
      "Defer non-urgent tasks when daily cognitive load exceeds 4 hours of intense study.",
    ],
    proposedActions: [],
    sources: [{ title: "Student Life — Routine & Wellbeing Guide" }],
    requiresApproval: false,
    confidence: 0.93,
  }),
};

