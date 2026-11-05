/**
 * Student OS Orchestration Planner
 *
 * Implements:
 * 1. CEO Intent Analysis & Classification
 * 2. Task Decomposition
 * 3. Specialist Agent Selection (Max 6 agents per run)
 * 4. DAG Step Dependency Resolution
 */

import {
  classifyIntentAndPlan,
  loadStudentContextSnapshot,
  detectMissingInformation,
  validateAndOrderPlanDAG,
} from "../lib/agents/orchestrator.ts";

export {
  classifyIntentAndPlan,
  classifyIntentAndPlan as classifyUserIntent,
  classifyIntentAndPlan as createCEOExecutionPlan,
  loadStudentContextSnapshot,
  detectMissingInformation,
  validateAndOrderPlanDAG,
};

export type {
  CEOExecutionPlan,
  CEOExecutionPlanStep,
  CEOIntentCategory,
} from "../types/student-os.ts";
