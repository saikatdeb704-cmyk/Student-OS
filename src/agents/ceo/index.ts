import { ceoAgentConfig } from "../../lib/agents/configs/ceo.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { ceoAgentConfig, ceoAgentConfig as default };
export const ceoAgent = getAgentBySlug("ceo");
