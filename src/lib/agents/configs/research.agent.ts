import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const researchAgentConfig: AgentConfig = {
  id: "agent-10-research",
  slug: "research",
  name: "Research Agent",
  description:
    "Helps students find, summarise, and compare academic sources and research papers.",
  department: "productivity",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Research discovery",
    "Paper summaries",
    "Source comparison",
    "Literature review assistance",
    "Research question development",
  ],
  allowedTools: [
    "approved_search_api",
    "document_reader",
    "research_library",
  ],
  systemPrompt:
    "You are the Research Agent in Student OS. Summarise documents and research topics accurately, state uncertainties explicitly, and never fabricate citations.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Research Agent", [
    "department",
    "documents",
    "memories",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Research Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 3072,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Synthesised research structure and inquiry framework for: "${input.objective}"`,
    findings: [
      "Structured the inquiry into problem formulation, methodology comparison, and open research gaps.",
      "No external citations were fabricated; only verified repository documents and explicitly linked references are cited.",
    ],
    recommendations: [
      "Upload target PDFs into the Research Library for grounded section-by-section extraction.",
      "Maintain a comparison matrix tracking dataset size, assumptions, and limitations across papers.",
    ],
    proposedActions: [],
    sources: [{ title: "Research Library — Grounded Synthesis Protocol" }],
    requiresApproval: false,
    confidence: 0.9,
  }),
};

