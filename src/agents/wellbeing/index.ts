import { wellbeingAgentConfig } from "../../lib/agents/configs/wellbeing.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { wellbeingAgentConfig, wellbeingAgentConfig as default };
export const wellbeingAgent = getAgentBySlug("wellbeing");
