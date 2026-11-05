"use client";

import React, { useState } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  ChevronUp,
  Compass,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Mic,
  MoreHorizontal,
  Settings,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type { NavSection } from "@/app/page";

interface MobileBottomNavProps {
  activeNav: NavSection;
  onSelectNav: (section: NavSection) => void;
  pendingApprovalsCount?: number;
  isOnline?: boolean;
}

export function MobileBottomNav({
  activeNav,
  onSelectNav,
  pendingApprovalsCount = 0,
  isOnline = true,
}: MobileBottomNavProps) {
  const [showMoreDrawer, setShowMoreDrawer] = useState<boolean>(false);

  const handleSelect = (section: NavSection) => {
    onSelectNav(section);
    setShowMoreDrawer(false);
  };

  return (
    <>
      {/* MORE QUICK-DRAWER MODAL */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreDrawer(false)}
          />
          <div className="relative z-10 bg-surface rounded-t-2xl border-t border-border p-5 pb-8 max-h-[75vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm text-text-primary">
                  Student OS Modules & Studios
                </h3>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-full text-text-secondary hover:bg-surface-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleSelect("learning")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "learning"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                <span>Study & Exams</span>
              </button>

              <button
                onClick={() => handleSelect("agents")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "agents"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span>Agent HQ (16)</span>
              </button>

              <button
                onClick={() => handleSelect("projects")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "projects"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <Briefcase className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Project Lab</span>
              </button>

              <button
                onClick={() => handleSelect("opportunities")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "opportunities"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <Award className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Opportunities</span>
              </button>

              <button
                onClick={() => handleSelect("intelligence")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "intelligence"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" />
                <span>Research & Notes</span>
              </button>

              <button
                onClick={() => handleSelect("memory_voice")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "memory_voice"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <Mic className="h-4 w-4 shrink-0 text-purple-600" />
                <span>Memory & Voice</span>
              </button>

              <button
                onClick={() => handleSelect("tasks")}
                className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                  activeNav === "tasks"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
                  <span>Tasks & Approvals</span>
                </div>
                {pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelect("support")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  activeNav === "support"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <HeartPulse className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Support & Analytics</span>
              </button>

              <button
                onClick={() => handleSelect("onboarding")}
                className={`p-3 rounded-lg border text-left flex items-center gap-2.5 col-span-2 transition ${
                  activeNav === "onboarding"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-primary hover:bg-surface-muted"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0 text-slate-600" />
                <span>Student Profile & Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface/95 backdrop-blur-md border-t border-border shadow-lg"
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
          {/* 1. DASHBOARD */}
          <button
            onClick={() => onSelectNav("overview")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeNav === "overview"
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          {/* 2. ACADEMIC */}
          <button
            onClick={() => onSelectNav("academic")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeNav === "academic"
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <BookOpen className="h-5 w-5 mb-0.5" />
            <span className="text-[10px]">Academic</span>
          </button>

          {/* 3. AI CEO (CENTER PROMINENT ACTION) */}
          <button
            onClick={() => onSelectNav("ceo")}
            className="flex flex-col items-center justify-center -mt-4 px-2 relative"
            aria-label="Ask AI CEO"
          >
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md transition ${
                activeNav === "ceo"
                  ? "bg-primary text-white ring-4 ring-primary/20 scale-105"
                  : "bg-primary text-white hover:bg-primary-hover"
              }`}
            >
              <Sparkles className="h-6 w-6" />
            </div>
            <span
              className={`text-[10px] mt-1 font-semibold ${
                activeNav === "ceo" ? "text-primary" : "text-text-primary"
              }`}
            >
              AI CEO
            </span>
          </button>

          {/* 4. CAREER */}
          <button
            onClick={() => onSelectNav("career")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeNav === "career"
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Briefcase className="h-5 w-5 mb-0.5" />
            <span className="text-[10px]">Career</span>
          </button>

          {/* 5. MORE / STUDIOS */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition ${
              showMoreDrawer ||
              ![
                "overview",
                "academic",
                "ceo",
                "career",
              ].includes(activeNav)
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
            aria-label="More navigation options"
          >
            <div className="relative">
              <MoreHorizontal className="h-5 w-5 mb-0.5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-surface" />
              )}
            </div>
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

