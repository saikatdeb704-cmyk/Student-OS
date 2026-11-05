import { communicationAgentConfig } from "../../lib/agents/configs/communication.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { communicationAgentConfig, communicationAgentConfig as default };
export const communicationAgent = getAgentBySlug("communication");
