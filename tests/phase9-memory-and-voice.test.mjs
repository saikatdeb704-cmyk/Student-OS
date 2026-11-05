import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dbStore } from "../src/lib/db/store.ts";
import {
  MEMORY_CATEGORIES,
  generateEmbedding768,
  cosineSimilarity,
} from "../src/lib/memory/engine.ts";
import {
  detectVoiceCapabilities,
  requestMicrophonePermission,
  validateVoiceProviderConsent,
  VoiceInteractionController,
} from "../src/lib/voice/provider.ts";
import { classifyIntentAndPlan } from "../src/lib/agents/orchestrator.ts";

const USER_A = "student-demo-001";
const USER_B = "student-isolation-002";

test("Phase 9.1 — PostgreSQL + pgvector Migration & All 7 User-Scoped Memory Categories", () => {
  dbStore.resetStateForTesting();

  // Verify SQL migration 0005 exists and includes pgvector HNSW index, RPC, and RLS
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "0005_phase9_pgvector_memory_and_voice.sql"
  );
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /create extension if not exists "vector"/i);
  assert.match(sql, /idx_memory_records_embedding_hnsw/i);
  assert.match(sql, /match_user_memories/i);
  assert.match(sql, /third_party_audio_consent/i);

  // Verify all 7 required memory domains exist for User A with 768-d embeddings
  const memories = dbStore.getMemories(USER_A);
  const presentCategories = new Set(memories.map((m) => m.category));
  for (const requiredCat of MEMORY_CATEGORIES) {
    assert.equal(
      presentCategories.has(requiredCat),
      true,
      `Missing required memory category: ${requiredCat}`
    );
  }

  for (const mem of memories) {
    assert.ok(
      Array.isArray(mem.embedding) && mem.embedding.length === 768,
      `Memory ${mem.id} must have a 768-dimensional pgvector embedding`
    );
  }
});

test("Phase 9.2 — Memory Creation, Duplicate Prevention, Relevance Scoring & Document Retrieval", () => {
  dbStore.resetStateForTesting();

  // 1. Create a new memory record
  const firstCreate = dbStore.createMemoryWithDeduplication(
    {
      category: "student_preference",
      content:
        "Prefers visual dry-run trace diagrams before reading formal proofs in CS301 Algorithms.",
      importanceScore: 0.91,
    },
    USER_A
  );
  assert.equal(firstCreate.created, true);
  assert.equal(firstCreate.duplicate, false);
  assert.equal(firstCreate.record.embedding?.length, 768);

  // 2. Attempt to create an exact/normalized duplicate -> must be prevented
  const duplicateAttempt = dbStore.createMemoryWithDeduplication(
    {
      category: "student_preference",
      content:
        "  prefers visual dry-run trace diagrams before reading formal proofs in cs301 algorithms! ",
      importanceScore: 0.91,
    },
    USER_A
  );
  assert.equal(
    duplicateAttempt.created,
    false,
    "Duplicate memory creation must be prevented"
  );
  assert.equal(duplicateAttempt.duplicate, true);
  assert.equal(duplicateAttempt.record.id, firstCreate.record.id);

  // 3. Retrieve memories & documents with hybrid pgvector relevance scoring
  const retrieval = dbStore.retrieveMemoriesWithRelevance(
    {
      query: "Operating Systems CS302 syllabus paging concurrency",
    },
    USER_A
  );
  assert.ok(retrieval.memories.length > 0, "Should return ranked memories");
  assert.ok(retrieval.documents.length > 0, "Should return ranked documents");

  // Verify top memory is relevant to academic/document Operating Systems context
  const topHit = retrieval.memories[0];
  assert.ok(
    topHit.relevanceScore >= retrieval.memories[retrieval.memories.length - 1].relevanceScore,
    "Memories must be sorted in descending order of relevanceScore"
  );
  assert.match(topHit.record.content, /CS302|Operating Systems/i);
});

test("Phase 9.3 — Memory Review, Editing (with Re-Embedding), User-Controlled Deletion & Cross-User Isolation", () => {
  dbStore.resetStateForTesting();

  const created = dbStore.createMemoryWithDeduplication(
    {
      category: "career_goal",
      content: "Initial career note: explore backend engineering roles.",
      importanceScore: 0.75,
      reviewStatus: "pending_review",
    },
    USER_A
  );
  const memId = created.record.id;
  const originalEmbedding = [...(created.record.embedding || [])];

  // 1. Memory Review: transition from pending_review -> verified
  const reviewed = dbStore.reviewMemoryRecord(memId, "verified", USER_A);
  assert.equal(reviewed?.review_status, "verified");

  // Cross-user isolation: User B cannot review User A's memory
  assert.equal(dbStore.reviewMemoryRecord(memId, "archived", USER_B), null);

  // 2. Memory Editing: update content and importance -> must recompute 768-dim embedding
  const edited = dbStore.updateMemoryRecord(
    memId,
    {
      content:
        "Updated career goal: Target AI Systems & Distributed Inference internships for Summer 2026.",
      importanceScore: 0.96,
    },
    USER_A
  );
  assert.ok(edited);
  assert.equal(edited.importance_score, 0.96);
  assert.equal(edited.embedding?.length, 768);
  const simBetweenOldAndNew = cosineSimilarity(
    originalEmbedding,
    edited.embedding
  );
  assert.ok(
    simBetweenOldAndNew < 0.99,
    "Re-embedded vector must reflect edited memory content"
  );

  // Cross-user isolation: User B cannot edit or delete User A's memory
  assert.equal(
    dbStore.updateMemoryRecord(memId, { content: "Tampered" }, USER_B),
    null
  );
  assert.equal(dbStore.deleteMemoryRecord(memId, USER_B), false);

  // 3. User-Controlled Deletion by Owner (User A)
  assert.equal(dbStore.deleteMemoryRecord(memId, USER_A), true);
  assert.equal(
    dbStore.getMemories(USER_A).some((m) => m.id === memId),
    false
  );
});

