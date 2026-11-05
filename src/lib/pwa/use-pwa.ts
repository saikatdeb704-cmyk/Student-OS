"use client";

import { useEffect, useState, useCallback } from "react";
import {
  applyPwaUpdate,
  canPromptPwaInstall,
  detectPlatform,
  isPushNotificationSupported,
  isServiceWorkerSupported,
  isStandaloneMode,
  promptPwaInstall,
  registerPwaServiceWorker,
  requestNotificationPermission,
  setDeferredInstallPrompt,
  subscribeToPwaEvents,
  triggerPwaNotification,
  type BeforeInstallPromptEvent,
  type PlatformType,
  type PwaInstallOutcome,
} from "./pwa-manager";

export interface UsePwaReturn {
  isSupported: boolean;
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  hasUpdate: boolean;
  platform: PlatformType;
  notificationPermission: NotificationPermission | "unsupported";
  isPushSupported: boolean;
  installPwa: () => Promise<PwaInstallOutcome>;
  applyUpdate: () => void;
  enableNotifications: () => Promise<boolean>;
  sendTestNotification: (title?: string, body?: string) => Promise<boolean>;
}

export function usePwa(): UsePwaReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PlatformType>("desktop");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSupported(isServiceWorkerSupported());
    setIsOnline(navigator.onLine);
    setIsInstalled(isStandaloneMode());
    setPlatform(detectPlatform());
    setIsPushSupported(isPushNotificationSupported());

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // 1. Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. BeforeInstallPrompt listener (Android & Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const pEvent = e as BeforeInstallPromptEvent;
      setDeferredInstallPrompt(pEvent);
      setIsInstallable(true);
    };

    // 3. App Installed listener
    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    // 4. Register Service Worker & check for updates
    registerPwaServiceWorker({
      onUpdateAvailable: () => setHasUpdate(true),
      onInstalled: () => console.log("[PWA] Service worker installed"),
    });

    // 5. Subscribe to manager update & installable changes
    const unsubscribe = subscribeToPwaEvents({
      onUpdate: (updateReady) => setHasUpdate(updateReady),
      onInstallable: (installReady) => setIsInstallable(installReady),
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      unsubscribe();
    };
  }, []);

  const installPwa = useCallback(async (): Promise<PwaInstallOutcome> => {
    const outcome = await promptPwaInstall();
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    return outcome;
  }, []);

  const applyUpdate = useCallback(() => {
    applyPwaUpdate();
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
    return result === "granted";
  }, []);

  const sendTestNotification = useCallback(
    async (
      title = "Student OS Study Reminder",
      body = "Your AI Study Agent scheduled a 25-minute Pomodoro focus session!"
    ): Promise<boolean> => {
      return await triggerPwaNotification({
        title,
        body,
        url: "/?tab=learning",
        tag: "student-os-reminder",
      });
    },
    []
  );

  return {
    isSupported,
    isOnline,
    isInstalled,
    isInstallable: isInstallable || canPromptPwaInstall(),
    hasUpdate,
    platform,
    notificationPermission,
    isPushSupported,
    installPwa,
    applyUpdate,
    enableNotifications,
    sendTestNotification,
  };
}

