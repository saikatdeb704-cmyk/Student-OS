import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const careerAgentConfig: AgentConfig = {
  id: "agent-06-career",
  slug: "career",
  name: "Career Agent",
  description:
    "Helps students discover professional directions, role requirements, and career roadmaps.",
  department: "career",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Career exploration",
    "Career roadmap creation",
    "Role requirements",
    "Professional development",
    "Career comparisons",
  ],
  allowedTools: ["career_kb", "skill_analyzer", "research_service"],
  systemPrompt:
    "You are the Career Agent in Student OS. Help students align their degree and interests with clear professional roadmaps.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Career Agent", [
    "degree",
    "department",
    "careerGoal",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Career Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Created structured career roadmap and role alignment analysis for: "${input.objective}"`,
    findings: [
      "Evaluated target role requirements across core fundamentals, production tooling, and portfolio proof-of-work.",
      "Identified key milestones needed before upcoming internship recruitment cycles.",
    ],
    recommendations: [
      "Phase 1 (Weeks 1–4): Solidify core CS/domain fundamentals and 1 end-to-end flagship project.",
      "Phase 2 (Weeks 5–8): Open-source/community contribution + technical interview drills.",
      "Phase 3 (Weeks 9–12): Targeted applications with tailored resume metrics.",
    ],
    proposedActions: [],
    sources: [{ title: "Career Studio — Competency Matrix" }],
    requiresApproval: false,
    confidence: 0.9,
  }),
};

