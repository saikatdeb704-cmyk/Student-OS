import { examAgentConfig } from "../../lib/agents/configs/exam.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { examAgentConfig, examAgentConfig as default };
export const examAgent = getAgentBySlug("exam");
