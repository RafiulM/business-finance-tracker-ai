import { db } from '@/db';
import {
  auditLog,
  user,
  type AuditLog,
  type NewAuditLog,
  type AuditAction
} from '@/db/schema';
import { eq, and, desc, asc, gte, lte, ilike, inArray } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

export class AuditService {
  /**
   * Create a new audit log entry
   */
  async createAuditLog(auditData: {
    userId: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    const newAuditLog: NewAuditLog = {
      id: createId(),
      userId: auditData.userId,
      entityType: auditData.entityType,
      entityId: auditData.entityId,
      action: auditData.action,
      oldValue: auditData.oldValue || null,
      newValue: auditData.newValue || null,
      reason: auditData.reason?.trim() || null,
      ipAddress: auditData.ipAddress || null,
      userAgent: auditData.userAgent || null,
      metadata: auditData.metadata || {},
      timestamp: new Date(),
    };

    const [createdAuditLog] = await db
      .insert(auditLog)
      .values(newAuditLog)
      .returning();

    return createdAuditLog;
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(auditId: string, userId?: string): Promise<AuditLog | null> {
    const conditions = [eq(auditLog.id, auditId)];

    if (userId) {
      conditions.push(eq(auditLog.userId, userId));
    }

    const [auditRecord] = await db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .limit(1);

    return auditRecord || null;
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      entityType?: string;
      entityId?: string;
      action?: AuditAction;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: 'timestamp' | 'entityType' | 'action';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 50,
      offset = 0,
      entityType,
      entityId,
      action,
      startDate,
      endDate,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    // Build conditions
    const conditions = [eq(auditLog.userId, userId)];

    if (entityType) {
      conditions.push(eq(auditLog.entityType, entityType));
    }

    if (entityId) {
      conditions.push(eq(auditLog.entityId, entityId));
    }

    if (action) {
      conditions.push(eq(auditLog.action, action));
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(auditLog.timestamp, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.timestamp, end));
    }

    if (search) {
      conditions.push(ilike(auditLog.entityType, `%${search.toLowerCase()}%`));
    }

    // Build order by
    let orderBy;
    if (sortBy === 'timestamp') {
      orderBy = sortOrder === 'asc' ? asc(auditLog.timestamp) : desc(auditLog.timestamp);
    } else if (sortBy === 'entityType') {
      orderBy = sortOrder === 'asc' ? asc(auditLog.entityType) : desc(auditLog.entityType);
    } else if (sortBy === 'action') {
      orderBy = sortOrder === 'asc' ? asc(auditLog.action) : desc(auditLog.action);
    } else {
      orderBy = desc(auditLog.timestamp);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: auditLog.id })
      .from(auditLog)
      .where(and(...conditions));

    // Get audit logs
    const logs = await db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      logs,
      total: Number(count),
      hasMore: offset + logs.length < Number(count)
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    options: {
      limit?: number;
      offset?: number;
      userId?: string;
      action?: AuditAction;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 50,
      offset = 0,
      userId,
      action,
      startDate,
      endDate
    } = options;

    // Build conditions
    const conditions = [
      eq(auditLog.entityType, entityType),
      eq(auditLog.entityId, entityId)
    ];

    if (userId) {
      conditions.push(eq(auditLog.userId, userId));
    }

    if (action) {
      conditions.push(eq(auditLog.action, action));
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(auditLog.timestamp, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.timestamp, end));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: auditLog.id })
      .from(auditLog)
      .where(and(...conditions));

    // Get audit logs
    const logs = await db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit)
      .offset(offset);

    return {
      logs,
      total: Number(count),
      hasMore: offset + logs.length < Number(count)
    };
  }

  /**
   * Get recent activity for a user
   */
  async getRecentActivity(userId: string, limit: number = 20): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(
    userId: string,
    action: AuditAction,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          eq(auditLog.action, action)
        )
      )
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalActions: number;
    actionsByType: Record<AuditAction, number>;
    actionsByEntityType: Record<string, number>;
    mostActiveDay: string | null;
    uniqueEntitiesModified: number;
    recentActions: number; // Last 24 hours
  }> {
    // Build conditions
    const conditions = [eq(auditLog.userId, userId)];

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(auditLog.timestamp, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.timestamp, end));
    }

    const logs = await db
      .select()
      .from(auditLog)
      .where(and(...conditions));

    // Calculate recent actions (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentActions = logs.filter(log => log.timestamp >= twentyFourHoursAgo);

    // Group by action type
    const actionsByType: Record<AuditAction, number> = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0,
      login: 0,
      logout: 0,
      export: 0,
      import: 0,
    };

    logs.forEach(log => {
      actionsByType[log.action]++;
    });

    // Group by entity type
    const actionsByEntityType: Record<string, number> = {};

    logs.forEach(log => {
      if (!actionsByEntityType[log.entityType]) {
        actionsByEntityType[log.entityType] = 0;
      }
      actionsByEntityType[log.entityType]++;
    });

    // Find most active day
    const dayActivity: Record<string, number> = {};

    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];
      dayActivity[day] = (dayActivity[day] || 0) + 1;
    });

    const mostActiveDay = Object.entries(dayActivity)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Count unique entities modified
    const uniqueEntities = new Set(
      logs.map(log => `${log.entityType}:${log.entityId}`)
    );

    return {
      totalActions: logs.length,
      actionsByType,
      actionsByEntityType,
      mostActiveDay,
      uniqueEntitiesModified: uniqueEntities.size,
      recentActions: recentActions.length,
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    actions: number;
    actionTypes: Record<AuditAction, number>;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          gte(auditLog.timestamp, startDate)
        )
      )
      .orderBy(asc(auditLog.timestamp));

    // Group by day
    const dailyActivity: Record<string, {
      actions: number;
      actionTypes: Record<AuditAction, number>;
    }> = {};

    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];

      if (!dailyActivity[day]) {
        dailyActivity[day] = {
          actions: 0,
          actionTypes: {
            create: 0,
            read: 0,
            update: 0,
            delete: 0,
            login: 0,
            logout: 0,
            export: 0,
            import: 0,
          }
        };
      }

      dailyActivity[day].actions++;
      dailyActivity[day].actionTypes[log.action]++;
    });

    // Convert to array and fill missing days
    const summary = [];
    const currentDay = new Date(startDate);

    while (currentDay <= new Date()) {
      const dayKey = currentDay.toISOString().split('T')[0];
      const dayData = dailyActivity[dayKey] || {
        actions: 0,
        actionTypes: {
          create: 0,
          read: 0,
          update: 0,
          delete: 0,
          login: 0,
          logout: 0,
          export: 0,
          import: 0,
        }
      };

      summary.push({
        date: dayKey,
        ...dayData
      });

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return summary;
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          // Search in entityType, entityId, and reason
          ilike(auditLog.entityType, `%${query.toLowerCase()}%`) ||
          ilike(auditLog.entityId, `%${query.toLowerCase()}%`) ||
          ilike(auditLog.reason, `%${query.toLowerCase()}%`)
        )
      )
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId: string, limit: number = 20): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          inArray(auditLog.action, ['login', 'logout'])
        )
      )
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Get data modification history
   */
  async getDataModificationHistory(
    userId: string,
    entityType?: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const conditions = [
      eq(auditLog.userId, userId),
      inArray(auditLog.action, ['create', 'update', 'delete'])
    ];

    if (entityType) {
      conditions.push(eq(auditLog.entityType, entityType));
    }

    return await db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  /**
   * Get failed actions or suspicious activity
   */
  async getSuspiciousActivity(
    userId: string,
    hours: number = 24
  ): Promise<AuditLog[]> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    // This is a simple implementation - in reality, you'd want more sophisticated detection
    return await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          gte(auditLog.timestamp, startTime)
        )
      )
      .orderBy(desc(auditLog.timestamp));
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalActions: number;
    dataAccess: number;
    dataModification: number;
    dataDeletion: number;
    logins: number;
    exports: number;
    unusualActivity: Array<{
      timestamp: string;
      action: string;
      entityType: string;
      description: string;
    }>;
  }> {
    const logs = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          gte(auditLog.timestamp, new Date(startDate)),
          lte(auditLog.timestamp, new Date(endDate))
        )
      )
      .orderBy(desc(auditLog.timestamp));

    const dataAccess = logs.filter(log => log.action === 'read').length;
    const dataModification = logs.filter(log => ['create', 'update'].includes(log.action)).length;
    const dataDeletion = logs.filter(log => log.action === 'delete').length;
    const logins = logs.filter(log => log.action === 'login').length;
    const exports = logs.filter(log => log.action === 'export').length;

    // Identify unusual activity (simple implementation)
    const unusualActivity = logs
      .filter(log => {
        // Large data exports
        if (log.action === 'export' && log.metadata?.recordCount > 1000) {
          return true;
        }
        // Multiple deletions
        if (log.action === 'delete' && log.metadata?.batchDelete === true) {
          return true;
        }
        // Unusual time (outside business hours)
        const hour = log.timestamp.getHours();
        if (hour < 6 || hour > 22) {
          return true;
        }
        return false;
      })
      .map(log => ({
        timestamp: log.timestamp.toISOString(),
        action: log.action,
        entityType: log.entityType,
        description: this.getUnusualActivityDescription(log),
      }));

    return {
      totalActions: logs.length,
      dataAccess,
      dataModification,
      dataDeletion,
      logins,
      exports,
      unusualActivity,
    };
  }

  /**
   * Get description for unusual activity
   */
  private getUnusualActivityDescription(log: AuditLog): string {
    if (log.action === 'export' && log.metadata?.recordCount > 1000) {
      return `Large data export: ${log.metadata.recordCount} records`;
    }
    if (log.action === 'delete' && log.metadata?.batchDelete === true) {
      return 'Batch deletion operation';
    }
    const hour = log.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      return 'Activity outside business hours';
    }
    return 'Unusual activity detected';
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  async cleanupOldAuditLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // This would typically be done in a background job
    // Here we'll implement it for completeness
    const result = await db
      .delete(auditLog)
      .where(lte(auditLog.timestamp, cutoffDate));

    return result.rowCount || 0;
  }

  /**
   * Validate audit log data
   */
  private validateAuditLogData(auditData: any): void {
    if (!auditData.userId || typeof auditData.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!auditData.entityType || typeof auditData.entityType !== 'string') {
      throw new Error('Entity type is required and must be a string');
    }

    if (!auditData.entityId || typeof auditData.entityId !== 'string') {
      throw new Error('Entity ID is required and must be a string');
    }

    if (!auditData.action || ![
      'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import'
    ].includes(auditData.action)) {
      throw new Error('Action must be a valid audit action');
    }

    if (auditData.reason && auditData.reason.length > 500) {
      throw new Error('Reason cannot exceed 500 characters');
    }
  }

  /**
   * Create audit log with validation
   */
  async createAuditLogWithValidation(auditData: {
    userId: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    this.validateAuditLogData(auditData);
    return this.createAuditLog(auditData);
  }
}

// Export singleton instance
export const auditService = new AuditService();