test("Phase 9.4 — Independent Voice Testing: Compatibility Checks, Mic Permission, Disclosure Consent, STT, TTS, Stop & Interrupt", async () => {
  const controller = new VoiceInteractionController();

  // 1. Browser & Mobile Compatibility Checks (never assume every browser supports the same APIs)
  const iosSafariCaps = controller.getCapabilities({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    hasMediaDevices: true,
    hasSpeechRecognition: false,
    hasWebkitSpeechRecognition: true,
    hasSpeechSynthesis: true,
  });
  assert.equal(iosSafariCaps.isMobile, true);
  assert.equal(iosSafariCaps.isIOS, true);
  assert.equal(iosSafariCaps.continuousSttSupported, false);
  assert.equal(iosSafariCaps.recommendedMode, "full_voice");

  const firefoxDesktopCaps = detectVoiceCapabilities({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    hasMediaDevices: true,
    hasSpeechRecognition: false,
    hasWebkitSpeechRecognition: false,
    hasSpeechSynthesis: true,
  });
  assert.equal(firefoxDesktopCaps.sttSupported, false);
  assert.equal(firefoxDesktopCaps.ttsSupported, true);
  assert.equal(firefoxDesktopCaps.recommendedMode, "tts_only");

  // 2. Third-Party Audio Disclosure & Permission Enforcement
  const blockedCloud = controller.setConsentConfig({
    provider: "cloud_speech_provider",
    disclosureAcknowledged: false,
    thirdPartyAudioConsent: false,
  });
  assert.equal(
    blockedCloud.allowed,
    false,
    "Must block third-party speech provider when disclosure/permission is missing"
  );
  assert.equal(blockedCloud.config.provider, "browser_native");

  const allowedCloud = controller.setConsentConfig({
    provider: "cloud_speech_provider",
    disclosureAcknowledged: true,
    thirdPartyAudioConsent: true,
  });
  assert.equal(allowedCloud.allowed, true);
  assert.equal(allowedCloud.config.provider, "cloud_speech_provider");

  // 3. Microphone Permission Handling (Granted & Track Release)
  let trackStopped = false;
  const micGranted = await controller.checkOrRequestMicrophone({
    getUserMedia: async () => ({
      getTracks: () => [
        {
          stop: () => {
            trackStopped = true;
          },
        },
      ],
    }),
  });
  assert.equal(micGranted.state, "granted");
  assert.equal(
    trackStopped,
    true,
    "Microphone test track must be released immediately after permission check"
  );

  // 4. Voice Input Transcription (STT)
  const sttResult = controller.transcribeOrFallback({
    spokenTranscript:
      "Plan my Operating Systems paging revision and check my internship deadlines",
    simulatedConfidence: 0.96,
  });
  assert.equal(sttResult.usedTextFallback, false);
  assert.equal(sttResult.confidence, 0.96);
  assert.match(sttResult.transcript, /Operating Systems paging revision/);

  // 5. Voice Response Playback (TTS), Stop Playback & Interrupt Response
  const playingStatus = controller.speakResponse(
    "### Executive Summary\n**Priority 1:** Complete `CS302` Paging Lab."
  );
  assert.equal(playingStatus.isPlaying, true);
  assert.equal(
    playingStatus.activeText.includes("###"),
    false,
    "Markdown symbols must be sanitized before TTS playback"
  );

  const stoppedStatus = controller.stopPlayback();
  assert.equal(stoppedStatus.isPlaying, false);

  // Resume playback and test Interrupt Response
  controller.speakResponse("Continuing explanation of virtual memory...");
  assert.equal(controller.getPlaybackStatus().isPlaying, true);
  const interruptedStatus = controller.interruptResponse();
  assert.equal(interruptedStatus.isPlaying, false);
  assert.equal(interruptedStatus.wasInterrupted, true);
});

test("Phase 9.5 — Independent Text Fallback & Text-Only CEO Workflow Verification", async () => {
  dbStore.resetStateForTesting();
  const controller = new VoiceInteractionController();

  // Simulate denied microphone permission -> must fall back cleanly to text
  const micDenied = await controller.checkOrRequestMicrophone({
    getUserMedia: async () => {
      const err = new Error("Permission denied by user");
      err.name = "NotAllowedError";
      throw err;
    },
  });
  assert.equal(micDenied.state, "denied");

  const fallbackResult = controller.transcribeOrFallback({
    fallbackText:
      "Analyse my CS302 syllabus and create a study plan using my saved memories",
  });
  assert.equal(fallbackResult.usedTextFallback, true);
  assert.equal(fallbackResult.provider, "text_fallback");

  // Verify the text prompt executes through the CEO intent & pgvector memory retrieval pipeline independently of voice
  const plan = classifyIntentAndPlan(fallbackResult.transcript, USER_A);
  assert.equal(plan.requiresSpecialistAgents, true);
  assert.ok(plan.selectedAgents.includes("academic"));
  assert.ok(plan.selectedAgents.includes("study"));
  assert.ok(
    plan.contextReadSummary.some((line) => line.includes("pgvector Memory")),
    "CEO context summary must include retrieved pgvector memory count"
  );
});

