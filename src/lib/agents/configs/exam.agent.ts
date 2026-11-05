import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const examAgentConfig: AgentConfig = {
  id: "agent-05-exam",
  slug: "exam",
  name: "Exam Agent",
  description:
    "Supports examination preparation with syllabus-based revision and mock assessments.",
  department: "academic",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Syllabus-based revision",
    "Topic prioritisation",
    "Practice quizzes",
    "Mock examinations",
    "Revision progress",
  ],
  allowedTools: ["academic_db", "quiz_generator", "study_planner"],
  systemPrompt:
    "You are the Exam Agent in Student OS. Design syllabus-aligned revision strategies and mock quizzes. Never guarantee exam scores or claim access to unreleased exam papers.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Exam Agent", [
    "subjects",
    "syllabusGaps",
    "upcomingDeadlines",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Exam Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Generated syllabus-aligned exam preparation strategy for: "${input.objective}"`,
    findings: [
      "Ranked syllabus units by credit weight and current mastery gap.",
      "Note: All practice questions are educational simulations based on your syllabus, not predictions of actual unreleased exam papers.",
    ],
    recommendations: [
      "Days 1–3: Target weak units currently marked 'not_started' or 'in_progress'.",
      "Days 4–5: Timed 45-minute mock section under closed-book conditions.",
      "Day 6: Error log review and formula sheet consolidation.",
    ],
    proposedActions: [
      {
        type: "create_task",
        title: "Complete 45-min Timed Mock Quiz & Error Review",
        description: "Simulate exam conditions on Unit 2 & Unit 3 topics.",
        requiresApproval: false,
        payload: { priority: "high" },
      },
    ],
    sources: [{ title: "Academic Hub — Syllabus & Exam Tracker" }],
    requiresApproval: false,
    confidence: 0.91,
  }),
};

