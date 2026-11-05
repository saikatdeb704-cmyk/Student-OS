/**
 * Student OS Result Aggregator & Conflict Resolution
 *
 * Implements:
 * 1. Cross-agent conflict detection & resolution
 * 2. Executive CEO synthesis generation
 * 3. Token usage ledger rollup
 */

export {
  resolveCrossAgentConflicts,
  buildContextualCEOSynthesis,
} from "../lib/agents/orchestrator.ts";

export type {
  ConflictResolutionRecord,
  TokenUsageRecord,
} from "../types/student-os.ts";
