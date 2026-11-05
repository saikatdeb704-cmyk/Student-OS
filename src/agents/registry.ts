/**
 * Student OS Canonical Agent Registry
 *
 * Central registry hosting all 16 specialized agents:
 * 1. CEO (Executive Orchestrator)
 * 2. Academic Agent
 * 3. Study Agent
 * 4. Tutor Agent
 * 5. Exam Agent
 * 6. Career Agent
 * 7. Skill Agent
 * 8. Project Agent
 * 9. Opportunity Agent
 * 10. Research Agent
 * 11. Productivity Agent
 * 12. Notes Agent
 * 13. Communication Agent
 * 14. Performance Agent
 * 15. Finance Agent
 * 16. Wellbeing Agent
 */

import {
  getAllAgents,
  getAgentById,
  getAgentBySlug,
  getAgentsByDepartment,
  setAgentEnabledStatus,
  resetAgentRegistryForTesting,
} from "../lib/agents/registry.ts";

export {
  getAllAgents,
  getAgentById,
  getAgentBySlug,
  getAgentsByDepartment,
  setAgentEnabledStatus,
  resetAgentRegistryForTesting,
};

export const getExecutiveCEOAgent = () => getAgentBySlug("ceo");
export const AGENT_REGISTRY = getAllAgents();
