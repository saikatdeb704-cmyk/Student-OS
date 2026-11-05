"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  FolderGit2,
  Layers,
  Loader2,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  AgentResult,
  AgentTaskRecord,
  OpportunityItem,
  ProjectItem,
  StudentProfile,
} from "@/types/student-os";

export interface StudentSkillItem {
  id: string;
  userId: string;
  skillId: string;
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  createdAt: string;
}

interface CareerDepartmentStudioProps {
  mode: "career_studio" | "project_lab" | "opportunity_center";
  profile: StudentProfile | null;
  onLaunchCEOObjective: (objective: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

export function CareerDepartmentStudio({
  mode,
  profile,
  onLaunchCEOObjective,
  onRefreshDashboard,
}: CareerDepartmentStudioProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [studentSkills, setStudentSkills] = useState<StudentSkillItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);

  // Active agent result
  const [activeAgentResult, setActiveAgentResult] =
    useState<AgentResult | null>(null);
  const [runningAgentSlug, setRunningAgentSlug] = useState<string | null>(null);
  const [agentObjective, setAgentObjective] = useState(
    mode === "career_studio"
      ? `Audit my skill gaps and build a 12-week target role roadmap for ${
          profile?.careerGoal || "AI Systems Engineer"
        }`
      : mode === "project_lab"
      ? "Design a high-signal capstone architecture with GitHub milestones and deployment checklist"
      : "Evaluate my saved internships, fellowships, and hackathons by deadline priority and fit"
  );

  // Skill form
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("AI & Machine Learning");
  const [skillProficiency, setSkillProficiency] = useState<
    "beginner" | "intermediate" | "advanced" | "expert"
  >("intermediate");

  // Project form
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStack, setProjectStack] = useState(
    "Next.js, TypeScript, Supabase, Gemini"
  );
  const [projectRepo, setProjectRepo] = useState("");

  // Opportunity form
  const [oppTitle, setOppTitle] = useState("");
  const [oppOrg, setOppOrg] = useState("");
  const [oppType, setOppType] = useState<OpportunityItem["type"]>("internship");
  const [oppSourceUrl, setOppSourceUrl] = useState("https://");
  const [oppDeadline, setOppDeadline] = useState("2026-06-30");

