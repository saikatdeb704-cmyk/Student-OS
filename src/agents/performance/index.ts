import { performanceAgentConfig } from "../../lib/agents/configs/performance.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { performanceAgentConfig, performanceAgentConfig as default };
export const performanceAgent = getAgentBySlug("performance");
