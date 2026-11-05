"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryLink, setRecoveryLink] = useState<string | undefined>();

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setRecoveryLink(undefined);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to process password recovery.");
      } else {
        setMessage(data.message);
        if (data.recoveryLink) {
          setRecoveryLink(data.recoveryLink);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error during recovery"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-11 w-11 rounded-button bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Password Recovery
          </h1>
          <p className="text-xs text-text-secondary max-w-xs">
            Enter the email address associated with your Student OS account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              We will generate a secure recovery link so you can set a new
              password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            {message && (
              <Alert variant="success" className="space-y-2">
                <p>{message}</p>
                {recoveryLink && (
                  <p className="pt-1">
                    <Link
                      href={recoveryLink}
                      className="font-bold underline text-primary"
                    >
                      Click here to open your password reset link →
                    </Link>
                  </p>
                )}
              </Alert>
            )}

            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <Label htmlFor="email">Account Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-text-secondary absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aarav.sharma@iitd.ac.in"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Generating recovery link..."
                  : "Send Recovery Instructions"}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

