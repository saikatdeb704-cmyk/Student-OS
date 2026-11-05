/**
 * Student OS Orchestration Validator
 *
 * Implements:
 * 1. Output schema validation
 * 2. Tool permission enforcement
 * 3. Execution-time permission check verification
 */

import {
  validateAgentResultContract,
  validateAgentToolPermissions,
} from "../lib/agents/orchestrator.ts";

export {
  validateAgentResultContract,
  validateAgentResultContract as validateAgentOutput,
  validateAgentToolPermissions,
};

export {
  checkExecutionPermission,
  classifyAction,
  getActionDefinition,
} from "../lib/security/permission-registry.ts";
