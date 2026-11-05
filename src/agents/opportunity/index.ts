import { opportunityAgentConfig } from "../../lib/agents/configs/opportunity.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { opportunityAgentConfig, opportunityAgentConfig as default };
export const opportunityAgent = getAgentBySlug("opportunity");
