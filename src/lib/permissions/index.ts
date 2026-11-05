/**
 * Student OS Permissions & Security Registry
 */

export {
  PERMISSION_REGISTRY,
  classifyAction,
  getActionDefinition,
  checkExecutionPermission,
  computeActionIdempotencyKey,
} from "../security/permission-registry.ts";

export type {
  ActionDefinition,
  PermissionCheckResult,
} from "../security/permission-registry.ts";

