import test from "node:test";
import assert from "node:assert/strict";

import { dbStore } from "../src/lib/db/store.ts";
import { resetAIUsageMetricsForTesting } from "../src/lib/ai/provider.ts";
import { resetAgentRegistryForTesting } from "../src/lib/agents/registry.ts";
import {
  MAX_DELEGATION_DEPTH,
  cancelOrchestrationRun,
  executeCEOOrchestration,
  validateAgentToolPermissions,
  validateAndOrderPlanDAG,
} from "../src/lib/agents/orchestrator.ts";

test("Phase 5.1 — Flagship Scenario: Student requests a complete semester and AI career roadmap (6 Agents Coordinated)", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();
  resetAgentRegistryForTesting();

  const userId = "student-demo-001";
  const convo = dbStore.createConversation(
    "Semester & AI Career Master Plan",
    userId
  );

  const result = await executeCEOOrchestration(
    "Build my complete semester and AI career roadmap with study schedule, skill gaps, portfolio project milestones, and daily task priorities",
    convo.id,
    undefined,
    userId
  );

  assert.equal(result.status, "completed");
  assert.equal(result.plan.requiresSpecialistAgents, true);

  // Must coordinate Academic, Study, Career, Skill, Project, and Productivity agents
  const expectedAgents = [
    "academic",
    "study",
    "career",
    "skill",
    "project",
    "productivity",
  ];
  assert.deepEqual(result.plan.selectedAgents, expectedAgents);
  assert.equal(result.plan.steps.length, 6);

  // Verify every agent execution was recorded in agentResults and dbStore.getAgentTasks
  for (const slug of expectedAgents) {
    assert.ok(
      result.agentResults[slug],
      `Expected execution result for agent '${slug}'`
    );
    assert.equal(result.agentResults[slug].status, "completed");
  }

  const storedRuns = dbStore.getRuns(userId);
  assert.equal(storedRuns[0].id, result.runId);
  assert.equal(storedRuns[0].selectedAgents.length, 6);

  const storedTasks = dbStore
    .getAgentTasks(userId)
    .filter((t) => t.runId === result.runId);
  assert.equal(
    storedTasks.length,
    6,
    "Every single agent execution must be persisted in agent_tasks"
  );

  // Verify structured inter-agent communication messages (delegation, context_handoff, result_report, conflict_resolution)
  const storedBusMessages = dbStore.getAgentMessages(result.runId, userId);
  assert.ok(
    storedBusMessages.length >= 12,
    "Expected structured delegation, handoff, and report messages on the agent bus"
  );
  const msgTypes = new Set(storedBusMessages.map((m) => m.message_type));
  assert.ok(msgTypes.has("delegation"));
  assert.ok(msgTypes.has("context_handoff"));
  assert.ok(msgTypes.has("result_report"));
  assert.ok(msgTypes.has("conflict_resolution"));

  // Verify conflict resolution ran and consolidated response includes all 6 agents
  assert.ok(result.conflictsResolved.length >= 1);
  assert.ok(result.consolidatedText.includes("Academic Agent"));
  assert.ok(result.consolidatedText.includes("Study Agent"));
  assert.ok(result.consolidatedText.includes("Career Agent"));
  assert.ok(result.consolidatedText.includes("Skill Agent"));
  assert.ok(result.consolidatedText.includes("Project Agent"));
  assert.ok(result.consolidatedText.includes("Productivity Agent"));
});

test("Phase 5.2 — Bounded retries recovery & partial failure handling", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();

  const userId = "student-demo-001";
  let studyAttempts = 0;

  // 1. Test transient failure on Study Agent (fails attempt 1, succeeds attempt 2)
  //    and permanent failure on Skill Agent (fails all attempts)
  const result = await executeCEOOrchestration(
    "Create my complete semester and AI career roadmap",
    "conv-default",
    undefined,
    {
      userId,
      maxRetriesOverride: 1,
      agentExecutionOverrides: {
        study: async (attempt) => {
          studyAttempts = attempt;
          if (attempt === 1) {
            throw new Error("Transient calendar service glitch");
          }
          return {
            status: "completed",
            summary: "Recovered study schedule on retry attempt #2",
            findings: ["Allocated 3.5h/day across CS301 and CS302."],
            recommendations: ["Follow 50/10 Pomodoro blocks."],
            proposedActions: [],
            sources: [{ title: "Study Planner" }],
            requiresApproval: false,
            confidence: 0.91,
          };
        },
        skill: async () => {
          throw new Error("Skill taxonomy service unavailable");
        },
      },
    }
  );

  assert.equal(studyAttempts, 2, "Study Agent should succeed on retry attempt 2");
  assert.equal(result.agentResults.study.status, "completed");
  assert.equal(result.agentResults.skill.status, "failed");
  assert.equal(
    result.status,
    "partial_failure",
    "Run with both succeeded and failed agents must be marked partial_failure"
  );
  assert.ok(
    result.consolidatedText.includes("Agent Status (`FAILED`)"),
    "Consolidated response must honestly disclose the failed agent without claiming success"
  );
});

