import test from "node:test";
import assert from "node:assert/strict";
import { ApprovalService } from "../../src/services/approvals/index.ts";
import { executeGatedAgentAction } from "../../src/orchestration/executor.ts";
import { generateEmbedding768, cosineSimilarity } from "../../src/services/memory/index.ts";
import { dbStore } from "../../src/lib/db/store.ts";

test("Integration Test: Approval Service Idempotency & Duplicate Prevention", () => {
  const userId = `int-user-${Date.now()}`;
  const payload = { recipient: "recruiter@apple.com", subject: "Internship" };

  const a1 = ApprovalService.createApproval({
    userId,
    agentSlug: "communication",
    actionType: "send_email",
    title: "Email Recruiter",
    description: "Inquire about internship",
    payload,
  });

  const a2 = ApprovalService.createApproval({
    userId,
    agentSlug: "communication",
    actionType: "send_email",
    title: "Email Recruiter (Duplicate)",
    description: "Inquire about internship",
    payload,
  });

  assert.equal(a2.isDuplicate, true);
  assert.equal(a1.approval.id, a2.approval.id);
});

test("Integration Test: Execution Gate Enforces Approval and Blocks Direct Bypass", () => {
  const userId = `int-bypass-${Date.now()}`;

  const unapproved = executeGatedAgentAction({
    agentSlug: "communication",
    actionType: "send_email",
    payload: { recipient: "advisor@college.edu", subject: "Research" },
    userId,
  });

  assert.equal(unapproved.success, false);
  assert.equal(unapproved.status, "approval_required");
});

test("Integration Test: 768-Dimension Semantic Memory Embeddings & Cosine Search", () => {
  const vec1 = generateEmbedding768("Algorithms and Distributed Systems");
  const vec2 = generateEmbedding768("Algorithms and Distributed Systems");
  const vec3 = generateEmbedding768("Mindfulness and Meditation");

  assert.equal(vec1.length, 768);
  const simIdentical = cosineSimilarity(vec1, vec2);
  const simDifferent = cosineSimilarity(vec1, vec3);

  assert.ok(simIdentical > 0.99);
  assert.ok(simIdentical > simDifferent);
});

