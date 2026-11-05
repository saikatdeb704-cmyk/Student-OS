import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const skillAgentConfig: AgentConfig = {
  id: "agent-07-skill",
  slug: "skill",
  name: "Skill Agent",
  description:
    "Identifies skill gaps and builds structured learning paths with proficiency tracking.",
  department: "career",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Skill assessment",
    "Skill gap analysis",
    "Learning path generation",
    "Resource recommendations",
    "Skill progress tracking",
  ],
  allowedTools: [
    "student_skills_db",
    "learning_resources",
    "progress_tracker",
  ],
  systemPrompt:
    "You are the Skill Agent in Student OS. Identify concrete skill gaps and propose measurable learning sprints.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Skill Agent", [
    "careerGoal",
    "skills",
    "subjects",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Skill Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Completed skill gap assessment for: "${input.objective}"`,
    findings: [
      "Current strengths: TypeScript (Intermediate), Python (Intermediate), Data Structures (Intermediate).",
      "Priority gaps for target role: System Design fundamentals, PostgreSQL performance indexing, Automated testing.",
    ],
    recommendations: [
      "Build one production feature using PostgreSQL RLS + indexed queries to move SQL from Beginner to Intermediate.",
      "Add unit and integration tests to your active portfolio project.",
    ],
    proposedActions: [
      {
        type: "create_task",
        title: "Skill Sprint: PostgreSQL Indexing & Query Optimization Lab",
        description:
          "Practice EXPLAIN ANALYZE and composite indexes on a sample dataset.",
        requiresApproval: false,
        payload: { priority: "medium" },
      },
    ],
    sources: [{ title: "Student Skills Matrix" }],
    requiresApproval: false,
    confidence: 0.91,
  }),
};

