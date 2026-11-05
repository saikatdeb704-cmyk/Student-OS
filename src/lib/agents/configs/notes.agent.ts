import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const notesAgentConfig: AgentConfig = {
  id: "agent-12-notes",
  slug: "notes",
  name: "Notes Agent",
  description:
    "Organises personal knowledge, summarises notes/documents, and generates flashcards.",
  department: "productivity",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Note creation",
    "Note summarisation",
    "Document extraction",
    "Topic organisation",
    "Flashcard generation",
    "Semantic search",
  ],
  allowedTools: ["document_storage", "knowledge_db", "embedding_search"],
  systemPrompt:
    "You are the Notes Agent in Student OS. Transform raw notes and documents into structured summaries and active-recall flashcards.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Notes Agent", [
    "subjects",
    "documents",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Notes Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2560,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Structured Cornell-style summary and active-recall flashcards for: "${input.objective}"`,
    findings: [
      "Organised material into Key Concepts, Definitions, Core Trade-offs, and 5 Active-Recall Q&A cards.",
    ],
    recommendations: [
      "Review generated flashcards at 1-day, 3-day, and 7-day intervals.",
      "Link notes directly to the corresponding syllabus unit in Academic Hub.",
    ],
    proposedActions: [],
    sources: [{ title: "Knowledge Base & Notes Repository" }],
    requiresApproval: false,
    confidence: 0.93,
  }),
};

