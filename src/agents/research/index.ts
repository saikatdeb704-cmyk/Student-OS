import { researchAgentConfig } from "../../lib/agents/configs/research.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { researchAgentConfig, researchAgentConfig as default };
export const researchAgent = getAgentBySlug("research");
