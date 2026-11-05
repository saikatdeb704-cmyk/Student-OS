import { studyAgentConfig } from "../../lib/agents/configs/study.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { studyAgentConfig, studyAgentConfig as default };
export const studyAgent = getAgentBySlug("study");
