import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ALL_AGENT_CONFIGS } from "../src/lib/agents/configs/index.ts";
import {
  getAllAgents,
  getAgentById,
  getAgentBySlug,
  getAgentsByDepartment,
  resetAgentRegistryForTesting,
  setAgentEnabledStatus,
  validateAgentConfig,
} from "../src/lib/agents/registry.ts";

const ROOT = process.cwd();

const EXPECTED_16_SLUGS = [
  "ceo",
  "academic",
  "study",
  "tutor",
  "exam",
  "career",
  "skill",
  "project",
  "opportunity",
  "research",
  "productivity",
  "notes",
  "communication",
  "performance",
  "finance",
  "wellbeing",
];

test("Phase 4.1 — All 16 agents have dedicated configuration files and are registered in the central registry", () => {
  resetAgentRegistryForTesting();

  // Verify individual configuration files exist in src/lib/agents/configs/
  for (const slug of EXPECTED_16_SLUGS) {
    const filePath = path.join(
      ROOT,
      "src",
      "lib",
      "agents",
      "configs",
      `${slug}.agent.ts`
    );
    assert.ok(
      fs.existsSync(filePath),
      `Individual config file must exist for ${slug}: ${filePath}`
    );
  }

  assert.equal(
    ALL_AGENT_CONFIGS.length,
    16,
    "ALL_AGENT_CONFIGS must contain exactly 16 agent configurations"
  );

  const registeredAgents = getAllAgents();
  assert.equal(
    registeredAgents.length,
    16,
    "Central registry must return all 16 agents"
  );

  const seenIds = new Set();
  const seenSlugs = new Set();

  for (const slug of EXPECTED_16_SLUGS) {
    const agent = getAgentBySlug(slug);
    assert.ok(agent, `Agent with slug '${slug}' must be registered`);
    assert.ok(!seenIds.has(agent.id), `Duplicate agent ID: ${agent.id}`);
    assert.ok(!seenSlugs.has(agent.slug), `Duplicate agent slug: ${agent.slug}`);
    seenIds.add(agent.id);
    seenSlugs.add(agent.slug);

    const byId = getAgentById(agent.id);
    assert.equal(byId?.slug, agent.slug);
  }
});

test("Phase 4.2 — Every agent has all 12 required configuration fields and valid schemas", () => {
  for (const cfg of ALL_AGENT_CONFIGS) {
    const validation = validateAgentConfig(cfg);
    assert.equal(
      validation.valid,
      true,
      `Agent '${cfg.slug}' failed validation: ${validation.errors.join(", ")}`
    );

    // Check all 12 required attributes explicitly
    assert.ok(cfg.id.startsWith("agent-"));
    assert.ok(cfg.name.length >= 2);
    assert.ok(cfg.description.length >= 10);
    assert.ok(
      [
        "executive",
        "academic",
        "career",
        "productivity",
        "support",
        "intelligence",
      ].includes(cfg.department)
    );
    assert.ok(cfg.systemPrompt.length >= 20);
    assert.ok(Array.isArray(cfg.capabilities) && cfg.capabilities.length >= 4);
    assert.ok(Array.isArray(cfg.allowedTools) && cfg.allowedTools.length >= 2);
    assert.equal(typeof cfg.inputSchema.safeParse, "function");
    assert.equal(typeof cfg.outputSchema.safeParse, "function");
    assert.ok(cfg.inputSchemaDescriptor.requiredFields.includes("objective"));
    assert.ok(cfg.outputSchemaDescriptor.requiredFields.includes("summary"));
    assert.match(cfg.version, /^\d+\.\d+\.\d+$/);
    assert.ok(cfg.executionLimits.maxSteps > 0);
    assert.ok(cfg.executionLimits.maxTokensPerRun >= 512);
    assert.ok(cfg.executionLimits.timeoutMs >= 5000);
    assert.equal(typeof cfg.enabled, "boolean");
  }

  // Verify department grouping totals 16
  const totalAcrossDepts =
    getAgentsByDepartment("executive").length +
    getAgentsByDepartment("academic").length +
    getAgentsByDepartment("career").length +
    getAgentsByDepartment("productivity").length +
    getAgentsByDepartment("support").length +
    getAgentsByDepartment("intelligence").length;
  assert.equal(totalAcrossDepts, 16);
});

test("Phase 4.3 — Agent runtime enforces input/output schemas and enabled status", async () => {
  resetAgentRegistryForTesting();

  const academicAgent = getAgentBySlug("academic");
  assert.ok(academicAgent);
  assert.equal(academicAgent.enabled, true);
  assert.equal(academicAgent.status, "idle");

  // 1. Valid execution produces schema-validated output
  const validResult = await academicAgent.execute({
    userId: "student-demo-001",
    runId: "run-test-01",
    taskId: "task-test-01",
    objective: "Analyse CS301 and CS302 syllabus priorities",
    context: { semester: 5 },
    constraints: ["No fabricated deadlines"],
  });
  const outputCheck = academicAgent.outputSchema.safeParse(validResult);
  assert.equal(outputCheck.success, true);
  assert.equal(validResult.status, "completed");

  // 2. Invalid input (empty objective) is rejected cleanly by inputSchema
  const invalidResult = await academicAgent.execute({
    userId: "student-demo-001",
    runId: "run-test-02",
    taskId: "task-test-02",
    objective: "",
    context: {},
    constraints: [],
  });
  assert.equal(invalidResult.status, "failed");

  // 3. Disabling an agent updates status to 'disabled' and blocks execution
  setAgentEnabledStatus("academic", false);
  assert.equal(academicAgent.enabled, false);
  assert.equal(academicAgent.status, "disabled");

  const disabledResult = await academicAgent.execute({
    userId: "student-demo-001",
    runId: "run-test-03",
    taskId: "task-test-03",
    objective: "Analyse syllabus while disabled",
    context: {},
    constraints: [],
  });
  assert.equal(disabledResult.status, "failed");
  assert.ok(disabledResult.summary.includes("disabled"));

  // Re-enable and verify
  setAgentEnabledStatus("academic", true);
  assert.equal(academicAgent.enabled, true);
  assert.equal(academicAgent.status, "idle");

  // Central CEO cannot be disabled
  setAgentEnabledStatus("ceo", false);
  assert.equal(getAgentBySlug("ceo")?.enabled, true);
});

test("Phase 4.4 — Agent Headquarters UI displays all required metadata & execution history", () => {
  const hqPath = path.join(
    ROOT,
    "src",
    "components",
    "agents",
    "agent-headquarters.tsx"
  );
  const content = fs.readFileSync(hqPath, "utf8");

  assert.ok(content.includes("agent.name"), "Displays agent name");
  assert.ok(content.includes("agent.department"), "Displays agent department");
  assert.ok(content.includes("agent.description"), "Displays agent description");
  assert.ok(content.includes("agent.capabilities"), "Displays capabilities");
  assert.ok(content.includes("agent.status"), "Displays agent status");
  assert.ok(content.includes("agent.allowedTools"), "Displays available tools");
  assert.ok(content.includes("agent.version"), "Displays agent version");
  assert.ok(
    content.includes("Recent Agent Execution History"),
    "Displays recent execution history"
  );
});

