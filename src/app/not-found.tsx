import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>404 — Module Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-text-secondary">
            The requested Student OS page could not be found.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-button bg-primary text-white text-sm font-medium"
          >
            Return to Student OS Command Center
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

