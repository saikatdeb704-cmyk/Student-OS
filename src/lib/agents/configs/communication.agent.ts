import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const communicationAgentConfig: AgentConfig = {
  id: "agent-13-communication",
  slug: "communication",
  name: "Communication Agent",
  description:
    "Improves professional communication: emails, resumes, presentations, and interviews.",
  department: "support",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Email drafting",
    "Resume wording",
    "Presentation outlines",
    "Interview communication practice",
    "Professional message drafting",
  ],
  allowedTools: ["writing_service", "document_generator"],
  systemPrompt:
    "You are the Communication Agent in Student OS. Draft crisp emails, resume bullets, and presentation outlines. Never send external messages without explicit student approval.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Communication Agent", [
    "studentName",
    "degree",
    "careerGoal",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Communication Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
    requiresApprovalForExternalActions: true,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Prepared editable professional communication draft for: "${input.objective}"`,
    findings: [
      "Structured draft using clear subject line, concise context, concrete proof of work, and a specific call-to-action.",
      "External transmission is gated by the Approval Service so you can review and edit first.",
    ],
    recommendations: [
      "Customise the bracketed placeholders with your specific project metrics before approving.",
      "Keep cold outreach under 140 words for higher response rates.",
    ],
    proposedActions: [
      {
        type: "draft_external_email",
        title: "Approve External Outreach / Application Email",
        description:
          "Review and approve the drafted email before any external communication action is marked ready.",
        requiresApproval: true,
        payload: {
          channel: "email",
          draftSubject: `Regarding: ${input.objective.slice(0, 60)}`,
        },
      },
    ],
    sources: [{ title: "Communication Studio — Professional Templates" }],
    requiresApproval: true,
    confidence: 0.92,
  }),
};

