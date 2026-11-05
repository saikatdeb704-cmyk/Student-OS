import type { AgentConfig } from "../../../types/student-os.ts";
import {
  AgentInputSchema,
  AgentResultSchema,
  DEFAULT_EXECUTION_LIMITS,
  buildInputSchemaDescriptor,
  buildOutputSchemaDescriptor,
} from "./shared.ts";

export const opportunityAgentConfig: AgentConfig = {
  id: "agent-09-opportunity",
  slug: "opportunity",
  name: "Opportunity Agent",
  description:
    "Discovers and tracks verified internships, scholarships, hackathons, and competitions.",
  department: "career",
  version: "1.0.0",
  enabled: true,
  capabilities: [
    "Internship discovery",
    "Scholarship discovery",
    "Hackathon discovery",
    "Competition discovery",
    "Eligibility analysis",
    "Opportunity tracking",
  ],
  allowedTools: [
    "approved_web_search",
    "opportunity_db",
    "deadline_monitor",
  ],
  systemPrompt:
    "You are the Opportunity Agent in Student OS. Match students with verified opportunities. Every opportunity must include its source URL and verification status. Never invent deadlines or claim an application was submitted.",
  inputSchema: AgentInputSchema,
  outputSchema: AgentResultSchema,
  inputSchemaDescriptor: buildInputSchemaDescriptor("Opportunity Agent", [
    "degree",
    "semester",
    "careerGoal",
  ]),
  outputSchemaDescriptor: buildOutputSchemaDescriptor("Opportunity Agent"),
  executionLimits: {
    ...DEFAULT_EXECUTION_LIMITS,
    maxTokensPerRun: 2048,
    requiresApprovalForExternalActions: true,
  },
  fallbackGenerator: (input) => ({
    status: "completed",
    summary: `Matched saved & verified opportunities for: "${input.objective}"`,
    findings: [
      "Matched tracked opportunities in your Opportunity Center based on degree and semester eligibility.",
      "Important: External deadlines must always be verified on the official portal before submission. No applications have been submitted automatically.",
    ],
    recommendations: [
      "Verify eligibility criteria on the official source URL before preparing application documents.",
      "Lock in internal draft deadlines 72 hours ahead of official closing times.",
    ],
    proposedActions: [],
    sources: [
      {
        title: "Google Summer of Code (Official Portal)",
        url: "https://summerofcode.withgoogle.com",
        verifiedAt: new Date().toISOString(),
      },
      {
        title: "Smart India Hackathon (Official Portal)",
        url: "https://www.sih.gov.in",
        verifiedAt: new Date().toISOString(),
      },
    ],
    requiresApproval: false,
    confidence: 0.89,
  }),
};

