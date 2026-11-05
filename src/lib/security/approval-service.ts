/**
 * Student OS Approval Management Service
 *
 * Implements:
 * 1. Approval creation with action classification & idempotency key
 * 2. Duplicate action prevention (prevents duplicate pending requests for identical payloads)
 * 3. Approval listing & automatic expiration evaluation
 * 4. Approval decision (approve / reject) with caller ownership verification
 * 5. User cancellation of pending requests
 * 6. Execution-time verification and consumption
 * 7. Comprehensive audit logging
 */

import { dbStore } from "../db/store.ts";
import {
  classifyAction,
  computeActionIdempotencyKey,
  getActionDefinition,
} from "./permission-registry.ts";
import type {
  ActionClassification,
  AgentSlug,
  ApprovalItem,
  ApprovalStatus,
} from "../../types/student-os.ts";

export interface CreateApprovalParams {
  userId: string;
  agentSlug: AgentSlug;
  actionType: string;
  title: string;
  description: string;
  payload?: Record<string, unknown>;
  runId?: string;
  expiresInHours?: number;
}

export interface CreateApprovalResult {
  approval: ApprovalItem;
  isDuplicate: boolean;
  classification: ActionClassification;
}

export class ApprovalService {
  /**
   * Create an approval request for an action
   */
  static createApproval(params: CreateApprovalParams): CreateApprovalResult {
    const classification = classifyAction(params.actionType);
    const def = getActionDefinition(params.actionType);

    // 1. Restricted actions cannot be approved through normal flow
    if (classification === "restricted") {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "agent",
        action: "restricted_action_blocked",
        resourceType: "approval",
        metadata: {
          actionType: params.actionType,
          agentSlug: params.agentSlug,
          reason: "Restricted action attempted without authority",
        },
      });
      throw new Error(
        `Action '${params.actionType}' is RESTRICTED (financial transaction or high-impact decision). Cannot create standard approval.`
      );
    }

    const payload = params.payload ?? {};

    // Validate payload if schema validator exists
    if (def.validatePayload) {
      const val = def.validatePayload(payload);
      if (!val.valid) {
        throw new Error(
          `Invalid payload for action '${params.actionType}': ${val.error}`
        );
      }
    }

    // 2. Compute idempotency key for duplicate prevention
    const idempotencyKey = computeActionIdempotencyKey(
      params.userId,
      params.actionType,
      payload
    );

    const ttlHours = params.expiresInHours ?? def.defaultExpirationHours;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

    const existingApprovals = dbStore.getApprovals(params.userId);
    const activeExisting = existingApprovals.find(
      (a) =>
        a.idempotencyKey === idempotencyKey &&
        a.status === "pending" &&
        (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now())
    );

    if (activeExisting) {
      // Duplicate action prevented!
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "system",
        action: "duplicate_approval_reused",
        resourceType: "approval",
        resourceId: activeExisting.id,
        metadata: {
          idempotencyKey,
          actionType: params.actionType,
        },
      });
      return {
        approval: activeExisting,
        isDuplicate: true,
        classification,
      };
    }

    // 3. Create fresh approval in database
    const approval = dbStore.createApproval(
      {
        runId: params.runId || `run-${Date.now()}`,
        agentSlug: params.agentSlug,
        actionType: params.actionType,
        title: params.title,
        description: params.description,
        payload,
        classification,
        idempotencyKey,
        expiresAt,
        status: "pending",
      },
      params.userId
    );

    // 4. Record audit log
    dbStore.recordAuditLog({
      userId: params.userId,
      actorType: "agent",
      action: "approval_created",
      resourceType: "approval",
      resourceId: approval.id,
      metadata: {
        agentSlug: params.agentSlug,
        actionType: params.actionType,
        classification,
        idempotencyKey,
        expiresAt,
      },
    });

    return {
      approval,
      isDuplicate: false,
      classification,
    };
  }

  /**
   * List approvals for a student, updating expired records
   */
  static listApprovals(
    userId: string,
    filter?: { status?: ApprovalStatus; includeExpired?: boolean }
  ): ApprovalItem[] {
    const list = dbStore.getApprovals(userId);
    if (!filter?.status) {
      if (filter?.includeExpired === false) {
        return list.filter((a) => a.status !== "expired");
      }
      return list;
    }
    return list.filter((a) => a.status === filter.status);
  }

  /**
   * Decide approval request (Approve or Reject)
   */
  static decideApproval(params: {
    approvalId: string;
    decision: "approved" | "rejected";
    userId: string;
    reason?: string;
  }): ApprovalItem {
    const approvals = dbStore.getApprovals(params.userId);
    const item = approvals.find((a) => a.id === params.approvalId);

    if (!item) {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "student",
        action: "approval_decision_denied_not_found",
        resourceType: "approval",
        resourceId: params.approvalId,
        metadata: { reason: "Approval not found or access denied" },
      });
      throw new Error("Approval request not found or access denied");
    }

    if (item.userId !== params.userId) {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "student",
        action: "approval_decision_unauthorized",
        resourceType: "approval",
        resourceId: params.approvalId,
        metadata: { targetUserId: item.userId },
      });
      throw new Error("Unauthorized: Cannot decide another student's approval");
    }

    if (item.status === "expired" || (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now())) {
      item.status = "expired";
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "system",
        action: "approval_decision_rejected_expired",
        resourceType: "approval",
        resourceId: params.approvalId,
        metadata: { expiresAt: item.expiresAt },
      });
      throw new Error("Approval request has expired and cannot be decided");
    }

    if (item.status !== "pending") {
      throw new Error(`Approval request has already been ${item.status}`);
    }

    const updated = dbStore.decideApproval(
      params.approvalId,
      params.decision,
      params.userId
    );

    if (!updated) {
      throw new Error("Failed to record approval decision");
    }

    dbStore.recordAuditLog({
      userId: params.userId,
      actorType: "student",
      action: params.decision === "approved" ? "approval_granted" : "approval_rejected",
      resourceType: "approval",
      resourceId: params.approvalId,
      metadata: {
        actionType: item.actionType,
        agentSlug: item.agentSlug,
        reason: params.reason || null,
      },
    });

    return updated;
  }

  /**
   * Cancel approval request by student
   */
  static cancelApproval(params: {
    approvalId: string;
    userId: string;
    reason?: string;
  }): ApprovalItem {
    const approvals = dbStore.getApprovals(params.userId);
    const item = approvals.find((a) => a.id === params.approvalId);

    if (!item) {
      throw new Error("Approval request not found or access denied");
    }

    if (item.userId !== params.userId) {
      throw new Error("Unauthorized: Cannot cancel another student's approval");
    }

    if (item.status !== "pending") {
      throw new Error(
        `Cannot cancel approval with current status: '${item.status}'`
      );
    }

    const cancelled = dbStore.cancelApproval(
      params.approvalId,
      params.userId,
      params.reason
    );

    if (!cancelled) {
      throw new Error("Failed to cancel approval request");
    }

    dbStore.recordAuditLog({
      userId: params.userId,
      actorType: "student",
      action: "approval_cancelled",
      resourceType: "approval",
      resourceId: params.approvalId,
      metadata: {
        actionType: item.actionType,
        reason: params.reason || "Cancelled by student",
      },
    });

    return cancelled;
  }

  /**
   * Verify and consume approval at execution time
   * Ensures an agent CANNOT execute an approval-required action without a valid, unexpired approval grant
   */
  static verifyAndConsumeApproval(params: {
    approvalId: string;
    actionType: string;
    userId: string;
    agentSlug?: AgentSlug;
  }): { allowed: boolean; approval: ApprovalItem } {
    const approvals = dbStore.getApprovals(params.userId);
    const item = approvals.find((a) => a.id === params.approvalId);

    if (!item) {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "agent",
        action: "action_execution_blocked_invalid_approval",
        resourceType: "approval",
        resourceId: params.approvalId,
        metadata: {
          actionType: params.actionType,
          reason: "Approval ID does not exist",
        },
      });
      throw new Error(
        `Execution Blocked: Approval '${params.approvalId}' does not exist or access denied.`
      );
    }

    if (item.userId !== params.userId) {
      throw new Error("Execution Blocked: Approval belongs to a different student.");
    }

    if (item.actionType !== params.actionType) {
      throw new Error(
        `Execution Blocked: Approval action mismatch. Approved for '${item.actionType}' but requested '${params.actionType}'.`
      );
    }

    if (item.status !== "approved") {
      dbStore.recordAuditLog({
        userId: params.userId,
        actorType: "agent",
        action: "action_execution_blocked_unapproved_status",
        resourceType: "approval",
        resourceId: params.approvalId,
        metadata: {
          status: item.status,
          actionType: params.actionType,
        },
      });
      throw new Error(
        `Execution Blocked: Approval status is '${item.status}'. Only 'approved' actions can be executed.`
      );
    }

    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      item.status = "expired";
      throw new Error(
        `Execution Blocked: Approval '${params.approvalId}' has expired.`
      );
    }

    if (item.executedAt) {
      throw new Error(
        `Execution Blocked: Approval '${params.approvalId}' was already executed at ${item.executedAt}.`
      );
    }

    // Consume approval
    const consumed = dbStore.consumeApproval(params.approvalId, params.userId);
    if (!consumed) {
      throw new Error("Execution Blocked: Failed to consume approval record.");
    }

    dbStore.recordAuditLog({
      userId: params.userId,
      actorType: "agent",
      action: "action_executed_with_approval",
      resourceType: "approval",
      resourceId: params.approvalId,
      metadata: {
        actionType: params.actionType,
        agentSlug: params.agentSlug || item.agentSlug,
      },
    });

    return {
      allowed: true,
      approval: consumed,
    };
  }
}
