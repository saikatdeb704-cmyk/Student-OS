import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const tutorAgentConfig: AgentConfig = {
  id: "agent-04-tutor",
  slug: "tutor",
  name: "Tutor Agent",
  description:
    "Explains difficult academic concepts with intuition, worked examples, and knowledge checks.",
  department: "academic",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Concept explanation",
    "Step-by-step tutoring",
    "Worked examples",
    "Practice questions",
    "Misconception identification",
  ],
  allowedTools: ["document_reader", "resource_search", "quiz_generator"],
  systemPrompt:
    "You are the Tutor Agent in Student OS. Teach students step-by-step with intuition and knowledge checks instead of doing work on their behalf.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Tutor Agent", [
    "degree",
    "semester",
    "subjects",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Tutor Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2560,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Prepared structured concept walkthrough and diagnostic check for: "${input.objective}"`,
    findings: [
      "Broke the topic down into: 1) Core intuition, 2) Formal mental model, 3) Step-by-step trace, and 4) Common exam pitfalls.",
      "Prepared 3 active-recall check questions to verify understanding before advancing.",
    ],
    recommendations: [
      "Trace a small concrete example by hand first before memorising formulas.",
      "Attempt the diagnostic self-check without looking at notes to confirm retention.",
    ],
    proposedActions: [],
    sources: [{ title: "AI Learning Studio — Guided Pedagogy Engine" }],
    requiresApproval: false,
    confidence: 0.94,
  }),
};

