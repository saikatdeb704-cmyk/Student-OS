# STUDENT OS — Pre-Deployment & Production Checklist

Before triggering a public production deployment, complete and verify each stage of this checklist.

---

## Stage 1: Code Quality & Build Verification
- [x] **TypeScript Strict Check:** `npx tsc --noEmit` exits with 0 errors.
- [x] **Automated Test Suite:** `npm test` passes 51/51 tests across all phases (100% pass rate).
- [x] **Production Bundle Build:** `npm run build` compiles all 30 routes without webpack or packaging errors.
- [x] **No Hardcoded Credentials:** Verify no real API keys, database connection strings, or service tokens exist in client source code.

---

## Stage 2: Database & Supabase Configuration
- [ ] **Supabase Project Created:** New project initialized on Supabase in target region (e.g. `ap-south-1` for India / Asia).
- [ ] **SQL Migrations Applied:** Run migrations 0001 through 0006 in order:
  - `0001_initial_schema.sql` (Creates 27 public tables and primary indexes)
  - `0002_seed_agents.sql` (Seeds all 16 agent metadata records)
  - `0003_phase1_auth_onboarding.sql` (Adds onboarding attributes and auth trigger)
  - `0004_phase2_schema_constraints_rls_triggers.sql` (Enforces foreign keys and updated_at triggers)
  - `0005_phase9_pgvector_memory_and_voice.sql` (Enables `vector` extension and IVFFlat cosine index)
  - `0006_phase11_security_permissions_approvals.sql` (Configures approval idempotency and security audit log indexes)
- [ ] **Row Level Security Verified:** Ensure RLS is enabled on all tables in Supabase Table Editor.
- [ ] **Seed Data Loaded:** Execute `supabase/seed.sql` to populate default agents and initial system records.
- [ ] **Site URL & Redirects Configured:** Set **Site URL** in Supabase Auth Settings to your custom domain or Vercel URL (e.g. `https://student-os.vercel.app`).
  - Add redirect URLs:
    - `https://your-domain.vercel.app/`
    - `https://your-domain.vercel.app/reset-password`
    - `https://your-domain.vercel.app/auth/callback`

---

## Stage 3: AI Configuration & Limits
- [ ] **Gemini API Key Verified:** Active key generated from Google AI Studio.
- [ ] **Model Selection:** `GEMINI_MODEL=gemini-1.5-flash` or `gemini-2.0-flash`.
- [ ] **Safety Quotas Enforced:** `DAILY_TOKEN_BUDGET_PER_USER=50000` set to prevent unexpected API costs.
- [ ] **Error Fallback Verified:** Verify that agents degrade to context-grounded recommendations if Gemini returns 429 or network errors.

---

## Stage 4: Hosting & Vercel Deployment
- [ ] **Repository Connected:** Push code to GitHub repository (public or private).
- [ ] **Vercel Project Imported:** Framework Preset set to **Next.js**. Root directory: `./`.
- [ ] **Environment Variables Populated:** All 4 required variables added to Vercel (see [PRODUCTION_ENVIRONMENT_VARIABLES.md](file:///c:/Users/HP/Student%20OS/docs/PRODUCTION_ENVIRONMENT_VARIABLES.md)).
- [ ] **Custom Domain Configured:** Add custom domain (e.g. `app.studentos.in`) with SSL automatically provisioned by Vercel.

---

## Stage 5: Post-Deployment Smoke Tests
- [ ] **User Registration:** Create a new test student account from `/register`.
- [ ] **Onboarding Flow:** Complete all 11 fields and verify redirect to `/`.
- [ ] **AI CEO Chat Test:** Send prompt: `"Help me plan my semester study schedule and find 2 machine learning internships."`
- [ ] **Agent Coordination:** Check that CEO streams plan, delegates to Academic, Study, Career, and Opportunity agents, and generates response.
- [ ] **Approval Center:** Trigger an action requiring approval (e.g. drafting an outreach email) and verify it appears in Pending Approvals.
- [ ] **PWA Shell:** Verify that `/offline` page loads when network connection is severed.
- [ ] **Sign Out:** Click Sign Out and verify session cookies are cleared and redirect to `/login` occurs.

