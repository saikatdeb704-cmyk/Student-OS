"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="h-10 w-10 rounded-button bg-red-50 text-danger flex items-center justify-center mb-2">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>Something went wrong in Student OS</CardTitle>
          <CardDescription>
            {error.message ||
              "An unexpected error occurred while rendering this view."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} className="w-full">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

