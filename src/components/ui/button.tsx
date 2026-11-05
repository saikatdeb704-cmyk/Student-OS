import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-primary text-white hover:bg-primary-hover shadow-sm focus-visible:ring-primary",
      secondary:
        "bg-surface-muted text-text-primary hover:bg-slate-200/80 border border-border",
      outline:
        "border border-border bg-surface text-text-primary hover:bg-surface-muted",
      ghost:
        "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
      danger: "bg-danger text-white hover:bg-red-700 shadow-sm",
      success: "bg-success text-white hover:bg-green-700 shadow-sm",
    };

    const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 py-1.5 text-xs",
      lg: "h-11 px-6 py-2.5 text-sm",
      icon: "h-10 w-10 p-2",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-button font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

