# STUDENT OS — Phased Implementation Roadmap

**Version:** 1.0  
**Strategy:** Modular Monolith in 12 Structured Phases across 3 Releases (Prototype -> Beta -> Public SaaS)

---

## 1. End-to-End 12-Phase Delivery Plan

| Phase | Milestone Name | Core Deliverables | Current Status |
|---|---|---|---|
| **Phase 0** | Repository Inspection & Architecture | Full repository audit, 7 architecture specifications in `/docs/`, risk & conflict analysis | **Completed** |
| **Phase 1** | Foundation, Auth & Onboarding | Next.js 15 + TypeScript + Tailwind config, Supabase SSR client/server helpers, Student Onboarding & Profile flow | **Scaffolded (Ready for Live Supabase Auth)** |
| **Phase 2** | Database & Student Dashboard | `0001_initial_schema.sql` (22 tables + RLS + indexes), `0002_seed_agents.sql`, Student Overview Dashboard | **Scaffolded** |
| **Phase 3** | CEO Chat & Provider Abstraction | `src/lib/ai/provider.ts` (Gemini API + token ledger + fallback), 3-column CEO Command Center, streaming NDJSON events | **Scaffolded** |
| **Phase 4** | Agent Registry & All 16 Definitions | `src/lib/agents/registry.ts` implementing `StudentAgent` contract for all 16 agents + Agent Headquarters UI | **Scaffolded** |
| **Phase 5** | Orchestration & Shared Tools | 15-step `executeCEOOrchestration` pipeline, intent router, bounded delegation, database/memory tool bindings | **Scaffolded (Core Pipeline Active)** |
| **Phase 6** | Academic & Learning Departments | Full CRUD for Courses, Subjects, Syllabus Units, Assignments, Exams + Interactive Quiz/Flashcard persistence | Planned Next |
| **Phase 7** | Career & Project Departments | Career Roadmaps, Skill Gap Matrix CRUD, Project Milestone board, Verified Opportunity tracker | Planned |
| **Phase 8** | Productivity & Student Support | Calendar time-blocking view, recurring tasks, Student Budget expense tracker (#15), Habit & Wellbeing check-ins (#16) | Planned |
| **Phase 9** | Voice, Semantic Memory & PWA | Web Speech STT/TTS enhancements, PDF upload to Supabase Storage + `pgvector` embeddings (`768d`), Service Worker | Planned |
| **Phase 10** | Approvals & Background Automation | Persistent `approvals` audit trail, `scheduled_jobs` worker for daily morning briefings & deadline alerts | Planned |
| **Phase 11** | Testing, Security & Cost Optimisation | Vitest unit/integration suite, Playwright E2E tests, AI evaluation harness, rate-limiting & token quota enforcement | Planned |
| **Phase 12** | Beta Launch & Deployment | Vercel + Supabase production deployment, weekly intelligence reports, privacy export/delete workflows | Planned |

---

## 2. Release Strategy

### Release 1: Private Prototype (Phases 0–6)
- **Objective:** Prove the central AI CEO orchestration experience with 10–20 initial student testers.
- **Scope:**
  - Authentication & Student Onboarding (`profiles`, `user_preferences`).
  - 3-Column CEO Command Center with live agent streaming.
  - Complete 16-Agent Registry with deep functional workflows for **Academic (#02)**, **Study (#03)**, **Tutor (#04)**, **Exam (#05)**, **Productivity (#11)**, and **Communication (#13)**.
  - Task creation, completion, and Human-in-the-Loop Approval Gate.

### Release 2: Student OS Beta (Phases 7–10)
- **Objective:** Validate daily retention and cross-department student value.
- **Scope:**
  - All 16 agents wired to live Supabase tables (`career_roadmaps`, `student_skills`, `projects`, `opportunities`, `documents`, `memory_records`, `expenses`, `habits`).
  - PDF document uploads + `pgvector` semantic retrieval in Research Library.
  - Voice input/output + Installable PWA with safe offline shell.

### Release 3: Public SaaS (Phases 11–12)
- **Objective:** Production readiness, cost sustainability, and freemium conversion.
- **Scope:**
  - Per-user token quotas, billing entitlements, account data export/deletion, automated E2E/AI evaluation suites, and production observability.

---

## 3. Definition of Done (Strict Engineering Gate)

A feature or agent department is marked **Done** only when:
1. Its UI component works responsively on desktop and mobile.
2. Its Next.js server route handler validates inputs/outputs with Zod.
3. Its Supabase PostgreSQL queries and RLS policies are verified.
4. Authentication and agent tool permissions are enforced.
5. Error states, timeouts, and empty states are handled gracefully.
6. Automated unit/integration tests pass.
7. Functionality is manually verified end-to-end.
8. `/docs/*` documentation remains in sync.

