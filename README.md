# Student OS

**One AI CEO. 15 Specialised Agents. One Organised Student Life.**

Student OS is an AI-powered digital operating system for college and university students built as a modular monolith with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Supabase (PostgreSQL + pgvector + RLS)**, and a **Provider-Independent AI Adapter (Gemini API + Demo Fallback)**.

---

## Architecture & Core Capabilities

1. **Central AI CEO Orchestrator (`src/lib/agents/orchestrator.ts`)**
   - Implements the 15-step orchestration lifecycle (`PENDING → PLANNING → RUNNING → WAITING_FOR_APPROVAL → COMPLETED`).
   - Classifies natural-language student directives, selects up to 4 specialist agents per run, enforces tool permissions, syncs generated tasks to the Productivity Center, and gates external actions behind the **Human-in-the-Loop Approval Service**.
   - Streams structured NDJSON `CEOEvent`s to the 3-column CEO Command Center UI.

2. **All 16 Registered AI Agents (`src/lib/agents/registry.ts`)**
   - `#01` **AI CEO** (`ceo`) — Executive Orchestrator
   - `#02` **Academic Agent** (`academic`) — Courses, syllabi & assignments
   - `#03` **Study Agent** (`study`) — Daily/weekly schedules & revision blocks
   - `#04` **Tutor Agent** (`tutor`) — Step-by-step concept intuition & checks
   - `#05` **Exam Agent** (`exam`) — Syllabus-aligned revision & mock quizzes
   - `#06` **Career Agent** (`career`) — Career exploration & roadmaps
   - `#07` **Skill Agent** (`skill`) — Skill gap analysis & learning sprints
   - `#08` **Project Agent** (`project`) — Portfolio project architecture & milestones
   - `#09` **Opportunity Agent** (`opportunity`) — Verified internships, hackathons & scholarships
   - `#10` **Research Agent** (`research`) — Grounded paper summaries & literature synthesis
   - `#11` **Productivity Agent** (`productivity`) — Daily MITs, deadlines & task triage
   - `#12` **Notes Agent** (`notes`) — Cornell summaries & active-recall flashcards
   - `#13` **Communication Agent** (`communication`) — Outreach drafts & resume bullets (approval-gated)
   - `#14` **Performance Agent** (`performance`) — Grounded analytics from stored activity
   - `#15` **Finance Agent** (`finance`) — Student budget planning & financial literacy
   - `#16` **Wellbeing Agent** (`wellbeing`) — Sustainable routines, rest intervals & habit pacing

3. **Database Schema & Row Level Security (`supabase/migrations/`)**
   - `0001_initial_schema.sql`: Full PostgreSQL + `pgvector` schema with `auth.uid()` RLS policies across all 22 tables.
   - `0002_seed_agents.sql`: Seeds all 16 specialist agent definitions.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (Optional for Local Demo Mode):**
   ```bash
   cp .env.example .env.local
   ```
   *Note: Student OS works immediately out-of-the-box in **Local Demo Mode** even before `NEXT_PUBLIC_SUPABASE_URL` or `GEMINI_API_KEY` are added.*

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

