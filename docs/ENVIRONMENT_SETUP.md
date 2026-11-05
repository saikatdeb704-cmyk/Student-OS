# Student OS — Environment Setup & Local Development Guide

This guide walks developers through setting up, configuring, and developing on Student OS.

---

## 1. System Prerequisites

Ensure your workstation has the following installed:
- **Node.js:** v20.10.0 or higher (Tested and verified on Node.js v24.16.0).
- **npm:** v10.0.0 or higher.
- **Git:** Standard git version control.
- **Operating System:** Windows, macOS, or Linux.
- **Modern Web Browser:** Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari.

---

## 2. Quickstart: Zero-Config Local Development

Student OS features an intelligent dual-mode architecture. You can run and test the complete application immediately **without needing any cloud accounts or API keys**.

```bash
# 1. Clone the repository
git clone https://github.com/your-org/student-os.git
cd "Student OS"

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
- **Pre-configured Demo Student:** `aarav.sharma@iitd.ac.in` (Password: `password123`).
- In Local Demo Mode, all 16 agents, multi-agent orchestration, pgvector memory queries, approval workflows, voice controls, and PWA shells operate with persistent, user-scoped in-memory state.

---

## 3. Full Cloud Setup (Supabase & Google Gemini API)

To connect Student OS to a live Supabase PostgreSQL database and real Gemini AI models, create a `.env.local` file by copying the template:

```bash
cp .env.example .env.local
```

### Complete Environment Variable Reference

```env
# ============================================================================
# 1. SUPABASE CONFIGURATION
# ============================================================================
# Public project URL obtained from Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Public anonymous key for client-side queries (safe for browser exposure)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Secret service-role key for backend operations & migrations (NEVER share or commit)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ============================================================================
# 2. GOOGLE GEMINI AI CONFIGURATION
# ============================================================================
# Server-only API key obtained from Google AI Studio (https://aistudio.google.com)
GEMINI_API_KEY=AIzaSy...

# Target Gemini model for CEO intent analysis and agent synthesis
GEMINI_MODEL=gemini-2.5-flash

# ============================================================================
# 3. SECURITY, COST & EXECUTION GUARDRAILS
# ============================================================================
# Maximum prompt + completion tokens permitted for a single CEO orchestration request
MAX_TOKENS_PER_REQUEST=2048

# Maximum nested sub-agent delegation depth (prevents infinite recursive loops)
MAX_AGENT_DELEGATION_DEPTH=3

# Daily token quota ceiling allocated per student account
DAILY_TOKEN_BUDGET_PER_USER=50000
```

---

## 4. Development & Verification Commands

| Command | Action | Description |
|---|---|---|
| `npm run dev` | Start Dev Server | Launches Next.js App Router on `http://localhost:3000`. |
| `npm run typecheck` | Type Checking | Executes `tsc --noEmit` across all `.ts` and `.tsx` source files. |
| `npm test` | Run Test Suite | Runs all 42 automated unit and integration tests across Phases 1–11. |
| `npm run build` | Production Build | Compiles Next.js for production and validates all 30 routes. |
| `npm run start` | Production Server | Serves the pre-built application locally in production mode. |
| `node scripts/generate-pwa-icons.mjs` | Generate Icons | Generates crisp, valid PNG/SVG icon assets in `public/icons/`. |

---

## 5. Applying Database Migrations Locally

If you are running the Supabase CLI locally with Docker:

```bash
# 1. Start local Supabase instance
supabase start

# 2. Apply all 6 migrations
supabase db reset
```

The migrations located in [`supabase/migrations/`](file:///c:/Users/HP/Student%20OS/supabase/migrations/) will be executed in order:
1. `0001_initial_schema.sql` (Tables & constraints)
2. `0002_rls_policies.sql` (RLS policies)
3. `0003_storage_buckets.sql` (Storage buckets)
4. `0004_fix_profile_rls_and_defaults.sql` (Profile triggers)
5. `0005_phase9_pgvector_memory_and_voice.sql` (`pgvector` & HNSW indexing)
6. `0006_phase11_security_permissions_approvals.sql` (Approvals & audit index)

---

## 6. Troubleshooting Common Development Issues

### 1. Port 3000 Already in Use
If another application is using port 3000:
```bash
npm run dev -- -p 3001
```

### 2. Windows Sandbox `EPERM` Error on `.next` Directory
On Windows, file locking during fast repeated compilations can occasionally trigger a transient `EPERM` error:
```powershell
# In PowerShell:
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm run build
```

### 3. Node.js `[MODULE_TYPELESS_PACKAGE_JSON]` Warning in Tests
When running `npm test`, Node.js v24 logs an informational warning:
`Warning: Module type of file:///... is not specified and it doesn't parse as CommonJS. Reparsing as ES module...`
- **Cause:** Node.js native test runner experimental TypeScript module execution without `"type": "module"` in `package.json`.
- **Status:** Harmless. All 42 tests pass completely and the production Next.js build compiles cleanly as native ES Modules.

