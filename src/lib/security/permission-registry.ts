/**
 * Student OS Central Permission Registry
 *
 * Implements strict action classification:
 * 1. AUTOMATIC:
 *    - Creating study plans
 *    - Analysing documents
 *    - Creating internal tasks
 *    - Generating summaries & notes
 *    - Vector memory search
 *
 * 2. APPROVAL REQUIRED:
 *    - Sending emails
 *    - Sharing files
 *    - Publishing content
 *    - External calendar modifications
 *    - Other consequential external actions (applications, outreach)
 *
 * 3. RESTRICTED:
 *    - Financial transactions
 *    - High-impact academic decisions (course drop, semester withdrawal)
 *    - Actions requiring authority the student has not granted
 */

import crypto from "node:crypto";
import type { ActionClassification, AgentSlug } from "../../types/student-os.ts";

export interface ActionDefinition {
  actionType: string;
  classification: ActionClassification;
  name: string;
  description: string;
  allowedAgents: AgentSlug[];
  defaultExpirationHours: number;
  requiresStudentConsent: boolean;
  validatePayload?: (payload: Record<string, unknown>) => {
    valid: boolean;
    error?: string;
  };
}

export interface PermissionCheckResult {
  allowed: boolean;
  classification: ActionClassification;
  requiresApproval: boolean;
  isRestricted: boolean;
  reason: string;
  actionDefinition: ActionDefinition;
}

export const PERMISSION_REGISTRY: Record<string, ActionDefinition> = {
  // --------------------------------------------------------------------------
  // 1. AUTOMATIC ACTIONS
  // --------------------------------------------------------------------------
  create_study_plan: {
    actionType: "create_study_plan",
    classification: "automatic",
    name: "Create Study Plan",
    description: "Generate structured study sessions and revision milestones",
    allowedAgents: ["study", "academic", "tutor", "exam", "ceo"],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },
  analyze_document: {
    actionType: "analyze_document",
    classification: "automatic",
    name: "Analyze Document",
    description: "Parse, extract, and summarize student notes, syllabus, or papers",
    allowedAgents: ["research", "notes", "tutor", "study", "academic", "ceo"],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },
  create_internal_task: {
    actionType: "create_internal_task",
    classification: "automatic",
    name: "Create Internal Task",
    description: "Create internal todo and revision items on the student dashboard",
    allowedAgents: [
      "productivity",
      "study",
      "academic",
      "career",
      "project",
      "ceo",
    ],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },
  generate_summary: {
    actionType: "generate_summary",
    classification: "automatic",
    name: "Generate Summary",
    description: "Generate summaries of lectures, papers, or conversations",
    allowedAgents: ["notes", "research", "tutor", "ceo"],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },
  generate_notes: {
    actionType: "generate_notes",
    classification: "automatic",
    name: "Generate Notes",
    description: "Create structured markdown study notes in the second brain",
    allowedAgents: ["notes", "research", "academic", "ceo"],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },
  query_vector_memory: {
    actionType: "query_vector_memory",
    classification: "automatic",
    name: "Query Vector Memory",
    description: "Read relevance-scored semantic memory records for the student",
    allowedAgents: [
      "ceo",
      "academic",
      "career",
      "research",
      "notes",
      "study",
      "tutor",
    ],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  },

  // --------------------------------------------------------------------------
  // 2. APPROVAL REQUIRED ACTIONS
  // --------------------------------------------------------------------------
  send_email: {
    actionType: "send_email",
    classification: "approval_required",
    name: "Send Email",
    description:
      "Send external email to professors, recruiters, advisors, or peers",
    allowedAgents: ["communication", "career", "academic", "ceo"],
    defaultExpirationHours: 24,
    requiresStudentConsent: true,
    validatePayload: (p) => {
      const recipient = p.recipient || p.to;
      if (!recipient || typeof recipient !== "string") {
        return { valid: false, error: "Recipient email is required" };
      }
      return { valid: true };
    },
  },
  share_file: {
    actionType: "share_file",
    classification: "approval_required",
    name: "Share File",
    description: "Share documents, code artifacts, or portfolios with external parties",
    allowedAgents: ["project", "communication", "career", "ceo"],
    defaultExpirationHours: 24,
    requiresStudentConsent: true,
  },
  publish_content: {
    actionType: "publish_content",
    classification: "approval_required",
    name: "Publish Content",
    description: "Publish articles, public project repos, or online portfolio posts",
    allowedAgents: ["project", "career", "communication", "ceo"],
    defaultExpirationHours: 48,
    requiresStudentConsent: true,
  },
  modify_calendar: {
    actionType: "modify_calendar",
    classification: "approval_required",
    name: "Modify External Calendar",
    description: "Create, reschedule, or cancel external calendar events & meetings",
    allowedAgents: ["productivity", "communication", "academic", "ceo"],
    defaultExpirationHours: 24,
    requiresStudentConsent: true,
  },
  consequential_external_action: {
    actionType: "consequential_external_action",
    classification: "approval_required",
    name: "Consequential External Action",
    description:
      "Submit job applications, contact sponsors, or trigger external webhooks",
    allowedAgents: ["opportunity", "career", "communication", "ceo"],
    defaultExpirationHours: 48,
    requiresStudentConsent: true,
  },
  submit_application: {
    actionType: "submit_application",
    classification: "approval_required",
    name: "Submit Opportunity Application",
    description:
      "Formally submit an application to a company, scholarship, or hackathon",
    allowedAgents: ["opportunity", "career", "ceo"],
    defaultExpirationHours: 72,
    requiresStudentConsent: true,
  },

  // --------------------------------------------------------------------------
  // 3. RESTRICTED ACTIONS
  // --------------------------------------------------------------------------
  financial_transaction: {
    actionType: "financial_transaction",
    classification: "restricted",
    name: "Financial Transaction",
    description:
      "Execute monetary payments, tuition fees, bank transfers, or card charges",
    allowedAgents: ["finance"],
    defaultExpirationHours: 1,
    requiresStudentConsent: true,
  },
  high_impact_academic_decision: {
    actionType: "high_impact_academic_decision",
    classification: "restricted",
    name: "High-Impact Academic Decision",
    description:
      "Official course drops, semester withdrawal, degree major change, or formal grade appeals",
    allowedAgents: ["academic"],
    defaultExpirationHours: 1,
    requiresStudentConsent: true,
  },
  unauthorized_grant: {
    actionType: "unauthorized_grant",
    classification: "restricted",
    name: "Unauthorized Permission Grant",
    description:
      "Agent attempts to grant itself elevated authority or modify system security boundaries",
    allowedAgents: [],
    defaultExpirationHours: 0,
    requiresStudentConsent: true,
  },
};

