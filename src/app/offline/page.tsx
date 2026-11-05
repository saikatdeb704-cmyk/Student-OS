"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

interface OfflineTask {
  id: string;
  title: string;
  subject: string;
  estimatedMinutes: number;
  completed: boolean;
}

const DEFAULT_OFFLINE_TASKS: OfflineTask[] = [
  {
    id: "offline-1",
    title: "Review Semester Syllabus & Course Notes",
    subject: "Academic Core",
    estimatedMinutes: 30,
    completed: false,
  },
  {
    id: "offline-2",
    title: "Self-Quiz Active Recall Flashcards",
    subject: "Study Agent Toolkit",
    estimatedMinutes: 25,
    completed: true,
  },
  {
    id: "offline-3",
    title: "Draft Project Architecture Overview",
    subject: "Project Lab",
    estimatedMinutes: 45,
    completed: false,
  },
];

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [tasks, setTasks] = useState<OfflineTask[]>(DEFAULT_OFFLINE_TASKS);
  const [activeTab, setActiveTab] = useState<"tasks" | "guidelines">("tasks");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Read any student-saved offline tasks from localStorage if available
    try {
      const saved = localStorage.getItem("student_os_offline_tasks");
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch {}

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    try {
      localStorage.setItem(
        "student_os_offline_tasks",
        JSON.stringify(updated)
      );
    } catch {}
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    try {
      if (navigator.onLine) {
        // Test ping
        window.location.href = "/";
      } else {
        setTimeout(() => {
          setChecking(false);
        }, 600);
      }
    } catch {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-8">
      {/* HEADER */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-text-primary">Student OS</h1>
            <p className="text-xs text-text-secondary">
              Progressive Web App Shell
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wifi className="h-3.5 w-3.5" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
              <WifiOff className="h-3.5 w-3.5" />
              Offline Shell Active
            </span>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto my-8 flex-1">
        {/* HERO BANNER */}
        <div className="bg-surface rounded-card border border-border p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Network Connection Unavailable
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                You are currently in Offline Mode
              </h2>
              <p className="text-sm text-text-secondary max-w-xl">
                Student OS cached this shell so you can continue studying,
                reviewing cached topics, and tracking your revision checklist
                without internet access.
              </p>
            </div>

            <button
              onClick={handleCheckConnection}
              disabled={checking}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-button bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
              />
              {checking ? "Checking..." : "Reconnect & Retry"}
            </button>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex gap-2 mb-4 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 rounded-button text-sm font-medium transition ${
              activeTab === "tasks"
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-surface-muted"
            }`}
          >
            Offline Revision Checklist ({tasks.filter((t) => !t.completed).length}{" "}
            Remaining)
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`px-4 py-2 rounded-button text-sm font-medium transition ${
              activeTab === "guidelines"
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-surface-muted"
            }`}
          >
            Offline Capabilities Guide
          </button>
        </div>

        {/* TAB CONTENT: TASKS */}
        {activeTab === "tasks" && (
          <div className="bg-surface rounded-card border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary text-base">
                Your Offline Study Session
              </h3>
              <span className="text-xs text-text-secondary">
                Saved locally in browser storage
              </span>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                    task.completed
                      ? "bg-surface-muted/50 border-border opacity-70 line-through"
                      : "bg-surface border-border hover:border-primary/40 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={
                        task.completed ? "Mark incomplete" : "Mark complete"
                      }
                      className={`h-5 w-5 rounded flex items-center justify-center border transition ${
                        task.completed
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {task.title}
                      </p>
                      <span className="text-xs text-text-secondary">
                        {task.subject}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-text-secondary shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{task.estimatedMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: CAPABILITIES GUIDE */}
        {activeTab === "guidelines" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-card border border-emerald-200 p-5">
              <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Works Seamlessly Offline
              </h4>
              <ul className="text-xs text-text-secondary space-y-2">
                <li>• Application shell and UI navigation</li>
                <li>• Local study tasks and Pomodoro revision checklist</li>
                <li>• Viewing previously loaded academic syllabus topics</li>
                <li>• PWA installation to Home Screen / Desktop</li>
                <li>• Strict privacy: zero document leakage in shared cache</li>
              </ul>
            </div>

            <div className="bg-surface rounded-card border border-amber-200 p-5">
              <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-600" />
                Resumes When Back Online
              </h4>
              <ul className="text-xs text-text-secondary space-y-2">
                <li>• Live AI CEO multi-agent task orchestration</li>
                <li>• Real-time SSE streaming responses</li>
                <li>• Semantic pgvector memory embedding and synchronization</li>
                <li>• Speech-to-text and cloud voice synthesis</li>
                <li>• Supabase cloud database synchronization</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl w-full mx-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-3">
        <p>Student OS PWA • Safe Offline Application Shell v1.0</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-primary hover:underline font-medium">
            Return to Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}

