import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { dbStore } from "../src/lib/db/store.ts";
import {
  AIRequestSchema,
  DAILY_TOKEN_BUDGET_PER_USER,
  MAX_TOKENS_PER_REQUEST,
  checkUserTokenQuota,
  estimateTokenCount,
  getAIUsageSnapshot,
  getActiveAIProvider,
  recordAIUsageMetrics,
  resetAIUsageMetricsForTesting,
} from "../src/lib/ai/provider.ts";
import {
  classifyIntentAndPlan,
  executeCEOOrchestration,
  loadStudentContextSnapshot,
} from "../src/lib/agents/orchestrator.ts";

const ROOT = process.cwd();

test("Phase 3.1 — AI API keys and server AI provider are never exposed in client components", () => {
  const clientFiles = [
    "src/app/page.tsx",
    "src/components/ceo/ceo-command-center.tsx",
    "src/components/dashboard/student-dashboard.tsx",
  ];

  for (const rel of clientFiles) {
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.ok(
      !content.includes("GEMINI_API_KEY"),
      `${rel} must never reference GEMINI_API_KEY`
    );
    assert.ok(
      !content.includes("SUPABASE_SERVICE_ROLE_KEY"),
      `${rel} must never reference SUPABASE_SERVICE_ROLE_KEY`
    );
    assert.ok(
      !content.includes("@/lib/ai/provider") &&
        !content.includes("../lib/ai/provider"),
      `${rel} must never import server-only AI provider module directly`
    );
  }
});

test("Phase 3.2 — AI Provider abstraction, request validation, token limits & usage tracking", () => {
  resetAIUsageMetricsForTesting();

  const provider = getActiveAIProvider();
  assert.equal(provider.name, "gemini");
  assert.ok(provider.defaultModel.includes("gemini"));

  // 1. Validate request schema rejects empty userPrompt or excessive maxOutputTokens
  const invalidEmpty = AIRequestSchema.safeParse({
    systemPrompt: "System",
    userPrompt: "   ",
  });
  assert.equal(invalidEmpty.success, false);

  const invalidMaxTokens = AIRequestSchema.safeParse({
    systemPrompt: "System",
    userPrompt: "Valid prompt",
    maxOutputTokens: MAX_TOKENS_PER_REQUEST + 500,
  });
  assert.equal(invalidMaxTokens.success, false);

  // 2. Token estimation & quota enforcement
  const tokens = estimateTokenCount("Hello AI CEO, build my study plan.");
  assert.ok(tokens > 0);

  const overRequestLimit = checkUserTokenQuota(
    "usr_quota_test",
    MAX_TOKENS_PER_REQUEST + 10
  );
  assert.equal(overRequestLimit.allowed, false);
  assert.ok(overRequestLimit.reason?.includes("single-request token limit"));

  // 3. Record usage metrics and verify per-user daily budget tracking
  const rec = recordAIUsageMetrics({
    userId: "usr_quota_test",
    agentSlug: "ceo",
    provider: "gemini",
    model: provider.defaultModel,
    inputTokens: 1200,
    outputTokens: 800,
  });
  assert.equal(rec.totalTokens, 2000);

  const snap = getAIUsageSnapshot("usr_quota_test");
  assert.equal(snap.totalTokens, 2000);
  assert.equal(
    snap.remainingDailyTokens,
    DAILY_TOKEN_BUDGET_PER_USER - 2000
  );

  // Exhaust daily quota and verify rejection
  recordAIUsageMetrics({
    userId: "usr_quota_test",
    agentSlug: "ceo",
    provider: "gemini",
    model: provider.defaultModel,
    inputTokens: DAILY_TOKEN_BUDGET_PER_USER,
    outputTokens: 100,
  });
  const exhaustedCheck = checkUserTokenQuota("usr_quota_test", 100);
  assert.equal(exhaustedCheck.allowed, false);
  assert.ok(exhaustedCheck.reason?.includes("Daily token budget reached"));
});

