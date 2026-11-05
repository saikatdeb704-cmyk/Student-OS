-- ============================================================================
-- MIGRATION 0004: PHASE 2 COMPLETE CONSTRAINTS, TRIGGERS, INDEXES & RLS
-- ============================================================================
-- Enforces foreign keys, composite indexes, CHECK constraints, updated_at
-- triggers, and strict multi-tenant Row Level Security (RLS) ownership
-- verification across all 27 Student OS tables.

-- ----------------------------------------------------------------------------
-- 1. ENSURE UPDATED_AT COLUMNS ON ALL MUTABLE TABLES
-- ----------------------------------------------------------------------------
alter table public.courses add column if not exists updated_at timestamptz default now();
alter table public.subjects add column if not exists updated_at timestamptz default now();
alter table public.syllabus_topics add column if not exists updated_at timestamptz default now();
alter table public.assignments add column if not exists updated_at timestamptz default now();
alter table public.exams add column if not exists updated_at timestamptz default now();
alter table public.goals add column if not exists updated_at timestamptz default now();
alter table public.study_plans add column if not exists updated_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();
alter table public.opportunities add column if not exists updated_at timestamptz default now();
alter table public.documents add column if not exists updated_at timestamptz default now();
alter table public.approvals add column if not exists updated_at timestamptz default now();

-- ----------------------------------------------------------------------------
-- 2. ATTACH UPDATED_AT TRIGGERS TO ALL MUTABLE TABLES
-- ----------------------------------------------------------------------------
drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
  before update on public.courses
  for each row execute function public.handle_updated_at();

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.handle_updated_at();

drop trigger if exists set_syllabus_topics_updated_at on public.syllabus_topics;
create trigger set_syllabus_topics_updated_at
  before update on public.syllabus_topics
  for each row execute function public.handle_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at
  before update on public.assignments
  for each row execute function public.handle_updated_at();

drop trigger if exists set_exams_updated_at on public.exams;
create trigger set_exams_updated_at
  before update on public.exams
  for each row execute function public.handle_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.handle_updated_at();

drop trigger if exists set_study_plans_updated_at on public.study_plans;
create trigger set_study_plans_updated_at
  before update on public.study_plans
  for each row execute function public.handle_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

drop trigger if exists set_opportunities_updated_at on public.opportunities;
create trigger set_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.handle_updated_at();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

drop trigger if exists set_approvals_updated_at on public.approvals;
create trigger set_approvals_updated_at
  before update on public.approvals
  for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ADDITIONAL INTEGRITY & DOMAIN CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------
alter table public.subjects
  drop constraint if exists chk_subjects_credits_positive,
  add constraint chk_subjects_credits_positive check (credits is null or credits >= 0);

alter table public.syllabus_topics
  drop constraint if exists chk_syllabus_unit_positive,
  add constraint chk_syllabus_unit_positive check (unit_number is null or unit_number >= 1);

alter table public.agent_tasks
  drop constraint if exists chk_agent_tasks_attempts_non_negative,
  add constraint chk_agent_tasks_attempts_non_negative check (attempt_count >= 0);

alter table public.usage_records
  drop constraint if exists chk_usage_tokens_non_negative,
  add constraint chk_usage_tokens_non_negative check (
    input_tokens >= 0 and output_tokens >= 0 and estimated_cost >= 0
  );

alter table public.study_plans
  drop constraint if exists chk_study_plans_dates,
  add constraint chk_study_plans_dates check (
    start_date is null or end_date is null or end_date >= start_date
  );

-- ----------------------------------------------------------------------------
-- 4. FOREIGN-KEY & COMPOSITE PERFORMANCE INDEXES ACROSS ALL 27 TABLES
-- ----------------------------------------------------------------------------
create index if not exists idx_courses_user on public.courses(user_id, semester);
create index if not exists idx_subjects_course on public.subjects(course_id);
create index if not exists idx_syllabus_topics_subject on public.syllabus_topics(subject_id, unit_number);
create index if not exists idx_assignments_user_due on public.assignments(user_id, due_at);
create index if not exists idx_assignments_subject on public.assignments(subject_id);
create index if not exists idx_exams_user_date on public.exams(user_id, exam_at);
create index if not exists idx_exams_subject on public.exams(subject_id);
create index if not exists idx_goals_user_status on public.goals(user_id, status);
create index if not exists idx_study_plans_user on public.study_plans(user_id, status);
create index if not exists idx_study_sessions_user on public.study_sessions(user_id, started_at desc);
create index if not exists idx_student_skills_user on public.student_skills(user_id);
create index if not exists idx_projects_user_status on public.projects(user_id, status);
create index if not exists idx_opportunities_user_deadline on public.opportunities(user_id, deadline);
create index if not exists idx_documents_user on public.documents(user_id, created_at desc);
create index if not exists idx_agent_messages_run on public.agent_messages(run_id, created_at);
create index if not exists idx_usage_records_user on public.usage_records(user_id, created_at desc);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. COMPLETE OWNERSHIP-VERIFIED RLS POLICIES FOR NESTED & EXECUTION TABLES
-- ----------------------------------------------------------------------------
-- Ensure agent_tasks and agent_messages also allow owner inserts/updates
-- when orchestrated within the authenticated user's own agent_run.

drop policy if exists "Users view own agent_tasks via run" on public.agent_tasks;
drop policy if exists "Users manage own agent_tasks via run" on public.agent_tasks;

create policy "Users manage own agent_tasks via run" on public.agent_tasks
  for all
  using (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_tasks.run_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_tasks.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Users view own agent_messages via run" on public.agent_messages;
drop policy if exists "Users manage own agent_messages via run" on public.agent_messages;

create policy "Users manage own agent_messages via run" on public.agent_messages
  for all
  using (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_messages.run_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_messages.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Users view own usage_records" on public.usage_records;
drop policy if exists "Users manage own usage_records" on public.usage_records;

create policy "Users manage own usage_records" on public.usage_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users view own audit_logs" on public.audit_logs;
drop policy if exists "Users manage own audit_logs" on public.audit_logs;

create policy "Users manage own audit_logs" on public.audit_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

