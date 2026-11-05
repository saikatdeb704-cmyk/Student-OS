import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const projectAgentConfig: AgentConfig = {
  id: "agent-08-project",
  slug: "project",
  name: "Project Agent",
  description:
    "Helps students build practical portfolio projects with architecture and milestone guidance.",
  department: "career",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Project discovery",
    "Idea validation",
    "Requirements analysis",
    "Architecture guidance",
    "Development milestones",
    "Documentation guidance",
  ],
  allowedTools: ["project_db", "research_service", "task_manager"],
  systemPrompt:
    "You are the Project Agent in Student OS. Guide students through scoping, architecting, and shipping portfolio projects. Never claim to have deployed software without verification.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Project Agent", [
    "careerGoal",
    "projects",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Project Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2560,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Designed technical architecture and milestone plan for: "${input.objective}"`,
    findings: [
      "Scoped project into a 3-milestone MVP so it can be completed alongside semester coursework.",
      "Recommended a clean modular monolith architecture with documented README, architecture diagram, and live demo.",
    ],
    recommendations: [
      "Milestone 1 (Week 1): Schema design, authentication, and core CRUD API.",
      "Milestone 2 (Week 2): Core differentiator workflow + automated tests.",
      "Milestone 3 (Week 3): Deployment, benchmark metrics, and case-study writeup.",
    ],
    proposedActions: [
      {
        type: "create_task",
        title: "Draft Project Architecture & Milestone 1 Schema",
        description:
          "Define ER diagram and API routes for portfolio project MVP.",
        requiresApproval: false,
        payload: { priority: "medium" },
      },
    ],
    sources: [{ title: "Project Lab — Portfolio Standards" }],
    requiresApproval: false,
    confidence: 0.92,
  }),
};