  async function loadCareerData() {
    setErrorMsg("");
    try {
      const res = await fetch("/api/career");
      if (!res.ok) throw new Error("Failed to load Career Department data.");
      const data = await res.json();
      setStudentSkills(data.studentSkills || []);
      setProjects(data.projects || []);
      setOpportunities(data.opportunities || []);
      setAgentTasks(data.agentTasks || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error loading career data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCareerData();
  }, [mode]);

  async function handleRunAgent(
    agentSlug: "career" | "skill" | "project" | "opportunity",
    customObjective?: string
  ) {
    const objectiveToRun = (customObjective || agentObjective).trim();
    if (!objectiveToRun) return;
    setRunningAgentSlug(agentSlug);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_agent",
          agentSlug,
          objective: objectiveToRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Agent execution failed.");
      }
      setActiveAgentResult(data.result);
      setSuccessMsg(
        `${data.agentName || agentSlug} completed execution and recorded output in agent_tasks.`
      );
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to run career agent."
      );
    } finally {
      setRunningAgentSlug(null);
    }
  }

  async function handleUpsertSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!skillName.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_skill",
          name: skillName.trim(),
          category: skillCategory.trim(),
          proficiency: skillProficiency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save skill.");
      setSkillName("");
      setSuccessMsg(`Saved skill "${data.skill.name}" (${data.skill.proficiency}).`);
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Skill update failed.");
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDesc.trim()) return;
    setErrorMsg("");
    try {
      const stackList = projectStack
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_project",
          title: projectTitle.trim(),
          description: projectDesc.trim(),
          techStack: stackList.length > 0 ? stackList : ["TypeScript"],
          status: "in_progress",
          repositoryUrl: projectRepo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create project.");
      setProjectTitle("");
      setProjectDesc("");
      setProjectRepo("");
      setSuccessMsg(`Created portfolio project "${data.project.title}".`);
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Project creation failed."
      );
    }
  }

  async function handleUpdateProjectStatus(
    projectId: string,
    status: ProjectItem["status"]
  ) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_project_status",
          projectId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update project status.");
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Status update failed.");
    }
  }

  async function handleCreateOpportunity(e: React.FormEvent) {
    e.preventDefault();
    if (!oppTitle.trim() || !oppOrg.trim() || !oppSourceUrl.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_opportunity",
          title: oppTitle.trim(),
          organisation: oppOrg.trim(),
          type: oppType,
          sourceUrl: oppSourceUrl.trim(),
          deadline: new Date(oppDeadline).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to register opportunity.");
      setOppTitle("");
      setOppOrg("");
      setSuccessMsg(
        `Registered opportunity "${data.opportunity.title}" (${data.opportunity.verificationStatus} source URL).`
      );
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Opportunity creation failed."
      );
    }
  }

  async function handleUpdateOpportunityStatus(
    opportunityId: string,
    status: OpportunityItem["status"]
  ) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_opportunity_status",
          opportunityId,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update opportunity status.");
      await loadCareerData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Update failed.");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">
          Loading Career Department Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            CAREER DEPARTMENT • 4 SPECIALISED AGENTS
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "career_studio"
              ? "Career Roadmap & Skill Gap Studio"
              : mode === "project_lab"
              ? "Portfolio Project Builder Lab"
              : "Verified Opportunity & Internship Center"}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Target Role:{" "}
            <span className="font-semibold text-slate-900">
              {profile?.careerGoal || "AI Systems Engineer"}
            </span>{" "}
            • Powered by Career Agent, Skill Agent, Project Agent, and
            Opportunity Agent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              onLaunchCEOObjective(
                `Coordinate Career, Skill, Project, and Opportunity agents to align my ${
                  profile?.careerGoal || "AI Systems"
                } portfolio and internship pipeline.`
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Orchestrate via AI CEO
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Direct Department Agent Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Execute Career Department Agents Directly
            </h3>
            <p className="text-xs text-slate-500">
              Each execution validates tool permissions, runs against your live
              skills/projects/opportunities, and logs structured output.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={agentObjective}
            onChange={(e) => setAgentObjective(e.target.value)}
            placeholder="Enter objective for Career, Skill, Project, or Opportunity Agent..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { slug: "career", label: "Run Career Agent" },
                { slug: "skill", label: "Run Skill Agent" },
                { slug: "project", label: "Run Project Agent" },
                { slug: "opportunity", label: "Run Opportunity Agent" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.slug}
                disabled={runningAgentSlug !== null}
                onClick={() => handleRunAgent(btn.slug)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-medium transition"
              >
                {runningAgentSlug === btn.slug ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {activeAgentResult && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                Structured Agent Output ({activeAgentResult.status})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                Confidence: {Math.round(activeAgentResult.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeAgentResult.summary}
            </p>
            {activeAgentResult.recommendations.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-900 mb-1.5">
                  Recommendations & Action Plan
                </p>
                <ul className="space-y-1 text-xs text-slate-700">
                  {activeAgentResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode 1: Career Studio & Skill Matrix */}
      {mode === "career_studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Add or Update Student Skill
            </h3>
            <form onSubmit={handleUpsertSkill} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., PyTorch Distributed, System Design, Rust"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Proficiency Level
                  </label>
                  <select
                    value={skillProficiency}
                    onChange={(e) =>
                      setSkillProficiency(
                        e.target.value as StudentSkillItem["proficiency"]
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Skill to Matrix
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Verified Student Skill Matrix ({studentSkills.length})
              </h3>
            </div>
            {studentSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No skills recorded yet. Add your first technical or domain skill
                on the left to build your career gap analysis.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studentSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {sk.name}
                      </p>
                      <p className="text-[11px] text-slate-500">{sk.category}</p>
                    </div>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        sk.proficiency === "expert" ||
                        sk.proficiency === "advanced"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : sk.proficiency === "intermediate"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {sk.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Portfolio Project Lab */}
      {mode === "project_lab" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-600" />
              Create Portfolio Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g., Distributed RAG Citation Verifier"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Architecture & Problem Statement
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Describe the engineering problem, benchmarks, and user value..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tech Stack (comma-separated)
                </label>
                <input
                  type="text"
                  value={projectStack}
                  onChange={(e) => setProjectStack(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  GitHub Repository URL (optional)
                </label>
                <input
                  type="url"
                  value={projectRepo}
                  onChange={(e) => setProjectRepo(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project to Lab
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Active Portfolio Projects ({projects.length})
            </h3>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No portfolio projects created yet. Create a project or ask the
                Project Agent to scaffold milestones.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-slate-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {proj.title}
                      </h4>
                      <select
                        value={proj.status}
                        onChange={(e) =>
                          handleUpdateProjectStatus(
                            proj.id,
                            e.target.value as ProjectItem["status"]
                          )
                        }
                        className="text-xs rounded-lg border border-slate-200 px-2.5 py-1 bg-white font-medium text-slate-700"
                      >
                        <option value="planning">Planning</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="shipped">Shipped</option>
                      </select>
                    </div>
                    <p className="text-xs text-slate-600">{proj.description}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {proj.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          handleRunAgent(
                            "project",
                            `Generate concrete engineering milestones and README architecture checklist for project "${proj.title}"`
                          )
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Generate Milestones →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Opportunity Center */}
      {mode === "opportunity_center" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              Register Verified Opportunity
            </h3>
            <p className="text-xs text-slate-500">
              All opportunities require a source URL and deadline. Opportunity
              Agent never fabricates unverified listings or submits external
              applications without approval.
            </p>
            <form onSubmit={handleCreateOpportunity} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Role / Program Title
                </label>
                <input
                  type="text"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  placeholder="e.g., Research Intern — Foundation Models"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Organisation
                  </label>
                  <input
                    type="text"
                    value={oppOrg}
                    onChange={(e) => setOppOrg(e.target.value)}
                    placeholder="e.g., Google Research"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={oppType}
                    onChange={(e) =>
                      setOppType(e.target.value as OpportunityItem["type"])
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="internship">Internship</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="competition">Competition</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Official HTTPS Source URL
                  </label>
                  <input
                    type="url"
                    value={oppSourceUrl}
                    onChange={(e) => setOppSourceUrl(e.target.value)}
                    placeholder="https://careers.example.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={oppDeadline}
                    onChange={(e) => setOppDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Verified Opportunity
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Tracked Opportunities ({opportunities.length})
            </h3>
            {opportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No opportunities tracked yet. Add a verified listing on the
                left.
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 mr-2">
                          {opp.type}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {opp.title}
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {opp.organisation} • Deadline:{" "}
                          {new Date(opp.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <select
                        value={opp.status}
                        onChange={(e) =>
                          handleUpdateOpportunityStatus(
                            opp.id,
                            e.target.value as OpportunityItem["status"]
                          )
                        }
                        className="text-xs rounded-lg border border-slate-200 px-2.5 py-1 bg-white font-medium text-slate-700"
                      >
                        <option value="saved">Saved</option>
                        <option value="preparing">Preparing</option>
                        <option value="applied">Applied (Self-Confirmed)</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verification: {opp.verificationStatus}
                      </span>
                      <a
                        href={opp.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                      >
                        Official Source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Department Execution History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Career Department Agent Execution History ({agentTasks.length})
        </h3>
        {agentTasks.length === 0 ? (
          <p className="text-xs text-slate-500">
            No Career Department agent runs recorded in this session yet.
          </p>
        ) : (
          <div className="space-y-2">
            {agentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold uppercase text-indigo-700 mr-2">
                    [{task.agentSlug}]
                  </span>
                  <span className="font-semibold text-slate-900">
                    {task.objective}
                  </span>
                  {task.summary && (
                    <p className="text-slate-600 mt-0.5 line-clamp-2">
                      {task.summary}
                    </p>
                  )}
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
