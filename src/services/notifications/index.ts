/**
 * Student OS Notification & Push Service
 */

import { dbStore } from "../../lib/db/store.ts";
import type { NotificationRow } from "../../types/database.ts";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "approval" | "deadline" | "agent_complete" | "warning";
}

export class NotificationService {
  static listNotifications(userId: string): NotificationRow[] {
    return dbStore.getNotifications(userId);
  }

  static createNotification(params: CreateNotificationParams): NotificationRow {
    return dbStore.createNotification(
      {
        user_id: params.userId,
        title: params.title,
        body: params.message,
        type: params.type || "info",
        read_at: null,
      },
      params.userId
    );
  }
}
