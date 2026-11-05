import { careerAgentConfig } from "../../lib/agents/configs/career.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { careerAgentConfig, careerAgentConfig as default };
export const careerAgent = getAgentBySlug("career");