test("Phase 5.3 — Execution timeouts & task cancellation", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();

  const userId = "student-demo-001";

  // 1. Test execution timeout enforcement
  const timeoutRun = await executeCEOOrchestration(
    "Analyse my CS301 syllabus",
    "conv-default",
    undefined,
    {
      userId,
      timeoutMsOverride: 25,
      maxRetriesOverride: 0,
      agentExecutionOverrides: {
        academic: async () => {
          await new Promise((resolve) => setTimeout(resolve, 120));
          return {
            status: "completed",
            summary: "Should have timed out",
            findings: [],
            recommendations: [],
            proposedActions: [],
            sources: [],
            requiresApproval: false,
            confidence: 0.9,
          };
        },
      },
    }
  );

  assert.equal(timeoutRun.status, "failed");
  assert.equal(timeoutRun.agentResults.academic.status, "failed");
  assert.ok(
    timeoutRun.agentResults.academic.summary.includes("Execution timeout"),
    "Timed-out agent must report execution timeout"
  );

  // 2. Test task cancellation via AbortController & cancelOrchestrationRun
  const abortController = new AbortController();
  abortController.abort();

  const cancelledRun = await executeCEOOrchestration(
    "Create my complete semester and AI career roadmap",
    "conv-default",
    undefined,
    {
      userId,
      signal: abortController.signal,
    }
  );
  assert.equal(cancelledRun.status, "cancelled");

  // Also test explicit run cancellation helper
  const manualCancel = cancelOrchestrationRun(timeoutRun.runId, userId);
  assert.equal(manualCancel, true);
  const updatedRun = dbStore
    .getRuns(userId)
    .find((r) => r.id === timeoutRun.runId);
  assert.equal(updatedRun?.status, "cancelled");
});

test("Phase 5.4 — Permission denial, maximum delegation depth & infinite loop prevention", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();

  const userId = "student-demo-001";

  // 1. Verify agents cannot grant themselves unauthorized tool permissions
  const permCheck = validateAgentToolPermissions("academic", [
    "academic_db",
    "unauthorized_root_shell",
  ]);
  assert.equal(permCheck.allowed, false);
  assert.deepEqual(permCheck.unauthorizedTools, ["unauthorized_root_shell"]);

  const permDeniedRun = await executeCEOOrchestration(
    "Analyse my CS301 syllabus",
    "conv-default",
    undefined,
    {
      userId,
      requestedToolsByAgent: {
        academic: ["academic_db", "self_granted_admin_tool"],
      },
    }
  );

  assert.equal(permDeniedRun.status, "failed");
  assert.equal(permDeniedRun.agentResults.academic.status, "failed");
  assert.ok(
    permDeniedRun.agentResults.academic.summary.includes("Permission denied")
  );
  assert.ok(
    permDeniedRun.agentMessages.some(
      (m) => m.messageType === "permission_denied"
    ),
    "Permission denial must be recorded on the inter-agent bus"
  );

  // 2. Verify maximum delegation depth enforcement
  const depthValidation = validateAndOrderPlanDAG(
    [
      {
        stepNumber: 1,
        agent: "academic",
        agentName: "Academic Agent",
        objective: "Depth test",
        rationale: "Test",
        executionMode: "specialist_delegation",
        delegationDepth: MAX_DELEGATION_DEPTH + 1,
      },
    ],
    MAX_DELEGATION_DEPTH
  );
  assert.equal(depthValidation.valid, false);
  assert.ok(depthValidation.error?.includes("Delegation depth limit exceeded"));

  // 3. Verify circular dependency / infinite loop detection
  const cycleValidation = validateAndOrderPlanDAG([
    {
      stepNumber: 1,
      agent: "academic",
      agentName: "Academic Agent",
      objective: "Step 1",
      rationale: "Test",
      executionMode: "specialist_delegation",
      dependsOn: [2],
      delegationDepth: 1,
    },
    {
      stepNumber: 2,
      agent: "study",
      agentName: "Study Agent",
      objective: "Step 2",
      rationale: "Test",
      executionMode: "specialist_delegation",
      dependsOn: [1],
      delegationDepth: 2,
    },
  ]);
  assert.equal(cycleValidation.valid, false);
  assert.ok(cycleValidation.error?.includes("Infinite loop / circular dependency"));
});

test("Phase 5.5 — Missing information detection returns needs_input without fake execution", async () => {
  dbStore.resetStateForTesting();
  resetAIUsageMetricsForTesting();

  const userId = "student-demo-001";

  const missingInfoRun = await executeCEOOrchestration(
    "Please grade my submission",
    "conv-default",
    undefined,
    userId
  );

  assert.equal(missingInfoRun.status, "needs_input");
  assert.equal(missingInfoRun.plan.requiresSpecialistAgents, false);
  assert.ok(
    missingInfoRun.plan.missingInformation &&
      missingInfoRun.plan.missingInformation.length > 0
  );
  assert.ok(missingInfoRun.consolidatedText.includes("Clarification Needed"));

  // Verify audit logs captured the orchestration lifecycle
  const auditLogs = dbStore.getAuditLogs(userId);
  assert.ok(auditLogs.length >= 1);
});

