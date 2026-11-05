# STUDENT OS
## Product Requirements Document & Technical Architecture

**Version:** 1.0  
**Status:** Approved for development planning  
**Product category:** AI-powered Student Operating System  
**Platform:** Responsive Web + Progressive Web App  
**Primary users:** College and university students  
**Business model:** Freemium SaaS  
**AI architecture:** Multi-agent system with central CEO orchestrator

---

## Core Value Proposition
"One AI CEO. 15 specialised agents. One organised student life."

## Phased Implementation Roadmap
- **Phase 0:** Repository inspection and architecture
- **Phase 1:** Foundation, authentication and onboarding
- **Phase 2:** Database and dashboard
- **Phase 3:** CEO chat and provider abstraction
- **Phase 4:** Agent registry and all 16 definitions
- **Phase 5:** Orchestration and shared tools
- **Phase 6:** Academic and learning departments
- **Phase 7:** Career and project departments
- **Phase 8:** Productivity and student support
- **Phase 9:** Voice, memory and PWA
- **Phase 10:** Approvals and automation
- **Phase 11:** Testing, security and cost optimisation
- **Phase 12:** Beta launch and deployment

## Architecture Overview
- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons, PWA manifest & service worker.
- **Backend:** Next.js Route Handlers (`/api/*`), Custom TypeScript Orchestration Service, Provider-independent AI Adapter (Gemini API + Demo Fallback).
- **Database & Auth:** Supabase PostgreSQL + pgvector + RLS + Supabase Auth (with Local/Demo Storage Fallback when credentials are not yet configured).
- **16 Registered Agents:**
  1. `ceo` — AI CEO (Chief Executive & Central Orchestrator)
  2. `academic` — Academic Agent
  3. `study` — Study Agent
  4. `tutor` — Tutor Agent
  5. `exam` — Exam Agent
  6. `career` — Career Agent
  7. `skill` — Skill Agent
  8. `project` — Project Agent
  9. `opportunity` — Opportunity Agent
  10. `research` — Research Agent
  11. `productivity` — Productivity Agent
  12. `notes` — Notes Agent
  13. `communication` — Communication Agent
  14. `performance` — Performance Agent
  15. `finance` — Finance Agent
  16. `wellbeing` — Wellbeing Agent

