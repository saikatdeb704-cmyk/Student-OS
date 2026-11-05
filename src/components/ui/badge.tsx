import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-blue-50 text-primary border border-blue-200",
    secondary: "bg-surface-muted text-text-secondary border border-border",
    success: "bg-green-50 text-success border border-green-200",
    warning: "bg-amber-50 text-warning border border-amber-200",
    danger: "bg-red-50 text-danger border border-red-200",
    outline: "bg-surface text-text-primary border border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

