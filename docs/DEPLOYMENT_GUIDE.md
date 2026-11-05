# Student OS — Production Deployment Guide

This guide provides step-by-step instructions for deploying Student OS to production using **Vercel** and **Supabase (PostgreSQL with `pgvector`)**.

---

## 1. Prerequisites & Required Accounts

Before beginning deployment, ensure you have:
1. **GitHub / GitLab Repository:** A clean push of the `Student OS` repository.
2. **Supabase Account:** Access to [supabase.com](https://supabase.com) to create a managed PostgreSQL project.
3. **Google Cloud / Gemini API Account:** An API key from [Google AI Studio](https://aistudio.google.com) with Gemini 2.5 access.
4. **Vercel Account:** Access to [vercel.com](https://vercel.com) for App Router hosting.
5. **Custom Domain (Optional but Recommended):** Access to your DNS management console (e.g. Cloudflare, Namecheap, Google Domains).

---

## 2. Step 1: Database Setup on Supabase

### 2.1 Create Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**, select your organization, specify a project name (e.g., `student-os-prod`), choose a region close to your primary student base (e.g., `ap-south-1` for India, `us-east-1` for US), and generate a strong database password.
3. Once provisioned, navigate to **Project Settings** -> **API** to copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **Anon / Public Key** (`eyJhbGciOi...`)
   - **Service Role Key** (Secret — keep confidential!)

### 2.2 Execute SQL Migrations (In Sequential Order)
Open the **SQL Editor** in the Supabase Dashboard and run the 6 migration files located in `supabase/migrations/`:

1. **[`0001_initial_schema.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0001_initial_schema.sql)**:
   - Provisions all 27 tables, primary keys, foreign keys (`on delete cascade`), indexes, and `updated_at` triggers.
2. **[`0002_rls_policies.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0002_rls_policies.sql)**:
   - Enables Row Level Security (RLS) across all tables and binds queries to `auth.uid() = user_id`.
3. **[`0003_storage_buckets.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0003_storage_buckets.sql)**:
   - Creates private storage buckets (`student-documents`, `student-avatars`) with user-scoped RLS policies.
4. **[`0004_fix_profile_rls_and_defaults.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0004_fix_profile_rls_and_defaults.sql)**:
   - Establishes profile defaults, insert triggers, and onboarding flags.
5. **[`0005_phase9_pgvector_memory_and_voice.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0005_phase9_pgvector_memory_and_voice.sql)**:
   - Enables the `vector` extension, creates the HNSW index on `memory_records(embedding vector_cosine_ops)`, and installs the `match_user_memories` hybrid search function.
6. **[`0006_phase11_security_permissions_approvals.sql`](file:///c:/Users/HP/Student%20OS/supabase/migrations/0006_phase11_security_permissions_approvals.sql)**:
   - Configures approval statuses (`cancelled`), the partial unique idempotency index (`idx_approvals_user_pending_idempotency`), and audit logs RLS.

*Alternative via Supabase CLI:*
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 2.3 Configure Supabase Authentication
1. Go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your production domain: `https://student-os.com`.
3. Add to **Redirect URLs**:
   - `https://student-os.com/auth/callback`
   - `https://student-os.com/reset-password`
   - `https://student-os.com/onboarding`
   - `http://localhost:3000/auth/callback` (for local development)

---

## 3. Step 2: Deploy to Vercel

### 3.1 Connect Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `Student OS` repository.
4. Framework Preset will be automatically detected as **Next.js**.

### 3.2 Configure Environment Variables in Vercel
In the **Environment Variables** section, add the following production variables:

| Variable Name | Environment | Value / Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://<your-project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Your public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Your secret Supabase service role key |
| `GEMINI_API_KEY` | Production, Preview | Google Gemini API key from AI Studio |
| `GEMINI_MODEL` | Production, Preview | `gemini-2.5-flash` |
| `MAX_TOKENS_PER_REQUEST` | Production, Preview | `2048` |
| `MAX_AGENT_DELEGATION_DEPTH` | Production, Preview | `4` |
| `DAILY_TOKEN_BUDGET_PER_USER` | Production, Preview | `50000` |
| `NODE_ENV` | Production | `production` |

### 3.3 Deploy
Click **Deploy**. Vercel will run `npm run build` and output the optimized App Router production deployment.

---

## 4. Step 3: Custom Domain & DNS Configuration

1. In the Vercel Project Dashboard, navigate to **Settings** -> **Domains**.
2. Enter your custom domain (e.g. `app.studentos.org` or `studentos.ai`).
3. Add the required DNS records at your domain registrar:
   - **Apex domain:** An `A` record pointing to `76.76.21.21`.
   - **Subdomain (`app`):** A `CNAME` record pointing to `cname.vercel-dns.com`.
4. Vercel will automatically provision a free Let's Encrypt SSL certificate within a few minutes.

---

## 5. Step 4: PWA & CDN Cache Configuration

To ensure instant updates and offline support, verify the following cache rules in Vercel:
- **`public/sw.js`**: Must **never** be cached permanently. Vercel automatically serves `/sw.js` with `Cache-Control: public, max-age=0, must-revalidate`.
- **`public/manifest.json`**: Served with `Content-Type: application/manifest+json`.
- **Static Assets (`/_next/static/*`, `/icons/*`)**: Immutable caching with long TTL.
- **API Routes (`/api/*`)**: Dynamically executed on demand without shared intermediate caching.

---

## 6. Step 5: Post-Deployment Verification & Smoke Tests

Execute this post-deployment checklist on your live production URL:

1. [ ] **Registration & Email:** Register a new test account at `/register`. Verify account creation in Supabase Auth table.
2. [ ] **11-Field Onboarding:** Complete the full onboarding flow at `/onboarding`. Verify redirect to `/` and profile database row.
3. [ ] **Student Dashboard:** Verify that all 8 widgets render real database metrics without errors.
4. [ ] **AI CEO Streaming:** Open AI CEO, submit a multi-agent prompt (*"Plan my semester exams and study roadmap"*), and verify SSE real-time streaming and agent badge indicators.
5. [ ] **Approval Center:** Create an external outreach action and confirm it appears in the Human-in-the-Loop approval gate with classification and expiration badges.
6. [ ] **PWA Installation:** Open the production URL in Chrome on desktop and Android. Verify that the **"Install App"** prompt appears and adds the standalone icon.
7. [ ] **Offline Application Shell:** Disconnect your internet connection or turn on Airplane Mode. Refresh the page and confirm the offline shell (`/offline`) loads with your local revision checklist.
8. [ ] **Security Audit:** Verify that `/api/security/audit` records actions properly and rejects cross-user unauthorized access.

