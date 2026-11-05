/**
 * Student OS Progressive Web App (PWA) Manager
 *
 * Implements:
 * 1. Service worker lifecycle registration & updates
 * 2. BeforeInstallPrompt handling & deferred prompt management (Desktop & Android)
 * 3. Network status detection (online/offline)
 * 4. Safe caching validation (enforcing zero private API / document caching in shared caches)
 * 5. Push notification subscription & test trigger
 * 6. Graceful progressive enhancement fallback
 */

export type PwaInstallOutcome = "accepted" | "dismissed" | "unsupported";
export type PlatformType = "android" | "ios" | "desktop" | "other";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  platform: PlatformType;
  notificationPermission: NotificationPermission | "unsupported";
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let activeRegistration: ServiceWorkerRegistration | null = null;
const updateListeners = new Set<(hasUpdate: boolean) => void>();
const installListeners = new Set<(isInstallable: boolean) => void>();

/**
 * Detect client platform (Android, iOS, Desktop)
 */
export function detectPlatform(): PlatformType {
  if (typeof window === "undefined" || !navigator.userAgent) {
    return "other";
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/windows|macintosh|linux/.test(ua)) return "desktop";
  return "other";
}

/**
 * Check if running in standalone PWA display mode
 */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    // iOS Safari standalone check
    Boolean((navigator as unknown as { standalone?: boolean }).standalone)
  );
}

/**
 * Check if Service Workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Check if Push Notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Strict Security Policy:
 * Ensures private authenticated API responses, auth routes, and sensitive documents
 * are NEVER stored in shared service worker caches.
 */
export function isSafeToCacheUrl(rawUrl: string, headers?: HeadersInit): boolean {
  try {
    const url = new URL(rawUrl, "https://student-os.local");
    const path = url.pathname.toLowerCase();

    // 1. Private API endpoints
    if (path.startsWith("/api/")) return false;

    // 2. Authentication & onboarding routes
    if (
      path.startsWith("/auth/") ||
      path === "/login" ||
      path === "/register" ||
      path === "/forgot-password" ||
      path === "/reset-password" ||
      path === "/onboarding"
    ) {
      return false;
    }

    // 3. Sensitive student documents, memory, or voice records
    if (
      path.includes("/documents/") ||
      path.includes("/memory/") ||
      path.includes("/voice/") ||
      path.includes("/approvals/")
    ) {
      return false;
    }

    // 4. Requests carrying authorization headers
    if (headers) {
      if (headers instanceof Headers) {
        if (headers.has("authorization")) return false;
      } else if (Array.isArray(headers)) {
        if (headers.some(([k]) => k.toLowerCase() === "authorization")) {
          return false;
        }
      } else if (typeof headers === "object") {
        if ("authorization" in headers || "Authorization" in headers) {
          return false;
        }
      }
    }

    // 5. Allowed static shell and public assets
    return (
      path === "/" ||
      path === "/offline" ||
      path === "/offline.html" ||
      path === "/manifest.json" ||
      path === "/favicon.ico" ||
      path.startsWith("/icons/") ||
      path.startsWith("/_next/static/")
    );
  } catch {
    return false;
  }
}

/**
 * Initialize and register service worker safely with update checking
 */
export async function registerPwaServiceWorker(options?: {
  swUrl?: string;
  onUpdateAvailable?: () => void;
  onInstalled?: () => void;
}): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  const swUrl = options?.swUrl || "/sw.js";

  try {
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: "/",
    });
    activeRegistration = registration;

    // Check if an updated worker is already waiting
    if (registration.waiting) {
      options?.onUpdateAvailable?.();
      updateListeners.forEach((fn) => fn(true));
    }

    // Listen for new worker installation
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // New version ready to activate!
            options?.onUpdateAvailable?.();
            updateListeners.forEach((fn) => fn(true));
          } else {
            // First install
            options?.onInstalled?.();
          }
        }
      });
    });

    // Handle controller change (reloaded after skipWaiting)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] Service worker controller updated");
    });

    return registration;
  } catch (error) {
    console.warn("[PWA] Service worker registration bypassed or failed:", error);
    return null;
  }
}

/**
 * Prompt user to install Student OS PWA (Desktop & Android)
 */
export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  if (!deferredPrompt) {
    return "unsupported";
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
    return choice.outcome;
  } catch (err) {
    console.warn("[PWA] Install prompt failed:", err);
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
    return "dismissed";
  }
}

/**
 * Store deferred install prompt (called on window 'beforeinstallprompt')
 */
export function setDeferredInstallPrompt(
  e: BeforeInstallPromptEvent | null
): void {
  deferredPrompt = e;
  const isInstallable = Boolean(e);
  installListeners.forEach((fn) => fn(isInstallable));
}

/**
 * Check if PWA install prompt is currently deferred and ready
 */
export function canPromptPwaInstall(): boolean {
  return Boolean(deferredPrompt);
}

/**
 * Trigger skipWaiting on waiting service worker and reload
 */
export function applyPwaUpdate(): void {
  if (!activeRegistration?.waiting) {
    // If no waiting worker, reload to fetch latest assets
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return;
  }

  // Instruct waiting worker to take over
  activeRegistration.waiting.postMessage({ type: "SKIP_WAITING" });

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      window.location.reload();
    },
    { once: true }
  );
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "unsupported";
  }
}

/**
 * Trigger local test notification using active service worker registration or window.Notification
 */
export async function triggerPwaNotification(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    const res = await requestNotificationPermission();
    if (res !== "granted") return false;
  }

  try {
    if (activeRegistration && "showNotification" in activeRegistration) {
      await activeRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.tag || "student-os-test",
        data: { url: payload.url || "/" },
      });
      return true;
    } else {
      new Notification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
      });
      return true;
    }
  } catch (err) {
    console.warn("[PWA] Notification display failed:", err);
    return false;
  }
}

/**
 * Subscribe to update & install listener callbacks
 */
export function subscribeToPwaEvents(callbacks: {
  onUpdate?: (hasUpdate: boolean) => void;
  onInstallable?: (isInstallable: boolean) => void;
}): () => void {
  if (callbacks.onUpdate) updateListeners.add(callbacks.onUpdate);
  if (callbacks.onInstallable) installListeners.add(callbacks.onInstallable);

  return () => {
    if (callbacks.onUpdate) updateListeners.delete(callbacks.onUpdate);
    if (callbacks.onInstallable)
      installListeners.delete(callbacks.onInstallable);
  };
}

