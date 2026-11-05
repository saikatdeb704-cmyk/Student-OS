import { academicAgentConfig } from "../../lib/agents/configs/academic.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { academicAgentConfig, academicAgentConfig as default };
export const academicAgent = getAgentBySlug("academic");
