"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  AgentResult,
  AgentTaskRecord,
  StudentProfile,
} from "@/types/student-os";
import type { DocumentRow, MemoryRecordRow } from "@/types/database";

interface IntelligenceDepartmentStudioProps {
  profile: StudentProfile | null;
  onLaunchCEOObjective: (objective: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

export function IntelligenceDepartmentStudio({
  profile,
  onLaunchCEOObjective,
  onRefreshDashboard,
}: IntelligenceDepartmentStudioProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [memories, setMemories] = useState<MemoryRecordRow[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>([]);

  const [activeAgentResult, setActiveAgentResult] =
    useState<AgentResult | null>(null);
  const [runningAgentSlug, setRunningAgentSlug] = useState<string | null>(null);
  const [agentObjective, setAgentObjective] = useState(
    "Synthesize key findings from my uploaded research papers and convert them into Cornell notes and active-recall flashcards"
  );

  // Document Registration Form
  const [docName, setDocName] = useState("");
  const [docSummary, setDocSummary] = useState("");

  // Note / Memory Form
  const [noteCategory, setNoteCategory] = useState("cornell_summary");
  const [noteContent, setNoteContent] = useState("");

  async function loadIntelligenceData(query = searchQuery) {
    setErrorMsg("");
    try {
      const url = query.trim()
        ? `/api/intelligence?q=${encodeURIComponent(query.trim())}`
        : "/api/intelligence";
      const res = await fetch(url);
      if (!res.ok)
        throw new Error("Failed to load Intelligence Department data.");
      const data = await res.json();
      setDocuments(data.documents || []);
      setMemories(data.memories || []);
      setAgentTasks(data.agentTasks || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error loading intelligence data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntelligenceData("");
  }, []);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loadIntelligenceData(searchQuery);
  }

  async function handleRunAgent(
    agentSlug: "research" | "notes",
    customObjective?: string
  ) {
    const objectiveToRun = (customObjective || agentObjective).trim();
    if (!objectiveToRun) return;
    setRunningAgentSlug(agentSlug);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_agent",
          agentSlug,
          objective: objectiveToRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent execution failed.");
      setActiveAgentResult(data.result);
      setSuccessMsg(
        `${data.agentName || agentSlug} completed synthesis and persisted execution record.`
      );
      await loadIntelligenceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to run intelligence agent."
      );
    } finally {
      setRunningAgentSlug(null);
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docName.trim() || !docSummary.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_document",
          name: docName.trim(),
          mimeType: "application/pdf",
          summary: docSummary.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add document.");
      setDocName("");
      setDocSummary("");
      setSuccessMsg(`Indexed research document "${data.document.name}".`);
      await loadIntelligenceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save doc.");
    }
  }

  async function handleDeleteDocument(docId: string) {
    setErrorMsg("");
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_document",
          docId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete document.");
      await loadIntelligenceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleCreateNoteMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_note_memory",
          category: noteCategory,
          content: noteContent.trim(),
          metadata: { source: "Intelligence Studio" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save note.");
      setNoteContent("");
      setSuccessMsg(
        `Saved structured note (${data.memory.category}) to memory_records.`
      );
      await loadIntelligenceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save note.");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">
          Loading Intelligence & Knowledge Base Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold mb-2">
            <BookMarked className="w-3.5 h-3.5" />
            INTELLIGENCE DEPARTMENT • RESEARCH AGENT & NOTES AGENT
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Research Synthesis & Second-Brain Notes Studio
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Index academic PDFs, synthesize literature reviews with citation
            grounding, and convert lecture notes into active-recall flashcards
            for {profile?.fullName || "Student"}.
          </p>
        </div>

        <button
          onClick={() =>
            onLaunchCEOObjective(
              "Coordinate Research Agent and Notes Agent to summarize my indexed papers and create an exam revision sheet."
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Synthesize via AI CEO
        </button>
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

      {/* Search Knowledge Base & Direct Agent Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across indexed documents and semantic memory notes..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Search Knowledge Base
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                loadIntelligenceData("");
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </form>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={agentObjective}
            onChange={(e) => setAgentObjective(e.target.value)}
            placeholder="Objective for Research Agent or Notes Agent..."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
          />
          <button
            disabled={runningAgentSlug !== null}
            onClick={() => handleRunAgent("research")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            {runningAgentSlug === "research" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Research Agent
          </button>
          <button
            disabled={runningAgentSlug !== null}
            onClick={() => handleRunAgent("notes")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            {runningAgentSlug === "notes" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Notes Agent
          </button>
        </div>

        {activeAgentResult && (
          <div className="rounded-xl bg-violet-50/60 border border-violet-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-950">
                Structured Synthesis Output ({activeAgentResult.status})
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-semibold">
                Confidence: {Math.round(activeAgentResult.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeAgentResult.summary}
            </p>
            {activeAgentResult.recommendations.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-700 pt-1">
                {activeAgentResult.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Documents & Notes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Research Documents */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Indexed Research Documents ({documents.length})
          </h3>

          <form
            onSubmit={handleCreateDocument}
            className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80"
          >
            <p className="text-xs font-semibold text-slate-700">
              Index New Paper / Syllabus PDF
            </p>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Document filename (e.g., Attention_Is_All_You_Need_Notes.pdf)"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <textarea
              rows={2}
              value={docSummary}
              onChange={(e) => setDocSummary(e.target.value)}
              placeholder="Abstract, key theorems, or lecture digest..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Index Document
            </button>
          </form>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No matching documents found in your knowledge base.
            </div>
          ) : (
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {doc.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        {doc.processing_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{doc.summary}</p>
                    <button
                      onClick={() =>
                        handleRunAgent(
                          "research",
                          `Synthesize key methodology and citations from document "${doc.name}": ${doc.summary}`
                        )
                      }
                      className="text-[11px] text-indigo-600 hover:underline font-semibold"
                    >
                      Synthesize with Research Agent →
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Delete Document"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Structured Notes & Semantic Memory */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-violet-600" />
            Second-Brain Notes & Flashcards ({memories.length})
          </h3>

          <form
            onSubmit={handleCreateNoteMemory}
            className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                Create Cornell Note / Active-Recall Flashcard
              </p>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white"
              >
                <option value="cornell_summary">Cornell Summary</option>
                <option value="flashcard_deck">Active-Recall Flashcard</option>
                <option value="formula_sheet">Formula & Theorem Sheet</option>
                <option value="academic_strength">Academic Insight</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter key concept, Q&A flashcard pair, or lecture synthesis..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Save to Memory Graph
            </button>
          </form>

          {memories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No memory notes found. Create a note above or run Notes Agent.
            </div>
          ) : (
            <div className="space-y-2.5">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="rounded-xl border border-slate-200 p-3.5 space-y-1.5 bg-slate-50/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                      {mem.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {mem.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Intelligence Department Execution History ({agentTasks.length})
        </h3>
        {agentTasks.length === 0 ? (
          <p className="text-xs text-slate-500">
            No Research or Notes agent executions logged in this session yet.
          </p>
        ) : (
          <div className="space-y-2">
            {agentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200/80 p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold uppercase text-violet-700 mr-2">
                    [{task.agentSlug}]
                  </span>
                  <span className="font-semibold text-slate-900">
                    {task.objective}
                  </span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
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
