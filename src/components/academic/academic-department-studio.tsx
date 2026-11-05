"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import type {
  AgentResult,
  AgentTaskRecord,
  AssignmentItem,
  CourseItem,
  ExamItem,
  StudentProfile,
  SubjectItem,
  SyllabusTopicItem,
} from "@/types/student-os";
import type { StudyPlanRow, StudySessionRow } from "@/types/database";

interface AcademicDepartmentStudioProps {
  mode: "academic_hub" | "learning_studio";
  profile: StudentProfile | null;
  courses: CourseItem[];
  subjects: SubjectItem[];
  syllabusTopics: SyllabusTopicItem[];
  assignments: AssignmentItem[];
  exams: ExamItem[];
  studyPlans: StudyPlanRow[];
  studySessions: StudySessionRow[];
  agentTasks: AgentTaskRecord[];
  onRefresh: () => Promise<void>;
  onInvokeCEO: (directive: string) => void;
}

export function AcademicDepartmentStudio({
  mode,
  profile,
  courses,
  subjects,
  syllabusTopics,
  assignments,
  exams,
  studyPlans,
  studySessions,
  agentTasks,
  onRefresh,
  onInvokeCEO,
}: AcademicDepartmentStudioProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [latestAgentOutput, setLatestAgentOutput] = useState<{
    agentName: string;
    agentSlug: string;
    result: AgentResult;
  } | null>(null);

  // Add Subject form state
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectCredits, setNewSubjectCredits] = useState(4);

  // Add Syllabus Topic form state
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    subjects[0]?.id || ""
  );
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicUnit, setNewTopicUnit] = useState(1);

  // Add Study Session form state
  const [sessionMinutes, setSessionMinutes] = useState(50);
  const [sessionNotes, setSessionNotes] = useState("");

  // AI Tutor / Exam interactive prompt state
  const [learningObjective, setLearningObjective] = useState(
    "Explain Virtual Memory Page Replacement (LRU vs Clock) with a worked example and 3 check questions"
  );

  const academicHistory = agentTasks.filter((t) =>
    ["academic", "study", "tutor", "exam"].includes(t.agentSlug)
  );

  async function postAcademicAction(payload: Record<string, unknown>) {
    setErrorMsg(null);
    const res = await fetch("/api/academic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Academic action failed");
    }
    return data;
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubjectName.trim() || !newSubjectCode.trim()) return;
    const courseId = courses[0]?.id || "course-sem5-cse";
    try {
      await postAcademicAction({
        action: "create_subject",
        courseId,
        name: newSubjectName.trim(),
        code: newSubjectCode.trim().toUpperCase(),
        credits: Number(newSubjectCredits),
      });
      setNewSubjectName("");
      setNewSubjectCode("");
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not create subject"
      );
    }
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    const targetSubj = selectedSubjectId || subjects[0]?.id;
    if (!targetSubj || !newTopicTitle.trim()) return;
    try {
      await postAcademicAction({
        action: "create_syllabus_topic",
        subjectId: targetSubj,
        title: newTopicTitle.trim(),
        unitNumber: Number(newTopicUnit),
      });
      setNewTopicTitle("");
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not add syllabus topic"
      );
    }
  }

  async function handleCycleTopicStatus(topic: SyllabusTopicItem) {
    const order: SyllabusTopicItem["completionStatus"][] = [
      "not_started",
      "in_progress",
      "completed",
      "needs_revision",
    ];
    const nextIdx = (order.indexOf(topic.completionStatus) + 1) % order.length;
    try {
      await postAcademicAction({
        action: "update_syllabus_topic",
        topicId: topic.id,
        completionStatus: order[nextIdx],
      });
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not update topic status"
      );
    }
  }

  async function handleToggleAssignment(asgn: AssignmentItem) {
    const nextStatus = asgn.status === "submitted" ? "in_progress" : "submitted";
    try {
      await postAcademicAction({
        action: "update_assignment_status",
        assignmentId: asgn.id,
        status: nextStatus,
      });
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not update assignment"
      );
    }
  }

  async function handleLogStudySession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionNotes.trim()) return;
    try {
      await postAcademicAction({
        action: "log_study_session",
        subjectId: selectedSubjectId || subjects[0]?.id || null,
        durationMinutes: Number(sessionMinutes),
        notes: sessionNotes.trim(),
      });
      setSessionNotes("");
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not log study session"
      );
    }
  }

  async function handleRunDepartmentAgent(
    agentSlug: "academic" | "study" | "tutor" | "exam",
    objectiveText: string
  ) {
    setRunningAgent(agentSlug);
    setErrorMsg(null);
    try {
      const data = await postAcademicAction({
        action: "run_agent",
        agentSlug,
        objective: objectiveText,
      });
      setLatestAgentOutput({
        agentName: data.agentName,
        agentSlug: data.agentSlug,
        result: data.result,
      });
      await onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to run academic agent"
      );
    } finally {
      setRunningAgent(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 rounded-card bg-red-50 border border-red-200 text-xs text-danger flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </span>
          <button
            onClick={() => setErrorMsg(null)}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-card bg-surface border border-border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {mode === "academic_hub"
              ? "Academic Department · Academic & Study Agents"
              : "Academic Department · Tutor & Exam Agents"}
          </span>
          <h2 className="text-xl font-bold text-text-primary mt-0.5">
            {mode === "academic_hub"
              ? `${profile?.institution || "University"} — ${
                  profile?.degree || "Degree"
                } (Semester ${profile?.semester || 5})`
              : "AI Learning & Exam Preparation Studio"}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            {mode === "academic_hub"
              ? "Manage enrolled subjects, syllabus units, assignments, study plans, and Pomodoro study sessions."
              : "Run interactive step-by-step concept tutoring and syllabus-aligned mock exam preparation."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(runningAgent)}
            onClick={() =>
              handleRunDepartmentAgent(
                mode === "academic_hub" ? "academic" : "tutor",
                mode === "academic_hub"
                  ? "Audit my enrolled subjects, incomplete syllabus units, and upcoming assignments"
                  : learningObjective
              )
            }
            className="px-3.5 py-2 rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {runningAgent === "academic" || runningAgent === "tutor" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {mode === "academic_hub"
              ? "Run Academic Agent"
              : "Run Tutor Agent"}
          </button>

          <button
            type="button"
            disabled={Boolean(runningAgent)}
            onClick={() =>
              handleRunDepartmentAgent(
                mode === "academic_hub" ? "study" : "exam",
                mode === "academic_hub"
                  ? `Build a balanced ${
                      profile?.dailyStudyHours || 3.5
                    }h/day study schedule for my active subjects`
                  : "Generate a syllabus-aligned mock quiz and revision schedule for my nearest exam"
              )
            }
            className="px-3.5 py-2 rounded-button bg-surface-muted hover:bg-slate-200/70 text-text-primary border border-border text-xs font-semibold flex items-center gap-1.5"
          >
            {runningAgent === "study" || runningAgent === "exam" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Award className="h-3.5 w-3.5 text-primary" />
            )}
            {mode === "academic_hub" ? "Run Study Agent" : "Run Exam Agent"}
          </button>
        </div>
      </div>

      {/* Structured Agent Output Panel */}
      {latestAgentOutput && (
        <div className="rounded-card bg-blue-50/50 border border-blue-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
              {latestAgentOutput.agentName} (@{latestAgentOutput.agentSlug}) ·
              Structured Output
            </span>
            <span className="text-xs text-text-secondary">
              Confidence: {Math.round(latestAgentOutput.result.confidence * 100)}%
            </span>
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {latestAgentOutput.result.summary}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-button bg-surface border border-border space-y-1.5">
              <p className="font-bold text-text-primary">Grounded Findings:</p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary">
                {latestAgentOutput.result.findings.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-button bg-surface border border-border space-y-1.5">
              <p className="font-bold text-text-primary">
                Actionable Recommendations:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary">
                {latestAgentOutput.result.recommendations.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {mode === "learning_studio" && (
        <div className="rounded-card bg-surface border border-border p-5 space-y-4 shadow-xs">
          <h3 className="font-bold text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Interactive Concept Tutor & Exam Simulator
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={learningObjective}
              onChange={(e) => setLearningObjective(e.target.value)}
              placeholder="Enter any syllabus topic, algorithm, or exam concept..."
              className="flex-1 px-3.5 py-2.5 rounded-button border border-border bg-background text-xs sm:text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={Boolean(runningAgent)}
              onClick={() =>
                handleRunDepartmentAgent("tutor", learningObjective)
              }
              className="px-4 py-2.5 rounded-button bg-primary text-white text-xs font-semibold"
            >
              Explain Step-by-Step (Tutor)
            </button>
            <button
              type="button"
              disabled={Boolean(runningAgent)}
              onClick={() =>
                handleRunDepartmentAgent("exam", learningObjective)
              }
              className="px-4 py-2.5 rounded-button bg-surface-muted border border-border text-text-primary text-xs font-semibold"
            >
              Generate Mock Quiz (Exam)
            </button>
          </div>
        </div>
      )}

      {/* Enrolled Subjects & Syllabus Topic Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Enrolled Subjects & Syllabus Units ({subjects.length})
            </h3>
          </div>

          {subjects.length === 0 ? (
            <div className="rounded-card bg-surface border border-border p-6 text-center text-xs text-text-secondary">
              No subjects enrolled yet. Add your first semester subject using
              the form on the right.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subj) => {
                const subjTopics = syllabusTopics.filter(
                  (t) => t.subjectId === subj.id
                );
                return (
                  <div
                    key={subj.id}
                    className="rounded-card bg-surface border border-border p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-blue-50 text-primary text-xs font-bold">
                        {subj.code} · {subj.credits} Credits
                      </span>
                      <span className="text-xs font-semibold text-text-primary">
                        {subj.completionPercentage}% Mastery
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-text-primary">
                      {subj.name}
                    </h4>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${subj.completionPercentage}%` }}
                      />
                    </div>

                    {/* Interactive Syllabus Units */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-text-secondary">
                        Syllabus Units (Click to cycle status):
                      </p>
                      {subjTopics.length === 0 ? (
                        <p className="text-[11px] text-text-secondary italic">
                          No syllabus units added yet.
                        </p>
                      ) : (
                        subjTopics.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleCycleTopicStatus(topic)}
                            className="w-full text-left p-2 rounded bg-surface-muted hover:bg-blue-50/50 border border-border flex items-center justify-between gap-2 text-xs transition"
                          >
                            <span className="truncate font-medium text-text-primary">
                              U{topic.unitNumber}: {topic.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                                topic.completionStatus === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : topic.completionStatus === "in_progress"
                                  ? "bg-blue-50 text-primary"
                                  : topic.completionStatus === "needs_revision"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {topic.completionStatus.replace(/_/g, " ")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assignments & Exams Tracker */}
          <div className="rounded-card bg-surface border border-border p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Assignments ({assignments.length}) & Upcoming Exams ({exams.length})
            </h3>
            {assignments.length === 0 ? (
              <p className="text-xs text-text-secondary italic">
                No assignments recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((asgn) => (
                  <div
                    key={asgn.id}
                    className="p-2.5 rounded-button bg-surface-muted border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-primary mr-2">
                        [{asgn.subjectCode}]
                      </span>
                      <span
                        className={
                          asgn.status === "submitted"
                            ? "line-through text-text-secondary"
                            : "font-medium text-text-primary"
                        }
                      >
                        {asgn.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAssignment(asgn)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        asgn.status === "submitted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-white border border-border text-text-primary hover:border-primary"
                      }`}
                    >
                      {asgn.status === "submitted"
                        ? "Submitted ✓"
                        : "Mark Submitted"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Forms & Study Session Logger */}
        <div className="space-y-4">
          {/* Add Subject Form */}
          <form
            onSubmit={handleAddSubject}
            className="rounded-card bg-surface border border-border p-4 space-y-3 shadow-xs"
          >
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Add Semester Subject
            </h4>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Subject name (e.g., Computer Networks)"
              className="w-full px-3 py-2 rounded-button border border-border bg-background text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
                placeholder="Code (CS305)"
                className="px-3 py-2 rounded-button border border-border bg-background text-xs"
              />
              <input
                type="number"
                min={1}
                max={8}
                value={newSubjectCredits}
                onChange={(e) => setNewSubjectCredits(Number(e.target.value))}
                className="px-3 py-2 rounded-button border border-border bg-background text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-button bg-primary text-white text-xs font-semibold"
            >
              Save Subject
            </button>
          </form>

          {/* Add Syllabus Unit Form */}
          <form
            onSubmit={handleAddTopic}
            className="rounded-card bg-surface border border-border p-4 space-y-3 shadow-xs"
          >
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Add Syllabus Topic
            </h4>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              aria-label="Select subject for syllabus topic"
              className="w-full px-3 py-2 rounded-button border border-border bg-background text-xs"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                max={15}
                value={newTopicUnit}
                onChange={(e) => setNewTopicUnit(Number(e.target.value))}
                placeholder="Unit #"
                className="px-3 py-2 rounded-button border border-border bg-background text-xs"
              />
              <input
                type="text"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="Topic title..."
                className="col-span-2 px-3 py-2 rounded-button border border-border bg-background text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-button bg-surface-muted border border-border hover:border-primary text-text-primary text-xs font-semibold"
            >
              Add Syllabus Unit
            </button>
          </form>

          {/* Log Study Session Form */}
          <form
            onSubmit={handleLogStudySession}
            className="rounded-card bg-surface border border-border p-4 space-y-3 shadow-xs"
          >
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Log Pomodoro Study Session ({studySessions.length} logged)
            </h4>
            <input
              type="number"
              min={10}
              max={240}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-button border border-border bg-background text-xs"
            />
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="What did you study in this block?"
              className="w-full px-3 py-2 rounded-button border border-border bg-background text-xs"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-button bg-primary text-white text-xs font-semibold"
            >
              Log Study Session
            </button>
          </form>

          {/* Academic Agent Execution History */}
          <div className="rounded-card bg-surface border border-border p-4 space-y-2 shadow-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary">
              Academic Agent Runs ({academicHistory.length})
            </h4>
            {academicHistory.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="p-2 rounded bg-surface-muted border border-border text-[11px] space-y-0.5"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-primary">{t.agentName}</span>
                  <span className="text-success">{t.status}</span>
                </div>
                <p className="text-text-secondary line-clamp-2">{t.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

