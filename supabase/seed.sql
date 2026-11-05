-- ============================================================================
-- STUDENT OS — DATABASE SEED DATA (supabase/seed.sql)
-- ============================================================================

-- 1. Insert/Seed Central Agent Registry (All 16 Agents)
insert into public.agents (id, slug, name, department, description, capabilities, allowed_tools, version, enabled)
values
  ('agent_ceo_01', 'ceo', 'Chief Executive Officer', 'executive', 'Central AI executive orchestrator delegating to specialist agents.', '["intent_classification", "dag_planning", "task_delegation", "conflict_resolution", "synthesis"]'::jsonb, '["delegate_task", "query_memory", "request_approval"]'::jsonb, '1.0.0', true),
  ('agent_academic_01', 'academic', 'Academic Agent', 'academic', 'Manages university curriculum, degree pathways, syllabus coverage, and GPA tracking.', '["course_tracking", "syllabus_mapping", "gpa_prediction"]'::jsonb, '["fetch_syllabus", "update_academic_record"]'::jsonb, '1.0.0', true),
  ('agent_study_01', 'study', 'Study Agent', 'academic', 'Designs active-recall revision schedules and Pomodoro focus blocks.', '["spaced_repetition", "study_session_builder", "retrieval_practice"]'::jsonb, '["create_study_plan", "timer_control"]'::jsonb, '1.0.0', true),
  ('agent_tutor_01', 'tutor', 'Tutor Agent', 'academic', 'Provides Socratic tutoring, concept breakdowns, and step-by-step problem solving.', '["socratic_tutoring", "concept_simplification", "feynman_technique"]'::jsonb, '["explain_concept", "solve_step_by_step"]'::jsonb, '1.0.0', true),
  ('agent_exam_01', 'exam', 'Exam Agent', 'academic', 'Builds diagnostic mock tests, practice questions, and exam readiness scores.', '["mock_test_generation", "exam_readiness_scoring", "weakness_analysis"]'::jsonb, '["generate_quiz", "evaluate_test"]'::jsonb, '1.0.0', true),
  ('agent_career_01', 'career', 'Career Agent', 'career', 'Builds target career roadmaps, industry skill maps, and interview plans.', '["career_pathway_mapping", "resume_alignment", "recruiting_timelines"]'::jsonb, '["generate_career_milestones", "analyze_job_market"]'::jsonb, '1.0.0', true),
  ('agent_skill_01', 'skill', 'Skill Agent', 'career', 'Identifies skill gaps against industry requirements and creates curated learning paths.', '["gap_analysis", "learning_curation", "credential_recommendation"]'::jsonb, '["audit_skills", "recommend_resources"]'::jsonb, '1.0.0', true),
  ('agent_project_01', 'project', 'Project Agent', 'career', 'Architects portfolio projects with architecture specs, tech stacks, and step-by-step sprints.', '["architecture_design", "milestone_scaffolding", "github_readiness"]'::jsonb, '["scaffold_project", "audit_codebase"]'::jsonb, '1.0.0', true),
  ('agent_opportunity_01', 'opportunity', 'Opportunity Agent', 'career', 'Sources verified internships, scholarships, hackathons, and research grants.', '["internship_discovery", "hackathon_sourcing", "deadline_tracking"]'::jsonb, '["search_opportunities", "prepare_application"]'::jsonb, '1.0.0', true),
  ('agent_research_01', 'research', 'Research Agent', 'intelligence', 'Synthesizes peer-reviewed academic literature, ArXiv preprints, and citation graphs.', '["literature_review", "paper_summarization", "methodology_extraction"]'::jsonb, '["query_scholar", "extract_citations"]'::jsonb, '1.0.0', true),
  ('agent_productivity_01', 'productivity', 'Productivity Agent', 'productivity', 'Manages daily tasks, deadline prioritization, and habit momentum.', '["prioritization", "habit_tracking", "workload_balancing"]'::jsonb, '["create_task", "update_task", "reorder_schedule"]'::jsonb, '1.0.0', true),
  ('agent_notes_01', 'notes', 'Notes Agent', 'intelligence', 'Structures raw notes into a second-brain knowledge base with semantic tagging.', '["note_structuring", "concept_linking", "knowledge_synthesis"]'::jsonb, '["format_markdown", "link_concepts"]'::jsonb, '1.0.0', true),
  ('agent_communication_01', 'communication', 'Communication Agent', 'productivity', 'Drafts professional emails to professors, recruiters, and advisors behind an approval gate.', '["email_drafting", "outreach_structuring", "tone_calibration"]'::jsonb, '["draft_email", "request_approval"]'::jsonb, '1.0.0', true),
  ('agent_performance_01', 'performance', 'Performance Agent', 'support', 'Tracks historical GPA trends, study velocity, and holistic academic health.', '["analytics_dashboard", "velocity_tracking", "burnout_detection"]'::jsonb, '["calculate_metrics", "generate_report"]'::jsonb, '1.0.0', true),
  ('agent_finance_01', 'finance', 'Finance Agent', 'support', 'Tracks student budgets, textbook expenses, scholarships, and financial aid.', '["budgeting", "expense_logging", "aid_tracking"]'::jsonb, '["log_expense", "calculate_aid"]'::jsonb, '1.0.0', true),
  ('agent_wellbeing_01', 'wellbeing', 'Wellbeing Agent', 'support', 'Monitors study burnout, recommends sleep balance, and provides mindfulness routines.', '["burnout_prevention", "mindfulness_guidance", "sleep_scheduling"]'::jsonb, '["check_wellbeing", "recommend_break"]'::jsonb, '1.0.0', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  capabilities = excluded.capabilities,
  allowed_tools = excluded.allowed_tools,
  version = excluded.version;

-- 2. Insert Default Demo Student Profile
insert into public.profiles (
  id,
  full_name,
  country,
  institution,
  degree,
  department,
  academic_year,
  semester,
  career_interests,
  learning_goals,
  preferred_language,
  timezone,
  onboarding_completed,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  'Aarav Sharma',
  'India',
  'Indian Institute of Technology Delhi (IIT Delhi)',
  'B.Tech in Computer Science and Engineering',
  'Computer Science & Engineering',
  '3rd Year (Junior)',
  'Semester 6',
  'Distributed Systems, AI Agents & Large Language Models, Cloud Architecture',
  'Master distributed consensus, prepare for top-tier software engineering internships, publish an undergraduate agent systems paper.',
  'English',
  'Asia/Kolkata',
  true,
  now(),
  now()
) on conflict (id) do nothing;

