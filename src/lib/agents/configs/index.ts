import type { AgentConfig } from "../../../types/student-os.ts";
import { ceoAgentConfig } from "./ceo.agent.ts";
import { academicAgentConfig } from "./academic.agent.ts";
import { studyAgentConfig } from "./study.agent.ts";
import { tutorAgentConfig } from "./tutor.agent.ts";
import { examAgentConfig } from "./exam.agent.ts";
import { careerAgentConfig } from "./career.agent.ts";
import { skillAgentConfig } from "./skill.agent.ts";
import { projectAgentConfig } from "./project.agent.ts";
import { opportunityAgentConfig } from "./opportunity.agent.ts";
import { researchAgentConfig } from "./research.agent.ts";
import { productivityAgentConfig } from "./productivity.agent.ts";
import { notesAgentConfig } from "./notes.agent.ts";
import { communicationAgentConfig } from "./communication.agent.ts";
import { performanceAgentConfig } from "./performance.agent.ts";
import { financeAgentConfig } from "./finance.agent.ts";
import { wellbeingAgentConfig } from "./wellbeing.agent.ts";

export {
  ceoAgentConfig,
  academicAgentConfig,
  studyAgentConfig,
  tutorAgentConfig,
  examAgentConfig,
  careerAgentConfig,
  skillAgentConfig,
  projectAgentConfig,
  opportunityAgentConfig,
  researchAgentConfig,
  productivityAgentConfig,
  notesAgentConfig,
  communicationAgentConfig,
  performanceAgentConfig,
  financeAgentConfig,
  wellbeingAgentConfig,
};

export const ALL_AGENT_CONFIGS: AgentConfig[] = [
  ceoAgentConfig,
  academicAgentConfig,
  studyAgentConfig,
  tutorAgentConfig,
  examAgentConfig,
  careerAgentConfig,
  skillAgentConfig,
  projectAgentConfig,
  opportunityAgentConfig,
  researchAgentConfig,
  productivityAgentConfig,
  notesAgentConfig,
  communicationAgentConfig,
  performanceAgentConfig,
  financeAgentConfig,
  wellbeingAgentConfig,
];

