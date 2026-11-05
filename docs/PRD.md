# STUDENT OS — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Approved for Development Planning  
**Product Category:** AI-Powered Student Operating System  
**Platform:** Responsive Web + Progressive Web App (PWA)  
**Primary Users:** College and University Students (Initial Launch: India; Global-ready Architecture)  
**Business Model:** Freemium SaaS  
**AI Architecture:** Multi-Agent System with Central AI CEO Orchestrator

---

## 1. Product Vision & Mission

**Student OS** is an AI-powered digital operating system that helps college students manage their academic, professional, and personal development through a coordinated team of 15 specialised AI agents led by 1 central AI CEO.

Instead of switching across disconnected tools for studying, syllabus tracking, career planning, project building, opportunity discovery, research, and daily tasks, students interact with one central **AI CEO**. The CEO understands natural-language goals, creates structured plans, delegates responsibilities to specialist agents, monitors execution, gates consequential actions behind human approval, and delivers consolidated briefings.

- **Mission:** Help every college student turn their ambitions into achievable, organised actions.
- **Core Value Proposition:** *"One AI CEO. 15 specialised agents. One organised student life."*

---

## 2. Problem-to-Agent Mapping

| Student Problem | Student OS Solution | Owning Agent |
|---|---|---|
| Fragmented goals & multi-app overload | Central executive orchestration & briefings | `#01` AI CEO (`ceo`) |
| No clear academic direction or syllabus tracking | Course, subject, syllabus & assignment planning | `#02` Academic Agent (`academic`) |
| Unstructured daily/weekly study habits | Time-blocked study & revision schedules | `#03` Study Agent (`study`) |
| Difficulty understanding complex subjects | Step-by-step concept tutoring & checks | `#04` Tutor Agent (`tutor`) |
| Exam preparation stress & poor prioritisation | Syllabus-aligned revision & practice quizzes | `#05` Exam Agent (`exam`) |
| Unclear career direction | Role comparison & semester career roadmaps | `#06` Career Agent (`career`) |
| Unidentified skill gaps | Competency assessment & learning sprints | `#07` Skill Agent (`skill`) |
| Lack of portfolio-ready projects | Project scoping, architecture & milestones | `#08` Project Agent (`project`) |
| Missed internships, hackathons & scholarships | Verified opportunity discovery & tracking | `#09` Opportunity Agent (`opportunity`) |
| Research paper & source overload | Grounded paper summaries & literature synthesis | `#10` Research Agent (`research`) |
| Poor daily time & deadline management | Priority queues, reminders & calendar blocks | `#11` Productivity Agent (`productivity`) |
| Disorganised lecture notes & PDFs | Structured summaries, flashcards & semantic search | `#12` Notes Agent (`notes`) |
| Weak outreach emails, resumes & interview answers | Editable communication drafts & interview prep | `#13` Communication Agent (`communication`) |
| Inability to measure real progress | Grounded analytics from stored platform activity | `#14` Performance Agent (`performance`) |
| Limited student budgeting knowledge | Monthly budget planning & expense tracking | `#15` Finance Agent (`finance`) |
| Burnout & unsustainable routines | Study-break pacing, habits & workload balance | `#16` Wellbeing Agent (`wellbeing`) |

---

## 3. Target Audience & User Personas

### Primary Audience
- Undergraduate students across Engineering, Computer Science, Business/Management, Science, and Humanities.
- Students preparing for campus placements, off-campus internships, hackathons, and research fellowships.
- **Initial Launch Market:** Indian college students (`Asia/Kolkata` default timezone, semester-based grading, INR cost-conscious infrastructure), architected for international multi-timezone and multi-institution expansion from Day 1.

### Secondary Audience
- Postgraduate students, international students, student technical societies, and university career cells (future institutional tenant tier).

### Core User Personas
- **Persona A — The Confused Fresher:** Needs academic direction, foundational learning guidance, and a structured daily study routine.
- **Persona B — The Ambitious Builder:** Wants to close professional skill gaps, build production portfolio projects, and secure internships.
- **Persona C — The Overwhelmed Organiser:** Juggles overlapping assignments, lab submissions, exams, and deadlines; needs ruthless prioritisation.
- **Persona D — The Research Explorer:** Needs literature organisation, paper summaries, citation grounding, and research project planning.

---

## 4. Core Product Modules (12 Modules)

