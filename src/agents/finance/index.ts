import { financeAgentConfig } from "../../lib/agents/configs/finance.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { financeAgentConfig, financeAgentConfig as default };
export const financeAgent = getAgentBySlug("finance");
