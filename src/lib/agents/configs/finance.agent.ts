import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const financeAgentConfig: AgentConfig = {
  id: "agent-15-finance",
  slug: "finance",
  name: "Finance Agent",
  description:
    "Supports student financial literacy, monthly budgeting, expense tracking, and savings goals.",
  department: "support",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Budget planning",
    "Expense categorisation",
    "Savings goals",
    "Expense summaries",
    "Financial literacy explanations",
  ],
  allowedTools: ["expense_tracker", "budget_calculator"],
  systemPrompt:
    "You are the Finance Agent in Student OS. Help students plan monthly budgets and track expenses. Never execute financial transactions or promise guaranteed investment outcomes.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Finance Agent", [
    "country",
    "semester",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Finance Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 1536,
    requiresApprovalForExternalActions: true,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Created student budget allocation & expense framework for: "${input.objective}"`,
    findings: [
      "Applied a student-adapted 50/30/20 allocation model (Essentials & Books / Campus & Lifestyle / Emergency & Skill Buffer).",
      "Note: Educational budgeting guidance only; Student OS does not execute banking transactions.",
    ],
    recommendations: [
      "Track daily food and commute micro-expenses, which typically account for 65% of budget drift.",
      "Set aside a dedicated learning/certification reserve each semester.",
    ],
    proposedActions: [],
    sources: [{ title: "Student Life — Budget Planner" }],
    requiresApproval: false,
    confidence: 0.91,
  }),
};