1. **Module 1: CEO Command Center** — Three-column interface (Conversations/Directives | Central CEO Chat + Voice STT/TTS | Live Agent Telemetry & Approvals). Understands natural language without forcing manual agent selection.
2. **Module 2: Student Dashboard** — Daily overview, upcoming assignments & exams, syllabus mastery, career goals, active projects, agent activity, and pending approvals.
3. **Module 3: Agent Headquarters** — Directory of all 16 registered agents with capabilities, allowed tools, status (`active`/`idle`/`error`), execution history, and usage telemetry.
4. **Module 4: Academic Hub** — Institution profile, degree/department, semester courses, subjects, unit-level syllabus completion, assignments, and exams.
5. **Module 5: AI Learning Studio** — Guided AI tutoring, concept breakdowns, notes summarisation, active-recall flashcards, practice quizzes, and revision schedules.
6. **Module 6: Career Studio** — Career exploration, role roadmaps, skill gap matrix, learning paths, resume bullet assistance, and interview preparation.
7. **Module 7: Project Lab** — Portfolio project discovery, requirements validation, technical architecture blueprints, milestone tracking, and documentation guidance.
8. **Module 8: Opportunity Center** — Internships, scholarships, hackathons, and competitions. **Strict Rule:** Every external opportunity requires a verified source URL and `last_checked_at` timestamp; never fabricate deadlines or claim an application was submitted.
9. **Module 9: Research Library** — Document uploads, research paper organisation, AI summaries, source extraction, and `pgvector` semantic search.
10. **Module 10: Productivity Center** — Task management, priority queues, calendar blocks, reminders, daily/weekly planning, goal tracking, and recurring tasks.
11. **Module 11: Student Life** — Student budgeting, expense categorisation, habit tracking, routine management, wellbeing check-ins, and communication drafts.
12. **Module 12: Intelligence Reports** — Weekly student reports, academic velocity, skill progression, project milestone completion, and agent execution audits.

---

## 5. Functional Requirements Matrix

| ID | Requirement | Priority | Target Release |
|---|---|---|---|
| FR-001 | Secure registration and login (Supabase Auth) | Critical | Release 1 |
| FR-002 | Student onboarding workflow | Critical | Release 1 |
| FR-003 | Student profile and preferences persistence | Critical | Release 1 |
| FR-004 | CEO natural-language text chat with streaming events | Critical | Release 1 |
| FR-005 | Multi-agent orchestration & task delegation | Critical | Release 1 |
| FR-006 | Agent registry containing all 16 specialist agents | Critical | Release 1 |
| FR-007 | Persistent conversations and message history | High | Release 1 |
| FR-008 | Task creation, prioritisation, and status tracking | High | Release 1 |
| FR-009 | Academic management (courses, subjects, syllabus, exams) | High | Release 1 |
| FR-010 | Personalised daily and weekly study plans | High | Release 1 |
| FR-011 | Voice interaction (STT input & TTS output with text fallback) | High | Release 2 |
| FR-012 | Document uploads & processing pipeline | High | Release 2 |
| FR-013 | Agent execution history & inter-agent message logs | High | Release 1 |
| FR-014 | Human-in-the-loop approval workflows | Critical | Release 1 |
| FR-015 | In-app and push notifications | Medium | Release 2 |
| FR-016 | Career roadmaps, skill gaps & portfolio projects | High | Release 2 |
| FR-017 | Grounded research & verified opportunity discovery | Medium | Release 2 |
| FR-018 | Progress analytics & weekly intelligence reports | Medium | Release 2 |
| FR-019 | Installable PWA (Manifest + Service Worker) | High | Release 2 |
| FR-020 | Offline access to selected previously saved content | Medium | Release 2 |

---

## 6. Non-Functional Requirements & Guardrails

- **Security:** Supabase Row Level Security (`auth.uid()`) on every user-owned table, server-only AI and service-role keys, strict Zod input/output validation, prompt-injection isolation for uploaded documents and web sources, and immutable audit logging.
- **Performance:** Streaming NDJSON/SSE CEO events, paginated database queries, indexed foreign keys, lazy-loaded studio views, and database-backed background jobs for heavy document/research workflows.
- **Reliability:** Bounded delegation depth (`MAX_AGENT_DELEGATION_DEPTH = 4`), per-task retry limits, idempotent task creation, and graceful agent failure recovery.
- **Cost Control (₹0–₹1,000 Bootstrap Budget):** Strict token budgets per request and per user, model tiering (`gemini-2.5-flash` default for routing and routine tasks), response caching, and real-time usage ledger visibility.

---

## 7. Explicitly Out of Scope (Initial Release)

- Native iOS / Android store binaries (served via installable PWA first).
- Direct college ERP scraping/integrations.
- Autonomous external job/internship form submissions without human execution.
- Autonomous banking or financial transactions.
- Peer social networking or college-wide administrative portals.

