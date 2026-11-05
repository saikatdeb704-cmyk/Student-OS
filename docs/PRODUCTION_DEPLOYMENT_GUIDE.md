# STUDENT OS — Comprehensive Production Deployment Guide

**Target Architecture:**
- **Frontend & Fullstack Runtime:** Next.js 15 (App Router, Node.js runtime) on **Vercel**
- **Database & Authentication:** **Supabase** (Managed PostgreSQL 15+ with `pgvector` extension)
- **AI Intelligence:** **Google Gemini API** (`gemini-1.5-flash`)
- **PWA & Edge Routing:** Service Worker cache isolation and Next.js middleware route protection

---

## 1. System Identification & Framework Verification

An inspection of the workspace confirms:
- **Framework:** Next.js 15.2.0 with React 19 and App Router (`src/app/`).
- **Language:** TypeScript 5.7.3 with strict type checking.
- **Styling:** Tailwind CSS 3.4.17 with custom color palette and responsive utilities.
- **Packaging:** Standalone web application with PWA manifest and service worker.
- **Target Deployment Platform:** Vercel (recommended for Next.js App Router).

---

## 2. Infrastructure Setup (Supabase)

### Step 2.1 — Create Supabase Project
1. Visit [supabase.com](https://supabase.com) and click **New project**.
2. Name your project: `Student OS Production`.
3. Choose your database password (store securely).
4. Select the region closest to your student base (e.g. `ap-south-1` Mumbai for India).
5. Choose the **Free** or **Pro** plan.

### Step 2.2 — Apply SQL Migrations
In the Supabase Dashboard, navigate to the **SQL Editor** and execute the 6 migration files in order:

```sql
-- 1. Execute supabase/migrations/0001_initial_schema.sql
-- Creates 27 public tables, UUID primary keys, and initial RLS policies.

-- 2. Execute supabase/migrations/0002_seed_agents.sql
-- Inserts metadata and system prompts for all 16 agents.

-- 3. Execute supabase/migrations/0003_phase1_auth_onboarding.sql
-- Adds the 11 student onboarding attributes and auth trigger.

-- 4. Execute supabase/migrations/0004_phase2_schema_constraints_rls_triggers.sql
-- Enforces foreign keys, check constraints, and updated_at triggers.

-- 5. Execute supabase/migrations/0005_phase9_pgvector_memory_and_voice.sql
-- Enables the vector extension and IVFFlat 768-d cosine index.

-- 6. Execute supabase/migrations/0006_phase11_security_permissions_approvals.sql
-- Enforces approval status constraints and security audit indexes.

-- 7. Execute supabase/seed.sql
-- Populates default agents and demo profiles.
```

### Step 2.3 — Configure Supabase Authentication
1. Go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your production domain: `https://your-student-os.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://your-student-os.vercel.app/**`
   - `https://your-student-os.vercel.app/reset-password`
   - `https://your-student-os.vercel.app/auth/callback`
   - `http://localhost:3000/**` (for local development)
4. Under **Providers**, ensure **Email** is enabled. Disable "Confirm email" for testing or configure your SMTP provider (SendGrid/Resend) for production confirmation emails.

---

## 3. AI Setup (Google Gemini API)

1. Navigate to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** -> **Create API key**.
3. Copy the API key string (e.g. `AIzaSy...`).
4. Keep the default model as `gemini-1.5-flash` for high throughput, low latency, and low operating cost.

---

## 4. Vercel Deployment Guide

### Method A: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Initialize Git & Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: complete Student OS enterprise architecture ready for public beta"
   git branch -M main
   git remote add origin https://github.com/your-username/student-os.git
   git push -u origin main
   ```

2. **Import Project into Vercel:**
   - Log in to [vercel.com](https://vercel.com).
   - Click **Add New...** -> **Project**.
   - Select your `student-os` GitHub repository and click **Import**.

3. **Configure Project Settings:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

4. **Add Environment Variables:**
   Expand the **Environment Variables** section and add:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-1.5-flash
   MAX_TOKENS_PER_REQUEST=2048
   DAILY_TOKEN_BUDGET_PER_USER=50000
   ```

5. **Deploy:**
   Click **Deploy**. Vercel will build the project, run optimizations, and provision an HTTPS URL (e.g. `https://student-os-xyz.vercel.app`).

---

### Method B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link and Configure Environment Variables:**
   ```bash
   vercel link
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add GEMINI_API_KEY production
   vercel env add GEMINI_MODEL production
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

---

## 5. Public Beta Security & Safety Guidelines

Student OS is equipped with multiple defensive layers making it suitable for a **controlled public beta**:
1. **Sliding-Window Rate Limiting:** Built into `/api/ceo/chat`, `/api/auth/login`, and `/api/auth/register` to block brute force and denial of wallet attacks.
2. **Server-Side AI API Isolation:** Client bundles cannot view or execute the Gemini API key.
3. **Execution Gate on Consequential Actions:** Consequential actions (such as sending emails or modifying external schedules) are halted in `ApprovalService` until explicitly authorized by the user.
4. **Prompt Injection & Document Scanners:** Incoming user requests and uploaded files are sanitized for prompt overrides and executable file payloads before reaching the AI orchestrator.

