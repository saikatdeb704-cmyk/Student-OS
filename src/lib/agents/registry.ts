import type {
  AgentConfig,
  AgentDepartment,
  AgentInput,
  AgentResult,
  AgentSlug,
  StudentAgent,
} from "../../types/student-os.ts";
import { generateAIJSON } from "../ai/provider.ts";
import { ALL_AGENT_CONFIGS } from "./configs/index.ts";

// ============================================================================
// PHASE 4: CENTRAL 16-AGENT REGISTRY & VALIDATED RUNTIME CONTRACT
// ============================================================================

const globalForAgentState = globalThis as unknown as {
  studentOSAgentEnabledMap?: Record<AgentSlug, boolean>;
};

function getEnabledMap(): Record<AgentSlug, boolean> {
  if (!globalForAgentState.studentOSAgentEnabledMap) {
    const initial: Partial<Record<AgentSlug, boolean>> = {};
    for (const cfg of ALL_AGENT_CONFIGS) {
      initial[cfg.slug] = cfg.enabled;
    }
    globalForAgentState.studentOSAgentEnabledMap = initial as Record<
      AgentSlug,
      boolean
    >;
  }
  return globalForAgentState.studentOSAgentEnabledMap;
}

export function validateAgentConfig(config: AgentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.id || !config.id.startsWith("agent-")) {
    errors.push("Agent must have a unique ID starting with 'agent-'.");
  }
  if (!config.slug) {
    errors.push("Agent must have a valid slug.");
  }
  if (!config.name || config.name.trim().length < 2) {
    errors.push("Agent must have a non-empty name.");
  }
  if (!config.description || config.description.trim().length < 10) {
    errors.push("Agent must have a clear description.");
  }
  if (!config.department) {
    errors.push("Agent must belong to a valid department.");
  }
  if (!config.systemPrompt || config.systemPrompt.trim().length < 20) {
    errors.push("Agent must have a non-empty system prompt.");
  }
  if (!Array.isArray(config.capabilities) || config.capabilities.length === 0) {
    errors.push("Agent must declare at least one capability.");
  }
  if (!Array.isArray(config.allowedTools) || config.allowedTools.length === 0) {
    errors.push("Agent must declare its allowed tools list.");
  }
  if (!config.inputSchema || typeof config.inputSchema.safeParse !== "function") {
    errors.push("Agent must define a Zod inputSchema.");
  }
  if (
    !config.outputSchema ||
    typeof config.outputSchema.safeParse !== "function"
  ) {
    errors.push("Agent must define a Zod outputSchema.");
  }
  if (!config.version || !/^\d+\.\d+\.\d+$/.test(config.version)) {
    errors.push("Agent must define a valid semantic version (e.g., 1.0.0).");
  }
  if (
    !config.executionLimits ||
    config.executionLimits.maxSteps <= 0 ||
    config.executionLimits.maxTokensPerRun <= 0 ||
    config.executionLimits.timeoutMs <= 0
  ) {
    errors.push("Agent must define valid positive executionLimits.");
  }
  if (typeof config.enabled !== "boolean") {
    errors.push("Agent must define a boolean enabled status.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function createAgentInstance(config: AgentConfig): StudentAgent {
  return {
    id: config.id,
    slug: config.slug,
    name: config.name,
    description: config.description,
    department: config.department,
    systemPrompt: config.systemPrompt,
    capabilities: config.capabilities,
    allowedTools: config.allowedTools,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    inputSchemaDescriptor: config.inputSchemaDescriptor,
    outputSchemaDescriptor: config.outputSchemaDescriptor,
    version: config.version,
    executionLimits: config.executionLimits,
    get enabled(): boolean {
      const map = getEnabledMap();
      return map[config.slug] ?? config.enabled;
    },
    get status(): "active" | "idle" | "error" | "disabled" {
      const isEnabled = getEnabledMap()[config.slug] ?? config.enabled;
      return isEnabled ? "idle" : "disabled";
    },
    async execute(rawInput: AgentInput): Promise<AgentResult> {
      const isEnabled = getEnabledMap()[config.slug] ?? config.enabled;
      if (!isEnabled) {
        return {
          status: "failed",
          summary: `${config.name} is currently disabled in Agent Headquarters.`,
          findings: [
            `Execution skipped because ${config.name} (${config.id}) is disabled.`,
          ],
          recommendations: [
            `Re-enable ${config.name} in Agent Headquarters to include it in CEO plans.`,
          ],
          proposedActions: [],
          sources: [],
          requiresApproval: false,
          confidence: 0,
        };
      }

      // Validate input against agent's inputSchema
      const parsedInput = config.inputSchema.safeParse(rawInput);
      if (!parsedInput.success) {
        return {
          status: "failed",
          summary: `Invalid input payload supplied to ${config.name}.`,
          findings: parsedInput.error.issues.map((i) => i.message),
          recommendations: [
            "Ensure userId, runId, taskId, and objective are non-empty.",
          ],
          proposedActions: [],
          sources: [],
          requiresApproval: false,
          confidence: 0,
        };
      }

      const input = parsedInput.data;

      const aiResult = await generateAIJSON<AgentResult>({
        userId: input.userId,
        agentSlug: config.slug,
        maxOutputTokens: config.executionLimits.maxTokensPerRun,
        systemPrompt: `${config.systemPrompt}
Return strictly valid JSON matching this structure:
{
  "status": "completed",
  "summary": "1-2 sentence executive summary of what you analysed/created",
  "findings": ["specific finding 1", "specific finding 2"],
  "recommendations": ["actionable step 1", "actionable step 2"],
  "proposedActions": [
    {
      "type": "create_task",
      "title": "Concrete task title",
      "description": "Concrete task details",
      "requiresApproval": false,
      "payload": { "priority": "high" }
    }
  ],
  "sources": [{ "title": "Grounded Source Name" }],
  "requiresApproval": false,
  "confidence": 0.92
}`,
        userPrompt: `Student Objective: ${input.objective}
Student Context: ${JSON.stringify(input.context)}
Constraints: ${input.constraints.join(", ")}`,
      });

      const candidateResult: AgentResult =
        aiResult && aiResult.summary && Array.isArray(aiResult.findings)
          ? {
              status: aiResult.status || "completed",
              summary: aiResult.summary,
              findings: aiResult.findings,
              recommendations: Array.isArray(aiResult.recommendations)
                ? aiResult.recommendations
                : [],
              proposedActions: Array.isArray(aiResult.proposedActions)
                ? aiResult.proposedActions
                : [],
              sources: Array.isArray(aiResult.sources) ? aiResult.sources : [],
              requiresApproval: Boolean(
                aiResult.requiresApproval ||
                  aiResult.proposedActions?.some((a) => a.requiresApproval)
              ),
              confidence:
                typeof aiResult.confidence === "number"
                  ? aiResult.confidence
                  : 0.9,
            }
          : config.fallbackGenerator(input);

      // Validate output against agent's outputSchema before returning
      const parsedOutput = config.outputSchema.safeParse(candidateResult);
      if (parsedOutput.success) {
        return parsedOutput.data;
      }

      return config.fallbackGenerator(input);
    },
  };
}

const REGISTRY_BY_SLUG = new Map<AgentSlug, StudentAgent>(
  ALL_AGENT_CONFIGS.map((cfg) => [cfg.slug, createAgentInstance(cfg)])
);

const REGISTRY_BY_ID = new Map<string, StudentAgent>(
  Array.from(REGISTRY_BY_SLUG.values()).map((agent) => [agent.id, agent])
);

export function getAllAgents(): StudentAgent[] {
  return Array.from(REGISTRY_BY_SLUG.values());
}

export function getAgentBySlug(slug: AgentSlug): StudentAgent | undefined {
  return REGISTRY_BY_SLUG.get(slug);
}

export function getAgentById(id: string): StudentAgent | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function getAgentsByDepartment(
  department: AgentDepartment
): StudentAgent[] {
  return getAllAgents().filter((agent) => agent.department === department);
}

export function setAgentEnabledStatus(
  slug: AgentSlug,
  enabled: boolean
): StudentAgent | undefined {
  const agent = REGISTRY_BY_SLUG.get(slug);
  if (!agent) return undefined;
  // CEO orchestrator cannot be disabled
  if (slug === "ceo") {
    getEnabledMap().ceo = true;
    return agent;
  }
  getEnabledMap()[slug] = enabled;
  return agent;
}

export function resetAgentRegistryForTesting(): void {
  globalForAgentState.studentOSAgentEnabledMap = undefined;
}