/**
 * Get action definition or generate a safe fallback
 */
export function getActionDefinition(actionType: string): ActionDefinition {
  const normalized = actionType.toLowerCase().trim();
  if (PERMISSION_REGISTRY[normalized]) {
    return PERMISSION_REGISTRY[normalized];
  }

  // Infer classification for unknown or dynamic action types:
  if (
    normalized.includes("pay") ||
    normalized.includes("money") ||
    normalized.includes("transfer") ||
    normalized.includes("withdraw") ||
    normalized.includes("drop_course")
  ) {
    return {
      actionType,
      classification: "restricted",
      name: `Restricted: ${actionType}`,
      description: "Consequential or high-impact financial/academic action",
      allowedAgents: ["ceo"],
      defaultExpirationHours: 1,
      requiresStudentConsent: true,
    };
  }

  if (
    normalized.includes("email") ||
    normalized.includes("message") ||
    normalized.includes("share") ||
    normalized.includes("publish") ||
    normalized.includes("calendar") ||
    normalized.includes("apply") ||
    normalized.includes("external")
  ) {
    return {
      actionType,
      classification: "approval_required",
      name: `Approval Required: ${actionType}`,
      description: "External communication or consequential modification",
      allowedAgents: ["ceo"],
      defaultExpirationHours: 24,
      requiresStudentConsent: true,
    };
  }

  return {
    actionType,
    classification: "automatic",
    name: `Internal: ${actionType}`,
    description: "Internal safe student workspace action",
    allowedAgents: ["ceo"],
    defaultExpirationHours: 168,
    requiresStudentConsent: false,
  };
}

/**
 * Classify any action string
 */
export function classifyAction(actionType: string): ActionClassification {
  return getActionDefinition(actionType).classification;
}

/**
 * Compute SHA256 idempotency key for duplicate action prevention
 */
export function computeActionIdempotencyKey(
  userId: string,
  actionType: string,
  payload: Record<string, unknown> = {}
): string {
  // Sort keys for deterministic payload hashing
  const sortedPayload = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHash("sha256")
    .update(`${userId}:${actionType}:${sortedPayload}`)
    .digest("hex");
}

/**
 * Central Execution-Time Permission Gate
 *
 * Checks if an agent is authorized to execute an action.
 * Enforces that:
 * 1. Restricted actions are categorically blocked from direct execution.
 * 2. Approval-required actions MUST have an active approved grant.
 * 3. Automatic actions pass if the agent is registered for them.
 */
export function checkExecutionPermission(params: {
  agentSlug: AgentSlug;
  actionType: string;
  payload?: Record<string, unknown>;
  hasApprovedGrant?: boolean;
  approvalId?: string;
  isApprovalExpired?: boolean;
}): PermissionCheckResult {
  const def = getActionDefinition(params.actionType);

  // 1. RESTRICTED ACTIONS: Categorically blocked from automated agent execution
  if (def.classification === "restricted") {
    return {
      allowed: false,
      classification: "restricted",
      requiresApproval: false,
      isRestricted: true,
      reason: `Action '${params.actionType}' is RESTRICTED (financial transactions, official degree changes, or unauthorized authority). Agents cannot execute this action.`,
      actionDefinition: def,
    };
  }

  // 2. APPROVAL REQUIRED ACTIONS:
  if (def.classification === "approval_required") {
    if (!params.hasApprovedGrant || !params.approvalId) {
      return {
        allowed: false,
        classification: "approval_required",
        requiresApproval: true,
        isRestricted: false,
        reason: `Action '${params.actionType}' requires explicit student approval. No valid approval token was provided.`,
        actionDefinition: def,
      };
    }

    if (params.isApprovalExpired) {
      return {
        allowed: false,
        classification: "approval_required",
        requiresApproval: true,
        isRestricted: false,
        reason: `Approval token '${params.approvalId}' for action '${params.actionType}' has EXPIRED and cannot be executed.`,
        actionDefinition: def,
      };
    }

    // Approved grant present and valid
    return {
      allowed: true,
      classification: "approval_required",
      requiresApproval: true,
      isRestricted: false,
      reason: `Action '${params.actionType}' authorized via student approval '${params.approvalId}'.`,
      actionDefinition: def,
    };
  }

  // 3. AUTOMATIC ACTIONS:
  return {
    allowed: true,
    classification: "automatic",
    requiresApproval: false,
    isRestricted: false,
    reason: `Action '${params.actionType}' is classified as AUTOMATIC and safe for direct execution.`,
    actionDefinition: def,
  };
}
