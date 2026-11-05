import { skillAgentConfig } from "../../lib/agents/configs/skill.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { skillAgentConfig, skillAgentConfig as default };
export const skillAgent = getAgentBySlug("skill");
