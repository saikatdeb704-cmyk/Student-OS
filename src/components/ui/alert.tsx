import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

export function Alert({
  className,
  variant = "default",
  ...props
}: AlertProps) {
  const variants: Record<NonNullable<AlertProps["variant"]>, string> = {
    default: "bg-blue-50/80 border-blue-200 text-blue-950",
    success: "bg-green-50 border-green-300 text-green-900",
    warning: "bg-amber-50 border-amber-300 text-amber-900",
    danger: "bg-red-50 border-red-300 text-red-900",
  };

  return (
    <div
      role="alert"
      className={cn(
        "w-full rounded-button border p-3.5 text-xs font-medium leading-relaxed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

