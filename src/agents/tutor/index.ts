import { tutorAgentConfig } from "../../lib/agents/configs/tutor.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { tutorAgentConfig, tutorAgentConfig as default };
export const tutorAgent = getAgentBySlug("tutor");
