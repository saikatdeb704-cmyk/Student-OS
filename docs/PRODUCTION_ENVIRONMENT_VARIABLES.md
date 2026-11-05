# STUDENT OS — Production Environment Variables Reference

**Application:** Student OS  
**Platform:** Next.js 15 (App Router) on Vercel  
**Database & Auth:** Supabase (PostgreSQL 15+ & pgvector)  
**AI Intelligence:** Google Gemini API  

---

## 1. Quick Reference Table

| Variable Name | Required | Target Environment | Scope | Description | Example / Allowed Values |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Production / Preview / Local | Client & Server | Your Supabase Project REST / API URL | `https://xyzprojectid.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Production / Preview / Local | Client & Server | Supabase anonymous public API key (RLS safe) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Production / Preview / Local | **Server Only** | Supabase service-role key for backend DB tasks | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `GEMINI_API_KEY` | **Yes** | Production / Preview / Local | **Server Only** | Google AI Studio Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | No | Production / Preview / Local | **Server Only** | Supported production Gemini model | `gemini-1.5-flash` (recommended), `gemini-1.5-pro`, `gemini-2.0-flash` |
| `MAX_TOKENS_PER_REQUEST` | No | Production / Preview / Local | Server Only | Maximum token budget for single request | `2048` (default: 4096 max) |
| `DAILY_TOKEN_BUDGET_PER_USER` | No | Production / Preview / Local | Server Only | Daily per-student token safety quota | `50000` (default: 120,000) |
| `MAX_AGENT_DELEGATION_DEPTH` | No | Production / Preview / Local | Server Only | Maximum specialist agent delegation chain | `3` (default: 3, max: 4) |

---

## 2. Step-by-Step Acquisition Guide

### A. Supabase Credentials
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and select your project.
2. Navigate to **Project Settings** (gear icon) -> **API**.
3. Under **Project URL**, copy the URL -> `NEXT_PUBLIC_SUPABASE_URL`.
4. Under **Project API keys**, copy the `anon` / `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Under **Project API keys**, copy the `service_role` (secret) key -> `SUPABASE_SERVICE_ROLE_KEY`.
   > [!CAUTION] Security Rule
   > Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. It bypasses PostgreSQL Row Level Security (RLS) and must strictly remain server-only.

### B. Google Gemini API Key
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API key** -> Select an existing Google Cloud Project or create a new one.
4. Copy the generated key string -> `GEMINI_API_KEY`.
   > [!IMPORTANT] Model Versioning
   > Always use standard GA models (`gemini-1.5-flash` or `gemini-2.0-flash`). Avoid deprecated experimental or non-existent identifiers like `gemini-2.5-flash`.

---

## 3. Configuring Variables in Vercel

### Via Vercel Dashboard
1. Open your project on the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** -> **Environment Variables**.
3. Add each variable name and value from the table above.
4. Select all environments: **Production**, **Preview**, and **Development**.
5. Click **Save** and trigger a redeployment.

### Via Vercel CLI
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GEMINI_API_KEY production
vercel env add GEMINI_MODEL production
```

---

## 4. Local Development vs. Production Fallback

If `NEXT_PUBLIC_SUPABASE_URL` or `GEMINI_API_KEY` are not configured locally:
- Student OS gracefully operates in **Local Grounded Engine Mode**.
- It uses the transactional in-memory store ([`src/lib/db/store.ts`](file:///c:/Users/HP/Student%20OS/src/lib/db/store.ts)) with pre-seeded demo records for Aarav Sharma (`student-demo-001`).
- All 16 agents run deterministic fallback generators with calibrated confidence scoring without incurring external API costs.

