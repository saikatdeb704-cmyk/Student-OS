import { productivityAgentConfig } from "../../lib/agents/configs/productivity.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { productivityAgentConfig, productivityAgentConfig as default };
export const productivityAgent = getAgentBySlug("productivity");
