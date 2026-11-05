import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  detectPlatform,
  isSafeToCacheUrl,
  isStandaloneMode,
  isServiceWorkerSupported,
  isPushNotificationSupported,
  setDeferredInstallPrompt,
  canPromptPwaInstall,
  promptPwaInstall,
  requestNotificationPermission,
  triggerPwaNotification,
  applyPwaUpdate,
  subscribeToPwaEvents,
} from "../src/lib/pwa/pwa-manager.ts";

test("Phase 10.1 — Web App Manifest & App Icons Validation", async (t) => {
  // 1. Read manifest.json
  const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "public/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.name, "Student OS — AI-Powered Student Operating System");
  assert.equal(manifest.short_name, "Student OS");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#F8FAFC");
  assert.equal(manifest.theme_color, "#2563EB");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.ok(Array.isArray(manifest.categories), "manifest.categories must be array");
  assert.ok(manifest.categories.includes("education"), "education category included");

  // 2. Validate icons
  assert.ok(Array.isArray(manifest.icons), "manifest.icons must be array");
  assert.ok(manifest.icons.length >= 4, "Must have at least 4 icon configurations");

  const icon192 = manifest.icons.find((i) => i.sizes === "192x192" && i.purpose === "any");
  const icon512 = manifest.icons.find((i) => i.sizes === "512x512" && i.purpose === "any");
  const maskable192 = manifest.icons.find((i) => i.sizes === "192x192" && i.purpose === "maskable");
  const maskable512 = manifest.icons.find((i) => i.sizes === "512x512" && i.purpose === "maskable");

  assert.ok(icon192, "192x192 icon exists in manifest");
  assert.ok(icon512, "512x512 icon exists in manifest");
  assert.ok(maskable192, "maskable 192 icon exists in manifest");
  assert.ok(maskable512, "maskable 512 icon exists in manifest");

  // Verify real icon files on disk
  const iconFiles = [
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/icon-maskable-192.png",
    "public/icons/icon-maskable-512.png",
    "public/icons/apple-touch-icon.png",
    "public/icons/icon.svg",
    "public/favicon.ico",
  ];

  for (const relPath of iconFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist on disk`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 0, `${relPath} must not be empty`);

    if (relPath.endsWith(".png")) {
      const buf = fs.readFileSync(fullPath);
      // Verify PNG magic header: \x89PNG\r\n\x1a\n
      assert.equal(buf[0], 0x89, "PNG signature byte 0");
      assert.equal(buf[1], 0x50, "PNG signature byte 1 (P)");
      assert.equal(buf[2], 0x4e, "PNG signature byte 2 (N)");
      assert.equal(buf[3], 0x47, "PNG signature byte 3 (G)");
    }
  }

  // 3. Validate Shortcuts
  assert.ok(Array.isArray(manifest.shortcuts), "Shortcuts must be present");
  const shortcutUrls = manifest.shortcuts.map((s) => s.url);
  assert.ok(shortcutUrls.includes("/?tab=ceo"), "AI CEO shortcut exists");
  assert.ok(shortcutUrls.includes("/?tab=academic"), "Academic shortcut exists");
});

test("Phase 10.2 — Safe Caching Policy & Service Worker Security Isolation", async (t) => {
  // CRITICAL REQUIREMENT:
  // "Never cache private authenticated API responses or sensitive student documents in shared caches."

  // 1. Private API routes MUST NEVER be cached
  assert.equal(isSafeToCacheUrl("/api/ceo/chat"), false, "Must block /api/ceo/chat");
  assert.equal(isSafeToCacheUrl("/api/memory"), false, "Must block /api/memory");
  assert.equal(isSafeToCacheUrl("/api/memory/rec-123"), false, "Must block /api/memory/:id");
  assert.equal(isSafeToCacheUrl("/api/profile"), false, "Must block /api/profile");
  assert.equal(isSafeToCacheUrl("/api/tasks"), false, "Must block /api/tasks");
  assert.equal(isSafeToCacheUrl("/api/academic"), false, "Must block /api/academic");

  // 2. Auth routes MUST NEVER be cached
  assert.equal(isSafeToCacheUrl("/auth/callback"), false, "Must block /auth/callback");
  assert.equal(isSafeToCacheUrl("/login"), false, "Must block /login");
  assert.equal(isSafeToCacheUrl("/register"), false, "Must block /register");
  assert.equal(isSafeToCacheUrl("/onboarding"), false, "Must block /onboarding");

  // 3. Sensitive documents & student approvals MUST NEVER be cached
  assert.equal(isSafeToCacheUrl("/user/documents/transcript.pdf"), false, "Must block sensitive documents");
  assert.equal(isSafeToCacheUrl("/approvals/appr-999"), false, "Must block approvals");

  // 4. Requests with Authorization header MUST NEVER be cached
  assert.equal(
    isSafeToCacheUrl("/some-data", { authorization: "Bearer secret-token" }),
    false,
    "Must block any request carrying authorization header"
  );

  // 5. Public static shell assets ARE allowed
  assert.equal(isSafeToCacheUrl("/"), true, "Root shell allowed");
  assert.equal(isSafeToCacheUrl("/offline"), true, "Offline page allowed");
  assert.equal(isSafeToCacheUrl("/offline.html"), true, "Offline HTML fallback allowed");
  assert.equal(isSafeToCacheUrl("/manifest.json"), true, "Manifest allowed");
  assert.equal(isSafeToCacheUrl("/icons/icon-192.png"), true, "Public icon allowed");
  assert.equal(isSafeToCacheUrl("/_next/static/chunks/app.js"), true, "Next static chunk allowed");

  // 6. Verify Service Worker script content
  const swPath = path.resolve(process.cwd(), "public/sw.js");
  assert.ok(fs.existsSync(swPath), "public/sw.js must exist");
  const swContent = fs.readFileSync(swPath, "utf8");

  assert.ok(swContent.includes("isPrivateApi"), "SW checks for private API");
  assert.ok(swContent.includes("isAuthRoute"), "SW checks for auth routes");
  assert.ok(swContent.includes("isSensitiveDocument"), "SW checks for sensitive documents");
  assert.ok(swContent.includes("SKIP_WAITING"), "SW handles SKIP_WAITING");
  assert.ok(swContent.includes("clients.claim()"), "SW claims clients on activate");
  assert.ok(swContent.includes("caches.delete"), "SW purges old cache generations");
  assert.ok(swContent.includes("showNotification"), "SW handles push notifications");
});

test("Phase 10.3 — Installable PWA Simulation (Desktop & Android)", async (t) => {
  // Test Deferred Prompt handling for Chrome, Edge, and Android PWA installation
  let promptCalled = false;
  let userChoiceResolved = false;

  const mockDeferredPrompt = {
    platforms: ["web", "android"],
    userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    async prompt() {
      promptCalled = true;
      userChoiceResolved = true;
    },
  };

  // Initially not installable
  setDeferredInstallPrompt(null);
  assert.equal(canPromptPwaInstall(), false, "Prompt cannot run when no deferred event");

  // 'beforeinstallprompt' fires
  setDeferredInstallPrompt(mockDeferredPrompt);
  assert.equal(canPromptPwaInstall(), true, "Prompt is ready after beforeinstallprompt");

  // User clicks Install App
  const outcome = await promptPwaInstall();
  assert.equal(promptCalled, true, "prompt() was called on native event");
  assert.equal(outcome, "accepted", "Outcome recorded as accepted");
  assert.equal(canPromptPwaInstall(), false, "Deferred prompt consumed and cleared");
});

test("Phase 10.4 — Offline Application Shell & Network Status Verification", async (t) => {
  // 1. Verify offline Next.js page exists
  const offlinePagePath = path.resolve(process.cwd(), "src/app/offline/page.tsx");
  assert.ok(fs.existsSync(offlinePagePath), "src/app/offline/page.tsx must exist");
  const offlineContent = fs.readFileSync(offlinePagePath, "utf8");
  assert.ok(offlineContent.includes("Offline Mode"), "Mentions offline mode");
  assert.ok(offlineContent.includes("Reconnect & Retry"), "Has reconnect retry button");
  assert.ok(offlineContent.includes("Offline Revision Checklist"), "Has offline study checklist");

  // 2. Verify static offline.html fallback exists
  const offlineHtmlPath = path.resolve(process.cwd(), "public/offline.html");
  assert.ok(fs.existsSync(offlineHtmlPath), "public/offline.html must exist");
  const htmlContent = fs.readFileSync(offlineHtmlPath, "utf8");
  assert.ok(htmlContent.includes("You are currently offline"), "Mentions offline status in static fallback");
  assert.ok(htmlContent.includes("Offline Shell Active"), "Indicates offline shell active");

  // 3. Verify mobile bottom nav component
  const navPath = path.resolve(process.cwd(), "src/components/navigation/mobile-bottom-nav.tsx");
  assert.ok(fs.existsSync(navPath), "Mobile bottom nav component must exist");
  const navContent = fs.readFileSync(navPath, "utf8");
  assert.ok(navContent.includes("Dashboard"), "Has Dashboard navigation");
  assert.ok(navContent.includes("AI CEO"), "Has AI CEO primary action");
  assert.ok(navContent.includes("Academic"), "Has Academic navigation");
  assert.ok(navContent.includes("Career"), "Has Career navigation");
});

test("Phase 10.5 — Push Notification Support, Updates & Progressive Enhancement", async (t) => {
  // 1. Graceful fallback when running in non-browser or unsupported environment
  const platform = detectPlatform();
  assert.ok(["desktop", "android", "ios", "other"].includes(platform), "Valid platform detected");

  const isStandalone = isStandaloneMode();
  assert.equal(typeof isStandalone, "boolean", "Standalone mode returns boolean");

  const swSupported = isServiceWorkerSupported();
  assert.equal(typeof swSupported, "boolean", "Service worker check returns boolean");

  const pushSupported = isPushNotificationSupported();
  assert.equal(typeof pushSupported, "boolean", "Push support check returns boolean");

  // 2. Requesting permission in node/unsupported environment returns 'unsupported' gracefully
  const perm = await requestNotificationPermission();
  assert.equal(perm, "unsupported", "Node environment safely returns 'unsupported' without throwing");

  // 3. Notification dispatch in unsupported environment returns false gracefully
  const notifResult = await triggerPwaNotification({
    title: "Test",
    body: "Test body",
  });
  assert.equal(notifResult, false, "Safely returns false without error");

  // 4. Update event subscriber management
  let updateFired = false;
  const unsubscribe = subscribeToPwaEvents({
    onUpdate: (hasUpdate) => {
      updateFired = hasUpdate;
    },
  });

  assert.equal(typeof unsubscribe, "function", "Returns unsubscribe function");
  unsubscribe();
});

