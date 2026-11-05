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

