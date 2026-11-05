/**
 * Student OS Validation Schemas
 */

import { z } from "zod";
import {
  RegisterSchema,
  LoginSchema,
  RecoverPasswordSchema,
  ResetPasswordSchema,
  OnboardingProfileSchema,
  AgentInputSchema,
  ProposedActionSchema,
  AgentResultSchema,
} from "../../types/student-os.ts";

export const OnboardingSchema = OnboardingProfileSchema;

export const TaskSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  goalId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .default("pending"),
  dueAt: z.string().optional(),
  sourceAgent: z.string().optional(),
});

export const GoalSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  category: z
    .enum(["academic", "career", "skill", "project", "finance", "wellbeing"])
    .default("academic"),
  progress: z.number().min(0).max(100).default(0),
  targetDate: z.string(),
  status: z
    .enum(["active", "completed", "paused", "archived"])
    .default("active"),
});

export {
  RegisterSchema,
  LoginSchema,
  RecoverPasswordSchema,
  ResetPasswordSchema,
  OnboardingProfileSchema,
  AgentInputSchema,
  ProposedActionSchema,
  AgentResultSchema,
};
