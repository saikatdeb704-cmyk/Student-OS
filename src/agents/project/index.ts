import { projectAgentConfig } from "../../lib/agents/configs/project.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { projectAgentConfig, projectAgentConfig as default };
export const projectAgent = getAgentBySlug("project");