test("Phase 3.3 — Persistent conversations, auto-titling, title editing & multi-user isolation", () => {
  dbStore.resetStateForTesting();

  const userA = "student-demo-001";
  const userB = "student-isolated-002";

  // 1. User A creates a new conversation
  const created = dbStore.createConversation("New Conversation", userA);
  assert.equal(created.userId, userA);
  assert.equal(created.title, "New Conversation");
  assert.equal(created.messageCount, 1); // Initial welcome message

  // 2. Appending first user message auto-titles the conversation
  const userMsg = dbStore.appendMessage(
    {
      conversationId: created.id,
      role: "user",
      content: "Create a 7-day revision plan for Operating Systems CS302",
    },
    userA
  );
  assert.ok(userMsg);

  const afterFirstMsg = dbStore.getConversationById(created.id, userA);
  assert.ok(afterFirstMsg);
  assert.equal(
    afterFirstMsg.conversation.title,
    "Create a 7-day revision plan for Operating Systems CS302"
  );
  assert.equal(afterFirstMsg.messages.length, 2);

  // 3. Rename conversation title explicitly
  const renamed = dbStore.updateConversationTitle(
    created.id,
    "CS302 Mid-Sem Sprint Plan",
    userA
  );
  assert.ok(renamed);
  assert.equal(renamed.title, "CS302 Mid-Sem Sprint Plan");

  // 4. Tenant Isolation: User B cannot view, rename, or delete User A's conversation
  const leakRead = dbStore.getConversationById(created.id, userB);
  assert.equal(leakRead, null);

  const leakRename = dbStore.updateConversationTitle(
    created.id,
    "Hacked Title",
    userB
  );
  assert.equal(leakRename, null);

  const leakDelete = dbStore.deleteConversation(created.id, userB);
  assert.equal(leakDelete, false);

  // User A can still see their intact conversation
  const verifyStillIntact = dbStore.getConversationById(created.id, userA);
  assert.ok(verifyStillIntact);
  assert.equal(verifyStillIntact.conversation.title, "CS302 Mid-Sem Sprint Plan");
});

test("Phase 3.4 — AI CEO 7 capabilities, streaming events & persistence end-to-end", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();

  const userA = "student-demo-001";
  const convo = dbStore.createConversation("New Conversation", userA);

  // Capability 2: Verify CEO reads real student context
  const contextSnap = loadStudentContextSnapshot(userA);
  assert.ok(contextSnap.profileSummary.includes("Aarav Sharma"));
  assert.ok(
    contextSnap.subjectsSummary.some((s) => s.includes("CS301")),
    "Context snapshot must include student's real CS301 subject"
  );

  // Capability 1, 3, 4, 5, 6: Test Direct CEO query (requiresSpecialistAgents === false)
  const directEvents = [];
  const directRun = await executeCEOOrchestration(
    "Summarize my current status",
    convo.id,
    (ev) => directEvents.push(ev),
    userA
  );

  assert.equal(directRun.plan.intentCategory, "executive_direct_query");
  assert.equal(directRun.plan.requiresSpecialistAgents, false);
  assert.deepEqual(directRun.plan.selectedAgents, ["ceo"]);
  assert.ok(directRun.plan.intendedActionExplanation.length > 20);
  assert.ok(directRun.consolidatedText.includes("Aarav Sharma"));

  const directEventTypes = directEvents.map((e) => e.type);
  assert.ok(directEventTypes.includes("message_start"));
  assert.ok(directEventTypes.includes("context_loaded"));
  assert.ok(directEventTypes.includes("intent_classified"));
  assert.ok(directEventTypes.includes("plan_created"));
  assert.ok(directEventTypes.includes("message_delta"));
  assert.ok(directEventTypes.includes("usage_recorded"));
  assert.ok(directEventTypes.includes("message_complete"));

  // Test Specialist Agent query (requiresSpecialistAgents === true)
  const specialistEvents = [];
  const specialistRun = await executeCEOOrchestration(
    "Analyse my CS301 and CS302 syllabus and create a 7-day study schedule",
    convo.id,
    (ev) => specialistEvents.push(ev),
    userA
  );

  assert.equal(specialistRun.plan.requiresSpecialistAgents, true);
  assert.ok(specialistRun.plan.selectedAgents.includes("academic"));
  assert.ok(specialistRun.plan.selectedAgents.includes("study"));
  assert.ok(specialistRun.plan.steps.length >= 2);
  assert.ok(specialistRun.tokenUsage.totalTokens > 0);

  // Verify delta chunks streamed progressively and reconstruct the full markdown
  const streamedDeltaText = specialistEvents
    .filter((e) => e.type === "message_delta")
    .map((e) => e.text)
    .join("");
  assert.equal(streamedDeltaText, specialistRun.consolidatedText);

  // Verify conversation persisted all messages (1 welcome + 2 user + 2 assistant = 5 messages)
  const persistedConvo = dbStore.getConversationById(convo.id, userA);
  assert.ok(persistedConvo);
  assert.equal(persistedConvo.messages.length, 5);
  assert.equal(
    persistedConvo.conversation.title,
    "Summarize my current status"
  );

  // Verify usage record was written to `usage_records` table for the student
  const usageRows = dbStore.getUsageRecords(userA);
  assert.ok(usageRows.length >= 2);
  assert.equal(usageRows[0].user_id, userA);
  assert.ok(usageRows[0].input_tokens > 0);
  assert.ok(usageRows[0].output_tokens > 0);
});
