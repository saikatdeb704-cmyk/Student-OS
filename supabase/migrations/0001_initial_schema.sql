-- ============================================================================
-- STUDENT OS — INITIAL PRODUCTION SCHEMA & RLS MIGRATION
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. STUDENT PROFILES & PREFERENCES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  country text default 'India',
  institution text,
  degree text,
  department text,
  semester integer check (semester is null or (semester >= 1 and semester <= 16)),
  career_goal text,
  persona text check (persona is null or persona in ('confused_fresher', 'ambitious_builder', 'overwhelmed_organizer', 'research_explorer')),
  timezone text default 'Asia/Kolkata',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text default 'light' check (theme in ('light', 'dark', 'system')),
  language text default 'en',
  voice_enabled boolean default true,
  notifications_enabled boolean default true,
  daily_study_hours numeric default 3,
  preferences jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 2. AGENT REGISTRY (16 AGENTS)
-- ----------------------------------------------------------------------------
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  department text not null check (department in ('executive', 'academic', 'career', 'productivity', 'support', 'intelligence')),
  system_prompt text,
  capabilities text[] default '{}',
  input_schema jsonb default '{}'::jsonb,
  output_schema jsonb default '{}'::jsonb,
  allowed_tools text[] default '{}',
  enabled boolean default true,
  version integer default 1,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 3. CONVERSATIONS & MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New CEO Session',
  status text default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.handle_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'agent')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 4. AGENT EXECUTION & ORCHESTRATION
-- ----------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'planning', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled', 'needs_input')),
  objective text not null,
  plan jsonb default '{}'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent_id uuid not null references public.agents(id),
  parent_task_id uuid references public.agent_tasks(id) on delete set null,
  objective text not null,
  input jsonb default '{}'::jsonb,
  output jsonb,
  status text default 'pending' check (status in ('pending', 'running', 'waiting_for_approval', 'completed', 'failed', 'needs_input')),
  attempt_count integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  sender_agent_id uuid references public.agents(id),
  recipient_agent_id uuid references public.agents(id),
  message_type text not null,
  content jsonb not null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 5. ACADEMIC HUB
-- ----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  academic_year text,
  semester integer,
  created_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  code text,
  credits numeric,
  created_at timestamptz default now()
);

create table if not exists public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  unit_number integer,
  completion_status text default 'not_started' check (completion_status in ('not_started', 'in_progress', 'completed', 'needs_revision')),
  created_at timestamptz default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status text default 'pending' check (status in ('pending', 'in_progress', 'submitted', 'overdue')),
  created_at timestamptz default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_at timestamptz,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 6. GOALS & TASKS
-- ----------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text default 'academic' check (category in ('academic', 'career', 'skill', 'project', 'finance', 'wellbeing')),
  target_date date,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  status text default 'active' check (status in ('active', 'completed', 'paused', 'archived')),
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  source_agent_id uuid references public.agents(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7. LEARNING & STUDY
-- ----------------------------------------------------------------------------
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  plan_data jsonb not null default '{}'::jsonb,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_plan_id uuid references public.study_plans(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 8. CAREER, PROJECTS & OPPORTUNITIES
-- ----------------------------------------------------------------------------
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text
);

create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency text default 'beginner' check (proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at timestamptz default now(),
  unique(user_id, skill_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  technology_stack text[] default '{}',
  status text default 'planning' check (status in ('planning', 'in_progress', 'completed', 'shipped')),
  repository_url text,
  created_at timestamptz default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organisation text,
  opportunity_type text check (opportunity_type in ('internship', 'scholarship', 'hackathon', 'competition', 'fellowship')),
  source_url text not null,
  deadline timestamptz,
  last_checked_at timestamptz default now(),
  verification_status text default 'unverified' check (verification_status in ('unverified', 'verified', 'expired')),
  status text default 'saved' check (status in ('saved', 'preparing', 'applied', 'archived')),
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 9. DOCUMENTS & MEMORY
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  summary text,
  processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz default now()
);

create table if not exists public.memory_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  content text not null,
  embedding vector(768),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 10. APPROVALS, NOTIFICATIONS, USAGE & AUDIT
-- ----------------------------------------------------------------------------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  action_type text not null,
  action_payload jsonb not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  expires_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info' check (type in ('info', 'approval', 'deadline', 'agent_complete', 'warning')),
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  model text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  estimated_cost numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('student', 'ceo', 'agent', 'system')),
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 11. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_due on public.tasks(user_id, due_at);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_agent_runs_user on public.agent_runs(user_id, created_at desc);
create index if not exists idx_agent_tasks_run on public.agent_tasks(run_id, status);
create index if not exists idx_memory_user on public.memory_records(user_id, category);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_approvals_user_status on public.approvals(user_id, status);

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_messages enable row level security;
alter table public.courses enable row level security;
alter table public.subjects enable row level security;
alter table public.syllabus_topics enable row level security;
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.skills enable row level security;
alter table public.student_skills enable row level security;
alter table public.projects enable row level security;
alter table public.opportunities enable row level security;
alter table public.documents enable row level security;
alter table public.memory_records enable row level security;
alter table public.approvals enable row level security;
alter table public.notifications enable row level security;
alter table public.usage_records enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles & Preferences
create policy "Users can view and update own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can view and update own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Agents Registry (Read-only for authenticated users; writes restricted to service role)
create policy "Authenticated users can read agents" on public.agents
  for select using (true);

-- Direct user_id owned tables
create policy "Users manage own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own agent_runs" on public.agent_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users view own agent_tasks via run" on public.agent_tasks
  for select using (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_tasks.run_id and r.user_id = auth.uid()
    )
  );

create policy "Users view own agent_messages via run" on public.agent_messages
  for select using (
    exists (
      select 1 from public.agent_runs r
      where r.id = agent_messages.run_id and r.user_id = auth.uid()
    )
  );

create policy "Users manage own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own subjects via course" on public.subjects
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = subjects.course_id and c.user_id = auth.uid()
    )
  );

create policy "Users manage own syllabus_topics via subject" on public.syllabus_topics
  for all using (
    exists (
      select 1 from public.subjects s
      join public.courses c on c.id = s.course_id
      where s.id = syllabus_topics.subject_id and c.user_id = auth.uid()
    )
  );

create policy "Users manage own assignments" on public.assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own exams" on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own study_plans" on public.study_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own study_sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can read skills catalog" on public.skills
  for select using (true);

create policy "Users manage own student_skills" on public.student_skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own opportunities" on public.opportunities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own memory_records" on public.memory_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own approvals" on public.approvals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users view own usage_records" on public.usage_records
  for select using (auth.uid() = user_id);

create policy "Users view own audit_logs" on public.audit_logs
  for select using (auth.uid() = user_id);

