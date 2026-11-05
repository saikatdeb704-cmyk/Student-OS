import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dbStore } from "../src/lib/db/store.ts";

const ROOT = process.cwd();

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

test("1. Security: Service-role credentials are never exposed in frontend/client code", () => {
  const clientFiles = [
    "src/lib/supabase/client.ts",
    "src/app/page.tsx",
    "src/app/login/page.tsx",
    "src/app/register/page.tsx",
    "src/app/forgot-password/page.tsx",
    "src/app/reset-password/page.tsx",
    "src/app/onboarding/page.tsx",
  ];

  for (const file of clientFiles) {
    const content = readFile(file);
    assert.equal(
      content.includes("SUPABASE_SERVICE_ROLE_KEY"),
      false,
      `${file} must never reference SUPABASE_SERVICE_ROLE_KEY`
    );
    assert.equal(
      content.includes("createSupabaseServiceRoleClient"),
      false,
      `${file} must never import createSupabaseServiceRoleClient`
    );
  }

  const serverFile = readFile("src/lib/supabase/server.ts");
  assert.equal(
    serverFile.includes('if (typeof window !== "undefined")'),
    true,
    "Server service-role helper must guard against browser execution"
  );
});

test("2. Database Migrations & RLS: All 11 onboarding fields and RLS policies exist", () => {
  const mig1 = readFile("supabase/migrations/0001_initial_schema.sql");
  const mig3 = readFile("supabase/migrations/0003_phase1_auth_onboarding.sql");
  const combined = mig1 + "\n" + mig3;

  const requiredColumns = [
    "full_name",
    "country",
    "institution",
    "degree",
    "department",
    "academic_year",
    "semester",
    "career_interests",
    "learning_goals",
    "preferred_language",
    "timezone",
    "onboarding_completed",
  ];

  for (const col of requiredColumns) {
    assert.equal(
      combined.includes(col),
      true,
      `Database schema must include onboarding column: ${col}`
    );
  }

  assert.equal(
    mig3.includes("enable row level security"),
    true,
    "Migration 0003 must enable Row Level Security"
  );
  assert.equal(
    mig3.includes("auth.uid() = id"),
    true,
    "Migration 0003 must enforce auth.uid() = id on profiles"
  );
  assert.equal(
    mig3.includes("handle_new_auth_user"),
    true,
    "Migration 0003 must define auth.users -> public.profiles trigger"
  );
});

test("3. Protected Route Middleware: Redirects unauthenticated to /login and non-onboarded to /onboarding", () => {
  const middlewareSrc = readFile("src/lib/supabase/middleware.ts");
  assert.equal(
    middlewareSrc.includes('loginUrl.pathname = "/login"'),
    true,
    "Middleware must redirect unauthenticated users to /login"
  );
  assert.equal(
    middlewareSrc.includes('onboardingUrl.pathname = "/onboarding"'),
    true,
    "Middleware must redirect un-onboarded users to /onboarding"
  );
});

test("4. Behavioral Verification: Registration, Login, 11-Field Onboarding, and Password Recovery", () => {
  // Step A: Register a new student
  const regResult = dbStore.registerUser({
    fullName: "Priya Nair",
    email: "priya.nair@nitk.edu.in",
    password: "SecurePass123",
  });

  assert.ok(regResult.account, "Registration should return a created account");
  assert.equal(
    regResult.account.profile.onboardingCompleted,
    false,
    "Newly registered student must have onboardingCompleted = false"
  );

  // Duplicate registration must be rejected
  const dupResult = dbStore.registerUser({
    fullName: "Priya Nair",
    email: "priya.nair@nitk.edu.in",
    password: "SecurePass123",
  });
  assert.ok(dupResult.error, "Duplicate email registration must return an error");

  // Step B: Complete Onboarding with all 11 required Phase 1 fields
  const updatedProfile = dbStore.updateProfile(
    {
      fullName: "Priya Nair",
      country: "India",
      institution: "National Institute of Technology Karnataka (NITK)",
      degree: "B.Tech",
      department: "Information Technology",
      academicYear: "2nd Year (2026-2027)",
      semester: 3,
      careerInterests: ["AI Systems Engineering", "Data Science & Machine Learning"],
      learningGoals: "Master Operating Systems, DBMS, and publish 1 ML project.",
      preferredLanguage: "English",
      timezone: "Asia/Kolkata",
      persona: "ambitious_builder",
      dailyStudyHours: 4,
    },
    regResult.account.id
  );

  assert.equal(updatedProfile.onboardingCompleted, true);
  assert.equal(updatedProfile.fullName, "Priya Nair");
  assert.equal(updatedProfile.country, "India");
  assert.equal(
    updatedProfile.institution,
    "National Institute of Technology Karnataka (NITK)"
  );
  assert.equal(updatedProfile.degree, "B.Tech");
  assert.equal(updatedProfile.department, "Information Technology");
  assert.equal(updatedProfile.academicYear, "2nd Year (2026-2027)");
  assert.equal(updatedProfile.semester, 3);
  assert.deepEqual(updatedProfile.careerInterests, [
    "AI Systems Engineering",
    "Data Science & Machine Learning",
  ]);
  assert.equal(
    updatedProfile.learningGoals,
    "Master Operating Systems, DBMS, and publish 1 ML project."
  );
  assert.equal(updatedProfile.preferredLanguage, "English");
  assert.equal(updatedProfile.timezone, "Asia/Kolkata");

  // Step C: Verify Login with wrong password fails & valid password succeeds
  const badLogin = dbStore.authenticateUser({
    email: "priya.nair@nitk.edu.in",
    password: "WrongPassword999",
  });
  assert.ok(badLogin.error, "Wrong password must fail login");

  const goodLogin = dbStore.authenticateUser({
    email: "priya.nair@nitk.edu.in",
    password: "SecurePass123",
  });
  assert.ok(goodLogin.account, "Valid password must succeed");
  assert.equal(goodLogin.account.profile.onboardingCompleted, true);

  // Step D: Verify Password Recovery & Reset flow
  const recovery = dbStore.createPasswordRecoveryToken("priya.nair@nitk.edu.in");
  assert.ok(recovery.token, "Recovery token must be generated");

  const badReset = dbStore.resetPasswordWithToken({
    email: "priya.nair@nitk.edu.in",
    token: "invalid-token",
    newPassword: "NewPassword456",
  });
  assert.equal(badReset.success, false, "Invalid recovery token must be rejected");

  const validReset = dbStore.resetPasswordWithToken({
    email: "priya.nair@nitk.edu.in",
    token: recovery.token,
    newPassword: "NewPassword456",
  });
  assert.equal(validReset.success, true, "Valid recovery token must reset password");

  // Step E: Login with the newly reset password
  const postResetLogin = dbStore.authenticateUser({
    email: "priya.nair@nitk.edu.in",
    password: "NewPassword456",
  });
  assert.ok(postResetLogin.account, "Login with new password must succeed");
});
