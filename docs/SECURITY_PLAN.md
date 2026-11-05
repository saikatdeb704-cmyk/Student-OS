# STUDENT OS — Security, Privacy & Cost Governance Plan

**Version:** 1.0  
**Target Budget Envelope:** ₹0–₹1,000 initial bootstrap budget  
**Security Posture:** Zero-Trust Tenant Isolation + Human-in-the-Loop Approval Gate + Server-Only Credentials

---

## 1. Authentication & Tenant Isolation

1. **Supabase Auth & SSR Cookies:**
   - All authenticated sessions use HTTP-only cookies managed via `@supabase/ssr` (`src/lib/supabase/server.ts`).
   - Every user-owned table in PostgreSQL (`profiles`, `conversations`, `messages`, `agent_runs`, `tasks`, `goals`, `courses`, `assignments`, `exams`, `projects`, `opportunities`, `documents`, `memory_records`, `approvals`, `notifications`, `usage_records`, `audit_logs`) has Row Level Security (`ENABLE ROW LEVEL SECURITY`) active from Migration `0001`.
2. **Strict Ownership Policies:**
   - Direct user tables enforce `auth.uid() = user_id` on `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   - Child tables (`subjects`, `syllabus_topics`, `agent_tasks`, `agent_messages`) verify ownership via `EXISTS` subqueries joining the parent table's `user_id` to `auth.uid()`.
3. **Protected Agent Registry:**
   - `public.agents` permits `SELECT` for authenticated students and blocks client-side `INSERT`, `UPDATE`, or `DELETE`. Only server-side migrations or service-role maintenance scripts can modify agent system prompts or tool allowlists.

---

## 2. Secret Management & Environment Isolation

- **Browser-Safe Variables (`NEXT_PUBLIC_*`):**
  - Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be exposed to client bundles.
- **Server-Only Secrets:**
  - `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are accessed exclusively inside server-only modules (`src/lib/ai/provider.ts` and Next.js Route Handlers).
  - `.gitignore` blocks `.env`, `.env.local`, and `.env.*.local` from ever being committed to version control.

---

## 3. Agent Permission Boundaries & Approval Gate

1. **Tool Allowlist Enforcement:**
   - Each agent in `src/lib/agents/registry.ts` defines an explicit `allowedTools` array.
   - Agents cannot dynamically request additional tools, execute raw SQL strings, or read another student's context.
2. **Consequential External Action Gate:**
   - Actions with external side effects (`draft_external_email`, `update_calendar`, external webhook/submission triggers) must set `requiresApproval: true`.
   - The orchestrator intercepts these actions at Step 13, writes a `pending` record to `public.approvals`, transitions the run status to `waiting_for_approval`, and requires an explicit student `POST /api/approvals/:id/decision` before proceeding.
3. **Truthfulness & Anti-Hallucination Controls:**
   - **Opportunity Agent (#09):** Requires `sourceUrl`, `lastCheckedAt`, and `verificationStatus`. Forbidden from inventing deadlines or claiming an application was submitted.
   - **Exam Agent (#05):** Forbidden from guaranteeing exam scores or claiming access to leaked exam papers.
   - **Research Agent (#10):** Forbidden from fabricating DOIs, paper titles, or citations.
   - **Finance Agent (#15):** Restricted to educational student budgeting; no banking credentials or payment execution.
   - **Wellbeing Agent (#16):** Includes mandatory non-medical disclaimer; never diagnoses mental or physical health conditions.

---

## 4. Prompt Injection & Untrusted Content Defence

- **Untrusted Inputs:** Uploaded PDFs, syllabus files, and scraped opportunity descriptions are treated strictly as untrusted data, never as executable system instructions.
- **Structural Delimiters:** External text injected into agent prompts must be isolated inside `<untrusted_data>...</untrusted_data>` tags with explicit system instructions ignoring any inner directives attempting to override `systemPrompt` or `requiresApproval`.
- **Output Schema Validation:** Every LLM output is parsed through Zod (`AgentResultSchema`). Unrecognised keys or invalid action types are stripped before persistence.

---

## 5. PWA & Shared-Device Privacy Rules

- **Service Worker Cache Isolation:** College students frequently use shared lab or library computers. The PWA Service Worker must **never** cache `/api/*` JSON responses, authenticated documents, or personal profile data. Only static UI assets (JS/CSS bundles, fonts, icons) may be cached in CacheStorage.

---

## 6. AI Cost Governance (₹0–₹1,000 Bootstrap Budget)

| Control Mechanism | Configuration / Limit | Implementation Location |
|---|---|---|
| Default Model Tier | `gemini-2.5-flash` | `src/lib/ai/provider.ts` (`GEMINI_MODEL`) |
| Max Output Tokens / Call | `2048` tokens | `MAX_TOKENS_PER_REQUEST` env var |
| Max Agents / Synchronous Turn | `4` specialist agents | `MAX_AGENT_DELEGATION_DEPTH` (`orchestrator.ts`) |
| Daily Per-Student Token Quota | `50,000` tokens / day | `DAILY_TOKEN_BUDGET_PER_USER` env var |
| Token Telemetry Ledger | Input/output tokens & request count | `getAIUsageSnapshot()` & `public.usage_records` |
| Deterministic Offline Fallback | Zero-cost local fallback when API key omitted or quota reached | `fallbackGenerator` in `src/lib/agents/registry.ts` |

