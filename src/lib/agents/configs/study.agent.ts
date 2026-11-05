import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const studyAgentConfig: AgentConfig = {
  id: "agent-03-study",
  slug: "study",
  name: "Study Agent",
  description:
    "Organises daily and weekly learning schedules, time allocation, and revision milestones.",
  department: "academic",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Daily study plans",
    "Weekly study plans",
    "Revision scheduling",
    "Study prioritisation",
    "Time allocation",
  ],
  allowedTools: ["calendar", "task_manager", "academic_db"],
  systemPrompt:
    "You are the Study Agent in Student OS. Create balanced, realistic daily and weekly study schedules tailored to the student's dailyStudyHours and upcoming deadlines.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Study Agent", [
    "dailyStudyHours",
    "subjects",
    "upcomingDeadlines",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Study Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Constructed time-blocked study schedule for: "${input.objective}"`,
    findings: [
      "Allocated focused study hours/day using 50/10 Pomodoro blocks.",
      "Reserved morning deep-work slots for high-cognitive subjects and evening slots for active recall.",
    ],
    recommendations: [
      "Block 1 (90 mins): Core concept mastery & problem solving.",
      "Block 2 (60 mins): Assignment execution & code lab work.",
      "Block 3 (30 mins): Spaced-repetition flashcard review.",
    ],
    proposedActions: [
      {
        type: "create_study_plan",
        title: "7-Day High-Yield Study Sprint",
        description:
          "Structured daily schedule balancing exam revision and project milestones.",
        requiresApproval: false,
        payload: { hoursPerDay: 3.5, durationDays: 7 },
      },
    ],
    sources: [{ title: "Student Preferences — Daily Study Allocation" }],
    requiresApproval: false,
    confidence: 0.92,
  }),
};

