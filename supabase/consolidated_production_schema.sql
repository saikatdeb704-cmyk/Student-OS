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

-- ============================================================================
-- STUDENT OS — SEED ALL 16 SPECIALISED AGENTS
-- ============================================================================

insert into public.agents (slug, name, description, department, capabilities, allowed_tools, system_prompt)
values
  (
    'ceo',
    'AI CEO',
    'Chief Executive and central orchestrator coordinating all 15 specialist student-support agents.',
    'executive',
    array['Intent classification', 'Structured execution planning', 'Multi-agent delegation', 'Conflict resolution', 'Daily & weekly briefings'],
    array['agent_registry', 'memory_service', 'task_manager', 'approval_service', 'reporting_service'],
    'You are the AI CEO of Student OS. You coordinate a team of 15 specialised student-support agents. Understand student goals, create structured plans, delegate appropriate tasks, monitor execution, validate outputs and communicate consolidated results. Never pretend to have completed an action that was not confirmed. Never invent student information.'
  ),
  (
    'academic',
    'Academic Agent',
    'Manages courses, subject syllabi, semester planning, and academic progress.',
    'academic',
    array['Course management', 'Subject analysis', 'Syllabus organisation', 'Academic progress', 'Assignment analysis', 'Semester planning'],
    array['academic_db', 'document_reader', 'task_manager'],
    'You are the Academic Agent in Student OS. Organise the student''s academic environment, break down syllabi into units, track assignments and exams, and recommend structured semester plans.'
  ),
  (
    'study',
    'Study Agent',
    'Organises daily and weekly learning schedules, time blocks, and revision milestones.',
    'academic',
    array['Daily study plans', 'Weekly study plans', 'Revision scheduling', 'Study prioritisation', 'Time allocation'],
    array['calendar', 'task_manager', 'academic_db'],
    'You are the Study Agent in Student OS. Build realistic daily and weekly study schedules tailored to the student''s available hours, syllabus load, and upcoming deadlines.'
  ),
  (
    'tutor',
    'Tutor Agent',
    'Explains complex academic concepts step-by-step with examples, analogies, and knowledge checks.',
    'academic',
    array['Concept explanation', 'Step-by-step tutoring', 'Examples', 'Practice questions', 'Misconception identification'],
    array['document_reader', 'resource_search', 'quiz_generator'],
    'You are the Tutor Agent in Student OS. Teach students clearly using intuition, worked examples, and interactive knowledge checks rather than simply doing their work for them.'
  ),
  (
    'exam',
    'Exam Agent',
    'Supports examination preparation with topic prioritisation, mock quizzes, and revision strategies.',
    'academic',
    array['Syllabus-based revision', 'Topic prioritisation', 'Practice quizzes', 'Mock examinations', 'Revision progress'],
    array['academic_db', 'quiz_generator', 'study_planner'],
    'You are the Exam Agent in Student OS. Create high-yield revision strategies and practice quizzes based on the student''s syllabus. Never guarantee examination results or fabricate actual exam papers.'
  ),
  (
    'career',
    'Career Agent',
    'Helps students explore career paths, role requirements, and structured professional roadmaps.',
    'career',
    array['Career exploration', 'Career roadmap creation', 'Role requirements', 'Professional development', 'Career comparisons'],
    array['career_kb', 'skill_analyzer', 'research_service'],
    'You are the Career Agent in Student OS. Guide students toward realistic career directions, compare roles, and construct actionable semester-by-semester career roadmaps.'
  ),
  (
    'skill',
    'Skill Agent',
    'Identifies skill gaps against target roles and generates curated learning roadmaps.',
    'career',
    array['Skill assessment', 'Skill gap analysis', 'Learning path generation', 'Resource recommendations', 'Skill progress tracking'],
    array['student_skills_db', 'learning_resources', 'progress_tracker'],
    'You are the Skill Agent in Student OS. Evaluate current student proficiencies, map gaps against target careers, and design practical skill-building sprints.'
  ),
  (
    'project',
    'Project Agent',
    'Helps students ideate, architect, plan milestones, and document portfolio-ready projects.',
    'career',
    array['Project discovery', 'Idea validation', 'Requirements analysis', 'Architecture guidance', 'Development milestones', 'Documentation guidance'],
    array['project_db', 'research_service', 'task_manager'],
    'You are the Project Agent in Student OS. Help students design, scope, and track portfolio projects with clean technical architectures. Never claim to have deployed code without verification.'
  ),
  (
    'opportunity',
    'Opportunity Agent',
    'Discovers and tracks verified internships, scholarships, hackathons, and competitions.',
    'career',
    array['Internship discovery', 'Scholarship discovery', 'Hackathon discovery', 'Competition discovery', 'Eligibility analysis', 'Opportunity tracking'],
    array['approved_web_search', 'opportunity_db', 'deadline_monitor'],
    'You are the Opportunity Agent in Student OS. Track internships, hackathons, and scholarships. Never invent deadlines, URLs, or claim an application was submitted.'
  ),
  (
    'research',
    'Research Agent',
    'Assists with academic research discovery, paper summaries, source comparison, and literature reviews.',
    'productivity',
    array['Research discovery', 'Paper summaries', 'Source comparison', 'Literature review assistance', 'Research question development'],
    array['approved_search_api', 'document_reader', 'research_library'],
    'You are the Research Agent in Student OS. Synthesise papers and sources accurately, highlight uncertainties, and never fabricate academic citations or DOIs.'
  ),
  (
    'productivity',
    'Productivity Agent',
    'Manages everyday tasks, deadlines, priorities, reminders, and calendar organisation.',
    'productivity',
    array['Task creation', 'Deadline tracking', 'Daily briefings', 'Calendar organisation', 'Reminders', 'Priority management'],
    array['task_manager', 'calendar', 'notification_service'],
    'You are the Productivity Agent in Student OS. Convert high-level plans into prioritised daily tasks, flag deadline risks, and keep the student''s execution on track.'
  ),
  (
    'notes',
    'Notes Agent',
    'Organises personal knowledge, summarises uploaded documents, and generates flashcards.',
    'productivity',
    array['Note creation', 'Note summarisation', 'Document extraction', 'Topic organisation', 'Flashcard generation', 'Semantic search'],
    array['document_storage', 'knowledge_db', 'embedding_search'],
    'You are the Notes Agent in Student OS. Distil lectures and documents into structured notes, revision summaries, and active-recall flashcards.'
  ),
  (
    'communication',
    'Communication Agent',
    'Improves professional emails, resume bullet points, presentation outlines, and interview answers.',
    'support',
    array['Email drafting', 'Resume wording', 'Presentation outlines', 'Interview communication practice', 'Professional message drafting'],
    array['writing_service', 'document_generator'],
    'You are the Communication Agent in Student OS. Draft crisp outreach emails, impactful resume bullets, and presentation outlines. Never send external messages without explicit student approval.'
  ),
  (
    'performance',
    'Performance Agent',
    'Measures real platform progress across goals, tasks, study sessions, and skills.',
    'intelligence',
    array['Goal progress analysis', 'Study consistency', 'Task completion reports', 'Skill progress', 'Project milestone tracking', 'Weekly reviews'],
    array['analytics_db', 'goal_tracker', 'task_manager'],
    'You are the Performance Agent in Student OS. Compute honest progress analytics from stored student activity and identify concrete bottlenecks.'
  ),
  (
    'finance',
    'Finance Agent',
    'Supports student budgeting, expense tracking, savings goals, and financial literacy.',
    'support',
    array['Budget planning', 'Expense categorisation', 'Savings goals', 'Expense summaries', 'Financial literacy explanations'],
    array['expense_tracker', 'budget_calculator'],
    'You are the Finance Agent in Student OS. Help students plan monthly budgets and understand financial literacy concepts. Never execute financial transactions or guarantee investment returns.'
  ),
  (
    'wellbeing',
    'Wellbeing Agent',
    'Supports healthy routines, study-break pacing, habit consistency, and workload balance.',
    'support',
    array['Routine planning', 'Study breaks', 'Habit tracking', 'Workload balance', 'General supportive check-ins'],
    array['habit_tracker', 'schedule_service', 'checkin_records'],
    'You are the Wellbeing Agent in Student OS. Help students maintain sustainable study routines, rest intervals, and healthy habits. You are not a medical or mental-health diagnostic service.'
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  department = excluded.department,
  capabilities = excluded.capabilities,
  allowed_tools = excluded.allowed_tools,
  system_prompt = excluded.system_prompt;

-- ============================================================================
-- MIGRATION 0003: PHASE 1 AUTHENTICATION, PROFILES & ONBOARDING FIELDS
-- ============================================================================
-- Ensures public.profiles and public.user_preferences capture all 11 required
-- Phase 1 onboarding attributes, creates an automatic auth.users -> profiles
-- trigger, and enforces strict Row Level Security (RLS) policies.

alter table public.profiles
  add column if not exists email text,
  add column if not exists academic_year text,
  add column if not exists career_interests text[] default '{}',
  add column if not exists learning_goals text,
  add column if not exists preferred_language text default 'en';

-- Ensure RLS is active on profiles and user_preferences
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

-- Granular RLS policies for profiles (SELECT, INSERT, UPDATE, DELETE)
drop policy if exists "Users can view and update own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Granular RLS policies for user_preferences
drop policy if exists "Users can view and update own preferences" on public.user_preferences;
drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Automatic profile & preferences provisioning when a student signs up via Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    country,
    preferred_language,
    timezone,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'country', 'India'),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata'),
    false
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (
    user_id,
    language
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

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

-- ============================================================================
-- MIGRATION 0005: PHASE 9 USER-SCOPED PGVECTOR MEMORY & VOICE PREFERENCES
-- ============================================================================
-- 1. Ensures pgvector extension is enabled.
-- 2. Enhances public.memory_records with review_status, importance_score,
--    content_hash (duplicate prevention), source_type, and updated_at trigger.
-- 3. Adds HNSW vector similarity index and hybrid relevance RPC function
--    (match_user_memories) strictly scoped to auth.uid().
-- 4. Adds voice consent & provider preferences to public.user_preferences.

create extension if not exists "vector";

-- ----------------------------------------------------------------------------
-- 1. ENHANCE PUBLIC.MEMORY_RECORDS FOR PHASE 9 LIFECYCLE
-- ----------------------------------------------------------------------------
alter table public.memory_records
  add column if not exists review_status text default 'verified'
    check (review_status in ('pending_review', 'verified', 'archived')),
  add column if not exists importance_score numeric default 0.8
    check (importance_score >= 0 and importance_score <= 1),
  add column if not exists content_hash text,
  add column if not exists source_type text default 'manual'
    check (source_type in ('manual', 'onboarding', 'conversation', 'agent_decision', 'document')),
  add column if not exists updated_at timestamptz default now();

drop trigger if exists set_memory_records_updated_at on public.memory_records;
create trigger set_memory_records_updated_at
  before update on public.memory_records
  for each row execute function public.handle_updated_at();

-- Prevent exact duplicate memories per user and category via unique index on content_hash
create unique index if not exists idx_memory_user_category_hash
  on public.memory_records(user_id, category, content_hash)
  where content_hash is not null;

-- Vector cosine similarity index using pgvector HNSW
create index if not exists idx_memory_records_embedding_hnsw
  on public.memory_records using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- 2. STRICT USER-SCOPED RLS POLICIES FOR MEMORY_RECORDS & DOCUMENTS
-- ----------------------------------------------------------------------------
drop policy if exists "Users manage own memory_records" on public.memory_records;
create policy "Users manage own memory_records" on public.memory_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. PGVECTOR HYBRID RELEVANCE SCORING RPC FUNCTION
-- ----------------------------------------------------------------------------
create or replace function public.match_user_memories(
  p_user_id uuid,
  query_embedding vector(768),
  match_threshold float default 0.15,
  match_count int default 10,
  filter_category text default null
)
returns table (
  id uuid,
  user_id uuid,
  category text,
  content text,
  review_status text,
  importance_score numeric,
  source_type text,
  metadata jsonb,
  similarity float,
  relevance_score float,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Access denied: cannot query another student''s memory records';
  end if;

  return query
  select
    m.id,
    m.user_id,
    m.category,
    m.content,
    m.review_status,
    m.importance_score,
    m.source_type,
    m.metadata,
    (1 - (m.embedding <=> query_embedding))::float as similarity,
    (
      (1 - (m.embedding <=> query_embedding)) * 0.70 +
      coalesce(m.importance_score, 0.8)::float * 0.20 +
      (case when m.review_status = 'verified' then 0.10 else 0.0 end)
    )::float as relevance_score,
    m.created_at,
    m.updated_at
  from public.memory_records m
  where m.user_id = p_user_id
    and m.review_status <> 'archived'
    and (filter_category is null or m.category = filter_category)
    and m.embedding is not null
    and (1 - (m.embedding <=> query_embedding)) >= match_threshold
  order by relevance_score desc, m.updated_at desc
  limit match_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. VOICE INTERACTION & DISCLOSURE CONSENT COLUMNS ON USER_PREFERENCES
-- ----------------------------------------------------------------------------
alter table public.user_preferences
  add column if not exists voice_provider text default 'browser_native'
    check (voice_provider in ('browser_native', 'cloud_speech_provider', 'text_only')),
  add column if not exists third_party_audio_consent boolean default false,
  add column if not exists voice_speech_rate numeric default 1.0
    check (voice_speech_rate >= 0.5 and voice_speech_rate <= 2.0);

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

