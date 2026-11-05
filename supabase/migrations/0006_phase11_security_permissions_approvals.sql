-- ============================================================================
-- STUDENT OS — PHASE 11: SECURITY, PERMISSIONS & APPROVAL MANAGEMENT MIGRATION
-- ============================================================================

-- 1. Extend public.approvals with action_classification, idempotency_key & cancellation_reason
alter table public.approvals
  add column if not exists action_classification text default 'approval_required'
    check (action_classification in ('automatic', 'approval_required', 'restricted')),
  add column if not exists idempotency_key text,
  add column if not exists cancellation_reason text,
  add column if not exists executed_at timestamptz;

-- 2. Update status check constraint to include 'cancelled'
alter table public.approvals
  drop constraint if exists approvals_status_check;

alter table public.approvals
  add constraint approvals_status_check
  check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled'));

-- 3. Duplicate Action Prevention: Unique partial index on (user_id, idempotency_key) for pending approvals
create unique index if not exists idx_approvals_user_pending_idempotency
  on public.approvals(user_id, idempotency_key)
  where (status = 'pending' and idempotency_key is not null);

-- 4. Fast lookup index for active & expiring approvals
create index if not exists idx_approvals_user_status_expires
  on public.approvals(user_id, status, expires_at);

-- 5. Audit logs indexes
create index if not exists idx_audit_logs_user_actor
  on public.audit_logs(user_id, actor_type, created_at desc);

create index if not exists idx_audit_logs_action
  on public.audit_logs(action, created_at desc);

-- 6. RLS Policies on approvals & audit_logs
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;

-- Approvals RLS
drop policy if exists "Users can view their own approvals" on public.approvals;
create policy "Users can view their own approvals"
  on public.approvals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own approvals" on public.approvals;
create policy "Users can update their own approvals"
  on public.approvals for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own approvals" on public.approvals;
create policy "Users can insert their own approvals"
  on public.approvals for insert
  with check (auth.uid() = user_id);

-- Audit logs RLS: Students can view their own audit trail; inserts are system/authenticated only
drop policy if exists "Users can view their own audit logs" on public.audit_logs;
create policy "Users can view their own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own audit logs" on public.audit_logs;
create policy "Users can insert their own audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);

