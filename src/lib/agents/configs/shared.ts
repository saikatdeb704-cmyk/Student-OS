import {
  AgentInputSchema,
  AgentResultSchema,
  type AgentExecutionLimits,
  type AgentSchemaDescriptor,
} from "../../../types/student-os.ts";

export { AgentInputSchema, AgentResultSchema };

export function buildInputSchemaDescriptor(
  agentName: string,
  domainContextFields: string[]
): AgentSchemaDescriptor {
  return {
    name: `${agentName.replace(/\s+/g, "")}InputSchema`,
    description: `Validated execution input contract for ${agentName}`,
    requiredFields: ["userId", "runId", "taskId", "objective"],
    fields: {
      userId: "string (UUID of authenticated student)",
      runId: "string (Parent CEO orchestration run ID)",
      taskId: "string (Unique agent task execution ID)",
      objective: "string (Natural-language domain objective)",
      context: `Record<string, unknown> (${domainContextFields.join(", ")})`,
      constraints: "string[] (Safety and governance guardrails)",
    },
  };
}

export function buildOutputSchemaDescriptor(
  agentName: string
): AgentSchemaDescriptor {
  return {
    name: `${agentName.replace(/\s+/g, "")}OutputSchema`,
    description: `Validated structured output contract for ${agentName}`,
    requiredFields: [
      "status",
      "summary",
      "findings",
      "recommendations",
      "proposedActions",
      "sources",
      "requiresApproval",
      "confidence",
    ],
    fields: {
      status: '"completed" | "failed" | "needs_input"',
      summary: "string (Concise synthesis of completed analysis)",
      findings: "string[] (Grounded findings from student records)",
      recommendations: "string[] (Actionable next steps for the student)",
      proposedActions:
        "ProposedAction[] (Workspace task or approval-gated actions)",
      sources: "Array<{ title: string; url?: string; verifiedAt?: string }>",
      requiresApproval: "boolean (True if external/consequential action queued)",
      confidence: "number (0.0 to 1.0 calibrated confidence score)",
    },
  };
}

export const DEFAULT_EXECUTION_LIMITS: AgentExecutionLimits = {
  maxSteps: 4,
  maxTokensPerRun: 2048,
  timeoutMs: 20000,
  maxConcurrentTasks: 2,
  cooldownSeconds: 2,
  requiresApprovalForExternalActions: true,
};

