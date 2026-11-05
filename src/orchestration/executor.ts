/**
 * Student OS Orchestration Executor
 *
 * Implements:
 * 1. Single-agent bounded retry execution
 * 2. Execution-time permission checks (Gated Agent Execution)
 * 3. Central Multi-Agent Orchestration Engine (`executeCEOOrchestration`)
 */

import {
  executeCEOOrchestration,
  executeGatedAgentAction,
} from "../lib/agents/orchestrator.ts";

export {
  executeCEOOrchestration,
  executeCEOOrchestration as executeCEOOrchestrator,
  executeGatedAgentAction,
  executeGatedAgentAction as executeSingleAgentWithRetry,
};
