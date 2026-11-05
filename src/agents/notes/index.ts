import { notesAgentConfig } from "../../lib/agents/configs/notes.agent.ts";
import { getAgentBySlug } from "../../lib/agents/registry.ts";

export { notesAgentConfig, notesAgentConfig as default };
export const notesAgent = getAgentBySlug("notes");
