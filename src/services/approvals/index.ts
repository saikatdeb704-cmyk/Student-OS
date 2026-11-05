/**
 * Student OS Approval Management Service
 *
 * Implements:
 * 1. Approval creation with action classification
 * 2. Idempotency & duplicate action prevention
 * 3. Expiration evaluation
 * 4. Approval decision (approve / reject)
 * 5. Student cancellation
 * 6. Execution-time verification and consumption
 */

export { ApprovalService } from "../../lib/security/approval-service.ts";
export {
  classifyAction,
  getActionDefinition,
  checkExecutionPermission,
  computeActionIdempotencyKey,
  PERMISSION_REGISTRY,
} from "../../lib/security/permission-registry.ts";

