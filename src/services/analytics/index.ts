/**
 * Student OS Analytics & Audit Service
 */

import { dbStore } from "../../lib/db/store.ts";
import type { AuditLogRow, UsageRecordRow } from "../../types/database.ts";
import type { DashboardMetrics } from "../../types/student-os.ts";

export class AnalyticsService {
  static getDashboardMetrics(userId?: string): DashboardMetrics {
    return dbStore.getDashboardMetrics(16, userId);
  }

  static getSecurityAuditLogs(userId?: string): AuditLogRow[] {
    return dbStore.getAuditLogs(userId);
  }

  static getUsageRecords(userId?: string): UsageRecordRow[] {
    return dbStore.getUsageRecords(userId);
  }
}
