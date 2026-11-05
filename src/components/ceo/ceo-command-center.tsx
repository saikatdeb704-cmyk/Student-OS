"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Edit3,
  Layers,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type {
  AgentSlug,
  ApprovalItem,
  CEOEvent,
  CEOExecutionPlan,
  ChatMessageItem,
  ConversationItem,
  StudentProfile,
  TokenUsageRecord,
} from "@/types/student-os";

interface CEOCommandCenterProps {
  profile: StudentProfile | null;
  approvals: ApprovalItem[];
  aiUsageSnapshot?: {
    totalRequests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    dailyBudgetTokens?: number;
    remainingDailyTokens?: number;
    providerMode: string;
    model: string;
  };
  initialDirective?: string | null;
  onDirectiveConsumed?: () => void;
  onWorkspaceRefresh: () => Promise<void>;
  onApprovalDecision: (
    approvalId: string,
    decision: "approved" | "rejected"
  ) => Promise<void>;
}

const EXECUTIVE_DIRECTIVES = [
  {
    label: "Direct Status Briefing (CEO Direct)",
    prompt: "Summarize my current status and academic priorities for today",
  },
  {
    label: "7-Day Study Sprint (Academic + Study)",
    prompt:
      "Analyse my CS301 and CS302 syllabus and create a 7-day study schedule",
  },
  {
    label: "Step-by-Step Concept Tutor (Tutor + Exam)",
    prompt: "Explain Virtual Memory Page Replacement step-by-step and quiz me",
  },
  {
    label: "Career & Skill Gap Plan (Career + Skill + Project)",
    prompt:
      "Evaluate my skill gaps for AI Systems internships and suggest a portfolio project milestone",
  },
  {
    label: "Research Outreach Draft (Approval Gated)",
    prompt:
      "Draft a cold outreach email to a professor for an undergraduate research internship",
  },
];

/**
 * Lightweight, safe Markdown renderer supporting headings, bold, inline code,
 * code blocks, bullet lists, numbered lists, and blockquotes.
 */
function formatInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownContent({
  content,
  isUser = false,
}: {
  content: string;
  isUser?: boolean;
}) {
  if (isUser) {
    return (
      <div className="text-sm whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    );
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  const flushList = (keyPrefix: string) => {
    if (!listBuffer) return;
    if (listBuffer.ordered) {
      elements.push(
        <ol
          key={`${keyPrefix}-ol`}
          className="list-decimal list-inside space-y-1 my-2 text-sm text-text-primary"
        >
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="list-disc list-inside space-y-1 my-2 text-sm text-text-primary"
        >
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    }
    listBuffer = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushList(`line-${index}`);
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-2.5 p-3 rounded-button bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      return;
    }

    if (!line.trim()) {
      flushList(`line-${index}`);
      return;
    }

    if (line.startsWith("### ")) {
      flushList(`line-${index}`);
      elements.push(
        <h3
          key={`h3-${index}`}
          className="text-sm font-bold text-text-primary mt-3 mb-1.5 pb-1 border-b border-border first:mt-0"
        >
          {formatInlineMarkdown(line.slice(4))}
        </h3>
      );
      return;
    }

    if (line.startsWith("#### ")) {
      flushList(`line-${index}`);
      elements.push(
        <h4
          key={`h4-${index}`}
          className="text-xs font-bold uppercase tracking-wider text-primary mt-2.5 mb-1"
        >
          {formatInlineMarkdown(line.slice(5))}
        </h4>
      );
      return;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const itemText = line.slice(2).trim();
      if (!listBuffer || listBuffer.ordered) {
        flushList(`line-${index}`);
        listBuffer = { ordered: false, items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[1].trim();
      if (!listBuffer || !listBuffer.ordered) {
        flushList(`line-${index}`);
        listBuffer = { ordered: true, items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      return;
    }

    if (line.startsWith("> ")) {
      flushList(`line-${index}`);
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-2 border-primary pl-3 py-1 my-2 text-xs italic text-text-secondary bg-blue-50/30 rounded-r"
        >
          {formatInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      return;
    }

    flushList(`line-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed my-1.5">
        {formatInlineMarkdown(line)}
      </p>
    );
  });

  flushList("final");

  return <div className="space-y-1">{elements}</div>;
}

export function CEOCommandCenter({
  profile,
  approvals,
  aiUsageSnapshot,
  initialDirective,
  onDirectiveConsumed,
  onWorkspaceRefresh,
  onApprovalDecision,
}: CEOCommandCenterProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Rename title state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Chat & streaming state
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);

  // Live CEO Orchestration Telemetry state
  const [contextReadSummary, setContextReadSummary] = useState<string[]>([]);
  const [activeIntent, setActiveIntent] = useState<{
    intentCategory: string;
    requiresSpecialistAgents: boolean;
    intendedActionExplanation: string;
  } | null>(null);
  const [activePlan, setActivePlan] = useState<CEOExecutionPlan | null>(null);
  const [activeAgentSlugs, setActiveAgentSlugs] = useState<AgentSlug[]>([]);
  const [completedAgentSlugs, setCompletedAgentSlugs] = useState<AgentSlug[]>(
    []
  );
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [latestUsage, setLatestUsage] = useState<TokenUsageRecord | null>(null);
  const [expandedPlanMsgIds, setExpandedPlanMsgIds] = useState<
    Record<string, boolean>
  >({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadConversationDetails = useCallback(async (convoId: string) => {
    setLoadingMessages(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/conversations/${convoId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Unable to load conversation messages");
      }
      const data = await res.json();
      setActiveConversationId(data.conversation.id);
      setMessages(data.messages || []);

      // Restore the most recent assistant message's plan into the right-hand telemetry panel
      const assistantMsgs = (data.messages || []).filter(
        (m: ChatMessageItem) => m.role === "assistant" && m.metadata?.plan
      );
      const lastWithPlan = assistantMsgs[assistantMsgs.length - 1];
      if (lastWithPlan?.metadata?.plan) {
        const plan = lastWithPlan.metadata.plan as CEOExecutionPlan;
        setActivePlan(plan);
        setContextReadSummary(plan.contextReadSummary || []);
        setActiveIntent({
          intentCategory: plan.intentCategory,
          requiresSpecialistAgents: plan.requiresSpecialistAgents,
          intendedActionExplanation: plan.intendedActionExplanation,
        });
        setCompletedAgentSlugs(plan.selectedAgents || []);
        if (lastWithPlan.metadata.tokenUsage) {
          setLatestUsage(lastWithPlan.metadata.tokenUsage);
        }
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to load conversation"
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchConversationsList = useCallback(
    async (selectId?: string) => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load conversation history");
        const data = await res.json();
        const list: ConversationItem[] = data.conversations || [];
        setConversations(list);

        const targetId =
          selectId ||
          activeConversationId ||
          (list.length > 0 ? list[0].id : "");
        if (targetId) {
          await loadConversationDetails(targetId);
        }
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : "Failed to load conversations list"
        );
      } finally {
        setLoadingConversations(false);
      }
    },
    [activeConversationId, loadConversationDetails]
  );

  useEffect(() => {
    fetchConversationsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleCreateNewConversation = async () => {
    setErrorBanner(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      if (!res.ok) throw new Error("Could not create new conversation");
      const data = await res.json();
      const newConvo: ConversationItem = data.conversation;
      setConversations((prev) => [newConvo, ...prev]);
      setActiveConversationId(newConvo.id);
      setMessages(data.messages || []);
      setActivePlan(null);
      setActiveIntent(null);
      setLiveEvents([]);
      setActiveAgentSlugs([]);
      setCompletedAgentSlugs([]);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to start new conversation"
      );
    }
  };

  const handleStartRename = (convo: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(convo.id);
    setEditingTitleValue(convo.title);
  };

  const handleSaveRename = async (convoId: string) => {
    if (!editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/conversations/${convoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitleValue.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to rename conversation");
      }
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? data.conversation : c))
      );
      setEditingTitleId(null);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to update title"
      );
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteConversation = async (
    convoId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${convoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      const data = await res.json();
      const remaining: ConversationItem[] = data.conversations || [];
      setConversations(remaining);
      if (convoId === activeConversationId && remaining.length > 0) {
        await loadConversationDetails(remaining[0].id);
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not delete conversation"
      );
    }
  };

  const handleSendCEOChat = useCallback(
    async (overridePrompt?: string) => {
      const promptText = (overridePrompt ?? chatInput).trim();
      if (!promptText || isStreaming) return;

      setChatInput("");
      setErrorBanner(null);
      setLastFailedPrompt(null);
      setIsStreaming(true);
      setStreamingContent("");
      setLiveEvents([]);
      setActiveAgentSlugs([]);
      setCompletedAgentSlugs([]);

      // Optimistically append user message to view
      const optimisticUserMsg: ChatMessageItem = {
        id: `temp_user_${Date.now()}`,
        conversationId: activeConversationId || "convo_pending",
        userId: profile?.id || "usr_arjun_01",
        role: "user",
        content: promptText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);

      try {
        const res = await fetch("/api/ceo/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptText,
            conversationId: activeConversationId || undefined,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const errPayload = await res.json().catch(() => ({}));
          throw new Error(
            errPayload.error ||
              `CEO request failed with HTTP status ${res.status}`
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let resolvedConvoId = activeConversationId;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as CEOEvent;

            if (event.type === "message_start") {
              resolvedConvoId = event.conversationId;
              setActiveConversationId(event.conversationId);
              setLiveEvents((prev) => [
                ...prev,
                `🚀 Started CEO Run (${event.runId})`,
              ]);
            } else if (event.type === "context_loaded") {
              setContextReadSummary(event.summary);
              setLiveEvents((prev) => [
                ...prev,
                `📚 Loaded live student context (${event.summary.length} domain snapshots)`,
              ]);
            } else if (event.type === "intent_classified") {
              setActiveIntent({
                intentCategory: event.intentCategory,
                requiresSpecialistAgents: event.requiresSpecialistAgents,
                intendedActionExplanation: event.intendedActionExplanation,
              });
              setLiveEvents((prev) => [
                ...prev,
                `🧭 Classified intent: ${event.intentCategory} (${
                  event.requiresSpecialistAgents
                    ? "Specialist Agent Plan"
                    : "Direct CEO Response"
                })`,
              ]);
            } else if (event.type === "plan_created") {
              setActivePlan(event.plan);
              setActiveAgentSlugs(event.plan.selectedAgents);
              setLiveEvents((prev) => [
                ...prev,
                `📋 Created ${event.plan.steps.length}-step execution plan`,
              ]);
            } else if (event.type === "agent_started") {
              setActiveAgentSlugs((prev) =>
                prev.includes(event.agent) ? prev : [...prev, event.agent]
              );
              setLiveEvents((prev) => [
                ...prev,
                `⚡ ${event.agentName}: ${event.objective}`,
              ]);
            } else if (event.type === "agent_completed") {
              setCompletedAgentSlugs((prev) =>
                prev.includes(event.agent) ? prev : [...prev, event.agent]
              );
              setLiveEvents((prev) => [
                ...prev,
                `✅ ${event.agentName}: ${event.result.summary}`,
              ]);
            } else if (event.type === "approval_required") {
              setLiveEvents((prev) => [
                ...prev,
                `🛡️ Approval Gate queued: ${event.title}`,
              ]);
            } else if (event.type === "message_delta") {
              setStreamingContent((prev) => prev + event.text);
            } else if (event.type === "usage_recorded") {
              setLatestUsage(event.usage);
              setLiveEvents((prev) => [
                ...prev,
                `📊 Usage recorded: ${event.usage.totalTokens} tokens (${event.usage.model})`,
              ]);
            } else if (event.type === "message_complete") {
              setStreamingContent("");
              await fetchConversationsList(
                event.conversationId || resolvedConvoId
              );
              await onWorkspaceRefresh();
            } else if (event.type === "error") {
              setErrorBanner(event.message);
              setLastFailedPrompt(promptText);
            }
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Network error communicating with AI CEO.";
        setErrorBanner(msg);
        setLastFailedPrompt(promptText);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [
      activeConversationId,
      chatInput,
      fetchConversationsList,
      isStreaming,
      onWorkspaceRefresh,
      profile?.id,
    ]
  );

  // Trigger directive passed from Student Dashboard Quick Actions
  useEffect(() => {
    if (initialDirective && !loadingConversations && !isStreaming) {
      const directiveToRun = initialDirective;
      onDirectiveConsumed?.();
      handleSendCEOChat(directiveToRun);
    }
  }, [
    initialDirective,
    loadingConversations,
    isStreaming,
    handleSendCEOChat,
    onDirectiveConsumed,
  ]);

  function handleVoiceInput() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setChatInput(
        "Create a focused study schedule for my upcoming CS301 and CS302 deadlines"
      );
      return;
    }

    if (voiceListening) {
      setVoiceListening(false);
      return;
    }

    setVoiceListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setChatInput(transcript);
      setVoiceListening(false);
    };
    recognition.onerror = () => setVoiceListening(false);
    recognition.onend = () => setVoiceListening(false);
    recognition.start();
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*_`>-]/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.04;
    utterance.onend = () => setVoiceSpeaking(false);
    utterance.onerror = () => setVoiceSpeaking(false);
    setVoiceSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopVoicePlayback() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceSpeaking(false);
  }

  function interruptVoiceResponse() {
    stopVoicePlayback();
    setVoiceListening(false);
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const estimatedInputTokens = Math.max(
    0,
    Math.ceil(chatInput.trim().length / 4)
  );

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden bg-background">
      {/* =====================================================================
          COLUMN 1: CONVERSATION HISTORY & EXECUTIVE DIRECTIVES
      ===================================================================== */}
      <div className="lg:col-span-3 border-r border-border bg-surface flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm text-text-primary flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversations
            </h3>
            <p className="text-[11px] text-text-secondary">
              Persistent multi-turn CEO sessions
            </p>
          </div>
          <button
            onClick={handleCreateNewConversation}
            disabled={isStreaming}
            className="px-2.5 py-1.5 rounded-button bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
            title="Start a new CEO conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingConversations ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-button bg-surface-muted animate-pulse border border-border"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-text-secondary p-2">
              No conversations yet. Click <strong>New Chat</strong> to begin.
            </p>
          ) : (
            conversations.map((convo) => {
              const isSelected = convo.id === activeConversationId;
              const isEditing = editingTitleId === convo.id;

              return (
                <div
                  key={convo.id}
                  onClick={() => {
                    if (!isEditing && !isStreaming) {
                      loadConversationDetails(convo.id);
                    }
                  }}
                  className={`group rounded-button p-2.5 border transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-xs"
                      : "bg-background hover:bg-surface-muted border-border"
                  }`}
                >
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(convo.id);
                          if (e.key === "Escape") setEditingTitleId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 text-xs rounded border border-primary bg-white text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(convo.id)}
                        disabled={savingTitle}
                        className="p-1 rounded bg-primary text-white hover:bg-primary-hover"
                        title="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTitleId(null)}
                        className="p-1 rounded bg-surface-muted text-text-secondary"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? "text-primary" : "text-text-primary"
                          }`}
                        >
                          {convo.title}
                        </p>
                        {convo.lastMessagePreview && (
                          <p className="text-[11px] text-text-secondary truncate mt-0.5">
                            {convo.lastMessagePreview}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                          <span>{convo.messageCount} msgs</span>
                          <span>•</span>
                          <span>
                            {new Date(convo.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleStartRename(convo, e)}
                          className="p-1 rounded hover:bg-white text-text-secondary hover:text-text-primary"
                          title="Rename conversation title"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(convo.id, e)}
                          className="p-1 rounded hover:bg-red-50 text-text-secondary hover:text-danger"
                          title="Delete conversation"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Executive Directives */}
        <div className="p-3 border-t border-border bg-surface-muted/50 space-y-2 max-h-60 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary px-1">
            Quick Directives
          </p>
          <div className="space-y-1.5">
            {EXECUTIVE_DIRECTIVES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendCEOChat(item.prompt)}
                disabled={isStreaming}
                className="w-full text-left p-2 rounded-button border border-border bg-surface hover:border-primary hover:bg-blue-50/40 text-xs transition flex items-start gap-1.5 disabled:opacity-50"
              >
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-[11px] text-text-primary truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-text-secondary line-clamp-1">
                    {item.prompt}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          COLUMN 2: CENTRAL AI CEO CHAT STREAM & MARKDOWN VIEW
      ===================================================================== */}
      <div className="lg:col-span-6 flex flex-col bg-background max-h-[calc(100vh-4rem)] min-h-0">
        {/* Conversation Header */}
        <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success shrink-0" />
              <h2 className="font-semibold text-sm text-text-primary truncate">
                {activeConversation?.title || "AI CEO Command Session"}
              </h2>
              {activeConversation && (
                <button
                  onClick={(e) => handleStartRename(activeConversation, e)}
                  className="p-1 rounded hover:bg-surface-muted text-text-secondary"
                  title="Edit conversation title"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-secondary truncate">
              Central AI CEO • Reads live academic, project, and deadline
              context before planning
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-surface-muted border border-border text-[11px] font-medium text-text-secondary flex items-center gap-1">
              <Cpu className="h-3 w-3 text-primary" />
              {aiUsageSnapshot?.providerMode === "gemini"
                ? `Gemini (${aiUsageSnapshot.model})`
                : "Server Contextual AI"}
            </span>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorBanner && (
          <div className="mx-4 mt-3 p-3 rounded-card bg-red-50 border border-red-200 flex items-start justify-between gap-3 text-xs text-danger">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">CEO Orchestration Alert</p>
                <p className="mt-0.5">{errorBanner}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {lastFailedPrompt && (
                <button
                  onClick={() => handleSendCEOChat(lastFailedPrompt)}
                  className="px-2.5 py-1 rounded bg-white border border-red-200 text-danger font-semibold hover:bg-red-100 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}
              <button
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded hover:bg-red-100"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12 text-xs text-text-secondary gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading conversation messages...
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const msgPlan = msg.metadata?.plan;
              const isPlanExpanded = Boolean(expandedPlanMsgIds[msg.id]);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl w-full sm:w-auto rounded-card p-4 space-y-2.5 ${
                      isUser
                        ? "bg-primary text-white"
                        : "bg-surface border border-border text-text-primary shadow-xs"
                    }`}
                  >
                    {/* Message Header */}
                    <div
                      className={`flex items-center justify-between gap-4 text-xs ${
                        isUser ? "text-blue-100" : "text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        {!isUser && (
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>
                          {isUser
                            ? profile?.fullName || "You"
                            : "Student OS AI CEO"}
                        </span>
                        {!isUser && msg.metadata?.intentCategory && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-200 text-[10px] font-medium">
                            {msg.metadata.intentCategory.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => speakText(msg.content)}
                            title="Read response aloud (TTS)"
                            className="p-1 rounded hover:bg-surface-muted text-text-secondary"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Structured Plan Summary on Assistant Messages */}
                    {!isUser && msgPlan && (
                      <div className="rounded-button bg-surface-muted/80 border border-border p-2.5 text-xs space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPlanMsgIds((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="w-full flex items-center justify-between text-left font-semibold text-text-primary"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            {msgPlan.requiresSpecialistAgents
                              ? `Structured Plan (${msgPlan.steps.length} Specialist Step${
                                  msgPlan.steps.length > 1 ? "s" : ""
                                })`
                              : "Direct CEO Context Synthesis (No Specialist Required)"}
                          </span>
                          {isPlanExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />
                          )}
                        </button>

                        {isPlanExpanded && (
                          <div className="pt-1.5 border-t border-border space-y-1.5 text-[11px] text-text-secondary">
                            <p>
                              <strong className="text-text-primary">
                                Intended Action:
                              </strong>{" "}
                              {msgPlan.intendedActionExplanation}
                            </p>
                            <div className="space-y-1">
                              {msgPlan.steps.map((s) => (
                                <div
                                  key={s.stepNumber}
                                  className="p-1.5 rounded bg-surface border border-border"
                                >
                                  <span className="font-semibold text-text-primary">
                                    Step {s.stepNumber} [{s.agentName}]:
                                  </span>{" "}
                                  {s.objective}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Formatted Markdown Message Body */}
                    <MarkdownContent content={msg.content} isUser={isUser} />

                    {/* Agent & Token Metadata Footer */}
                    {!isUser &&
                      (msg.metadata?.selectedAgents ||
                        msg.metadata?.tokenUsage) && (
                        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1">
                            {msg.metadata?.selectedAgents?.map((slug) => (
                              <span
                                key={slug}
                                className="px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] font-semibold border border-border"
                              >
                                @{slug}
                              </span>
                            ))}
                          </div>
                          {msg.metadata?.tokenUsage && (
                            <span className="text-[10px] text-text-secondary">
                              {msg.metadata.tokenUsage.totalTokens} tokens
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}

          {/* Live Streaming Assistant Bubble */}
          {isStreaming && (
            <div className="flex flex-col items-start">
              <div className="max-w-2xl w-full rounded-card p-4 bg-surface border border-blue-200 text-text-primary shadow-sm space-y-2.5">
                <div className="flex items-center justify-between text-xs text-primary font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI CEO is streaming response...
                  </span>
                  {activeIntent && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary text-[10px]">
                      {activeIntent.intentCategory.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {streamingContent ? (
                  <MarkdownContent content={streamingContent} />
                ) : (
                  <p className="text-xs text-text-secondary italic">
                    Reading your student context, classifying intent, and
                    generating structured plan...
                  </p>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input & Voice Controls */}
        <div className="p-4 bg-surface border-t border-border space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCEOChat();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-button border transition ${
                voiceListening
                  ? "bg-red-50 border-danger text-danger animate-pulse"
                  : "bg-surface-muted border-border text-text-secondary hover:text-text-primary"
              }`}
              title="Voice Input (Speech-to-Text)"
            >
              {voiceListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isStreaming}
              placeholder="Ask your AI CEO to plan, explain, schedule, or analyze..."
              className="flex-1 px-4 py-2.5 rounded-button border border-border bg-background text-sm focus:outline-none focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isStreaming || !chatInput.trim()}
              className="px-4 sm:px-5 py-2.5 rounded-button bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isStreaming ? "Streaming..." : "Send"}
              </span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary px-1">
            <span>
              Server-side AI Provider • API keys protected • pgvector Memory
              grounded
            </span>
            <div className="flex items-center gap-2">
              {voiceSpeaking && (
                <>
                  <button
                    type="button"
                    onClick={stopVoicePlayback}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
                  >
                    Stop Playback
                  </button>
                  <button
                    type="button"
                    onClick={interruptVoiceResponse}
                    className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold"
                  >
                    Interrupt Response
                  </button>
                </>
              )}
              <span>
                ~{estimatedInputTokens} est. prompt tokens (Max 4,096/req)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          COLUMN 3: LIVE CEO REASONING, PLAN & AGENT ACTIVITY INDICATORS
      ===================================================================== */}
      <div className="lg:col-span-3 border-l border-border bg-surface p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <div>
          <h3 className="font-semibold text-sm text-text-primary flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            CEO Orchestration Activity
          </h3>
          <p className="text-[11px] text-text-secondary">
            Real-time intent classification, context read & agent plan
          </p>
        </div>

        {/* 1. Intent & Specialist Requirement Indicator */}
        <div className="p-3 rounded-card bg-surface-muted border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary">
              1. Intent & Routing
            </span>
            {activeIntent && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeIntent.requiresSpecialistAgents
                    ? "bg-blue-50 text-primary border border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {activeIntent.requiresSpecialistAgents
                  ? "Specialist Plan"
                  : "CEO Direct"}
              </span>
            )}
          </div>
          {activeIntent ? (
            <div className="space-y-1 text-[11px] text-text-secondary">
              <p>
                <strong className="text-text-primary">Category:</strong>{" "}
                <code>{activeIntent.intentCategory}</code>
              </p>
              <p>
                <strong className="text-text-primary">Intended Action:</strong>{" "}
                {activeIntent.intendedActionExplanation}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-text-secondary italic">
              Send a message to see how the CEO classifies your request.
            </p>
          )}
        </div>

        {/* 2. Student Context Read Snapshot */}
        <div className="p-3 rounded-card bg-surface-muted border border-border space-y-2 text-xs">
          <span className="font-semibold text-text-primary block">
            2. Student Context Read
          </span>
          {contextReadSummary.length > 0 ? (
            <ul className="space-y-1 text-[11px] text-text-secondary">
              {contextReadSummary.map((line, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-text-secondary italic">
              Context snapshot loads automatically on every turn.
            </p>
          )}
        </div>

        {/* 3. Structured Execution Plan & Active Agents */}
        <div className="p-3 rounded-card bg-surface-muted border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary">
              3. Structured Plan
            </span>
            {activePlan && (
              <span className="text-[11px] text-text-secondary">
                {activePlan.steps.length} step(s)
              </span>
            )}
          </div>

          {activePlan ? (
            <div className="space-y-2">
              {activePlan.steps.map((step) => {
                const isDone = completedAgentSlugs.includes(step.agent);
                const isRunning =
                  isStreaming &&
                  activeAgentSlugs.includes(step.agent) &&
                  !isDone;
                return (
                  <div
                    key={step.stepNumber}
                    className="p-2 rounded-button bg-surface border border-border space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[11px] text-text-primary">
                        Step {step.stepNumber}: {step.agentName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isDone
                            ? "bg-emerald-50 text-emerald-700"
                            : isRunning
                            ? "bg-blue-50 text-primary animate-pulse"
                            : "bg-slate-100 text-text-secondary"
                        }`}
                      >
                        {isDone ? "Done" : isRunning ? "Active" : "Planned"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      {step.objective}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-text-secondary italic">
              No execution plan active yet.
            </p>
          )}
        </div>

        {/* 4. Live Event Stream */}
        {liveEvents.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Live Event Trace
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {liveEvents.map((ev, i) => (
                <div
                  key={i}
                  className="p-2 rounded-button bg-surface-muted text-[11px] text-text-primary border border-border"
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Token Usage & Budget Governance */}
        <div className="p-3 rounded-card bg-surface-muted border border-border space-y-1.5 text-xs">
          <span className="font-semibold text-text-primary block">
            Token Usage & Governance
          </span>
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>Last Turn Tokens:</span>
            <span className="font-semibold text-text-primary">
              {latestUsage ? `${latestUsage.totalTokens} tokens` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>Session Cumulative:</span>
            <span className="font-semibold text-text-primary">
              {(aiUsageSnapshot?.inputTokens || 0) +
                (aiUsageSnapshot?.outputTokens || 0)}{" "}
              tokens
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>Daily Student Quota:</span>
            <span className="font-semibold text-text-primary">
              120,000 tokens/day
            </span>
          </div>
        </div>

        {/* 6. Pending Approvals Gate */}
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-text-secondary">
            Pending Approvals ({pendingApprovals.length})
          </p>
          {pendingApprovals.length === 0 ? (
            <p className="text-[11px] text-text-secondary">
              No external actions waiting for student approval.
            </p>
          ) : (
            pendingApprovals.map((app) => (
              <div
                key={app.id}
                className="p-3 rounded-card bg-amber-50/70 border border-amber-200 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-warning font-semibold text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{app.title}</span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {app.description}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onApprovalDecision(app.id, "approved")}
                    className="flex-1 py-1.5 rounded-button bg-success text-white text-xs font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onApprovalDecision(app.id, "rejected")}
                    className="flex-1 py-1.5 rounded-button bg-surface border border-border text-text-secondary text-xs font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

