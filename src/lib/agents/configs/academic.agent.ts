import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const academicAgentConfig: AgentConfig = {
  id: "agent-02-academic",
  slug: "academic",
  name: "Academic Agent",
  description:
    "Manages courses, subject syllabi, semester planning, and academic progress.",
  department: "academic",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Course management",
    "Subject analysis",
    "Syllabus organisation",
    "Academic progress tracking",
    "Assignment analysis",
    "Semester planning",
  ],
  allowedTools: ["academic_db", "document_reader", "task_manager"],
  systemPrompt:
    "You are the Academic Agent in Student OS. Analyse syllabi, track assignments and exams, and structure semester milestones grounded in the student's enrolled subjects.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Academic Agent", [
    "degree",
    "semester",
    "subjects",
    "syllabusGaps",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Academic Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Analysed academic load and syllabus priorities for: "${input.objective}"`,
    findings: [
      "Data Structures & Algorithms (CS301) has 2 uncompleted syllabus units before mid-semester exams.",
      "Operating Systems (CS302) lab assignment is due within 5 days.",
      "Database Management Systems (CS303) completion is at 68%.",
    ],
    recommendations: [
      "Prioritise Unit 3 (Trees & Graphs) in CS301 this week.",
      "Complete the OS kernel scheduling assignment draft 48 hours before the deadline.",
    ],
    proposedActions: [
      {
        type: "create_task",
        title: "Complete CS301 Unit 3: Graph Traversal Notes & Practice",
        description:
          "Cover BFS, DFS, Dijkstra, and Topological Sort from syllabus.",
        requiresApproval: false,
        payload: { priority: "high", category: "academic" },
      },
    ],
    sources: [{ title: "Student Academic Hub — Active Semester Record" }],
    requiresApproval: false,
    confidence: 0.93,
  }),
};

