/**
 * Student OS Agent Type Contracts
 */

export type {
  AgentConfig,
  AgentDepartment,
  AgentExecutionLimits,
  AgentInput,
  AgentResult,
  AgentRunRecord,
  AgentSchemaDescriptor,
  AgentSlug,
  AgentTaskRecord,
  ProposedAction,
  StudentAgent,
} from "../types/student-os.ts";

export type AgentCapability = string;
export type AgentExecutionResult = import("../types/student-os.ts").AgentResult;
export interface AgentExecutionContext {
  userId: string;
  runId: string;
  taskId: string;
  conversationId?: string;
}
