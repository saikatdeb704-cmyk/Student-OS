// Student OS Progressive Web App Service Worker
// Version: student-os-cache-v1.0

const CACHE_NAME = "student-os-shell-v1";

const STATIC_SHELL_ASSETS = [
  "/",
  "/offline",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

// 1. INSTALL LIFECYCLE
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_SHELL_ASSETS);
      })
      .then(() => {
        // Do not force skipWaiting immediately during install so active users aren't disrupted
        // unless requested by UI update trigger
      })
      .catch((err) => {
        console.warn("[SW] Pre-caching static assets failed or partial:", err);
      })
  );
});

// 2. ACTIVATE LIFECYCLE: Purge stale cache generations
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Removing outdated cache generation:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. MESSAGE LISTENER: skipWaiting, ping, cache-purge
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received SKIP_WAITING directive from client");
    self.skipWaiting();
  } else if (event.data.type === "GET_VERSION") {
    event.ports?.[0]?.postMessage({
      version: CACHE_NAME,
      timestamp: Date.now(),
    });
  }
});

// 4. FETCH LISTENER: SAFE CACHING STRATEGY
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // A. Only intercept GET requests
  if (request.method !== "GET") {
    return;
  }

  // B. STRICT SECURITY & PRIVACY RULE:
  // Never cache private authenticated API responses, auth routes, or sensitive student documents in shared caches!
  const isPrivateApi = url.pathname.startsWith("/api/");
  const isAuthRoute =
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/onboarding";
  const isSensitiveDocument =
    url.pathname.includes("/documents/") ||
    url.pathname.includes("/memory/") ||
    url.pathname.includes("/voice/");
  const hasAuthHeader = request.headers.has("authorization");

  if (isPrivateApi || isAuthRoute || isSensitiveDocument || hasAuthHeader) {
    // Network-Only: Bypass shared service worker cache completely
    return;
  }

  // C. HTML Navigation Requests (App Shell & Offline Fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If valid response, return it directly
          return networkResponse;
        })
        .catch(async () => {
          // When offline, serve the pre-cached offline application shell
          const cache = await caches.open(CACHE_NAME);
          const cachedOfflinePage = await cache.match("/offline");
          if (cachedOfflinePage) {
            return cachedOfflinePage;
          }
          const cachedOfflineHtml = await cache.match("/offline.html");
          if (cachedOfflineHtml) {
            return cachedOfflineHtml;
          }
          return new Response(
            "<!DOCTYPE html><html><body><h1>Student OS is offline</h1><p>Please check your connection.</p></body></html>",
            {
              headers: { "Content-Type": "text/html" },
              status: 503,
            }
          );
        })
    );
    return;
  }

  // D. Static Assets (Scripts, CSS, Public Icons, Static Next.js Bundles)
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/offline.html";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-While-Revalidate: Return cached, update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Cache-Miss: fetch and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// 5. PUSH NOTIFICATION HANDLER
self.addEventListener("push", (event) => {
  let data = {
    title: "Student OS",
    body: "You have new updates in your Student Operating System.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    data: data.data || { url: "/" },
    tag: data.tag || "student-os-general",
    renotify: true,
    actions: [
      { action: "open", title: "Open Student OS" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 6. NOTIFICATION CLICK HANDLER
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing open window if available
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

