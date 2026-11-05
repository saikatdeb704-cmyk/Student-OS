"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e?: React.FormEvent,
    credentialsOverride?: { email: string; password: string }
  ) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = credentialsOverride || { email, password };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error while signing in."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-11 w-11 rounded-button bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            OS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Sign in to Student OS
          </h1>
          <p className="text-xs text-text-secondary max-w-xs">
            One AI CEO. 15 specialised agents. One organised student life.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your college or personal credentials to access your AI
              command center.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-text-secondary absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="mb-0">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-text-secondary absolute left-3 top-3" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-surface px-2 text-text-secondary">
                  Or quick prototype access
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={() =>
                handleLogin(undefined, {
                  email: "aarav.sharma@iitd.ac.in",
                  password: "StudentOS123",
                })
              }
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Continue as Demo Student (Aarav Sharma)
            </Button>

            <p className="text-center text-xs text-text-secondary pt-2">
              New to Student OS?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create your student account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

