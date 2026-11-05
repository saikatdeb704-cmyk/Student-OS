"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Bell,
  BellRing,
  CheckCircle2,
  Download,
  Info,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { usePwa } from "@/lib/pwa/use-pwa";

export function PwaBannerControls() {
  const {
    isOnline,
    isInstallable,
    isInstalled,
    hasUpdate,
    platform,
    notificationPermission,
    isPushSupported,
    installPwa,
    applyUpdate,
    enableNotifications,
    sendTestNotification,
  } = usePwa();

  const [dismissUpdate, setDismissUpdate] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);
  const [testNotificationSent, setTestNotificationSent] =
    useState<boolean>(false);

  const handleInstallClick = async () => {
    setInstallStatus("prompting");
    const outcome = await installPwa();
    if (outcome === "accepted") {
      setInstallStatus("installed");
      setTimeout(() => setShowInstallModal(false), 1200);
    } else {
      setInstallStatus("cancelled");
    }
  };

  const handleSendTestPush = async () => {
    if (notificationPermission !== "granted") {
      const granted = await enableNotifications();
      if (!granted) return;
    }

    const success = await sendTestNotification(
      "Student OS Study Notification",
      "AI Study Agent: Your Algorithms assignment is due in 48 hours. Ready to review?"
    );
    if (success) {
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 4000);
    }
  };

  return (
    <>
      {/* 1. OFFLINE STATUS BANNER */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm z-50">
          <div className="flex items-center gap-2 max-w-3xl mx-auto w-full">
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode Active:</strong> You are currently working
              from the cached application shell. Live AI CEO generation is
              temporarily paused.
            </span>
          </div>
        </div>
      )}

      {/* 2. UPDATE NOTIFICATION BANNER */}
      {hasUpdate && !dismissUpdate && (
        <div className="bg-primary text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-md z-50 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
              <span>
                A new version of <strong>Student OS</strong> is available.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={applyUpdate}
                className="px-3 py-1 rounded bg-white text-primary text-xs font-bold hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                Update Now
              </button>
              <button
                onClick={() => setDismissUpdate(true)}
                className="p-1 hover:bg-white/20 rounded transition"
                aria-label="Dismiss update banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INSTALLATION MODAL / DIALOG */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-surface rounded-card border border-border max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-button text-text-secondary hover:bg-surface-muted"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                <ArrowDownToLine className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-text-primary">
                  Install Student OS
                </h3>
                <p className="text-xs text-text-secondary">
                  Fast, standalone Progressive Web App
                </p>
              </div>
            </div>

            <div className="bg-surface-muted/60 rounded-lg p-3.5 mb-4 text-xs text-text-secondary space-y-2">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Instant Home Screen & Desktop Launch</span>
              </div>
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Offline Application Shell & Revision Access</span>
              </div>
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Zero Storage Overhead & Automatic Updates</span>
              </div>
            </div>

            {platform === "ios" ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
                <strong>iOS Safari Instructions:</strong>
                <p className="mt-1">
                  Tap the <strong>Share</strong> button (box with upward arrow)
                  in Safari, then scroll and select{" "}
                  <strong>Add to Home Screen</strong>.
                </p>
              </div>
            ) : isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" />
                {installStatus === "installed"
                  ? "Installed Successfully!"
                  : "Install to Device"}
              </button>
            ) : isInstalled ? (
              <div className="p-3 text-center rounded-button bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                ✓ Student OS is already installed in Standalone Mode
              </div>
            ) : (
              <div className="p-3 text-center rounded-button bg-surface-muted text-text-secondary text-xs">
                Installation is supported via Chrome, Edge, and Android
                browsers.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function PwaHeaderActionButtons() {
  const {
    isOnline,
    isInstallable,
    isInstalled,
    notificationPermission,
    isPushSupported,
    installPwa,
    enableNotifications,
    sendTestNotification,
  } = usePwa();

  const [notificationSent, setNotificationSent] = useState<boolean>(false);

  const handleNotificationClick = async () => {
    if (notificationPermission !== "granted") {
      const granted = await enableNotifications();
      if (!granted) return;
    }
    const sent = await sendTestNotification();
    if (sent) {
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* ONLINE / OFFLINE BADGE */}
      <div
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-300"
        }`}
        title={
          isOnline
            ? "Connected to Student OS Cloud"
            : "Offline Shell Mode Active"
        }
      >
        {isOnline ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* PWA INSTALL BUTTON (DESKTOP & MOBILE BROWSER) */}
      {isInstallable && !isInstalled && (
        <button
          onClick={() => installPwa()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button bg-surface border border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium transition shadow-2xs"
          title="Install Student OS as a standalone desktop or mobile application"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Install App</span>
        </button>
      )}

      {/* PUSH NOTIFICATION BUTTON */}
      {isPushSupported && (
        <button
          onClick={handleNotificationClick}
          className={`p-1.5 rounded-button border text-xs font-medium transition flex items-center gap-1 ${
            notificationPermission === "granted"
              ? "border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted"
              : "border-primary/40 bg-blue-50/50 text-primary hover:bg-blue-50"
          }`}
          title={
            notificationPermission === "granted"
              ? notificationSent
                ? "Test study notification dispatched!"
                : "Push notifications active (Click to test)"
              : "Enable Push Notifications for deadlines & study alerts"
          }
          aria-label="Push notifications"
        >
          {notificationPermission === "granted" ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellRing className="h-4 w-4 text-primary" />
          )}
        </button>
      )}
    </div>
  );
}

