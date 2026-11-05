"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  Check,
  CheckCircle2,
  Database,
  Edit3,
  FileText,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { StudentProfile } from "@/types/student-os";
import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  type ScoredDocumentItem,
  type ScoredMemoryRecord,
  type StandardMemoryCategory,
} from "@/lib/memory/engine";
import {
  detectVoiceCapabilities,
  requestMicrophonePermission,
  sanitizeTextForSpeech,
  THIRD_PARTY_VOICE_DISCLOSURE_TEXT,
  type MicrophonePermissionState,
  type VoiceCapabilityReport,
  type VoiceProviderId,
} from "@/lib/voice/provider";

interface MemoryVoiceStudioProps {
  profile: StudentProfile | null;
  onLaunchCEOObjective: (objective: string) => void;
  onRefreshDashboard: () => Promise<void>;
}

export function MemoryVoiceStudio({
  profile,
  onLaunchCEOObjective,
  onRefreshDashboard,
}: MemoryVoiceStudioProps) {
  const [activeTab, setActiveTab] = useState<"memory" | "voice">("memory");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  // =========================================================================
  // MEMORY STATE (PostgreSQL + pgvector)
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [scoredMemories, setScoredMemories] = useState<ScoredMemoryRecord[]>(
    []
  );
  const [scoredDocuments, setScoredDocuments] = useState<ScoredDocumentItem[]>(
    []
  );

  // Create Memory Form
  const [newCategory, setNewCategory] =
    useState<StandardMemoryCategory>("student_preference");
  const [newContent, setNewContent] = useState("");
  const [newImportance, setNewImportance] = useState(0.88);
  const [syncingContext, setSyncingContext] = useState(false);

  // Edit Memory Inline State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImportance, setEditImportance] = useState(0.85);

  // =========================================================================
  // VOICE INTERACTION STATE (Browser Native + Provider Abstraction)
  // =========================================================================
  const [capabilities, setCapabilities] =
    useState<VoiceCapabilityReport | null>(null);
  const [micPermission, setMicPermission] =
    useState<MicrophonePermissionState>("prompt");
  const [micStatusMessage, setMicStatusMessage] = useState(
    "Microphone permission not requested yet. Text fallback is always available."
  );

  const [voiceProvider, setVoiceProvider] =
    useState<VoiceProviderId>("browser_native");
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);
  const [thirdPartyAudioConsent, setThirdPartyAudioConsent] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.02);

  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [textFallbackInput, setTextFallbackInput] = useState(
    "Summarize my Semester 5 Operating Systems and AI career priorities using my saved memories"
  );
  const [usedFallbackBadge, setUsedFallbackBadge] = useState(false);

  // Playback & Interruption state
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [sampleResponseText, setSampleResponseText] = useState(
    "AI CEO Briefing: I have loaded your 7 user-scoped pgvector memory categories, including your 50/10 Pomodoro study preference, IIT Delhi Semester 5 coursework, and Campus RAG Engine portfolio project. Your next priority is completing Unit 3 of CS302 Operating Systems."
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  async function loadMemoryAndVoiceData(
    query = searchQuery,
    category = selectedCategory,
    archived = includeArchived
  ) {
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category && category !== "all") params.set("category", category);
      if (archived) params.set("includeArchived", "true");

      const [memRes, voiceRes] = await Promise.all([
        fetch(`/api/memory?${params.toString()}`),
        fetch("/api/voice"),
      ]);

      if (!memRes.ok) throw new Error("Failed to load user memory records.");
      const memData = await memRes.json();
      setScoredMemories(memData.memories || []);
      setScoredDocuments(memData.documents || []);

      if (voiceRes.ok) {
        const voiceData = await voiceRes.json();
        if (voiceData.settings) {
          setVoiceProvider(voiceData.settings.provider || "browser_native");
          setDisclosureAcknowledged(
            Boolean(voiceData.settings.disclosureAcknowledged)
          );
          setThirdPartyAudioConsent(
            Boolean(voiceData.settings.thirdPartyAudioConsent)
          );
          setSpeechRate(Number(voiceData.settings.speechRate || 1.02));
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to load Phase 9 studio."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCapabilities(detectVoiceCapabilities());
    loadMemoryAndVoiceData("", "all", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // MEMORY HANDLERS
  // =========================================================================
  async function handleSearchMemories(e: React.FormEvent) {
    e.preventDefault();
    await loadMemoryAndVoiceData(searchQuery, selectedCategory, includeArchived);
  }

  async function handleCreateMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setErrorMsg("");
    setSuccessMsg("");
    setDuplicateNotice(null);

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          category: newCategory,
          content: newContent.trim(),
          importanceScore: Number(newImportance),
          reviewStatus: "verified",
          sourceType: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create memory.");

      if (data.duplicate) {
        setDuplicateNotice(
          `Duplicate prevented (${data.duplicateReason || "Semantic match"}): "${
            data.record.content
          }" already exists in [${data.record.category}].`
        );
      } else {
        setNewContent("");
        setSuccessMsg(
          `Created user-scoped pgvector memory (768-dim embedding) in [${newCategory}].`
        );
      }
      await loadMemoryAndVoiceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Memory creation error.");
    }
  }

  async function handleSyncLiveContext() {
    setSyncingContext(true);
    setErrorMsg("");
    setSuccessMsg("");
    setDuplicateNotice(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_context" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync context.");
      setSuccessMsg(
        `Synchronized live student context: ${data.syncedCount} new memory record(s) embedded, ${data.skippedDuplicatesCount} duplicate(s) prevented.`
      );
      await loadMemoryAndVoiceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Context sync failed.");
    } finally {
      setSyncingContext(false);
    }
  }

  function startEditingMemory(item: ScoredMemoryRecord) {
    setEditingId(item.record.id);
    setEditContent(item.record.content);
    setEditCategory(item.record.category);
    setEditImportance(item.record.importance_score ?? 0.85);
  }

  async function handleSaveEditMemory(memoryId: string) {
    if (!editContent.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent.trim(),
          category: editCategory,
          importanceScore: Number(editImportance),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update memory.");
      setEditingId(null);
      setSuccessMsg(
        "Updated memory content and recomputed 768-dimensional pgvector embedding."
      );
      await loadMemoryAndVoiceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function handleReviewMemory(
    memoryId: string,
    reviewStatus: "verified" | "pending_review" | "archived"
  ) {
    setErrorMsg("");
    try {
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!res.ok) throw new Error("Failed to update memory review status.");
      setSuccessMsg(`Memory review status updated to "${reviewStatus}".`);
      await loadMemoryAndVoiceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Review update failed.");
    }
  }

  async function handleDeleteMemory(memoryId: string) {
    setErrorMsg("");
    try {
      const res = await fetch(`/api/memory/${memoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete memory record.");
      setSuccessMsg("Memory permanently deleted from your user-scoped vault.");
      await loadMemoryAndVoiceData();
      await onRefreshDashboard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  // =========================================================================
  // VOICE INTERACTION HANDLERS
  // =========================================================================
  async function handleRequestMicPermission() {
    setErrorMsg("");
    const result = await requestMicrophonePermission();
    setMicPermission(result.state);
    setMicStatusMessage(result.message);
  }

  async function handleSaveVoiceConsent(
    nextProvider: VoiceProviderId,
    nextDisclosure: boolean,
    nextConsent: boolean
  ) {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          provider: nextProvider,
          disclosureAcknowledged: nextDisclosure,
          thirdPartyAudioConsent: nextConsent,
          speechRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Voice provider update blocked.");
      }
      setVoiceProvider(data.settings.provider);
      setDisclosureAcknowledged(data.settings.disclosureAcknowledged);
      setThirdPartyAudioConsent(data.settings.thirdPartyAudioConsent);
      setSuccessMsg(
        `Voice provider set to "${data.settings.provider}" with verified privacy preferences.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Voice consent check failed."
      );
    }
  }

  function handleStartVoiceTranscription() {
    setErrorMsg("");
    setWasInterrupted(false);

    // Interrupt any ongoing TTS playback before listening
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlayingResponse(false);
    }

    if (
      voiceProvider === "cloud_speech_provider" &&
      (!disclosureAcknowledged || !thirdPartyAudioConsent)
    ) {
      setErrorMsg(
        "Third-party audio transmission blocked: please acknowledge disclosure and grant permission first, or use Browser Native / Text Fallback."
      );
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>)
            .webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setUsedFallbackBadge(true);
      setVoiceTranscript(textFallbackInput);
      setSuccessMsg(
        "Browser SpeechRecognition unavailable — automatically populated from Text Fallback."
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognitionRef.current = recognition;
      recognition.lang = "en-IN";
      recognition.continuous = Boolean(capabilities?.continuousSttSupported);
      recognition.interimResults = true;

      setIsListening(true);
      setUsedFallbackBadge(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        if (combined.trim()) {
          setVoiceTranscript(combined.trim());
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setUsedFallbackBadge(true);
        if (!voiceTranscript && textFallbackInput) {
          setVoiceTranscript(textFallbackInput);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setUsedFallbackBadge(true);
      setVoiceTranscript(textFallbackInput);
    }
  }

  function handlePlayVoiceResponse(textToSpeak = sampleResponseText) {
    const clean = sanitizeTextForSpeech(textToSpeak);
    if (!clean) return;

    setWasInterrupted(false);
    setIsPlayingResponse(true);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = speechRate;
        utterance.lang = "en-IN";
        utterance.onend = () => setIsPlayingResponse(false);
        utterance.onerror = () => setIsPlayingResponse(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback visual playback state
      }
    }
  }

  function handleStopPlayback() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setIsPlayingResponse(false);
  }

  function handleInterruptResponse() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort?.();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
    setIsPlayingResponse(false);
    setWasInterrupted(true);
    setSuccessMsg(
      "Interrupted active voice response immediately. Ready for new voice or text input."
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">
          Loading Phase 9 Memory (pgvector) & Voice Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Studio Header & Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Brain className="w-3.5 h-3.5" />
            PHASE 9 • USER-SCOPED PGVECTOR MEMORY & VOICE INTERACTION
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Semantic Memory Vault & Multi-Modal Voice Interface
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            768-dimensional{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">
              pgvector
            </code>{" "}
            relevance retrieval, duplicate prevention, user-controlled memory
            review/editing/deletion, and privacy-guarded STT/TTS with mobile &
            text fallbacks.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
          <button
            onClick={() => setActiveTab("memory")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "memory"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Memory Vault ({scoredMemories.length})
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "voice"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice & Compatibility Console
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {duplicateNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{duplicateNotice}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 1: USER-SCOPED PGVECTOR MEMORY VAULT
      ===================================================================== */}
      {activeTab === "memory" && (
        <div className="space-y-6">
          {/* Search, Category Filter & Live Context Sync */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Semantic & Hybrid Relevance Retrieval (`vector(768)`)
                </h3>
                <p className="text-xs text-slate-500">
                  Combines cosine vector similarity (52%), lexical token overlap
                  (30%), importance score (12%), and verification status (6%).
                </p>
              </div>
              <button
                onClick={handleSyncLiveContext}
                disabled={syncingContext}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition"
              >
                {syncingContext ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Sync Live Student Context to Memory
              </button>
            </div>

            <form
              onSubmit={handleSearchMemories}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query memories & documents by meaning (e.g., 'operating systems paging', 'career internship goal', 'pomodoro')..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  loadMemoryAndVoiceData(
                    searchQuery,
                    e.target.value,
                    includeArchived
                  );
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-800 font-medium"
              >
                <option value="all">All 7 Memory Domains</option>
                {MEMORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {MEMORY_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
              >
                Retrieve & Score
              </button>
            </form>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    loadMemoryAndVoiceData(searchQuery, "all", includeArchived);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                    selectedCategory === "all"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All Domains
                </button>
                {MEMORY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      loadMemoryAndVoiceData(searchQuery, cat, includeArchived);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {MEMORY_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => {
                    setIncludeArchived(e.target.checked);
                    loadMemoryAndVoiceData(
                      searchQuery,
                      selectedCategory,
                      e.target.checked
                    );
                  }}
                />
                Show Archived
              </label>
            </div>
          </div>

          {/* Memory Creation + Memory Review/Edit/Delete List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Create Memory Form */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 self-start">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Create User-Scoped Memory
              </h3>
              <p className="text-xs text-slate-500">
                Automatically generates a 768-dim embedding and checks for exact
                or semantic duplicates (&ge;92% cosine similarity) before
                insertion.
              </p>

              <form onSubmit={handleCreateMemory} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Memory Domain Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as StandardMemoryCategory)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-900 font-medium"
                  >
                    {MEMORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {MEMORY_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Memory Content
                  </label>
                  <textarea
                    rows={3}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Record a student preference, academic milestone, career target, project decision, or note..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">
                      Importance Weight
                    </span>
                    <span className="font-bold text-indigo-700">
                      {Math.round(newImportance * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1.0}
                    step={0.05}
                    value={newImportance}
                    onChange={(e) => setNewImportance(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Embed & Save Memory
                </button>
              </form>

              {/* Document Retrieval Panel */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Retrieved Documents ({scoredDocuments.length})
                </h4>
                {scoredDocuments.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No matching documents for current query.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {scoredDocuments.map((item) => (
                      <div
                        key={item.document.id}
                        className="rounded-xl border border-slate-200 p-3 bg-slate-50/70 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.document.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shrink-0">
                            Score: {Math.round(item.relevanceScore * 100)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {item.document.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Ranked Memories with Review, Edit & Delete */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Ranked User Memories ({scoredMemories.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Owner: {profile?.fullName || "Authenticated Student"} (RLS
                  Isolated)
                </span>
              </div>

              {scoredMemories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  No memories matched your filter or query. Add a memory on the
                  left or click &ldquo;Sync Live Student Context&rdquo;.
                </div>
              ) : (
                <div className="space-y-3">
                  {scoredMemories.map((item) => {
                    const rec = item.record;
                    const isEditing = editingId === rec.id;
                    const reviewStatus = rec.review_status || "verified";

                    return (
                      <div
                        key={rec.id}
                        className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-slate-50/40 hover:border-slate-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {MEMORY_CATEGORY_LABELS[
                                rec.category as StandardMemoryCategory
                              ] || rec.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                reviewStatus === "verified"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : reviewStatus === "pending_review"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-300"
                              }`}
                            >
                              {reviewStatus.replace("_", " ")}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600">
                              Relevance: {Math.round(item.relevanceScore * 100)}%
                            </span>
                          </div>

                          {/* Review, Edit, Delete Controls */}
                          <div className="flex items-center gap-1">
                            {reviewStatus !== "verified" && (
                              <button
                                onClick={() =>
                                  handleReviewMemory(rec.id, "verified")
                                }
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold"
                                title="Mark memory as verified"
                              >
                                Verify
                              </button>
                            )}
                            {reviewStatus === "verified" && (
                              <button
                                onClick={() =>
                                  handleReviewMemory(rec.id, "pending_review")
                                }
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold"
                                title="Flag for review"
                              >
                                Flag Review
                              </button>
                            )}
                            <button
                              onClick={() => startEditingMemory(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white"
                              title="Edit memory"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMemory(rec.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2.5 pt-2 border-t border-slate-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                value={editCategory}
                                onChange={(e) =>
                                  setEditCategory(e.target.value)
                                }
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                              >
                                {MEMORY_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {MEMORY_CATEGORY_LABELS[cat]}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2 text-xs">
                                <span>Importance:</span>
                                <input
                                  type="number"
                                  step={0.05}
                                  min={0.1}
                                  max={1.0}
                                  value={editImportance}
                                  onChange={(e) =>
                                    setEditImportance(Number(e.target.value))
                                  }
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                />
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-xs bg-white"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveEditMemory(rec.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Save & Re-Embed
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-800 leading-relaxed">
                              {rec.content}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                              <span>{item.matchReason}</span>
                              <span>
                                Vector Dim:{" "}
                                {rec.embedding ? rec.embedding.length : 768} •
                                Importance:{" "}
                                {Math.round(
                                  (rec.importance_score ?? 0.85) * 100
                                )}
                                %
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: VOICE INTERACTION & COMPATIBILITY CONSOLE
      ===================================================================== */}
      {activeTab === "voice" && (
        <div className="space-y-6">
          {/* Browser & Mobile Compatibility Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Runtime Browser & Mobile Voice Compatibility Checks
                </h3>
                <p className="text-xs text-slate-500">
                  Student OS inspects runtime capabilities dynamically and never
                  assumes every desktop or mobile browser supports the same
                  speech APIs.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                Recommended Mode: {capabilities?.recommendedMode || "text_fallback"}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                <p className="text-slate-500 font-medium">Detected Platform</p>
                <p className="font-bold text-slate-900 mt-1">
                  {capabilities?.browserName || "Standard Browser"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mobile Device: {capabilities?.isMobile ? "Yes" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                <p className="text-slate-500 font-medium">
                  Microphone Permission
                </p>
                <p className="font-bold text-slate-900 mt-1 capitalize">
                  {micPermission}
                </p>
                <button
                  onClick={handleRequestMicPermission}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold mt-0.5"
                >
                  Verify / Request Mic →
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                <p className="text-slate-500 font-medium">
                  Speech-to-Text (STT)
                </p>
                <p className="font-bold text-slate-900 mt-1">
                  {capabilities?.sttSupported
                    ? "Native Web Speech Ready"
                    : "Text Fallback Active"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Continuous STT:{" "}
                  {capabilities?.continuousSttSupported ? "Supported" : "Single-Utterance"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                <p className="text-slate-500 font-medium">
                  Text-to-Speech (TTS)
                </p>
                <p className="font-bold text-slate-900 mt-1">
                  {capabilities?.ttsSupported
                    ? "SpeechSynthesis Ready"
                    : "Visual Transcript Only"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Stop & Interrupt Supported
                </p>
              </div>
            </div>

            {capabilities && capabilities.compatibilityNotes.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 space-y-1">
                {capabilities.compatibilityNotes.map((note, idx) => (
                  <p key={idx}>• {note}</p>
                ))}
                <p className="text-slate-500 pt-0.5">
                  Mic Status: {micStatusMessage}
                </p>
              </div>
            )}
          </div>

          {/* Privacy Disclosure & Provider Abstraction Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Speech Provider & Audio Privacy Gate
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {THIRD_PARTY_VOICE_DISCLOSURE_TEXT}
              </p>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclosureAcknowledged}
                    onChange={(e) =>
                      setDisclosureAcknowledged(e.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span>
                    I have read the third-party audio disclosure regarding
                    external speech transcription services.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thirdPartyAudioConsent}
                    onChange={(e) =>
                      setThirdPartyAudioConsent(e.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span>
                    I grant explicit permission to send microphone audio to a
                    configured third-party speech provider when selected.
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Active Speech Provider Abstraction
                  </label>
                  <select
                    value={voiceProvider}
                    onChange={(e) =>
                      handleSaveVoiceConsent(
                        e.target.value as VoiceProviderId,
                        disclosureAcknowledged,
                        thirdPartyAudioConsent
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white text-slate-900 font-medium"
                  >
                    <option value="browser_native">
                      Browser Native Speech API (No Third-Party Audio Upload)
                    </option>
                    <option value="cloud_speech_provider">
                      Cloud Speech Provider (Requires Disclosure & Consent)
                    </option>
                    <option value="text_fallback">
                      Deterministic Text-Only Fallback Mode
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Voice Input Transcription, TTS Playback, Stop & Interrupt Controls */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Voice Input Transcriber & Response Playback Controls
                </h3>
                {usedFallbackBadge && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Text Fallback Active
                  </span>
                )}
              </div>

              {/* Voice STT Controls */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartVoiceTranscription}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      isListening
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        Start Voice Input (STT)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoiceTranscript(textFallbackInput);
                      setUsedFallbackBadge(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    Use Text Fallback Input
                  </button>

                  {(voiceTranscript || textFallbackInput) && (
                    <button
                      type="button"
                      onClick={() =>
                        onLaunchCEOObjective(
                          (voiceTranscript || textFallbackInput).trim()
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Send Transcript to AI CEO
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Transcribed Voice Input / Text Fallback Box
                  </label>
                  <textarea
                    rows={2}
                    value={voiceTranscript || textFallbackInput}
                    onChange={(e) => {
                      setVoiceTranscript(e.target.value);
                      setTextFallbackInput(e.target.value);
                    }}
                    placeholder="Speak into microphone or type fallback text here..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Voice Response Playback (TTS), Stop Playback & Interrupt Response */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Voice Response Playback (TTS)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span>Speed: {speechRate}x</span>
                    <input
                      type="range"
                      min={0.75}
                      max={1.5}
                      step={0.05}
                      value={speechRate}
                      onChange={(e) => setSpeechRate(Number(e.target.value))}
                      className="w-24 accent-indigo-600"
                    />
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={sampleResponseText}
                  onChange={(e) => setSampleResponseText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-slate-50"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlayVoiceResponse(sampleResponseText)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {isPlayingResponse
                      ? "Restart Playback"
                      : "Play Voice Response"}
                  </button>

                  <button
                    type="button"
                    onClick={handleStopPlayback}
                    disabled={!isPlayingResponse}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-semibold transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop Playback
                  </button>

                  <button
                    type="button"
                    onClick={handleInterruptResponse}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    Interrupt Response
                  </button>

                  {wasInterrupted && (
                    <span className="text-[11px] font-semibold text-rose-700">
                      Playback Interrupted — Ready for Next Command
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

