"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to reset password.");
      } else {
        setSuccessMsg(data.message || "Password updated successfully.");
        setTimeout(() => {
          router.push("/login");
        }, 1200);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error resetting password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below to restore access to your Student OS
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {successMsg && (
          <Alert variant="success" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </Alert>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="token">Recovery Token</Label>
            <Input
              id="token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste recovery token"
            />
          </div>

          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="h-4 w-4 text-text-secondary absolute left-3 top-3" />
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters with letter & number"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Lock className="h-4 w-4 text-text-secondary absolute left-3 top-3" />
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating password..." : "Update Password"}
          </Button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Return to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-11 w-11 rounded-button bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            OS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Complete Password Reset
          </h1>
        </div>
        <Suspense
          fallback={
            <Card>
              <CardContent className="p-6 text-center text-xs text-text-secondary">
                Loading recovery token...
              </CardContent>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

