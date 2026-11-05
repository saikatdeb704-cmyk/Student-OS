import test from "node:test";
import assert from "node:assert/strict";
import { executeCEOOrchestration } from "../../src/orchestration/executor.ts";
import { dbStore } from "../../src/lib/db/store.ts";

test("E2E Scenario: Flagship Multi-Agent Semester & Career Roadmap Orchestration", async () => {
  const userId = `e2e-student-${Date.now()}`;
  dbStore.createProfile({
    id: userId,
    email: "e2e.student@college.edu",
    fullName: "Priya Patel",
    country: "India",
    institution: "IIT Bombay",
    degree: "B.Tech Computer Science",
    department: "Computer Science",
    academicYear: "3rd Year",
    semester: 6,
    careerInterests: ["AI Systems", "Cloud Infrastructure"],
    learningGoals: "Master Distributed Systems and secure an AI systems internship",
    preferredLanguage: "English",
    timezone: "Asia/Kolkata",
    onboardingCompleted: true,
  });

  const prompt = "I need a complete roadmap for semester exams and an AI career strategy.";

  const result = await executeCEOOrchestration({
    userId,
    message: prompt,
    conversationId: `conv-e2e-${Date.now()}`,
  });

  assert.ok(result.runId);
  assert.ok(result.plan.selectedAgents.length >= 4);
  assert.ok(result.consolidatedText.length > 100);
  assert.ok(
    result.status === "completed" ||
      result.status === "waiting_for_approval" ||
      result.status === "partial_failure"
  );
});
